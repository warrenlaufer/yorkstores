# Yorkstores — Mystery Box Platform

A full-stack Next.js 14 application for mystery box e-commerce. Buyers open boxes, choose delivery or sell back within 5 minutes. Store owners create drops and fulfil orders.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT sessions + Argon2 password hashing
- **Payments**: Stripe (PaymentIntents + Connect for payouts)
- **Email**: Resend
- **File storage**: Cloudflare R2 (S3-compatible)
- **Deployment**: Vercel (recommended)

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database |
| `JWT_SECRET` | Run: `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys |
| `STRIPE_PUBLISHABLE_KEY` | Same as above |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks |
| `RESEND_API_KEY` | resend.com → API Keys |
| `R2_*` | Cloudflare → R2 → Manage API tokens |

### 3. Set up the database

```bash
npm run db:push      # Push schema to database
npm run db:seed      # Create demo data (optional)
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Stripe Setup

### Webhooks (required for wallet top-ups)

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Forward events locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Copy the webhook secret into `STRIPE_WEBHOOK_SECRET`

In production, add `https://yoursite.com/api/webhooks/stripe` as a webhook endpoint in the Stripe Dashboard and listen for:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `account.updated` (for Stripe Connect)

### Stripe Connect (store owner payouts)

Store owners go through `/dashboard/payments/connect` to onboard with Stripe Connect Express, enabling direct payouts to their bank accounts.

---

## Deployment (Vercel)

```bash
npm i -g vercel
vercel
```

Set all environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

Add `NEXT_PUBLIC_APP_URL=https://yoursite.vercel.app`

---

## Project Structure

```
src/
  app/
    api/
      auth/         # signin, signup, signout, me, forgot/reset password
      drops/        # list drops, create drop, purchase box
      orders/       # create order (delivery), sellback, fulfilment
      users/        # wallet topup, file upload URL
      webhooks/     # Stripe webhook handler
      admin/        # platform stats, user management
    dashboard/
      page.tsx         # Drops storefront
      history/         # Purchase history
      store/           # Store owner dashboard
      fulfilment/      # Order fulfilment
      drop/[id]/       # Pick-your-box detail page
      reveal/          # Box opening + sell-back/delivery choice
      wallet/          # Wallet top-up
      admin/           # Admin dashboard
    signin/           # Sign in page
    signup/           # Sign up page
    forgot-password/  # Password reset request
    reset-password/   # Password reset form
  components/
    DashboardNav      # Sticky navigation
    DropsClient       # Storefront with box choice modal
    DropDetailClient  # Box grid for "pick my box"
    FulfilmentClient  # Store owner fulfilment management
    StoreOwnerClient  # Drop creation dashboard
  lib/
    auth.ts           # JWT sessions, password hashing
    email.ts          # Resend email templates
    prisma.ts         # Prisma client singleton
    schemas.ts        # Zod validation schemas
    storage.ts        # Cloudflare R2 file uploads
    stripe.ts         # Stripe utilities
    api.ts            # Route helpers, rate limiting
  middleware.ts       # Route protection
prisma/
  schema.prisma       # Database schema
  seed.ts             # Demo data
```

---

## Seeded Demo Accounts

After running `npm run db:seed`:

| Role | Email | Password |
|---|---|---|
| Admin | admin@yorkstores.com | admin1234 |
| Store Owner | gadgetvault@example.com | password123 |
| Buyer | buyer@example.com | password123 |

---

## What's Included

- ✅ Real auth (Argon2 hashing, JWT sessions, 30-day cookies)
- ✅ Forgot password / reset password via email
- ✅ Sign up as buyer or store owner (company name required)
- ✅ Dynamic box pricing (avg item value × 1.05, rounded to $1)
- ✅ Box choice modal (random or pick)
- ✅ Box select page with odds table
- ✅ 5-minute countdown timer with auto sell-back
- ✅ Sell-back returns item to drop pool (reshuffled)
- ✅ Delivery address form → order created in DB
- ✅ Store owner fulfilment with tracking numbers
- ✅ Email notifications (welcome, order confirm, shipping, sell-back)
- ✅ Wallet top-up via Stripe PaymentIntents
- ✅ Stripe webhooks for payment confirmation
- ✅ Cloudflare R2 for image uploads
- ✅ Admin dashboard (stats, users, purchases)
- ✅ Rate limiting on auth endpoints
- ✅ Security headers (X-Frame-Options, CSP, etc.)
- ✅ Database transactions to prevent race conditions on purchases

## What Needs to Be Done Before Going Live

- [ ] Wire Stripe PaymentElement into `/dashboard/wallet/page.tsx` (client secret is returned, just needs the Stripe.js UI component mounted)
- [ ] Stripe Connect onboarding flow at `/dashboard/payments/connect`
- [ ] Email domain verification with Resend
- [ ] Apple Pay domain registration with Apple
- [ ] Legal review of mystery box regulations in your target markets
- [ ] Privacy policy + Terms of Service pages
- [ ] GDPR/CCPA cookie consent if serving EU/CA users
- [ ] Production Stripe keys (replace test keys)
- [ ] Custom domain + SSL (automatic with Vercel)
