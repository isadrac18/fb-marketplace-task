# Facebook Marketplace Clone (`marketplace-demo`)

A full-stack Facebook Marketplace clone built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Supabase** (Postgres + Storage).

## Key Features

- **Browse & Search**: Responsive 1–5 column grid and list views, real-time search, and 19 Marketplace categories.
- **Create Listings**: Multi-step listing type selection (`/create`) and item creation form (`/create/item`) with drag-and-drop photo upload, field validation, price formatting, and live preview.
- **Listing Detail & Messaging**: Dedicated item pages (`/item/[id]`) with full-screen image lightbox, seller contact actions, and an interactive **Message Seller** form backed by Supabase.
- **RESTful API & Graceful Fallback**: App Router API endpoints (`/api/listings`, `/api/listings/[id]`, `/api/messages`, `/api/upload`) that persist to Supabase when configured and fall back to mock data for local development.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js `16.4.6` (App Router, Turbopack, Cache Components) |
| UI | React `19.3.0`, TypeScript `5`, Tailwind CSS `4.3.3`, `lucide-react` |
| Backend / API | Next.js App Router Route Handlers |
| Database & Storage | Supabase (`@supabase/supabase-js`) — Postgres + `listing-images` Storage bucket |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure Supabase credentials
cp .env.example .env.local
# Edit .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> Without `.env.local`, the app runs in mock-data mode automatically so you can explore the full UI immediately.

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── listings/route.ts        # GET & POST listings
│   │   ├── listings/[id]/route.ts   # GET single listing
│   │   ├── messages/route.ts        # GET & POST buyer messages
│   │   └── upload/route.ts          # POST image upload to Supabase Storage
│   ├── category/
│   │   ├── [slug]/page.tsx          # Dynamic category pages
│   │   └── electronics/page.tsx     # Static Electronics category page
│   ├── create/
│   │   ├── page.tsx                 # Listing type selection
│   │   └── item/page.tsx            # Item creation form + live preview
│   ├── item/[id]/page.tsx           # Dynamic item detail page
│   ├── error.tsx                    # Route error boundary
│   ├── loading.tsx                  # Route loading spinner
│   ├── not-found.tsx                # 404 page
│   └── page.tsx                     # Main Marketplace feed ("Today's picks")
├── components/marketplace/          # Header, Sidebar, ItemGrid, ListingCard, ItemDetailClient, ErrorBoundary
└── lib/                             # Types, categories, mock data, Supabase client, ListingsProvider
```

## Documentation

- [SETUP.md](./SETUP.md) — Detailed local and Supabase setup instructions
- [FEATURES.md](./FEATURES.md) — Complete feature & API documentation
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) — Architecture, conventions, and developer workflow
