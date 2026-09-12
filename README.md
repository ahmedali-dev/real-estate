# Maskan — Real Estate Management Platform

A Next.js (App Router) + MongoDB real estate marketplace for listing and managing
**Builds/Properties**, **Apartments**, and **Land**. Browsing listings is
public and requires no account; managing them (the Dashboard) requires
staff sign-in.

> Setting this up locally? See **Getting started** below. Deploying it
> somewhere real? See **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Authentication & roles

The Dashboard (`/dashboard/**`) is protected by NextAuth (credentials
provider, JWT sessions) via `middleware.ts` — visiting any dashboard route
while signed out redirects to `/login`. There's no public sign-up form by
design; accounts are created either by an admin from **Dashboard → Users**,
or by bootstrapping the first one from the command line (see Setup below).

Four roles:

- **Real Estate Officer** — can create and edit listings (apartments, builds,
  and land). No access to Orders.
- **Sales Officer** — can view Orders, log new ones, and update their status.
  No access to property listings at all.
- **Project Manager** — same as Real Estate Officer, but scoped to **build**
  listings only (a "build" is the multi-unit "project" type in this app —
  see Apartment units below). Can't create or edit apartment or land
  listings; the category field is locked to "Build" in their listing form.
- **Admin** — everything every other role can do, plus **delete**
  listings/orders and manage staff accounts (create, change role,
  activate/deactivate, delete).

These rules are enforced server-side in the API routes
(`requireListingsAccess`, `requireOrdersAccess`, and `requireAdmin` for
deletes and user management — all in `lib/auth/requireSession.ts`) — the UI
hiding pages/buttons a given role can't use (`lib/auth/useRequireRole.ts`)
is a convenience for navigation, not the actual security boundary. A
safeguard also prevents removing/demoting the last remaining active admin
account, so you can't accidentally lock yourself out.

Public visitors can still browse every listing page with no login; only the
Edit/Delete actions on a listing's detail page are hidden unless you're
signed in (and Delete specifically only for admins). The Orders section is
restricted to Sales Officers and Admins end-to-end, including the list/read
endpoints, since it holds customer contact info.

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

**A dedicated form per category, not one shared form.** Creating a listing
starts at `/dashboard/new`, a picker with three cards — Apartment, Build,
Land — each leading to its own route and its own form component
(`ApartmentForm.tsx`, `BuildForm.tsx`, `LandForm.tsx`) that only shows the
fields relevant to that category: Land's form has no rooms/bathrooms/tenant
section at all and no rent option; Build's form replaces the top-level
rooms/bathrooms fields with the per-apartment units editor instead (since a
building's units are what actually have that information, not the building
itself); Apartment's form has both property details and tenant fields
directly. The three forms share one state/submit hook
(`lib/forms/useListingFormState.ts`) and a set of reusable field groups in
`components/forms/fields/` (owner, location, tenant, property details,
images/TikTok), so the category-specific logic (what fields to render, in
what order) lives in the three thin form components while the actual state
management, validation-error display, and submit logic isn't duplicated
three times. Editing a listing (`/dashboard/:id/edit`) is still one route —
it just renders whichever of the three form components matches the
listing's existing category.

**Property details** — rooms, bathrooms, whether there's a kitchen, whether
kitchen cabinets are installed, and who the listing is suitable for (see
below) — can be added to any apartment listing (not land, and not at the
top level of a build — see units, below).

**Suitability / residency type.** Apartments (and each individual apartment
inside a build) can optionally be tagged **Family**, **Singles / Bachelors**,
or **Women only** — a common classification in this market. It's stored as
`details.residencyType` on a standalone apartment, or per-unit on a build's
`units[].residencyType`, and left unset (`"No restriction"` in the UI) by
default. It's also a first-class filter on every browse page (hidden on the
Lands page, since it doesn't apply there) — filtering matches a listing
whose own `details.residencyType` fits, or a build with at least one
matching unit. A small badge (`components/properties/ResidencyBadge.tsx`)
surfaces it on listing cards and the details page whenever it's set — for a
build, every distinct type found across its units is shown.

**Build listings get a dedicated apartments form**: a "number of
apartments" field that grows or shrinks the list, plus a card per apartment
with its own name, number, rooms, bathrooms, kitchen, cabinets-installed,
residency type, and electricity (meter/subscription) number. This lives in
its own component (`components/forms/BuildUnitsForm.tsx`), used by
`BuildForm.tsx`. Units only apply to the "build" category and are cleared
automatically if the category is changed away from "build" via a direct
API call.

