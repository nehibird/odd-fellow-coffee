# Odd Fellow Coffee — Session Startup Prompt

Copy everything below this line into a new Claude Code session to resume work.

---

## Project

**Odd Fellow Coffee** — SvelteKit 5 e-commerce app for a specialty coffee shop in Oklahoma.

**Location:** `/Volumes/Media/Documents/Work/Birdherd Media/OddFellowCoffee`
**Repo:** https://github.com/nehibird/odd-fellow-coffee
**Live:** http://76.13.118.165:3200 (Hostinger VPS, Docker)
**Domain:** oddfellowcoffee.com (Cloudflare DNS → 76.13.118.165)

## Stack

- SvelteKit 5 + Svelte 5 + TypeScript + Tailwind CSS 3.4
- SQLite (better-sqlite3, WAL mode) at `data/odd-fellow.db`
- Stripe (checkout + subscriptions + webhooks)
- Nodemailer via SMTP2GO
- Docker + docker-compose, adapter-node

## Current State (as of 2026-02-02)

Fully deployed. Two major feature sets were just added:

### 1. Sourdough Drops System
Limited-inventory bake day pre-orders. Tables: `drops`, `drop_items`. Orders link via `orders.drop_id` and `orders.stage` (ordered→baking→ready→picked_up). Atomic inventory decrement on checkout. Abandoned checkout releases inventory via `checkout.session.expired` webhook. Customer page at `/drops`, admin at `/admin/drops`.

### 2. Fixed Subscriptions
Stripe recurring billing via `createSubscriptionCheckout()` in `stripe.ts`. Supports weekly/biweekly/monthly. Webhook handles `checkout.session.completed` (subscription mode), `customer.subscription.updated`, `customer.subscription.deleted`. Customer self-service at `/subscriptions` with HMAC email tokens. Subscribe button on product cards for `subscribable=1` products.

### 3. Security Hardening
- Admin auth: username + password (timing-safe), rate limiting (5 attempts/15min lockout)
- Session: expiry timestamps, max 100 cap, scoped cookies (`/admin` + `/api/admin`), `sameSite: strict`
- XSS: HTML escaping in all email templates
- CSRF: origin checking in `hooks.server.ts` (exempts `/api/webhook/`)
- Headers: CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Input validation: email format, status/stage/frequency whitelists in `validation.ts`
- Webhook: verifies product_id exists before inserting subscription

## Schema (7 tables)

- `products` — id, name, category, description, price_cents, variants (JSON), subscribable, active, image
- `orders` — id, stripe_session_id, customer_email, customer_name, items (JSON), total_cents, status, **stage**, **drop_id**
- `reservations` — id, order_id, reservation_date, time_slot, items, customer_name, customer_email, status
- `time_slots` — id, day_of_week, start_time, end_time, capacity, active
- `subscriptions` — id, stripe_subscription_id, customer_email, product_id, frequency, status, **stripe_price_id**, **current_period_end**, **cancel_at_period_end**
- `drops` — id, title, drop_date, opens_at, closes_at, pickup_start, pickup_end, status (scheduled/live/sold_out/closed)
- `drop_items` — id, drop_id, product_id, quantity_available, quantity_sold, price_cents_override

## Route Map

```
Customer:  / /shop /cart /drops /subscriptions /reservations /checkout/success /checkout/cancel
Admin:     /admin /admin/orders /admin/products /admin/reservations /admin/slots /admin/subscriptions /admin/drops
API:       /api/products /api/slots /api/drops /api/checkout /api/subscribe /api/subscriptions
Admin API: /api/admin/login /api/admin/orders /api/admin/products /api/admin/reservations /api/admin/slots /api/admin/subscriptions /api/admin/drops
Webhook:   /api/webhook/stripe
```

## Key Files

- `src/lib/server/db.ts` — schema, seed data, init
- `src/lib/server/stripe.ts` — createCheckoutSession + createSubscriptionCheckout
- `src/lib/server/auth.ts` — username/password auth, rate limiting, sessions
- `src/lib/server/validation.ts` — email, status, stage, frequency validators
- `src/lib/server/email.ts` — order + reservation confirmation emails (HTML-escaped)
- `src/hooks.server.ts` — CSRF + security headers
- `src/lib/components/CartStore.ts` — cart with dropId/dropItemId support
- `src/lib/components/ProductCard.svelte` — add to cart + subscribe UI

## Env Vars (in .env, gitignored)

PORT, STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, SITE_URL, DB_PATH

## Deploy

```bash
# VPS: ssh root@76.13.118.165 (default key)
# App dir: /opt/odd-fellow-coffee
ssh root@76.13.118.165 "cd /opt/odd-fellow-coffee && git pull origin main && docker compose down && docker compose build --no-cache && docker compose up -d"
```

Delete `data/odd-fellow.db` before rebuild if schema changed (tables auto-recreate + reseed).

## Admin Credentials

Username: `oddfellow` / Password: stored in `.env` on VPS and local machine. Not committed to git.

## Recent Commits

```
383681d Fix docker-compose port mapping to match app port 3200
949ff7f Add sourdough drops system, fix subscriptions, and harden security
1957c22 Fix product image 404s with SVG placeholders
cafd2a5 fix: admin cookie secure flag based on SITE_URL protocol
b3d45bf SvelteKit rebuild with e-commerce backend
```
