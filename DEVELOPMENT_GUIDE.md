# Development Guide

This guide documents the architecture, Next.js 16 conventions, and patterns used in `marketplace-demo`.

## Architecture Overview

- **State & Context (`src/lib/listings-store.tsx`)**: `ListingsProvider` hydrates listings from `GET /api/listings` on mount and manages shared search query, optimistic listing/message updates, and cross-page state.
- **Supabase Layer (`src/lib/supabase.ts`)**: `getSupabaseClient()` returns `null` when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset, allowing builds and local previews to run without credentials.
- **UI Components (`src/components/marketplace/`)**:
  - `MarketplaceHeader.tsx` — Top navigation & global search input
  - `MarketplaceSidebar.tsx` — Desktop category sidebar & mobile horizontal strip
  - `MarketplaceFeed.tsx` — Feed shell with Grid/List toggle and `ErrorBoundary`
  - `ItemGrid.tsx` — Live API-backed grid/list renderer with skeletons, retry, and empty states
  - `ListingCard.tsx` — Card component supporting grid and list layouts
  - `ItemDetailClient.tsx` — Detail view, lightbox, seller actions, and Message Seller form
  - `ErrorBoundary.tsx` — React class error boundary for localized recovery

## Next.js 16 Conventions

This project has `cacheComponents: true` and `partialPrefetching: true` enabled in `next.config.ts`:

1. **Async `params`**: Dynamic route pages and API handlers type `params` as `Promise<{ ... }>` and `await` it.
2. **`<Suspense>` Around Dynamic URL Access**: With `cacheComponents: true`, any Server Component reading `params` (e.g., `src/app/category/[slug]/page.tsx`, `src/app/item/[id]/page.tsx`) or Client Component using `useSearchParams()` (`src/app/create/item/page.tsx`) must be wrapped in `<Suspense>`.
3. **Images**: `next.config.ts` configures `images: { unoptimized: true, dangerouslyAllowSVG: true }` with `remotePatterns` for `**.supabase.co`, allowing `next/image` `<Image>` to render both Supabase Storage URLs and inline SVG/base64 previews cleanly.

## Styling & Typography

- **Tailwind CSS v4** is configured via `@import "tailwindcss";` in `src/app/globals.css` and `@tailwindcss/turbopack` in `next.config.ts`.
- **Facebook Font Stack**: `src/app/layout.tsx` loads `Roboto` (`--font-roboto`), and `src/app/globals.css` sets `--font-sans` and `--font-heading` to `-apple-system, BlinkMacSystemFont, "Segoe UI", var(--font-roboto), Helvetica, Arial, sans-serif`.

## Adding a New Category

1. Add an entry `{ name, slug, iconName }` to `MARKETPLACE_CATEGORIES` in `src/lib/categories.ts`.
2. Ensure the `iconName` exists in `ICON_MAP` in `src/components/marketplace/CategoryIcon.tsx`.
3. `generateStaticParams()` in `src/app/category/[slug]/page.tsx` will automatically include the new category slug on build.

## Verification Checklist

Before committing changes:

```bash
npm run lint
npm run build
```