**WattVision design system + electrical monitoring (manual readings).** A
second, deliberately separate visual identity — dark background, cyan/neon
accents, monospaced KPI numbers — used for a real electrical-monitoring
feature: manual meter readings logged per build unit, tied to the
electricity number already stored on that unit. It's fully namespaced so it
can never leak into Maskan's own light/warm theme:
- Colors live under the `wv` key in `tailwind.config.ts` (`bg-wv-surface`,
  `text-wv-cyan`, `border-wv-border`, etc.) — a completely separate palette
  from `ink`/`stone`/`brass`/`moss`/`rust`.
- The KPI/number font is JetBrains Mono, registered as its own
  `--font-jetbrains-mono` variable and Tailwind's `font-wv-mono`, never the
  app's default `font-display`/`font-body`.
- Component classes (`.wv-card`, `.wv-kpi-value`, `.wv-alert`,
  `.wv-table-row`, `.wv-live-dot`) live in `app/globals.css` alongside the
  existing ones, but only apply inside a `<div className="wv-theme">`
  wrapper — nothing here is global.
- **`/dashboard/electrical`** (Admin / Real Estate Officer / Project
  Manager) lets you pick a "meter" — any build unit that has an electricity
  number set — log a reading (watts + kWh since the last reading), and see
  today's/this month's kWh and Bs cost, a consumption chart, a recent
  readings table, and two basic alert heuristics (a consumption spike vs.
  the recent average, and sustained late-night "vampire" draw). There is
  **no smart-meter integration** — every reading is entered by hand — and
  the kWh→Bs conversion (`lib/electrical/tariff.ts`) uses a flat placeholder
  rate, not a verified real utility tariff (Bolivia's actual residential
  rate is tiered). The alert thresholds are simple starting heuristics, not
  calibrated against real consumption data.

**Tenant records for rentals.** Whenever a listing type is "rent", a Tenant
information section (name, ID number, mobile phone) appears — for a
standalone apartment or build, at the top of the listing; for a build split
into individual apartments, per apartment instead, since each unit inside a
building can have its own tenant. Like the other business rules, this is
enforced end-to-end: if a listing (or a unit) is ever switched back to
"sale," any tenant data attached to it is cleared automatically rather than
left stale, both when saving the document directly and on any
`findOneAndUpdate`-based write. Tenant ID numbers and phone numbers are
personal data — treat exports/backups of this database accordingly.

**Public / private listings.** Every listing form has a Visibility field —
**Public** (the default, shown to anyone browsing the site) or **Private**
(only visible to signed-in staff). This is enforced server-side, not just
hidden in the UI: the public listings API forces `visibility: public` for
any request without a session — a signed-out visitor can't request private
listings even by editing the query string — and fetching a private
listing's detail page directly returns the same "not found" response a
signed-out visitor would get for a wrong ID, so a private listing's very
existence isn't detectable from outside. Staff can flip a listing's
visibility from the dashboard table (a quick dropdown, same pattern as the
order-status dropdown) or from its edit form. A small "Private" badge shows
on the listing's detail page, but only to signed-in staff — a private
listing is otherwise indistinguishable from one that doesn't exist, for
anyone who isn't signed in.

**Owner (and tenant) contact info is staff-only.** A signed-out visitor
never sees a listing's real owner name/phone/email, or a rented unit's
tenant name/ID number/phone — those fields are real personal data and now
only render when `useSession()` resolves to a signed-in user. In their
place, a signed-out visitor sees a "Contact our office" card instead, with
the numbers in `lib/config/office.ts` and one-tap WhatsApp / Call buttons
for each. Update that file directly to change the office numbers — there's
no settings UI for it, since it's a small, rarely-changed list. Property
cards also stop showing an owner's name in the browse grid once signed out,
for the same reason.

The same staff-only treatment applies to **"Suitable for" (residency
type)** and a build unit's **electricity number** — both are hidden from
signed-out visitors everywhere they'd otherwise appear (badges, the detail
page, per-unit rows, and the "Suitable for" browse filter itself), and the
API won't apply a `residencyType` filter for a signed-out request either.
Staff still see and manage all of this as normal once signed in.

