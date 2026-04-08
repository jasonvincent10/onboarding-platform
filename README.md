# UK Employee Onboarding Platform

> MVP scaffold — Task 1.1 complete.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL, EU region) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage |
| Email | Resend |
| Hosting | Vercel |
| Payments | Stripe |

---

## First-time setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.local.example .env.local
```
Open `.env.local` and fill in every value. See comments in the file for where to find each one.

### 3. Generate your encryption key
```bash
openssl rand -hex 32
```
Paste the output into `FIELD_ENCRYPTION_KEY` in `.env.local`.

### 4. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com) — choose **Europe (London)** region
2. Copy your project URL and anon key from **Settings → API** into `.env.local`
3. Copy your service role key (keep this secret — server-side only)
4. Run the schema SQL from Task 1.2 in the Supabase SQL editor
5. Generate TypeScript types:
   ```bash
   npx supabase gen types typescript \
     --project-id <your-project-ref> \
     --schema public > types/database.ts
   ```

### 5. Configure Supabase Auth redirect URLs
In Supabase Dashboard → **Authentication → URL Configuration**:
- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://yourdomain.com/auth/callback` (add before deploying)

### 6. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### First deploy
```bash
npm install -g vercel
vercel
```
Follow the prompts. Vercel auto-detects Next.js.

### Environment variables on Vercel
In Vercel Dashboard → your project → **Settings → Environment Variables**, add every variable from `.env.local.example`.

The `vercel.json` already configures:
- Region: `lhr1` (London)
- Daily cron job at 08:00 UTC for reminder emails
- Security headers on all routes

### Stripe webhooks (Task 4.1)
After deploying, add your production URL as a Stripe webhook endpoint:
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

---

## Project structure

```
app/
  auth/
    callback/route.ts     ← Supabase magic link handler
    login/page.tsx        ← Login (Task 1.3)
    signup/page.tsx       ← Sign up (Task 1.3)
    redirect/page.tsx     ← Role-based router
  employer/
    dashboard/page.tsx    ← Employer dashboard (Task 1.3)
    templates/            ← Template builder (Task 1.4)
    onboarding/           ← Invitation flow (Task 1.5)
  employee/
    checklist/page.tsx    ← Employee checklist (Task 1.6)
    profile/              ← Portable profile (Task 3.1)
  api/
    cron/reminders/       ← Daily email cron (Task 2.6)
    webhooks/stripe/      ← Stripe events (Task 4.1)

lib/
  supabase/
    client.ts             ← Browser client (Client Components)
    server.ts             ← Server client (Server Components, Actions)
    middleware.ts         ← Session refresh + auth guards
  utils/
    helpers.ts            ← Shared utilities (date, validation, etc.)
    email.ts              ← Resend email functions
    encryption.ts         ← AES-256 field-level encryption

types/
  database.ts             ← Generated Supabase types (replace after Task 1.2)

middleware.ts             ← Route protection
vercel.json               ← Deploy config + cron + security headers
```

---

## Build roadmap

See `CONTEXT.md` for the full task list. Next task: **1.2 Database schema (Opus)**.
