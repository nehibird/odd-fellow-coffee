# Odd Fellow Coffee — Documentation Index

Quick guide to find what you need in the project documentation.

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
| **PROJECT-STATUS-MASTER.md** | Current project status & overview | Everyone | ~14 KB |
| **README.md** | Quick start & overview | Everyone | ~4 KB |
| **PROJECT.md** | Full technical reference | Developers | ~21 KB |
| **DEPLOYMENT-STATUS.md** | Deployment guide & checklist | DevOps/Deployers | ~13 KB |
| **COMPLETION-SUMMARY.md** | Quick facts & summary | Project stakeholders | ~7 KB |
| **SESSION-2026-02-04-PAYMENT-CONFIG.md** | Payment config & UX work (afternoon) | Development team | ~15 KB |
| **SESSION-2026-02-04.md** | Documentation & verification (morning) | Development team | ~13 KB |
| **SESSION-2026-02-02.md** | UI hardening work | Development team | ~12 KB |
| **DOCUMENTATION-INDEX.md** | This file | Navigation | ~4 KB |

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
*Last updated: 2026-02-04 (Added afternoon session: Stripe webhooks, coffee variants, mobile UX)*
