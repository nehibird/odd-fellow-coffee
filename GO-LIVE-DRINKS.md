# Going live with drink reservations

Everything in PRs #5–#12 is merged, deployed and running in production **with the feature
switched off**. The site behaves exactly as it did before: no Drinks link, `/reservations`
says ordering is not open, and any drink order is refused with a 403.

This document is the remaining work. It is ordered so that nothing irreversible happens
before the things that could stop it.

---

## 1. Before anything else — two phone calls

### [ ] ODAFF — (405) 522-6119

**Ask: are home-prepared, milk-based drinks in scope under the Local Food Freedom Act?**

An iced latte is a TCS food (milk; pH > 4.6, water activity > 0.85). Deborah holds a TCS
certification, which is why this is likely fine — but the scope of what the Act permits for
TCS *drinks prepared at home* has **not been confirmed**, and nothing in this codebase
establishes it.

- If the answer is yes → proceed with both drinks.
- If the answer is unclear or no → **sell iced black coffee only.** Deactivate Iced Latte in
  admin → Products. The economics barely change: the whole argument for drinks is that a
  roasted pound returns roughly 2× as a drink versus as beans, and that holds for either.

### [ ] ODAFF producer registration — $15 + form

Still outstanding from before this work. Resolve one-vs-two producers on the same call.

### [ ] OKTAP sales tax permit (~$20)

Prepared drinks are taxable in Oklahoma. The approved pricing is **tax-inclusive** ($5 is $5
at the window), which means the permit is required before the first sale, not after.

---

## 2. Caleb — Stripe onboarding

### [ ] Complete Stripe account onboarding

- EIN **42-4744593**
- The LLC's business bank account

**Only Caleb can do this** — it needs his identity details. Nothing in the drink flow can take
real money until it is done.

### [ ] Confirm the payout account is the LLC's, not a personal one

---

## 3. Deborah — one setting

### [ ] Set the drink pickup location

Admin → Settings → **Drink Pickup Location**.

It is currently **empty, deliberately**. The existing `pickup_address` setting is still the
placeholder `123 Main St, Tonkawa, OK 74653`, and that string would be printed in every
customer confirmation email. Empty-and-must-be-set beats wrong-but-looks-set.

Until it is set, customers are told the pickup spot will follow by email.

---

## 4. Prepare the configuration

### [ ] Back up the database — the WAL-aware way

```bash
ssh root@76.13.118.165
cd /opt/odd-fellow-coffee/data
sqlite3 odd-fellow.db ".backup odd-fellow.db.SAFEBAK-$(date +%Y%m%d-%H%M%S)"
```

> **Never `cp` this database.** It runs in WAL mode, so the `.db` file alone is a stale
> snapshot — recent writes live in `odd-fellow.db-wal`. Two older `*.bak-*.STALE-NO-WAL` files
> in that directory are exactly that mistake; restoring one would put bread back on the site
> and lose orders.

### [ ] Dry-run the preparation script

```bash
cd /opt/odd-fellow-coffee
docker compose exec web node scripts/prepare-drinks-go-live.mjs --dry-run
```

### [ ] Run it for real

```bash
docker compose exec web node scripts/prepare-drinks-go-live.mjs
```

It is idempotent and additive. It creates the **2:45–3:15 PM Mon–Fri** windows at **12 drinks
each**, confirms the daily cap (12), cutoff hour (20 = 8 PM Central) and ordering days, and
activates Iced Coffee ($5.00) and Iced Latte ($6.00).

It deliberately does **not** flip the switch, touch Stripe, or deactivate the old 07:00–11:00
bakery pickup slots — it reports those instead.

---

## 5. Stripe — live keys

### [ ] Swap the keys in `/opt/odd-fellow-coffee/.env`

```
STRIPE_SECRET_KEY=sk_live_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### [ ] Re-register the webhook endpoint in LIVE mode

`https://oddfellowcoffee.com/api/webhook/stripe` — events `checkout.session.completed`,
`checkout.session.expired`, plus the subscription events already in use.

### [ ] Put the **live** signing secret in `.env`

```
STRIPE_WEBHOOK_SECRET=whsec_...   # the LIVE one, not the test one
```

> ⚠️ **This is the step most likely to be fumbled, and it fails silently.** A test signing
> secret will not validate live events: payments succeed, `constructEvent` throws, the webhook
> 400s, and **reservations never reach `confirmed`** — so customers pay and no one is told.
> After the first live payment, check the Stripe dashboard's webhook log shows a 200.

### [ ] Rebuild so the new keys are picked up

```bash
docker compose up -d --build web
```

---

## 6. Turn it on

### [ ] Activate the n8n workflow

`n8n.birdherd.media` → **`T7iVJORk5ln1BXbs` — "OddFellow Coffee - Drink Reminders & Hold Sweep"**

It is already created, with `timezone: America/Chicago` pinned (cron on that instance is
otherwise interpreted in Europe/Berlin). It is **inactive on purpose**, because activating it
schedules mail to Deborah.

- `Every 15 min` → releases unpaid holds older than 45 minutes
- `Daily 6 AM CT` → run sheet to Deborah + pickup reminder to each customer

### [ ] Flip the switch

Admin → Settings → **Drink Ordering** → `1`

That is the only thing that makes drinks visible and orderable. Setting it back to `0` turns
everything off again instantly — the nav link disappears, the page explains ordering is closed,
and the API refuses with a 403.

---

## 7. Prove it with real money

### [ ] Buy one drink with a real card, then refund it

Place a single real order through `/reservations`, then refund it from the Stripe dashboard.

Verify, in order:

- [ ] the reservation shows **`confirmed`** (not `pending`) — this is the live-webhook check
- [ ] the customer confirmation email arrives, with the right day, window and pickup location
- [ ] Deborah's "new drink order" email arrives
- [ ] the order appears on the run sheet at `/admin/drinks` with the right per-drink tally
- [ ] the slot's remaining count dropped by the right number of **drinks**
- [ ] Stripe's webhook log shows a **200**

### [ ] Watch for an hour

```bash
ssh root@76.13.118.165 'cd /opt/odd-fellow-coffee && docker compose logs web --since 1h | grep -ciE "CRITICAL|StripeInvalidRequest|unhandled"'
```

`CRITICAL` appears in exactly two places, both deliberate: a payable Stripe session that could
not be linked to its reservation, and a paid session that revived a released hold. Either one
means a human needs to look.

---

## If something goes wrong

**Turn it off first, diagnose second.** Admin → Settings → Drink Ordering → `0`. That stops all
new orders immediately. Already-paid reservations stay valid and still appear on the run sheet.

To roll back the code: the drink feature is additive — every change is behind
`drinks_enabled`, and the schema is additive too. Reverting to the previous image is safe; the
extra columns are simply unused.

---

## What the numbers mean

| Setting | Value | Why |
|---|---|---|
| Iced Coffee | $5.00 | Round numbers matter in a car line |
| Iced Latte | $6.00 | |
| Daily cap | 12 drinks | ~1.2 lb/day at ~10 drinks per roasted pound — already several times current output. **The roaster is the constraint, not demand.** Raise it only after a week of real orders |
| Cutoff | 8 PM Central, night before | Cold brew needs a 12–24h steep, so same-day is not physically possible |
| Window | 2:45–3:15 PM Mon–Fri | School pickup line |

All of these are admin settings. Changing any of them needs no deploy.
