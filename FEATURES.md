# Features Documentation

## 1. Marketplace Browse & Search (`/`, `/category/[slug]`, `/category/electronics`)

- **Facebook Marketplace UI**: Sticky top header (`MarketplaceHeader`), persistent left category sidebar (`MarketplaceSidebar`), and horizontal mobile category strip (`MobileCategoryStrip`).
- **19 Categories**: Vehicles, Property Rentals, Apparel, Classifieds, Electronics, Entertainment, Family, Free Stuff, Garden & Outdoor, Hobbies, Home Goods, Home Improvement, Home Sales, Musical Instruments, Office Supplies, Pet Supplies, Sporting Goods, Toys & Games, and Buy and sell groups.
- **Responsive Grid & List Views**: `ItemGrid` switches between a 1–5 column responsive grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`) and a detailed list view.
- **Live API Search & Filtering**: Debounced search (`q`) and category filtering (`category`) query `GET /api/listings` with `AbortController` cancellation.

## 2. Create Listing Flow (`/create`, `/create/item`)

- **Listing Type Selection (`/create`)**: Choose between *Item for sale*, *Vehicle for sale*, or *Home for sale or rent* (pre-selects the corresponding category).
- **Drag & Drop Photo Upload**: Supports drag-and-drop and click-to-upload (`JPEG`, `PNG`, `WebP`, `GIF` up to `10 MB`) with instant preview and removal.
- **Validation & Formatting**: Blur and submit validation for title, price, and seller email, `$` prefix with live formatted price preview (`Free` for `0`), and character counter on description.
- **Real-Time Preview**: Synchronized side-by-side preview card reflecting every form change before publishing.

## 3. Item Detail & Messaging (`/item/[id]`)

- **Hero Image & Lightbox**: Large product showcase that opens an accessible `role="dialog"` lightbox (closeable via `Escape` or button).
- **Complete Details & Seller Info**: Price, location, listed date, condition, category link, description, seller avatar/initials, copy-email button, and `mailto:` link.
- **Message Seller**: Interactive composer with quick-reply chips (`"Hi, is this still available?"`, `"Is the price negotiable?"`, `"Where can we meet for pickup?"`), email validation, `POST /api/messages` persistence, and session sent-message list.
- **Related Items**: Displays up to 5 related listings from the same category.

## 4. RESTful API Endpoints

| Endpoint | Method | Purpose | Status Codes |
| --- | --- | --- | --- |
| `/api/listings` | `GET` | Browse/search listings (`category`, `q`, `limit`, `offset`) | `200`, `500` |
| `/api/listings` | `POST` | Validate and create a new listing | `201`, `400`, `500` |
| `/api/listings/[id]` | `GET` | Fetch a single listing by ID | `200`, `400`, `404`, `500` |
| `/api/messages` | `GET` | Fetch messages for a `listingId` | `200`, `400`, `500` |
| `/api/messages` | `POST` | Validate and save a buyer message | `201`, `400`, `404`, `500` |
| `/api/upload` | `POST` | Upload an image to `listing-images` bucket | `201`, `400`, `500` |

## 5. Resilience & State Management

- **Loading States**: Route-level `src/app/loading.tsx`, 10-card skeleton grid in `ItemGrid`, 12-column detail skeleton in `ItemDetailClient`, and button spinners during uploads/submissions.
- **Error Handling**: Component-level `ErrorBoundary`, route-level `src/app/error.tsx`, custom `src/app/not-found.tsx`, and inline retry UI for failed API requests.
