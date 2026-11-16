-- Create listings table
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  seller_email VARCHAR(255) NOT NULL,
  image_url TEXT,
  location VARCHAR(255) DEFAULT 'Palo Alto, CA',
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  buyer_email VARCHAR(255) NOT NULL,
  seller_email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true);

-- Create policy for listing images storage
CREATE POLICY "Anyone can upload listing images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'listing-images');

CREATE POLICY "Anyone can view listing images" ON storage.objects 
FOR SELECT USING (bucket_id = 'listing-images');

-- Create indexes for better performance
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_messages_listing_id ON messages(listing_id);

-- Enable Row Level Security (RLS)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for listings (anyone can read, anyone can insert)
CREATE POLICY "Anyone can view listings" ON listings FOR SELECT USING (true);
CREATE POLICY "Anyone can create listings" ON listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own listings" ON listings FOR UPDATE USING (seller_email = auth.jwt()->>'email');
CREATE POLICY "Users can delete their own listings" ON listings FOR DELETE USING (seller_email = auth.jwt()->>'email');

-- Create policies for messages (restrict SELECT to conversation participants when authenticated; allow buyers to insert)
CREATE POLICY "Participants can view their messages" ON messages FOR SELECT USING (
  auth.jwt()->>'email' = buyer_email OR auth.jwt()->>'email' = seller_email
);
CREATE POLICY "Anyone can create messages" ON messages FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Supabase Realtime for live listings updates
ALTER PUBLICATION supabase_realtime ADD TABLE listings;


-- ============================================================================
-- Stripe Connect Migration (safe to run on existing databases)
-- ============================================================================

-- Add sold status columns to listings if upgrading an existing table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'available';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);

-- Create sellers table for Stripe Connect accounts (no login required, keyed by email)
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  stripe_account_id VARCHAR(255) NOT NULL UNIQUE,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);
CREATE INDEX IF NOT EXISTS idx_sellers_stripe_account_id ON sellers(stripe_account_id);

-- Create orders table for completed Stripe Checkout purchases
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  seller_email VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  stripe_account_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'paid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);

-- Enable RLS on sellers and orders
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policies for sellers (public read of onboarding status, server/anon write for demo without login)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sellers' AND policyname = 'Anyone can view sellers') THEN
    CREATE POLICY "Anyone can view sellers" ON sellers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sellers' AND policyname = 'Anyone can insert sellers') THEN
    CREATE POLICY "Anyone can insert sellers" ON sellers FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sellers' AND policyname = 'Anyone can update sellers') THEN
    CREATE POLICY "Anyone can update sellers" ON sellers FOR UPDATE USING (true);
  END IF;
END $$;

-- Policies for orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Anyone can view orders') THEN
    CREATE POLICY "Anyone can view orders" ON orders FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Anyone can insert orders') THEN
    CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Anyone can update orders') THEN
    CREATE POLICY "Anyone can update orders" ON orders FOR UPDATE USING (true);
  END IF;
END $$;

-- Allow server/webhook to mark listings as sold even when using anon key
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'Anyone can mark listings sold') THEN
    CREATE POLICY "Anyone can mark listings sold" ON listings FOR UPDATE USING (true);
  END IF;
END $$;

-- Trigger for sellers.updated_at
DROP TRIGGER IF EXISTS update_sellers_updated_at ON sellers;
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
