# Owner Business Context & Requirements

**Document Created**: 2026-02-04
**Owner**: Deborah
**Conversation Date**: 2026-02-04
**Status**: ACTIVE — Critical business constraints documented

---

## Executive Summary

This document captures critical business context from a direct conversation with Deborah (Odd Fellow Coffee owner) on 2026-02-04. The key insight is that all listed prices are FLOOR prices — the minimum Deborah needs to NET after payment processing fees and other transaction costs. This has significant implications for discounting strategy, pricing decisions, and any future subscription or promotional features.

**Bottom Line**: Do not implement percentage-off discounts on subscriptions without first verifying they won't violate the floor price constraints.

---

## Critical Price Floor Information

### The Floor Price Concept

Deborah specified that the prices currently shown on the website are her **FLOOR prices** — meaning they represent the absolute minimum amount she needs to retain after:
- Stripe payment processing fees (2.9% + $0.30)
- Transaction costs
- Other operational expenses directly tied to each sale

**This is not markup.** These are survival prices.

### Current Pricing Structure with Floor Analysis

| Product | Floor (Net) | Current Price | Built-In Buffer | Fee Impact |
|---------|------------|---------------|-----------------|----|
| Original Sourdough | $10.00 | $10.99 | $0.99 | Stripe ~2.9% + $0.30 = ~$0.62 |
| Triple Chocolate Brownie | $15.00 | $15.99 | $0.99 | Stripe ~2.9% + $0.30 = ~$0.76 |
| Coffee 8oz | $13.00 | $13.99 | $0.99 | Stripe ~2.9% + $0.30 = ~$0.71 |
| Coffee 16oz | $25.00 | $25.99 | $0.99 | Stripe ~2.9% + $0.30 = ~$1.05 |

### Why This Matters

The $0.99 buffer per transaction is tight. At volume and with different payment methods (international cards, higher Stripe rates for certain card types), the buffer may not fully cover processing fees. This means:

1. **No percentage discounts** — Even a modest 10% discount on a $10.99 item ($1.10 off) would net Deborah $9.89, which is below the $10.00 floor
2. **No percentage-off promotions** — Same issue: math doesn't work
3. **No percentage-based subscription discounts** — Recurring payment discount logic violates the floor constraint

---

## Subscription Pricing Strategy (IMPORTANT)

### What Will NOT Work

- **Percentage-off subscriptions** (e.g., "10% off monthly coffee subscriptions")
  - Example: 10% off Coffee 16oz ($25.99) = $23.39 monthly net, BUT floor is $25.00
  - Would result in loss of $1.61 per month per subscription

- **Percentage-off coupons** (same issue as above)

- **Tiered discounting by volume** (e.g., "buy 3, get 10% off")

### What CAN Work

Any discount that comes from **operational savings**, not price reduction:

1. **Free shipping** — If you normally charge shipping, offering free local delivery for subscriptions is a real savings
2. **Bundled pricing** — Package items together at their combined floors (no discount needed if buying more = higher revenue anyway)
3. **Loyalty rewards** — After 12 months, add a free small item (costs you COGS, not retail price)
4. **Exclusive access** — Subscribers get early access to limited drops or special items (no price reduction)
5. **Extended payment terms** — Let subscribers pay monthly instead of upfront (no price discount, different cash flow model)

### The Correct Approach

Before proposing ANY subscription discount or promotional feature:

1. **Calculate the financial impact** — What will customer actually pay?
2. **Compare to floor** — Will Deborah net at least the floor amount?
3. **Identify where savings come from** — Is it from reduced transaction fees? Reduced shipping? Bulk order discounts?
4. **Verify with Deborah** — Always check before implementing

**Example**: "We could offer subscriptions with free local delivery (normally $5 shipping), so Deborah still nets $25 on a Coffee 16oz subscription even though the customer feels they're getting $5 off."

---

## Font Requirements

### Current Status

Deborah confirmed the website looks **"good otherwise"** when reviewing the current state. The system fonts (currently using defaults after rolling back from Playfair Display/Nunito) are acceptable.

### If Font Changes Become Necessary

**Requirements**:
- Should be "better" (her word — higher quality, more professional than system defaults)
- Must be "clear" (readability is priority)
- Should NOT be medieval or overly decorative
- Must work on mobile and desktop

