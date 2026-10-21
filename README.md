<div align="center">
  <img src="docs/assets/logo.png" alt="41 Real Estate logo" width="120" />

  <h1>41 Real Estate</h1>
  <p><strong>Find a place. Manage every detail.</strong></p>
  <p>A bilingual property marketplace and office management platform.</p>

  <p>
    <a href="https://www.41real-estate.site">Live Website</a> ·
    <a href="#local-setup">Getting Started</a> ·
    <a href="#api-endpoints">API Reference</a> ·
    <a href="DEPLOYMENT.md">Deployment</a>
  </p>

  <p>
    <img alt="Next.js 14" src="https://img.shields.io/badge/Next.js-14-3f5147?style=flat-square&amp;logo=nextdotjs&amp;logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-526d59?style=flat-square&amp;logo=typescript&amp;logoColor=white" />
    <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-647c69?style=flat-square&amp;logo=mongodb&amp;logoColor=white" />
    <img alt="Arabic and English" src="https://img.shields.io/badge/Language-AR%20%7C%20EN-7b8975?style=flat-square" />
  </p>
</div>

![Project and API guide banner](docs/assets/project-banner.svg)

# Project & API Guide


A bilingual Arabic–English real estate platform for browsing properties and managing office operations. Built with Next.js App Router, React, TypeScript, MongoDB, and Tailwind CSS.

