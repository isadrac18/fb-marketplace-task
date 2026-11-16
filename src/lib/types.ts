export interface Category {
  name: string;
  slug: string;
  iconName: string;
}

export type ItemCondition =
  | "New"
  | "Used - Like New"
  | "Used - Good"
  | "Used - Fair";

export interface Listing {
  id: string;
  title: string;
  price: number;
  description: string;
  category: string; // category slug
  location: string;
  imageUrl: string;
  sellerName: string;
  sellerEmail: string;
  condition: ItemCondition;
  status?: "available" | "sold";
  sellerOnboarded?: boolean;
  createdAt: string;
}

export interface SellerMessage {
  id: string;
  listingId: string;
  buyerEmail: string;
  message: string;
  createdAt: string;
}


export interface SellerAccount {
  id: string;
  email: string;
  stripeAccountId: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  listingId: string | null;
  sellerEmail: string;
  buyerEmail: string | null;
  amountCents: number;
  platformFeeCents: number;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  stripeAccountId: string | null;
  status: string;
  createdAt: string;
}
