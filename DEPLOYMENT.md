# Deploying Maskan to production

This app is built to deploy cleanly to **Vercel** (the natural fit for a
Next.js App Router project — zero server config, and the same serverless
model the app was already written against: `lib/mongodb/connect.ts` caches
its connection specifically to work well in that environment). Everything
below assumes Vercel; if you deploy elsewhere (Railway, Render, a VPS with
Docker, etc.) the environment variables and MongoDB/Cloudinary setup are
identical — only the hosting steps differ.

## Before you start: a codebase audit

Already checked and clear, so there's nothing to fix before deploying:

- No hardcoded `localhost` URLs anywhere in the app — everything derives
  from `NEXTAUTH_URL` or relative paths.
- No `next/image` usage, so there's no external image-domain allowlist to
  configure in `next.config.js`.
- `.gitignore` already excludes `.env*.local` and `.vercel` — your secrets
  won't get committed as long as you keep using `.env.local` locally.
- The four environment variables the app actually reads
  (`MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CLOUDINARY_URL`) are
  exactly the ones documented in `.env.local.example` — nothing hidden.

## 1. Set up production services

Use **separate credentials from your local dev setup** for all three of
these — don't reuse dev secrets/passwords in production.

### MongoDB Atlas

- If you're still on the **M0 (free) tier**, know that it has no backups
  or point-in-time recovery — a mistake (or a bug) that deletes data is
  permanent. Worth upgrading to a paid tier (M10+) before this holds real
  customer/listing data, specifically for that reason.
- Create a **dedicated production database user** (Atlas → Database
  Access) with a strong, unique password — don't reuse your dev user.
- Network Access: serverless functions (Vercel, Lambda, etc.) don't have
  static IPs, so the usual approach is to allow `0.0.0.0/0` in Atlas →
  Network Access. This is safe *only* because the database itself still
  requires the username/password to authenticate — it doesn't mean the
  database is open to the internet, just that the connection attempt is.
  If your Atlas tier supports Vercel's native integration or private
  peering, that's a stronger alternative, but 0.0.0.0/0 + a strong
  password is standard practice for this kind of deployment.
- Take the resulting connection string and keep it handy — that's your
  production `MONGODB_URI`. Make sure it includes a database name (e.g.
  `/realestate` before the `?` in the URL), same as in
  `.env.local.example`.

### Cloudinary

- Use a production Cloudinary account/environment (or the same account is
  fine if you're not expecting heavy traffic — just keep the credential
  separate from anything shared publicly, including this conversation, if
  it's ever been pasted in chat before).
- Copy the `CLOUDINARY_URL` from Cloudinary's dashboard → API Keys → "API
  Environment variable".

### NextAuth secret

Generate a fresh one — never reuse a dev secret in production:

```bash
openssl rand -base64 32
```

## 2. Push the code to a Git repository

Vercel deploys from Git (GitHub, GitLab, or Bitbucket). If this project
isn't already in a repo:

```bash
git init
git add .
git commit -m "Initial commit"
```

Then push it to a new GitHub repository (or wherever you host Git).

## 3. Import the project into Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import your
   repository. Vercel auto-detects Next.js — no build settings to change.
2. Before the first deploy, add these environment variables (Project
   Settings → Environment Variables), scoped to **Production** (and
   **Preview** too, if you want preview deployments to work against a
   real database — consider a separate Atlas database for that so preview
   branches can't touch production data):

   | Variable | Value |
   |----------|-------|
   | `MONGODB_URI` | Your production Atlas connection string |
   | `NEXTAUTH_SECRET` | The secret generated above |
   | `NEXTAUTH_URL` | Your production URL, e.g. `https://maskan.example.com` — must match exactly, including `https://` and no trailing slash |
   | `CLOUDINARY_URL` | Your production Cloudinary environment variable |

3. Deploy. Vercel builds and hosts it — no server to manage.

**About `NEXTAUTH_URL`:** if you don't have a custom domain yet, use the
`*.vercel.app` URL Vercel assigns on first deploy, redeploy once you know
it, then update `NEXTAUTH_URL` again if you add a custom domain later
(Section 5). A mismatch here is the most common cause of confusing
sign-in redirect loops.

## 4. Bootstrap your first admin account

There's no public sign-up form by design (see the README), so the
`create-admin` script needs to run once against your **production**
database. Since Vercel doesn't give you a persistent shell, the simplest
way is to run it from your own machine, pointed at production for just
this one command:

```bash
MONGODB_URI="<your production connection string>" \
  npx tsx scripts/create-admin.ts -- --name "Jane Doe" --email jane@example.com --password "at-least-8-characters"
```

(This bypasses `.env.local` entirely by setting the variable inline for
that single command, so you don't need to temporarily edit any files or
risk leaving production credentials in a local dotfile.) Once you have one
admin, create everyone else's account from **Dashboard → Users** instead.

## 5. Custom domain (optional)

Vercel → Project → Settings → Domains → add your domain, then follow its
DNS instructions (usually a `CNAME` or `A` record at your registrar).
Once it's live, **update `NEXTAUTH_URL`** to the final domain and
redeploy (Vercel → Deployments → ⋯ → Redeploy), since environment
variable changes don't apply to already-built deployments.

## 6. Post-deploy checklist

Run through these once, live:

- [ ] Sign in at `/login` with the admin account you just created
- [ ] Create a test listing in each category (Apartment, Build, Land) and
      confirm it saves
- [ ] Upload an image from device on a listing — confirms `CLOUDINARY_URL`
      is correctly configured
- [ ] Paste a real TikTok video URL and click "Fetch cover" — confirms
      the same, plus that TikTok's oEmbed endpoint is reachable from your
      hosting provider (it should be, but this is the one integration
      that depends on an outside service actually being reachable)
- [ ] Mark a listing **Private** and confirm it disappears from `/`,
      `/apartments`, `/builds`, or `/lands` — then confirm visiting its
      direct `/properties/:id` URL in an incognito window shows "not
      found," not the listing
- [ ] Sign out and confirm a listing's owner contact info is replaced by
      the office contact card, not shown
- [ ] Delete the test listings when you're done (or leave them — they're
      confirmed working either way)

## Ongoing notes

- **Never run `npm run seed -- --force` against production.** It's
  destructive by design (see the README) — it exists for empty dev
  databases only.
- If you ever paste a real secret (database password, Cloudinary key,
  NextAuth secret) into a chat, a support ticket, or anywhere outside
  your own `.env.local`/Vercel dashboard, rotate it afterward. Treat that
  as routine hygiene, not a sign something went wrong.
- Vercel's free tier has function timeout and bandwidth limits that are
  generous for a small office but worth checking against your expected
  traffic before you rely on it for something business-critical.
