# Maskan — Real Estate Management Platform

A Next.js (App Router) + MongoDB real estate marketplace for listing and managing
**Builds/Properties**, **Apartments**, and **Land**. No authentication — anyone
can browse and manage listings.

Core business rule, enforced in the UI, the API, and the database layer:

- Builds and Apartments → **sale or rent**
- Land → **sale only**, never rent, never a rental period

Every listing also tracks an **availability status** — `available`, `sold`,
or `rented` — settable from the edit page. `sold` only applies to sale
listings and `rented` only to rentals; this is enforced the same way as the
land rule (form UI, Zod schema, and a Mongoose hook), so an available sale
listing can be marked sold, but never "rented", and vice versa.

The interface is **bilingual (English / Arabic)** with full right-to-left
layout support. A language toggle sits in the header; the choice is
remembered in the browser (`localStorage`) and flips `<html dir>` between
`ltr` and `rtl`.

**Owner contact info and location are optional.** A listing can be created
with just a title, category, price, and description — owner/location only
become required internally once you start filling them in (e.g. if you type
an owner name, a phone number is still required; you just aren't forced to
provide owner or location info at all). Pages that display owner/location
show a graceful fallback ("Owner not provided", "Location not specified")
when they're missing.

**Property details** — rooms, bathrooms, whether there's a kitchen, and
whether kitchen cabinets are installed — can be added to any build or
apartment listing (not land). **Build listings can additionally list out
individual apartment units inside the building**: add as many units as you
like, each with its own rooms/bathrooms/kitchen/cabinets and an electricity
(meter/subscription) number. Units only apply to the "build" category and
are cleared automatically if the category is changed away from "build".

**TikTok video link.** Add a listing's TikTok video URL and click "Fetch
cover" to pull the video's official cover thumbnail (via TikTok's public
oEmbed endpoint — no scraping) and use it as the listing's cover photo.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- MongoDB via Mongoose
- Zod for server-side request validation
- Tailwind CSS

## Architecture overview

```
app/
  page.tsx                     Public browse page (search/filter/sort)
  properties/[id]/page.tsx     Property details page
  dashboard/page.tsx           Admin-style dashboard (stats + table)
  dashboard/new/page.tsx       Create listing
  dashboard/[id]/edit/page.tsx Edit listing
  api/properties/route.ts      GET (list, filter, search, sort, stats) / POST (create)
  api/properties/[id]/route.ts GET / PUT / DELETE by id

components/
  properties/   PropertyCard, CategoryBadge, ListingTypeBadge, FilterBar
  dashboard/    DashboardStats, ListingsTable
  forms/        ListingForm (shared create/edit form)
  ui/           SiteHeader, LoadingState, EmptyState, ErrorState, ConfirmDialog

lib/
  mongodb/connect.ts   Cached Mongoose connection (safe for dev hot-reload)
  mongodb/serialize.ts Mongoose doc -> plain JSON DTO
  validations/property.ts  Zod schema, enforces land = sale-only
  api-client.ts        Typed fetch wrapper used by client components
  format.ts            Price/date/location formatting helpers, locale-aware
  i18n/translations.ts English + Arabic dictionaries
  i18n/LanguageProvider.tsx  React context: current locale, dir, t() helper

models/Property.ts  Mongoose schema + pre-save/pre-update hooks that force
                     land listings to sale-only, apartment units to
                     build-only, and status to match listing type — all at
                     the database layer, so the rules can't be bypassed even
                     by a direct API call.

types/property.ts   Shared TypeScript types/DTOs
scripts/seed.ts      Optional sample-data seeder

app/api/tiktok/oembed/route.ts  Proxies TikTok's public oEmbed endpoint to
                                 fetch a video's official cover thumbnail
```

**Design decisions:**

- The land/sale-only rule is enforced in three independent layers (form UI,
  Zod schema on the API, and a Mongoose pre-hook on both `save` and
  `findOneAndUpdate`), so it can't be bypassed by a raw API request.
- No auth: owner info is just a plain sub-document on each listing, as
  requested. This keeps the schema simple to extend later with real user
  accounts if needed.
- The dashboard and public browse page share the same `FilterBar`,
  `PropertyCard`/`ListingsTable`, and `/api/properties` endpoint, so
  filtering/search/sort logic isn't duplicated.
- Mongoose connections are cached on `global` to avoid exhausting MongoDB
  connections during Next.js dev hot-reloads and serverless cold starts.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your database

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and replace `<db_password>` with your actual MongoDB Atlas
database user password:

```
MONGODB_URI=mongodb+srv://41forrealestat_db_user:<db_password>@cluster0.uoihwgh.mongodb.net/realestate?appName=Cluster0
```

A few notes on this connection string:

- `41forrealestat_db_user` is the database username — make sure this user
  exists under Atlas → Database Access, with a password you know.
- `<db_password>` must be URL-encoded if it contains special characters
  (e.g. `@` becomes `%40`).
- `/realestate` right after the host sets the database name Mongo will use;
  change it if you'd prefer a different name.
- In Atlas → Network Access, make sure your current IP (or `0.0.0.0/0` for
  quick local testing) is allowed to connect.

### 3. (Optional) Seed sample data

```bash
npm run seed
```

This clears the `properties` collection and inserts a handful of sample
builds, apartments, and land listings so you have something to browse
immediately.

### 4. Run the app

```bash
npm run dev
```

Visit:

- `http://localhost:3000` — public browse page
- `http://localhost:3000/dashboard` — admin dashboard

### 5. Build for production

```bash
npm run build
npm run start
```

## API reference

| Method | Route                    | Description                                  |
|--------|---------------------------|----------------------------------------------|
| GET    | `/api/properties`         | List, with `?search=&category=&listingType=&sortBy=&sortDir=&page=&limit=`, plus summary `stats` |
| POST   | `/api/properties`         | Create a listing (validated with Zod)        |
| GET    | `/api/properties/:id`     | Get one listing                              |
| PUT    | `/api/properties/:id`     | Update a listing (validated with Zod)        |
| DELETE | `/api/properties/:id`     | Delete a listing                             |

All write endpoints return `400` with a `fieldErrors` map on validation
failure (including if a request tries to set `category: "land"` with
`listingType: "rent"`), and `404` if the id doesn't exist.

## Notes

- **Language:** all UI copy lives in `lib/i18n/translations.ts` as flat
  dictionaries keyed by dot-path (e.g. `form.titleLabel`). To add more text,
  add the key to both the `en` and `ar` objects and call
  `t("your.new.key")` from any client component via `useLanguage()`. To add
  a third language, add another top-level key (e.g. `fr`) to `translations`
  and extend the `Locale` type — the toggle button in `SiteHeader` currently
  assumes two languages, so you'd want to swap it for a small `<select>`.
- Images are stored as plain URLs (add them in the listing form) rather than
  file uploads, to keep the stack simple — swap in an upload provider (S3,
  Cloudinary, etc.) later without touching the schema shape.
- There's no authentication by design, per the project brief. If you add
  accounts later, `owner` on each listing is a natural place to link a
  `userId`.
