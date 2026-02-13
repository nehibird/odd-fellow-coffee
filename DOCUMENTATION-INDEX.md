# Odd Fellow Coffee — Documentation Index

Quick guide to find what you need in the project documentation.

**Updated 2026-02-12**: Storefront flash of empty state eliminated; product image upload feature deployed; business process analysis complete with prioritized gap remediation roadmap

---

## For Project Overview

**Start Here**: [README.md](./README.md)
- Project status and key features
- Quick start guide
- Technology stack overview
- Page and API endpoint listings

---

## For Technical Deep Dives

**Complete Reference**: [PROJECT.md](./PROJECT.md)
- Full technology stack with versions
- Complete database schema (SQL, seed data)
- All 10 API endpoints with request/response examples
- Frontend pages and components breakdown
- Backend services architecture
- Build & deployment commands
- Design decisions and rationale
- Known issues and future work
- Testing checklist

**Milestone Completion**: [MILESTONE-SUBSCRIPTION-FEATURE-COMPLETE-2026-02-05.md](./MILESTONE-SUBSCRIPTION-FEATURE-COMPLETE-2026-02-05.md)
- Subscription feature completion summary
- All accomplishments documented (security audit, implementation, testing)
- Business requirements verification
- Production readiness assessment
- Knowledge transfer documentation
- Next steps for go-live

**Current Session** (2026-02-12 Afternoon): [SESSION-2026-02-12-STOREFRONT-FOES-FIX.md](./SESSION-2026-02-12-STOREFRONT-FOES-FIX.md) ✅ **FLASH OF EMPTY STATE ELIMINATED**
- Storefront FOES fix: Migrated shop/drops pages from onMount to server-side load functions ✅
- Zero flash on shop page: Products render instantly via SSR (commit 2609ed9)
- Zero flash on drops page: Empty state renders instantly via SSR
- CSP fix: Added Cloudflare analytics domains to CSP headers ✅
- Testing: E2E verified via Playwright MCP Docker, all tests passing ✅
- Deployment: Live on VPS 76.13.118.165 at oddfellowcoffee.com ✅

**Morning Session** (2026-02-12): [SESSION-2026-02-12-IMAGE-UPLOAD-FEATURE.md](./SESSION-2026-02-12-IMAGE-UPLOAD-FEATURE.md) ✅ **IMAGE UPLOAD FEATURE + BUSINESS ANALYSIS**
- Product image upload system: Multer-based file upload, nginx static serving, 7-day cache ✅
- Business process analysis: Orders & subscriptions workflows, 8 critical gaps identified, 3-tier remediation roadmap
- Deployment: Live on VPS with commit 8e78724
- Next priorities: Email notifications (Tier 1), bulk fulfillment, inventory management

**Previous Session (Evening)** (2026-02-09): [SESSION-IMPROVEMENTS-2026-02-09.md](./SESSION-IMPROVEMENTS-2026-02-09.md) ✅ **6 MAJOR ENHANCEMENTS DEPLOYED**
- Admin subscriptions page: Complete customer/shipping/fulfillment visibility ✅
- Shipping address collection: Integrated into Stripe checkout ✅
- Fulfillment email notifications: Automated when admin marks orders shipped ✅
- First delivery date display: Shows 7-day lead time for roasting ✅
- Database schema: Extended with 6 new fulfillment tracking columns ✅
- Product catalog: Hotplate removed, real images deployed ✅
- **Status**: All enhancements LIVE and OPERATIONAL

**Earlier Session** (2026-02-09): [SESSION-2026-02-09.md](./SESSION-2026-02-09.md)
- Full subscription checkout flow tested and operational ✅
- Product images deployed (coffee.jpg, sourdough.jpg, chocolate-sourdough.jpg) ✅
- Shop page tagline updated and hotplate removed ✅
- UX issue identified (subscription timing clarity needed)

