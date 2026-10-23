# Aron

Aron is an AI agent control plane prototype with an animated marketing site, a fictional refund workflow, and a production-oriented workspace stack. The connected stack uses Supabase Auth/Postgres/RLS, server-side workspace authorization, agent-key trace ingestion, and Stripe Checkout/Customer Portal/webhooks. The refund scenario never calls a real payment provider.

## Local development

Requires Node.js 24 or newer.

```bash
npm install
npm run dev
```

Without environment variables, `/console` runs the fictional local SQLite demo. Its database is stored at `data/aron-demo.sqlite`. The hosted demo API is disabled on Vercel. With Supabase variables, `/console` redirects to `/dashboard` and the marketing calls to action lead to the authenticated dashboard.

```bash
npm test
npm run typecheck
npm run build
```

## Production setup

1. Create a Supabase project. Copy `.env.example` to `.env.local` for local work. Set the project URL, publishable key, and **server-only** secret key. Keep the secret key out of the browser and Git.
2. Apply `supabase/migrations/202610230001_foundation.sql` in the Supabase SQL editor on the new project. This creates workspace tables, RLS policies, and atomic functions. This migration has not yet been exercised against a live Supabase project.
3. In Supabase Auth URL Configuration, add the production origin and `https://YOUR-DOMAIN/auth/callback` as a redirect URL. Set the Site URL to the same origin. Enable email confirmation and configure a production SMTP sender before accepting real users.
4. Complete Stripe account onboarding for **live payments**. Create a recurring Team product/price. Set `STRIPE_SECRET_KEY=sk_live_...` and its `STRIPE_TEAM_PRICE_ID`. Configure the Stripe Customer Portal.
5. Register a Stripe webhook endpoint at `https://YOUR-DOMAIN/api/billing/webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`. The webhook verifies the raw payload signature; redirects never activate a plan.
6. The Git repository is connected to the Vercel project `aron-control-plane`, currently available at `https://aron-control-plane.vercel.app/`. Set all values from `.env.example` as project environment variables. Use `NEXT_PUBLIC_APP_URL=https://aron-control-plane.vercel.app` unless you attach a custom domain. Redeploy, then verify sign-up, workspace creation, a paused approval, checkout, signed webhook delivery, Customer Portal, cancellation, and billing state. A live payment should be made only after pricing, legal pages, and support contact are approved.

The Team price displayed in the landing page is a pricing hypothesis until the live Stripe price is chosen. Make the displayed price match Stripe before launch. Never paste Stripe or Supabase secret keys into chat or a public issue.

## Agent ingestion

Owners and admins can issue, rotate, and revoke an agent key in the dashboard. The key appears once. Send it only from a trusted server to `POST /api/v1/ingest` as a Bearer token. The endpoint validates a typed trace, caps request and event size, removes common token/email patterns from event detail, and uses a workspace-scoped key digest. Reusing `externalRunId` for an agent returns the same run ID. See `sdk/index.ts` for the TypeScript client.

## Current limitations

The seeded refund model and provider costs are fictional. A generic policy editor, arbitrary protected tool adapter, production email sender, SSO, safe replay, observability export, provider integration, and real account deployment still need implementation/verification. See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for the current checklist.