[Live website](https://www.41real-estate.site) · [Main README](README.md) · [Deployment guide](DEPLOYMENT.md) · [WhatsApp service guide](services/openwa/README.md)

---

## 🧭 Contents

- [Features](#features)
- [Architecture](#architecture)
- [Local setup](#local-setup)
- [Pages](#pages)
- [Authentication and permissions](#authentication-and-permissions)
- [API endpoints](#api-endpoints)
- [Request examples](#request-examples)
- [Validation and errors](#validation-and-errors)
- [Deployment](#deployment)

## Features

> **One workspace for property discovery and office operations.**

- Three listing categories: apartments, buildings (`build`), and land.
- Apartment subtypes: villa, apartment, duplex, floor/story, shop, and other.
- Sale/rent listings, optional prices, availability, and public/private visibility.
- Search, category filters, price ranges, location filters, sorting, and pagination.
- Property galleries, image previews, quick view, and copy actions.
- Google Maps location links and a map of available properties with resolvable coordinates.
- TikTok links and video rendering on the full property page; Quick View uses a link and copy button.
- Building units with room details, rental status, and optional tenant records.
- Offer attribution to a system user.
- Customer request management, staff accounts, and role-based access.
- Cloudinary image uploads and TikTok cover re-hosting.
- Office WhatsApp text sharing, group selection for orders, QR pairing, and incoming TikTok-link lookup.
- Arabic/English interfaces with RTL/LTR support, responsive navigation, and sidebar layouts.
- Server-generated metadata, public-listing sitemap, robots rules, and structured data.
- Manual electrical readings for building-unit meters. Cost calculations use a placeholder tariff, not a verified utility rate.

## Architecture

```text
app/                       Next.js pages and API route handlers
  api/                     HTTP endpoints
  dashboard/               Staff workflows
  properties/[id]/         Property detail page and metadata
components/                Forms, listing cards, maps, dialogs, and UI
lib/
  auth/                    NextAuth configuration and permission guards
  validations/             Zod request schemas
  mongodb/                 Database connection and DTO serialization
  i18n/                    Arabic/English translations and language context
  seo/                     Search metadata helpers
models/                    Mongoose models
services/openwa/           Separate persistent WhatsApp browser service
scripts/                   Admin bootstrap, sample data, and service startup
tests/                     Regression tests
public/                    Static assets and HTML design prototypes
```

The website handles validation, sessions, database operations, and user interfaces. Cloudinary hosts uploaded images. OpenWA runs independently and forwards incoming WhatsApp messages to the website webhook.

## Local setup

Install dependencies:

```bash
npm install
```

Create `.env.local` with your own values:

```dotenv
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER/realestate
NEXTAUTH_SECRET=REPLACE_WITH_A_RANDOM_SECRET
NEXTAUTH_URL=http://localhost:3000
SITE_URL=https://your-public-domain.example
# Optional: image uploads and TikTok covers
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

`SITE_URL` must be a public origin for shared property URLs. Use your deployed domain; localhost links cannot be opened by external recipients. Never commit credentials, `.env.local`, or WhatsApp session files.

Generate an authentication secret:

```bash
openssl rand -base64 32
```

Bootstrap the first admin with your own account details:

```bash
npm run create-admin -- --name "Admin" --email "admin@example.com" --password "REPLACE_WITH_A_STRONG_PASSWORD"
```

Run the website:

```bash
npm run dev
```

For WhatsApp, run these commands in a separate terminal:

```bash
npm run openwa:setup
npm run openwa
```

Setup generates missing `OPENWA_API_URL` and `OPENWA_API_KEY` settings in `.env.local`. Sign in as admin at `/dashboard/whatsapp` and pair the office account. `npm run openwa:start` is an alias; `npm run dev` starts only the website.

Optional WhatsApp settings:

```dotenv
WHATSAPP_WEBHOOK_URL=http://127.0.0.1:3000/api/webhooks/whatsapp
WHATSAPP_REPLY_LOCALE=ar
```

Use `en` for English automatic replies. Saved titles and descriptions are not automatically translated.

Production and code checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

`npm run seed` adds samples only when the properties collection is empty. See the existing README before using any seed override options.

## Pages

Public pages:

- `/` — all property listings.
- `/apartments`, `/builds`, `/lands` — category browsing.
- `/properties/:id` — property details.
- `/login` — staff sign-in.
- `/sitemap.xml` — public property URLs, regenerated hourly.
- `/robots.txt` — crawler rules and sitemap location.

Staff pages:

- `/dashboard` — listing management.
- `/dashboard/new` — category picker.
- `/dashboard/new/apartment`, `/dashboard/new/build`, `/dashboard/new/land` — create listings.
- `/dashboard/:id/edit` — edit a listing.
- `/dashboard/orders`, `/dashboard/orders/new`, `/dashboard/orders/:id/edit` — customer requests.
- `/dashboard/users` — account management.
- `/dashboard/whatsapp` — connection status and QR pairing.
- `/dashboard/electrical` — manual meter readings.

## Authentication and permissions

The application uses NextAuth credentials authentication and JWT sessions. Staff sign in with email or an assigned phone number and password. There is no public registration endpoint.

Endpoint access labels used below:

- **Public:** no session required; signed-out property reads are restricted to public listings.
- **Listings:** `admin`, `real_estate_officer`, or `project_manager`. Project managers are restricted to buildings on property create/update/share operations.
- **Orders:** `admin` or `sales_officer`.
- **Admin:** `admin` only.
- **Webhook key:** `X-API-Key` matching the configured `OPENWA_API_KEY`.

Protected browser requests use the NextAuth session cookie, not a custom bearer token. Authorization is enforced by API handlers. Public API responses and server-rendered property payloads omit owner/tenant information, meter numbers, suitability, and offer attribution. Staff serialization explicitly includes these fields. Session reads revalidate account activation and current roles against MongoDB; sign-in is limited to 10 attempts per normalized identifier per 10-minute window.

## API endpoints

All paths below are relative to the website origin. JSON writes use `Content-Type: application/json` unless noted otherwise. `:id` is a MongoDB document ID.

### Properties

- **`GET /api/properties` — Public.** Returns `{ data, total, stats }`. Supports:
  - `category`: `apartment`, `build`, or `land`.
  - `listingType`: `sale` or `rent`.
  - `status`: `available`, `sold`, or `rented`.
  - `search`: title or address search.
  - `location`: city, district, or address text.
  - `propertyType`: `villa`, `apartment`, `duplex`, `floor`, `shop`, or `other`.
  - `rooms`: minimum top-level room count.
  - `minPrice`, `maxPrice`: numeric price bounds.
  - `residencyType`: `family`, `singles`, or `women_only`; applied only for signed-in requests.
  - `visibility`: `public` or `private`; signed-out requests always use public visibility.
  - `sortBy`: `createdAt` (default), `updatedAt`, `price`, or `title`.
  - `sortDir`: `asc` or `desc` (default).
  - `page`: starts at 1; `limit`: default 24, maximum 100.
  Property-type, room, and residency filters are skipped when category is explicitly `land`. Summary stats are calculated across accessible listings, independently of search filters.
- **`POST /api/properties` — Listings.** Create a validated property.
- **`GET /api/properties/:id` — Public.** Read a property; private listings require a session.
- **`PUT /api/properties/:id` — Listings.** Save a complete validated listing payload; this is not a general partial PATCH endpoint.
- **`DELETE /api/properties/:id` — Admin.** Delete a property.
- **`POST /api/properties/:id/whatsapp` — Listings.** Send a public property as a text message. Body: `{ "phone": "+966500000000", "locale": "en" }`. Requires a same-origin `Origin` header and configured OpenWA/public site URL. Private listings cannot be shared through this endpoint.

Property input supports `title`, `category`, `listingType`, `description`, optional `price`, `rentalPeriod`, `status`, `visibility`, `propertyType`, `broughtByUserId`, `owner`, `location`, `details`, `tenant`, `units`, `images`, and `tiktokUrl`. See [the property schema](lib/validations/property.ts) for nested fields and limits.

### Customer requests / orders

- **`GET /api/orders` — Orders.** List requests with `search`, `status`, `category`, `page`, and `limit` (default 50, maximum 100), plus summary stats.
- **`POST /api/orders` — Orders.** Create a customer request.
- **`GET /api/orders/:id` — Orders.** Read a request.
- **`PUT /api/orders/:id` — Orders.** Update a request, including its status.
- **`DELETE /api/orders/:id` — Admin.** Delete a request.
- **`POST /api/orders/:id/whatsapp` — Orders.** Send the saved request to a selected office WhatsApp group. Body: `{ "groupId": "123456789-123456789@g.us", "locale": "ar" }`. Requires a same-origin `Origin` header; the group must appear in the office account's group list.

Order fields: `customerName`, `customerPhone`, `requestedCategory`, optional `requestedListingType`, optional `notes`, and `status` (`pending`, `contacted`, `fulfilled`, or `cancelled`).

### Staff accounts and authentication

- **`GET /api/users` — Admin.** List staff accounts.
- **`POST /api/users` — Admin.** Create an account.
- **`PUT /api/users/:id` — Admin.** Update account details, role, active status, or password.
- **`DELETE /api/users/:id` — Admin.** Delete an account; safeguards protect self-deletion and the last active admin.
- **`GET /api/users/options` — Listings.** Retrieve active user choices for offer attribution.
- **`GET/POST /api/auth/[...nextauth]` — NextAuth-managed.** Authentication routes, including session and CSRF handling. Use NextAuth client helpers for sign-in/sign-out rather than manually constructing credential requests.

### Images, TikTok, and location

- **`POST /api/uploads` — Listings.** Multipart form with a `file` field. Accepts JPEG, PNG, WEBP, or GIF up to 8 MB. Requires Cloudinary; returns `{ "data": { "url": "https://..." } }` on success.
- **`GET /api/tiktok/oembed?url=...` — Listings.** Fetch TikTok cover metadata and re-host the cover on Cloudinary. Requires Cloudinary.
- **`GET /api/maps/resolve?url=...` — Public.** Resolve a supported Google Maps URL into `{ "embedUrl": "..." }`. Invalid URLs return 400; unresolved locations return 422.

### WhatsApp connection and webhook

- **`GET /api/whatsapp/connection` — Admin.** Returns `{ status, qr }`, where `qr` is a data URL or null. Covers setup, offline, waiting, pairing, connected, and service issue states. A 200 response alone does not mean the account is connected.
- **`GET /api/whatsapp/groups` — Orders.** Returns available groups in `{ data }`; service failures return 502, missing setup returns 503.
- **`POST /api/webhooks/whatsapp` — Webhook key.** Receives `{ messageId, from, text, fromMe }`. Processes incoming private messages containing TikTok links, looks up public properties, and replies with property details. Own messages, group messages, invalid senders, and messages without TikTok links are ignored. Message IDs prevent duplicate sends. Unknown links receive no reply.

WhatsApp sharing uses free-mode text messages with links, without images or paid interactive buttons. An unconfirmed send must be checked in the office account before retrying to avoid duplicate messages.

### Electrical readings

- **`GET /api/electrical-readings/meters` — Listings.** List building units with electricity numbers.
- **`GET /api/electrical-readings?electricityNumber=...` — Listings.** Return readings, stats, and alerts. Optional `limit`: default 50, maximum 200.
- **`POST /api/electrical-readings` — Listings.** Body: `electricityNumber`, non-negative `watts`, non-negative `kwh`, and optional ISO datetime `recordedAt`.

This feature records manual readings; it does not connect to smart meters.

## Request examples

Public property search:

```bash
curl 'http://localhost:3000/api/properties?category=apartment&status=available&minPrice=1000&sortBy=price&sortDir=asc&page=1&limit=12'
```

Example listing body for `POST /api/properties` (requires an authorized session):

```json
{
  "title": "Apartment for rent in Riyadh",
  "category": "apartment",
  "propertyType": "apartment",
  "listingType": "rent",
  "rentalPeriod": "monthly",
  "description": "A spacious apartment with a fitted kitchen and installed air conditioning.",
  "price": 3500,
  "status": "available",
  "visibility": "public",
  "location": { "city": "Riyadh", "district": "Example district" },
  "details": { "rooms": 3, "bathrooms": 2, "hasKitchen": true, "acInstalled": true },
  "images": [],
  "units": []
}
```

Example order body for `POST /api/orders`:

```json
{
  "customerName": "Example Customer",
  "customerPhone": "+966500000000",
  "requestedCategory": "apartment",
  "requestedListingType": "rent",
  "notes": "Looking for a three-room apartment.",
  "status": "pending"
}
```

Example incoming webhook payload (server-to-server, authenticated with `X-API-Key`):

```json
{
  "messageId": "unique-provider-message-id",
  "from": "966500000000@c.us",
  "text": "https://www.tiktok.com/@example/video/1234567890123456789",
  "fromMe": false
}
```

The examples use fictional data. Sending the webhook can produce an actual WhatsApp reply if a matching public listing exists.

## Validation and errors

- Land listings are sale-only and cannot have a rental period.
- Rentals require `monthly` or `yearly`; sale listings cannot have a rental period.
- `sold` applies to sale listings; `rented` applies to rentals.
- Only buildings can contain `units` (maximum 200).
- Price is optional, but must be positive when provided.
- Owner is optional; when included, name and phone are required.
- Common error statuses: 400 invalid input, 401 unauthenticated, 403 forbidden, 404 missing resource, 422 unresolved map, 500 server error, 502 upstream/send failure, and 503 missing integration setup.
- Validation failures commonly return `{ error, fieldErrors }`. Integration handlers may return `{ code }`; response formats are endpoint-specific.

The implementation is the source of truth: [API handlers](app/api), [validation schemas](lib/validations), and [authorization guards](lib/auth/requireSession.ts).

## Deployment

Deploy the Next.js website to Vercel or another compatible Node.js host. Configure MongoDB, authentication, Cloudinary, and the public `SITE_URL` in the deployment environment.

Run OpenWA on a separate persistent browser host. Configure `OPENWA_API_URL` and the matching `OPENWA_API_KEY` on the website, and point `WHATSAPP_WEBHOOK_URL` on the service to the deployed website webhook. Protect remote service endpoints with authenticated HTTPS; pairing data and WhatsApp sessions must remain private.

See [deployment instructions](DEPLOYMENT.md) and [OpenWA service documentation](services/openwa/README.md) for operational details. OpenWA is unofficial WhatsApp automation, and availability depends on the connected account and service.


---

<div align="center">
  <img src="docs/assets/logo.png" alt="41 Real Estate" width="64" />
  <p><strong>41 Real Estate</strong> · Arabic &amp; English</p>
  <a href="#41-real-estate">Back to top ↑</a>
</div>