**Previous Session**: [SESSION-2026-02-05-SUBSCRIPTION-DISCOUNT.md](./SESSION-2026-02-05-SUBSCRIPTION-DISCOUNT.md)
- 10% subscription discount implementation
- Fee-aware pricing formula (protects Deborah's floor prices)
- Server-side discount calculation (security)
- Product pricing updates (4 products)
- Database migrations
- Code changes (ProductCard.svelte, subscribe API)

---

## For Deployment & Current Status

**Deployment Guide**: [DEPLOYMENT-STATUS.md](./DEPLOYMENT-STATUS.md)
- Current build status (completed ✓)
- Deployment phase and next steps
- Browser testing plan with Playwright
- Step-by-step VPS deployment instructions
- Environment configuration details
- Rollback procedures
- Post-deployment task list

**Master Project Status**: [PROJECT-STATUS-MASTER.md](./PROJECT-STATUS-MASTER.md)
- Current project status overview (updated 2026-02-05)
- Deployment timeline and history
- All completed work summaries (including subscription discount)
- Known status (what's working, what's pending)
- Next steps prioritized
- Quality metrics and readiness
- Pricing structure with subscription discounts

**Current Session**: [SESSION-2026-02-04-PAYMENT-CONFIG.md](./SESSION-2026-02-04-PAYMENT-CONFIG.md)
- Complete session overview (afternoon work)
- Stripe webhook integration implemented
- Coffee variant system (size/grind options)
- Product pricing updates per owner
- Simplified checkout flow
- Mobile UX improvements (sticky nav, feedback)
- Testing results and deployment status
- Blocking items before go-live

**Previous Session**: [SESSION-2026-02-04.md](./SESSION-2026-02-04.md)
- Morning session: Documentation & verification
- Comprehensive documentation package created
- Site live verification
- Stripe TEST keys confirmed
- Payment flow testing prep

---

## For Owner Business Context

**CRITICAL READING**: [OWNER-BUSINESS-CONTEXT-2026-02-04.md](./OWNER-BUSINESS-CONTEXT-2026-02-04.md)
- Price floor constraints (minimum net after fees)
- Why percentage discounts won't work
- Subscription pricing strategy (operational savings only)
- Font preferences and future design considerations
- Owner feedback and approval status
- Decision log for business decisions
- What to remember for future feature work
- Contact info and conversation notes

---

## For Quick Reference

**Summary**: [COMPLETION-SUMMARY.md](./COMPLETION-SUMMARY.md)
- What was accomplished
- Key facts for future reference
- Seed data (10 products, 24 time slots)
- Build commands
- Environment variables required
- API endpoints and pages (quick list)
- Next steps for deployment

---

## Document Purposes

| Document | Purpose | Audience | Length |
|----------|---------|----------|--------|
| **SESSION-2026-02-12-STOREFRONT-FOES-FIX.md** | CURRENT: Storefront flash of empty state fix (LATEST) | Development team, UX team | ~16 KB |
| **SESSION-2026-02-12-IMAGE-UPLOAD-FEATURE.md** | Image upload system deployed + business process analysis | Development team, Product team, Business stakeholders | ~14 KB |
| **SESSION-IMPROVEMENTS-2026-02-09.md** | 6 subscription enhancements deployed | Development team, Product team | ~12 KB |
| **PROJECT-STATUS-MASTER.md** | Current project status & overview (UPDATED 2026-02-12) | Everyone | ~29 KB |
| **SESSION-2026-02-09.md** | Testing & UX assessment (earlier session) | Development team | ~7 KB |
| **MILESTONE-SUBSCRIPTION-FEATURE-COMPLETE-2026-02-05.md** | Subscription feature completion milestone | Everyone | ~8 KB |
| **README.md** | Quick start & overview | Everyone | ~4 KB |
| **PROJECT.md** | Full technical reference | Developers | ~21 KB |
| **DEPLOYMENT-STATUS.md** | Deployment guide & checklist | DevOps/Deployers | ~13 KB |
| **OWNER-BUSINESS-CONTEXT-2026-02-04.md** | Price floors, constraints, feedback | Product team, Decision makers | ~9 KB |
| **COMPLETION-SUMMARY.md** | Quick facts & summary | Project stakeholders | ~7 KB |
| **SESSION-2026-02-05-SUBSCRIPTION-DISCOUNT.md** | Subscription discount feature | Development team | ~6 KB |
| **SESSION-2026-02-04-PAYMENT-CONFIG.md** | Payment config & UX work (afternoon) | Development team | ~15 KB |
| **SESSION-2026-02-04.md** | Documentation & verification (morning) | Development team | ~13 KB |
| **SESSION-2026-02-02.md** | UI hardening work | Development team | ~12 KB |
| **DOCUMENTATION-INDEX.md** | This file | Navigation | ~6 KB |

---

## Finding Information

### "How do I..."

**...set up development?**
→ README.md → Quick Start → Development

**...understand the architecture?**
→ PROJECT.md → Technology Stack & File Structure

**...deploy to production?**
→ DEPLOYMENT-STATUS.md → Deployment Plan (Phase 3)

**...configure environment variables?**
→ DEPLOYMENT-STATUS.md → Key Deployment Configuration

**...see what's in the database?**
→ PROJECT.md → Database Schema

**...understand an API endpoint?**
→ PROJECT.md → API Endpoints (with examples)

**...check current deployment status?**
→ DEPLOYMENT-STATUS.md → Current Build Status

**...know what seed data exists?**
→ COMPLETION-SUMMARY.md → Key Facts for Future Reference

**...understand why a decision was made?**
→ PROJECT.md → Key Design Decisions

**...know about the owner's business constraints?** 🚨 **IMPORTANT**
→ OWNER-BUSINESS-CONTEXT-2026-02-04.md → All sections (CRITICAL for pricing/discount decisions)

**...understand why percentage discounts won't work?**
→ OWNER-BUSINESS-CONTEXT-2026-02-04.md → Subscription Pricing Strategy

**...know what the owner approved?**
→ OWNER-BUSINESS-CONTEXT-2026-02-04.md → Owner Feedback Summary

---

## Current Project Status

- **Code**: Complete ✓
- **Build**: Succeeds ✓
- **Git**: Committed and pushing to GitHub
- **Phase**: Pre-deployment testing & VPS setup
- **Target**: Hostinger VPS 76.13.118.165 (port 3200)

---

## Key Facts

- **Repository**: https://github.com/nehibird/odd-fellow-coffee
- **Framework**: SvelteKit 5 + Svelte 5
- **Database**: SQLite (5 tables, auto-seeded)
- **Backend**: Node.js + Express via SvelteKit adapter-node
- **Container**: Docker + docker-compose (Node 20 Alpine)
- **Pages**: 6 customer + 5 admin = 11 total
- **APIs**: 10 endpoints (product, slots, checkout, admin)
- **Products**: 10 seed items
- **Time Slots**: 24 pre-configured (Mon-Sat, 7am-11am)

---

## Documentation Maintenance

These docs are maintained as living documentation alongside the codebase.

**Update After**:
- Code changes affecting architecture
- Deployment to new environments
- API endpoint changes
- Database schema modifications
- Design decision reversals
- Significant bug fixes or features

**Review Dates**:
- After each deployment
- Weekly during active development
- Monthly in maintenance phase

---

## Questions or Issues?

Refer to the relevant documentation file above, then:
1. Check PROJECT.md for technical details
2. Check DEPLOYMENT-STATUS.md for deployment steps
3. Review git history for implementation context
4. See COMPLETION-SUMMARY.md for quick facts

---

*Index created: 2026-01-31*
*Last updated: 2026-02-12 (Added SESSION-2026-02-12-STOREFRONT-FOES-FIX; Storefront flash eliminated; Server-side rendering deployed; CSP fixed; All tests passing)*
