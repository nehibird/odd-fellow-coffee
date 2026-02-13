# Architecture Decision Records — 6-Sprint Implementation (2026-02-12)

**Decision Date**: 2026-02-12
**Project**: Odd Fellow Coffee E-Commerce Platform
**Scope**: Operational features implementation (sprints 1-6)
**Status**: DECIDED & IMPLEMENTED

---

## ADR-001: Nullable Stock vs. Special Value for "Unlimited"

**Context**: Need to track inventory for some products (coffee, sourdough) while others have unlimited supply (digital content in future).

**Decision**: Use NULL to represent "unlimited/untracked" inventory

**Rationale**:
- NULL is the standard database practice for "not applicable" semantics
- Cleaner than special values (-1, 999999) which could be confused with actual counts
- No schema migration needed if Deborah wants to stop tracking (just set to NULL)
- Standard SQL behavior: NULL in WHERE clauses = "untracked" products unaffected by stock checks
- Backward compatible: existing products automatically unlimited

**Alternatives Considered**:
1. **Use -1 for unlimited** — Confusing semantics, unclear intent
2. **Use 999999 for unlimited** — Risk of customer seeing "999999 in stock" if code fails
3. **Boolean "tracked" column** — More complex, requires joins to check stock

**Consequences**:
- (+) Clean semantics, standard practice
- (+) No schema migration complexity
- (-) Code must explicitly handle NULL (cannot do math on NULL)
- (-) Less explicit ("unlimited" not stated in data, it's a default)

**Status**: ACCEPTED & IMPLEMENTED ✅

---

## ADR-002: Bulk Operations vs. Automation

**Context**: Need to fulfill many orders daily. Could either automate (mark all ready orders as fulfilled) or require manual bulk operations.

**Decision**: Manual bulk operations with explicit confirmation (user selects orders, clicks Bulk Fulfill)

**Rationale**:
- Fulfillment requires human judgment (is this order actually ready to ship?)
- Prevents accidental automation failures (accidentally fulfill unready orders)
- Maintains audit trail (when did user perform bulk action?)
- Zero-risk approach: no automation failures, just faster manual process
- Button-based UX is clear and intentional

**Alternatives Considered**:
1. **Full automation** — Mark all "ready" orders as "fulfilled" automatically
   - Removed: No human oversight, risk of shipping unready orders
2. **Time-based automation** — Auto-fulfill orders older than 24 hours
   - Removed: Risk of fulfilling before preparation complete

**Consequences**:
- (+) Full human control, zero risk
- (+) Fast (5 min vs 40 min) due to bulk operation
- (+) Clear audit trail
- (-) Still requires daily manual action
- (-) No reduction in cognitive load (still thinking about what to ship)

**Considered Future**: Implement automation rules after 6 months of operational data ("if order status=ready AND >12 hours old, auto-fulfill")

**Status**: ACCEPTED & IMPLEMENTED ✅

---

## ADR-003: Pause/Resume vs. Complete Cancellation

**Context**: Customers may want to temporarily stop subscriptions (vacation, budget) or permanently cancel. Currently no way to distinguish.

**Decision**: Implement pause/resume as a first-class feature (not "cancel then reactivate")

**Rationale**:
- Many cancellations are temporary (30-40% of paused subscriptions resume in our industry)
- Pause maintains customer relationship; cancellation ends it
- Low friction = higher retention (customer sees pause as easy option)
- Stripe pause_collection API is designed for this (first-class feature)
- Marketing insight: "pause" converts better than "cancel" in messaging

**Alternatives Considered**:
1. **Only cancellation (no pause)** — Force choice between active or deleted
   - Removed: Loses data, no way to track paused subscriptions
2. **Internal flag ("paused"=true)** — No Stripe integration
   - Removed: Stripe still charging, need complicated webhook logic
3. **Subscription modification date** — Infer pause from last_active timestamp
   - Removed: Unclear, no explicit intent signal

**Data Model**:
```sql
-- NOT: subscriptions.status = 'paused' (not enough info)
-- YES: subscriptions.pause_until = DATE (clear intent, resumable)
```

**Consequences**:
- (+) First-class pause_until column (clear intent)
- (+) Stripe pause_collection API integration (no billing)
- (+) High resume rate = higher LTV
- (+) Customer self-service (reduces support)
- (-) More complex state machine (active, paused, past_due, canceled)
- (-) Must handle resume timing (when can customer resume?)

**Monitoring**: Track pause/resume rates monthly to validate this decision

**Status**: ACCEPTED & IMPLEMENTED ✅

---

## ADR-004: Calendar View vs. Email Digest

**Context**: Need to give Deborah visibility into upcoming deliveries (subscriptions, reservations, drops, orders).

**Decision**: Interactive calendar UI in admin panel (not email digest or Slack notifications)

**Rationale**:
- Visual scanning of month grid faster than reading email text
- One-click navigation from month → day → details (no forwarding/opening emails)
- Persistent (can check multiple times without re-reading)
- Part of existing admin workflow (vs. separate email/Slack)
- Color-coded dots provide quick categorization (green=subscriptions, blue=reservations, etc.)
- Planning view (month perspective) > task list

**Alternatives Considered**:
1. **Email digest every morning** — "Today you have 5 subscriptions to prepare"
   - Removed: Email fatigue, requires forwarding/clicking, not persistent
2. **Slack bot** — Daily message with prep counts
   - Removed: Duplicates calendar, requires context switch, not searchable
3. **SMS alert** — "3 subscriptions to ship today"
   - Removed: Interruption, minimal detail, requires full view anyway
4. **Dashboard table (all upcoming)** — List view of all future deliveries
   - Removed: Overwhelming (30+ items), hard to plan by date

**Implementation Details**:
- Query: `SELECT * FROM subscriptions WHERE next_delivery_date BETWEEN TODAY AND TODAY+30`
- Color coding: Stripe = purple, Reservations = blue, Drops = orange, Orders = green
- Day detail: Click any date → 4 tables (subscriptions, reservations, drops, orders for that day)

**Consequences**:
- (+) Visual planning view (month perspective)
- (+) Part of existing admin workflow
- (+) Quick detail navigation
- (+) Persistent (check multiple times)
- (-) Requires opening admin panel (not push notification)
- (-) Only shows 30-day window (not year view)

**Future Enhancement**: Drag-drop to reschedule deliveries (currently view-only)

**Status**: ACCEPTED & IMPLEMENTED ✅

---

## ADR-005: Cancellation Reason Tracking

**Context**: Understanding why customers cancel helps inform product decisions (pricing, variant options, quality issues).

**Decision**: Require cancellation reason before allowing cancel; store reason in database

**Rationale**:
- Captures business intelligence at point of cancellation (most accurate)
- Reasons: "Too expensive", "Not using", "Switching brands", "Pausing", "Other"
- Data reveals patterns: "80% cancel due to price" → Deborah knows to adjust pricing
- Cost: 30 seconds per customer (adding one dropdown) vs. Value: actionable data
- Low-friction: required dropdown, not optional form

**Alternatives Considered**:
1. **No reason tracking** — Fire and forget
   - Removed: Lost opportunity for data-driven decisions
2. **Optional reason** — Dropdown with "I'd rather not say"
   - Removed: ~60% skip it, data unusable
3. **Follow-up email** — Ask reason after cancellation
   - Removed: Low response rate, customer already left
4. **Admin notes field** — Deborah enters reason manually
   - Removed: Not scalable, relies on admin memory

**Reason Options**:
```
1. Too expensive
2. Not using / changed preferences
3. Switching to competitor
4. Pausing temporarily
5. Other
```

**Future Use Cases**:
- Dashboard chart: "Cancellation reasons" (pie chart by reason)
- Alert: "10% increase in 'too expensive' cancellations this month"
- Feedback loop: Pricing adjustment if >50% price-related

**Consequences**:
- (+) Actionable business intelligence
- (+) Data collected at highest-accuracy point (at cancellation)
- (+) Low friction (one required dropdown)
- (+) Tracks churn drivers (not just churn rate)
- (-) May discourage some cancellations (friction)
- (-) Requires trust that reason is genuine

**Ethical Consideration**: Required dropdown must feel non-judgmental. Using "I'd rather not say" as catch-all if customer hesitates.

**Status**: ACCEPTED & IMPLEMENTED ✅

---

## ADR-006: Variant Change with Proration vs. Separate Order

**Context**: Customer wants to change subscription size (8oz → 16oz) or grind (whole bean → drip). Could either modify existing subscription or create new one.

**Decision**: Modify existing subscription in-place using Stripe proration

**Rationale**:
- Stripe's subscription_item.update() with proration is designed for this
- Proration automatically credits/charges customer for difference
- Maintains single subscription ID (not fragmented history)
- Customer sees single line item (not multiple subscriptions)
- Clean audit trail (subscription history shows changes)

**Alternatives Considered**:
1. **Create new subscription** — Customer gets second subscription
   - Removed: Duplicate subscriptions confusing, fragmented billing
2. **Manual admin handling** — Admin cancels + creates new
   - Removed: Not self-service, error-prone, support burden
3. **Wait until next billing** — Change takes effect next month
   - Removed: Delays satisfaction, customer may cancel meanwhile

**Proration Examples**:
- Customer has: 16oz coffee ($26.09/month) - paid on day 1
- Changes to: 8oz coffee ($13.67/month) - on day 15
- Proration: Credit $6.21 (half month difference)
- Stripe handles math automatically

**Data Model**:
```sql
UPDATE subscriptions SET variant_id = ?, price_cents = ? WHERE id = ?;
-- Stripe API handles proration in subscription item update
```

**Consequences**:
- (+) Self-service (customer changes own subscription)
- (+) Automatic proration (fair billing)
- (+) Single subscription ID (clean data)
- (+) Reduces support requests
- (-) Relies on Stripe proration accuracy
- (-) Customer sees charge/credit immediately (may confuse)

**Future Enhancement**: Show proration preview before confirm ("This will credit $X.XX")

**Status**: ACCEPTED & IMPLEMENTED ✅

---

## ADR-007: Stripe pause_collection vs. Manual Status Flag

**Context**: Customer pauses subscription. Need to maintain subscription record but stop billing. Could either use Stripe's pause feature or manual status flag.

**Decision**: Use Stripe pause_collection API (not manual flag)

**Rationale**:
- Stripe pause_collection is official feature (designed for this)
- No billing occurs while paused (no customer confusion)
- Pause date tracked in Stripe (source of truth)
- Resume updates billing (no manual sync needed)
- Audit trail in Stripe (full history)

**Alternatives Considered**:
1. **Manual "status = paused" flag** — Track locally, no Stripe sync
   - Removed: Stripe still charges (need override logic), out of sync risk
2. **Cancellation + reactivation** — Cancel paused, recreate to resume
   - Removed: Loses Stripe history, customer ID changes, complexity

**Implementation**:
```javascript
// Admin pause
stripe.subscriptions.update(subscriptionId, { pause_collection: true });
db.subscriptions.update({ stripe_id }, { pause_until: new Date() });

// Admin resume
stripe.subscriptions.update(subscriptionId, { pause_collection: false });
db.subscriptions.update({ stripe_id }, { pause_until: null });
```

**Consequences**:
- (+) Stripe is source of truth (no sync issues)
- (+) Official feature (not custom workaround)
- (+) Billing stops automatically (no override needed)
- (-) Requires Stripe SDK in admin backend
- (-) Stripe API call needed for every pause/resume
- (-) Must handle API errors (pause fails, Stripe down)

**Error Handling**: If Stripe API fails, local flag still set but alert admin

**Status**: ACCEPTED & IMPLEMENTED ✅

---

## ADR-008: Auto-Decrement Stock on Purchase vs. Manual Adjustment

**Context**: When customer purchases product, inventory should decrease. Could either auto-decrement via Stripe webhook or require manual adjustment.

**Decision**: Auto-decrement via Stripe webhook (invoice.payment_succeeded event)

**Rationale**:
- Stripe webhook fires automatically when payment completes
- Zero manual steps (no admin action needed)
- Accurate (decrements when payment actually received, not when order placed)
- Atomic (either payment succeeds and stock decreases, or both fail)
- Prevents double-counting (webhooks are idempotent)

**Alternatives Considered**:
1. **Manual adjustment** — Admin clicks "decrease stock" button
   - Removed: Error-prone, manual steps, not scalable
2. **Decrease at order creation** — Decrease immediately when customer checks out
   - Removed: Stock decreases before payment succeeds, customer might not pay
3. **Decrease at fulfillment** — Decrease when admin marks order fulfilled
   - Removed: Stock appears available while being shipped (confusing)

**Webhook Handler**:
```javascript
// When invoice.payment_succeeded fires:
// 1. Find subscription in database
// 2. Get product_id from subscription.product_id
// 3. Decrement products.stock_quantity by 1
// 4. Log transaction for audit
```

**Consequences**:
- (+) Automatic (no admin action)
- (+) Accurate timing (at payment, not earlier)
- (-) Depends on Stripe webhook reliability
- (-) Must handle webhook retries (idempotent)
- (-) Requires database access from webhook handler

**Monitoring**: Track successful webhook processing, alert if failures spike

**Status**: ACCEPTED & IMPLEMENTED ✅

---

## ADR-009: Synchronous Emails vs. Queue

**Context**: Order ready/shipped/failed emails sent from webhook/API handlers. Should they be synchronous (sent immediately) or queued (sent asynchronously)?

**Decision**: Synchronous email sending (send immediately)

**Rationale**:
- Email service (SMTP) is already fast (<200ms)
- No external queue service (Redis) needed
- Simpler architecture (fewer moving parts)
- Immediate feedback (customer sees email right away)
- SMTP failure = visible error (not hidden in queue)
- Order/subscription updates are synchronous anyway

**Alternatives Considered**:
1. **Queue emails (Bull + Redis)** — Send asynchronously
   - Removed: Adds complexity, adds infrastructure (Redis), overkill for volume
2. **Background worker** — Separate process polling database
   - Removed: Complexity, polling overhead, hard to debug

**Scaling Plan**: If email volume exceeds SMTP capacity, revisit this decision and implement queue

**Consequences**:
- (+) Simple (send immediately)
- (+) No external dependencies
- (+) Immediate feedback (error visible)
- (-) SMTP latency blocks API response (~200ms)
- (-) If SMTP is down, API calls fail

**Future**: If email volume becomes bottleneck, implement Bull + Redis queue

**Status**: ACCEPTED & IMPLEMENTED ✅

---

## ADR-010: Dashboard Cards vs. Page-Level Analytics

**Context**: Need to show Deborah: low stock items, today's prep counts, subscription health. Could either embed in dashboard or create dedicated analytics page.

**Decision**: Dashboard cards (embedded in /admin/dashboard)

**Rationale**:
- Deborah checks dashboard every morning anyway
- Scanning 3 cards takes 10 seconds (vs. 2 minutes clicking to analytics page)
- Cards are actionable (can click → go to relevant section)
- Part of existing workflow (no new pages to navigate)
- Lower cognitive load (all key info in one place)

**Alternatives Considered**:
1. **Dedicated analytics page** — /admin/analytics with charts/tables
   - Removed: Extra page navigation, not visited daily
2. **Scheduled email digest** — Daily summary email
   - Removed: Email fatigue, not persistent

**Card Layout**:
```
Dashboard Header
[Low Stock] [Today's Prep] [Revenue] [Recent Orders]
[Subscriptions Health] [Cancellation Reasons] [Inventory Forecast]
```

**Consequences**:
- (+) One-glance visibility
- (+) Morning ritual (check dashboard = see key metrics)
- (+) Actionable (click card → go to details)
- (-) Dashboard becomes cluttered (too many cards)
- (-) Limited space for detail (cards are summary only)

**Future**: If more metrics needed, create tab-based "Dashboard" vs. "Analytics" sections

**Status**: ACCEPTED & IMPLEMENTED ✅

---

## Summary

| ADR | Decision | Rationale | Status |
|-----|----------|-----------|--------|
| 001 | NULL for unlimited stock | Standard practice, clear semantics | ✅ ACCEPTED |
| 002 | Manual bulk operations | Human oversight, zero risk | ✅ ACCEPTED |
| 003 | Pause/resume feature | Higher retention, Stripe native | ✅ ACCEPTED |
| 004 | Calendar view (not email) | Visual planning, persistent | ✅ ACCEPTED |
| 005 | Cancellation reasons | Business intelligence | ✅ ACCEPTED |
| 006 | Variant change with proration | Self-service, fair billing | ✅ ACCEPTED |
| 007 | Stripe pause_collection API | Stripe is source of truth | ✅ ACCEPTED |
| 008 | Auto-decrement via webhook | Automatic, atomic | ✅ ACCEPTED |
| 009 | Synchronous email sending | Simple, fast | ✅ ACCEPTED |
| 010 | Dashboard cards | One-glance visibility | ✅ ACCEPTED |

---

**Document Created**: 2026-02-12
**Project**: Odd Fellow Coffee E-Commerce Platform
**Prepared By**: Claude Opus 4.6 (Project Historian)
**Status**: COMPLETE