**WhatsApp link previews.** Sharing a listing's URL — including the
one-tap WhatsApp button on the office contact card — now shows a rich
preview (cover photo, title, description) directly in the chat, without
the recipient opening the link. That requires real Open Graph metadata
generated server-side per listing, which is why
`app/properties/[id]/page.tsx` is a thin server component exporting
`generateMetadata()`, wrapping `PropertyDetailsClient.tsx` (which still
holds all the actual interactive page logic, unchanged). The metadata
generator respects the same privacy rule as everything else here: a
private listing with no signed-in session gets generic fallback metadata,
so its title/photo never leak through a shared link preview either.

**Image uploads (Cloudinary).** The listing form's Images section has an
"Upload from device" button alongside the existing "paste a URL" option —
it uploads directly to Cloudinary (`app/api/uploads/route.ts`) and adds the
returned hosted URL to the listing, the same way a pasted URL or a fetched
TikTok cover would. Restricted to the same roles that can manage listings,
capped at 8MB, and limited to JPG/PNG/WEBP/GIF. If `CLOUDINARY_URL` isn't
configured, the button shows a clear setup error instead of failing
silently — pasting an external URL still works regardless, since that path
never touches Cloudinary.

**TikTok video link.** Add a listing's TikTok video URL and click "Fetch
cover" to pull the video's official cover thumbnail via TikTok's public
oEmbed endpoint (no scraping). TikTok's own thumbnail link is a signed,
time-limited CDN URL that goes dead after a few days if stored as-is, so
the server hands that URL to Cloudinary (`app/api/tiktok/oembed/route.ts`),
which fetches and re-hosts the image on its own permanent URL — that's what
actually gets saved to the listing, so it never expires. (An earlier version
of this fix embedded the image directly as a base64 `data:` URI instead of
using Cloudinary; that worked but bloated the MongoDB document per cover
photo — Cloudinary is the better fix now that uploads are wired up.) Only
callable by the same roles that can manage listings, since it triggers a
real Cloudinary upload. If a listing saved before either fix shows a broken
cover image, just open it for editing and click "Fetch cover" again to
replace the dead link.

**Orders (front-desk requests).** When a customer visits the office looking
for a property, log the request under Dashboard → Orders: customer name,
phone number, what they want (apartment / build / land, with an optional
sale-or-rent preference), and free-form notes. This is a separate resource
from listings — a lightweight request log, not tied to any specific
property — with its own status you can update inline from the table
(Pending → Contacted → Fulfilled, or Cancelled) as staff follow up.

**Sidebar navigation.** Browsing is split into dedicated pages — All
listings, Apartments, Builds/Properties, and Lands — plus a Dashboard link,
in a persistent sidebar (a slide-over drawer on mobile, toggled from the
header). The category pages reuse the same filter/search/sort UI as the
main browse page, just with the category locked instead of duplicating the
page three times.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- MongoDB via Mongoose
- Zod for server-side request validation
- Tailwind CSS

## Architecture overview

