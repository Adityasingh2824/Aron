# Aron implementation status

Updated: 23 October 2026

This file is the source of truth for what has been built and what remains before launch. The attached build plan is a product blueprint, not a claim that every feature is complete.

## Implemented in the repository

- Responsive animated marketing site using Jet Black `#050505`, Royal Amethyst `#3B0A6B`, and Electric Cyan `#00E5FF`, including reduced-motion support.
- Local fictional SQLite demo with run traces, deterministic refund thresholds, approval before simulated execution, rejection/blocking, audit history, usage, and focused tests.
- Supabase Auth sign-up/sign-in, PKCE callback, session refresh proxy, workspace creation, membership roles, Postgres tables and RLS read policies.
- Authenticated workspace dashboard and APIs for workspace-scoped runs, approvals, policies, agents, usage, subscriptions, and audit.
- Transactional database functions for workspace creation, fictional run transitions, approval decisions, usage limits, agent ingestion, and webhook-driven subscription state. These need live database validation.
- Agent key issuance/rotation/revocation, SHA-256 digests in storage, one-time display, typed ingest endpoint with payload limits and basic secret/email redaction, idempotent external run IDs, and a small server-side TypeScript SDK.
- Stripe live-key guarded subscription Checkout, hosted Customer Portal, signed webhook, event ID deduplication, and basic event ordering. Billing stays unavailable until live account values and webhook are configured.
- Hosted deployments disable the unauthenticated local demo API.

## Pending or blocked before public production launch

- **Account setup:** the owner must create a Supabase project and Stripe account, complete Stripe live payment onboarding, create the recurring live price, configure the webhook and portal, and provide values through local/Vercel environment settings. No account or live key was available in this session.
- **Database activation:** apply the migration to the new Supabase project, verify RLS and RPC behavior against Postgres, set Auth redirect URLs and a production email sender, and perform a full signup/workspace/approval smoke test.
- **Deployment:** source is pushed to `Adityasingh2824/Aron` on GitHub (`main`, commit `c65701b`). The Vercel project creation attempt returned HTTP 403 because the connector lacks access to the `aditya-singhs-projects` scope. The owner must grant that team access, then configure environment variables, deploy, and verify the production HTTPS URL and webhook delivery. There is no live Aron deployment yet.
- **Billing validation:** reconcile the public Team price with the actual Stripe price; test live payment, invoice, failed payment, cancellation, Customer Portal, and subscription state before accepting customers. No real payment has been charged or verified.
- **Product scope:** arbitrary policy editing/version history, custom protected tool adapters, safe replay, general agent instrumentation beyond typed run ingest, provider integrations and measured costs, SSO, team invitation UI, export/retention jobs, Sentry/alerting, legal/support pages, accessibility/security audit, and load/rate-limit hardening remain.

## Verified locally

- `npm test` passes the local simulator threshold and guarded-flow checks.
- `npm run typecheck` passes with the new Supabase/Stripe code.
- `npm run build` passed after the production routes, dashboard, and final CSS/security edits.
- No live Supabase, Stripe, or deployed end-to-end test is possible until the accounts above exist.
