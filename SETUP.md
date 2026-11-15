# Setup Guide

Follow these steps to run `marketplace-demo` locally and connect it to a live Supabase project.

## Prerequisites

- **Node.js** 20+ and **npm**
- A **Supabase** account and project (optional for UI-only/mock mode; required for persistent database & image storage)

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Supabase Database & Storage

1. Create a new project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor** in your Supabase project.
3. Copy the contents of [`supabase-schema.sql`](./supabase-schema.sql) and run it. This creates:
   - `listings` table with indexes (`idx_listings_category`, `idx_listings_created_at`) and `updated_at` trigger
   - `messages` table with foreign key `listing_id -> listings(id)` (`ON DELETE CASCADE`) and `idx_messages_listing_id`
   - Public storage bucket `listing-images`
   - Row Level Security (RLS) policies for `listings`, `messages`, and `storage.objects`

## 3. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your project values from **Project Settings → API** in Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> If `.env.local` is omitted, `isSupabaseConfigured()` in `src/lib/supabase.ts` returns `false` and the API routes fall back to in-memory/mock responses.

## 4. Run & Verify

```bash
# Start the development server
npm run dev

# Verify production build & TypeScript types
npm run build

# Run ESLint
npm run lint
```

Visit `http://localhost:3000` to browse the marketplace, `/create` to post a listing, and `/item/[id]` to view details and message sellers.