```
app/
  page.tsx                     Public browse page — all listings (search/filter/sort)
  apartments/page.tsx          Apartments only (category locked)
  builds/page.tsx              Builds/Properties only (category locked)
  lands/page.tsx                Lands only (category locked)
  properties/[id]/page.tsx     Server component — generates per-listing Open
                                Graph metadata, renders PropertyDetailsClient
  properties/[id]/PropertyDetailsClient.tsx  All the actual interactive
                                page logic (badges, gallery, contact card)
  login/page.tsx               Staff sign-in page
  dashboard/page.tsx           Admin-style dashboard (stats + table)
  dashboard/new/page.tsx       Category picker (Apartment / Build / Land cards)
  dashboard/new/apartment/page.tsx  Create an apartment listing
  dashboard/new/build/page.tsx      Create a build listing
  dashboard/new/land/page.tsx       Create a land listing
  dashboard/[id]/edit/page.tsx Edit listing — renders the matching one of the
                               three form components based on its category
  dashboard/orders/page.tsx    Orders list (front-desk customer requests)
  dashboard/orders/new/page.tsx        Log a new order
  dashboard/orders/[id]/edit/page.tsx  Edit an order / change its status
  dashboard/users/page.tsx     Staff account management — admin only
  api/properties/route.ts      GET (list, filter, search, sort, stats) / POST (create)
  api/properties/[id]/route.ts GET / PUT / DELETE by id
  api/orders/route.ts          GET (list, filter, search, stats) / POST (create)
  api/orders/[id]/route.ts     GET / PUT / DELETE by id
  api/users/route.ts           GET (list) / POST (create) — admin only
  api/users/[id]/route.ts      PUT / DELETE — admin only
  api/auth/[...nextauth]/route.ts  NextAuth handler

middleware.ts  Redirects signed-out visitors away from /dashboard/** to /login

components/
  properties/   PropertyCard, CategoryBadge, ListingTypeBadge, FilterBar,
                ListingsBrowser (shared browse/filter/grid used by all 4 browse pages)
  dashboard/    DashboardStats, ListingsTable
  orders/       OrderForm, OrdersTable (inline status dropdown), OrdersStats
  forms/        ApartmentForm, BuildForm, LandForm — three dedicated,
                category-specific listing forms (see below), plus
                BuildUnitsForm (the apartments-within-a-build editor, used
                only by BuildForm)
  forms/fields/ OwnerFields, LocationFields, TenantFields,
                PropertyDetailsFields, ImagesAndVideoFields — shared field
                groups reused across all three listing forms
  ui/           AppShell (sidebar + mobile drawer + header layout), Sidebar,
                SiteHeader, LoadingState, EmptyState, ErrorState, ConfirmDialog
  auth/         AuthSessionProvider (wraps the app in NextAuth's SessionProvider)

lib/
  forms/useListingFormState.ts  Shared state/validation-error/submit hook
                                 behind all three category-specific forms
  mongodb/connect.ts   Cached Mongoose connection (safe for dev hot-reload)
  mongodb/serialize.ts Mongoose doc -> plain JSON DTO (properties)
  mongodb/serializeOrder.ts  Mongoose doc -> plain JSON DTO (orders)
  mongodb/serializeUser.ts   Mongoose doc -> plain JSON DTO (users; never includes passwordHash)
  validations/property.ts  Zod schema, enforces land = sale-only
  validations/order.ts     Zod schema for order requests
  validations/user.ts      Zod schema for creating/updating staff accounts
  auth/authOptions.ts  NextAuth config: credentials provider, JWT session, role on the token
  auth/requireSession.ts  requireSession() / requireAdmin() guards used by API routes
  api-client.ts        Typed fetch wrapper used by client components
  format.ts            Price/date/location formatting helpers, locale-aware
  i18n/translations.ts English + Arabic dictionaries
  i18n/LanguageProvider.tsx  React context: current locale, dir, t() helper

models/Property.ts  Mongoose schema + pre-save/pre-update hooks that force
                     land listings to sale-only, apartment units to
                     build-only, and status to match listing type — all at
                     the database layer, so the rules can't be bypassed even
                     by a direct API call.
models/Order.ts      Mongoose schema for front-desk customer requests
models/User.ts       Mongoose schema for staff/admin accounts (bcrypt password hash)

types/property.ts   Shared TypeScript types/DTOs (listings)
types/order.ts       Shared TypeScript types/DTOs (orders)
types/user.ts        Shared TypeScript types/DTOs (users)
types/electrical.ts  Shared TypeScript types/DTOs (electrical readings, meters)
types/next-auth.d.ts Module augmentation so session.user.id/role are typed
scripts/seed.ts        Optional sample-data seeder
scripts/create-admin.ts  Bootstraps (or resets) the first admin account

models/ElectricalReading.ts  Mongoose schema for manually-logged meter readings
lib/electrical/tariff.ts     Placeholder kWh→Bs conversion rate — swap in a real tariff
lib/config/office.ts         Office phone numbers shown to signed-out visitors,
                              plus WhatsApp/tel: link helpers
lib/validations/electrical.ts  Zod schema for logging a reading

app/api/tiktok/oembed/route.ts  Fetches a TikTok video's official cover
                                 thumbnail and re-hosts it on Cloudinary
app/api/uploads/route.ts        Uploads an image file to Cloudinary
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

### 3. Configure authentication

Still in `.env.local`, set:

```
NEXTAUTH_SECRET=<a long random string>
NEXTAUTH_URL=http://localhost:3000
```

Generate a secret with `openssl rand -base64 32` (or any random 32+ character
string). Update `NEXTAUTH_URL` to your real domain when you deploy.

### 4. Create your first admin account

There's no public sign-up form, so bootstrap one from the command line:

```bash
npm run create-admin -- --name "Jane Doe" --email jane@example.com --password "at-least-8-characters"
```

Running this again with the same email updates that person's name/password
and ensures they're an active admin — handy if you ever get locked out.
Once you have one admin, you can create Real Estate Officer, Sales Officer,
or Project Manager accounts from **Dashboard → Users** instead.

> **Upgrading from an earlier version of this project:** the role system
> used to have a single generic "staff" role. That value has been replaced
> by the three specific roles above — any account still stored with the old
> role won't match a recognized permission and will effectively have no
> dashboard access until an admin reassigns it a new role from
> **Dashboard → Users**.

### 5. Configure image uploads (Cloudinary)

Add to `.env.local`:

```
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