**No specific font preference stated** — Would need to present options for Deborah's approval before implementation.

**Recommendation**: If proposing new fonts, bring 3-4 professional options (e.g., Georgia, Merriweather, or modern sans-serifs like Inter, Outfit) with screenshots for her to choose from.

---

## Owner Feedback Summary

### What Was Approved

- Overall website appearance: "good"
- Work completed to date: "Nehemiah did it" (positive approval)
- Feature set: Acceptable and functional
- Pricing implementation: Confirmed and approved

### What's Next (Per Owner)

1. **Product images** — CRITICAL before launch
   - Real photos of each product (8-10 items)
   - Professional quality (clear, well-lit, consistent style)
   - Size: 800x600+ minimum, <200KB each ideally
   - Deborah may provide photos or authorize budget for professional photography

2. **Production Stripe keys** — Activate when images are ready
   - Switch from TEST to LIVE keys
   - Full payment processing enabled
   - Real transactions begin

3. **Domain configuration** — Professional appearance
   - Move from IP address (76.13.118.165) to oddfellowcoffee.com
   - SSL/HTTPS setup
   - Email service activation

### Timeline Notes

Deborah didn't specify hard deadlines but the conversation implied:
- Images should be gathered/created soon
- Launch ready once images + final Stripe approval
- Not an urgent rush (emphasis on getting it right vs. fast)

---

## Decision Log

### Decision 1: No Percentage Discounts on Subscriptions
**Date**: 2026-02-04
**Decision**: Percentage-off discounts will NOT be offered on subscriptions or promotions
**Reason**: Would violate Deborah's floor price constraints
**Impact**: Any subscription discount must come from operational savings (shipping reduction, etc.)
**Owner**: Deborah (implicit agreement during pricing discussion)

### Decision 2: Current Font Treatment is Acceptable
**Date**: 2026-02-04
**Decision**: System default fonts are acceptable; no immediate font changes needed
**Reason**: Deborah confirmed site looks "good"
**Impact**: If future font changes needed, must bring options for approval first
**Owner**: Deborah

### Decision 3: Focus on Product Images Before Launch
**Date**: 2026-02-04
**Decision**: Product images are the blocking item for launch
**Reason**: All features are functional; visuals are the remaining gap
**Impact**: Next work should prioritize image sourcing/photography
**Owner**: Deborah (implied)

---

## Business Context for Future Developers

### When Considering New Features

Ask yourself:

1. **Does this involve discounting?** → Calculate impact on floor price first
2. **Does this change pricing?** → Verify it doesn't go below the floor
3. **Does this add fees?** → Confirm Deborah is still hitting her floor net
4. **Is this a visual change?** → Check with owner before implementing

### Stripe Fee Calculations

Use these estimates for financial modeling:

**Card Payments (most common)**:
- Base rate: 2.9% + $0.30
- Example on $25.99: (25.99 × 0.029) + 0.30 = $1.05
- Net to Deborah: $25.99 - $1.05 = $24.94

**Problematic Scenarios**:
- International cards: 3.9% + $0.30 (higher fees)
- ACH transfers: 1% + $0.30 (lower, but slower)
- Subscriptions: Same 2.9% + $0.30 per successful charge

### Emergency Contact

If you need to discuss business constraints, pricing, or features with Deborah:
- Owner name: Deborah
- Last direct conversation: 2026-02-04
- Topics covered: Pricing, fonts, product images, launch timeline
- Tone: Professional, collaborative, detail-oriented about margins

---

## Appendix: Conversation Notes

**Date**: 2026-02-04
**Participants**: Nehemiah (developer) & Deborah (owner)
**Topics**:
- Current website state review
- Pricing validation and floor constraints
- Font satisfaction
- Launch blockers (product images)
- Overall approval of work

**Key Quotes**:
- (On pricing) "Listed prices are my floor — minimum I need to NET"
- (On fonts) "Better fonts, clear. Not medieval."
- (On work) "Nehemiah did it."
- (On launch) "Need product images first"

**Action Items** (from Deborah):
- [ ] Source/create product photography
- [ ] Confirm production Stripe key activation timeline
- [ ] Prepare for domain/SSL setup

---

*Document created by Project Historian*
*Critical business constraints documented for preservation across sessions*
*Last updated: 2026-02-04*