Get this from your [Cloudinary dashboard](https://cloudinary.com/console) →
API Keys → "API Environment variable" (it gives you the whole string
pre-formatted). This is a secret — never commit it, and treat it like a
password. Without it, the "Upload from device" button on the listing form
will show a clear error instead of silently failing; pasting an external
image URL still works either way, since that doesn't touch Cloudinary at
all.

### 6. (Optional) Seed sample data

```bash
npm run seed
```

Inserts a handful of sample builds, apartments, and land listings so you
have something to browse immediately — **but only if the `properties`
collection is currently empty.** If it already has listings in it (real
data, or anything you don't want touched), the command refuses to run and
exits with an explanation instead of silently deleting anything.

```bash
npm run seed -- --force   # ⚠️ DESTRUCTIVE: deletes every existing listing, then seeds
npm run seed -- --keep    # Adds the sample listings alongside what's already there
```

**Only ever use `--force` against a database you're fine emptying out.**
There's no undo — MongoDB Atlas's free (M0) tier has no backups or
point-in-time recovery, so a deleted listing on that tier is gone for good.

### 7. Run the app

```bash
npm run dev
```

Visit:

- `http://localhost:3000` — public browse page (no login needed)
- `http://localhost:3000/login` — staff sign-in
- `http://localhost:3000/dashboard` — admin dashboard (redirects to `/login` if signed out)

### 8. Build for production

```bash
npm run build
npm run start
```

This runs a production build locally. To actually deploy it somewhere
(Vercel, a VPS, etc.) — provisioning production MongoDB/Cloudinary
credentials, environment variables, bootstrapping the first admin account
against a real database, custom domains, and a post-deploy checklist —
see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## API reference

| Method | Route                    | Description                                  |
|--------|---------------------------|----------------------------------------------|
| GET    | `/api/properties`         | List, with `?search=&category=&listingType=&residencyType=&sortBy=&sortDir=&page=&limit=`, plus summary `stats`. Signed-out requests are always forced to `visibility=public`; signed-in staff can additionally pass `?visibility=public\|private` |
| POST   | `/api/properties`         | Create a listing (validated with Zod)        |
| GET    | `/api/properties/:id`     | Get one listing                              |
| PUT    | `/api/properties/:id`     | Update a listing (validated with Zod)        |
| DELETE | `/api/properties/:id`     | Delete a listing                             |
| GET    | `/api/orders`              | List orders, with `?search=&status=&category=&page=&limit=`, plus summary `stats` |
| POST   | `/api/orders`              | Log a new order (validated with Zod)         |
| GET    | `/api/orders/:id`          | Get one order                                |
| PUT    | `/api/orders/:id`          | Update an order (e.g. change its status)     |
| DELETE | `/api/orders/:id`          | Delete an order                              |
| POST   | `/api/auth/[...nextauth]`  | NextAuth sign-in/sign-out/session endpoints (handled by the library) |
| POST   | `/api/uploads`             | Upload an image to Cloudinary, returns its hosted URL — Listings roles only |
| GET    | `/api/tiktok/oembed`       | Fetch a TikTok video's cover and re-host it on Cloudinary — Listings roles only |
| GET    | `/api/electrical-readings/meters` | List build units with an electricity number set — Listings roles only |
| GET    | `/api/electrical-readings` | Readings + stats + alerts for `?electricityNumber=` — Listings roles only |
| POST   | `/api/electrical-readings` | Log a manual reading (watts + kWh) — Listings roles only |
| GET    | `/api/users`                | List staff/admin accounts — **admin only**   |
| POST   | `/api/users`                | Create a staff/admin account — **admin only** |
| PUT    | `/api/users/:id`            | Update name/role/active/password — **admin only** |
| DELETE | `/api/users/:id`            | Delete a user — **admin only**, blocked for your own account and for the last remaining admin |

All property/order write endpoints require a signed-in session (`401` if
not); deletes additionally require the admin role (`403` otherwise).

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
