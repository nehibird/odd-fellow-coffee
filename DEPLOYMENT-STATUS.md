# Odd Fellow Coffee — Deployment Status

**Status Date**: 2026-01-31
**Current Phase**: Pre-Deployment Testing & Infrastructure Setup
**Target**: Hostinger VPS 76.13.118.165 (port 3200)

---

## Current Build Status

### Completed
- [x] Code implementation complete and committed to git
- [x] `npm run build` succeeds with no errors or warnings
- [x] `node build` starts server successfully on port 3000
- [x] Git remote configured: `https://github.com/nehibird/odd-fellow-coffee`
- [x] Initial commits pushed to GitHub
- [x] Docker image builds locally (from Dockerfile)
- [x] docker-compose.yml configured for port 3200

### In Progress
- [ ] Pushing to GitHub (large SVG logo file making push slow)
- [ ] Browser testing with Playwright MCP to verify all pages work
- [ ] SSH deployment to VPS

### Not Started
- [ ] Final production SSL configuration
- [ ] Email service activation (SMTP)
- [ ] Stripe production keys activation
- [ ] Database backup strategy
- [ ] Monitoring/alerting setup

---

## Deployment Plan (Next Steps)

### Phase 1: GitHub Push Completion
**Objective**: Ensure codebase is fully synchronized to GitHub
- Wait for large SVG logo push to complete
- Verify all commits are visible in GitHub UI
- Confirm package-lock.json is present (for reproducible builds)

### Phase 2: Browser Testing
**Objective**: Validate all customer & admin pages work correctly
**Tool**: Playwright MCP for automated browser testing
**Pages to Test**:
- [ ] Home (/)
- [ ] Shop (/shop)
- [ ] Product filtering by category
- [ ] Add to cart functionality
- [ ] Cart (/cart)
- [ ] Update/remove items in cart
- [ ] Reservations (/reservations)
- [ ] Date picker and time slot selection
- [ ] Checkout initiation (Stripe test mode)
- [ ] Success & cancel pages
- [ ] Admin login (/admin)
- [ ] Admin dashboard pages (orders, products, reservations, slots, subscriptions)
- [ ] Admin data retrieval APIs

**Success Criteria**:
- All pages load without errors
- Navigation works correctly
- Forms submit without JavaScript errors
- Cart persistence (localStorage)
- API responses return expected data

### Phase 3: VPS Deployment
**Objective**: Deploy to production infrastructure

**Steps**:
1. **SSH to VPS**:
   ```bash
   ssh root@76.13.118.165
   ```

2. **Clone repository**:
   ```bash
   cd /opt
   git clone https://github.com/nehibird/odd-fellow-coffee.git
   cd odd-fellow-coffee
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   nano .env
   # Enter production values:
   # - ADMIN_PASSWORD
   # - STRIPE keys (production)
   # - SMTP credentials
   # - DB_PATH=/opt/odd-fellow-coffee/data/odd-fellow.db
   ```

4. **Verify Docker**:
   ```bash
   docker --version
   docker-compose --version
   ```

5. **Build and deploy**:
   ```bash
   docker-compose up --build -d
   ```

6. **Verify health**:
   ```bash
   curl http://localhost:3200
   # Should return HTML response

   docker ps
   # Should show container running

   docker logs odd-fellow-coffee
   # Check for errors
   ```

7. **Setup nginx reverse proxy**:
   - Create `/etc/nginx/sites-available/odd-fellow-coffee`
   - Configure proxy to localhost:3200
   - Enable site: `a2ensite odd-fellow-coffee` (or nginx equivalent)
   - Test: `curl http://localhost:3200`

8. **Setup SSL (Let's Encrypt)**:
   ```bash
   certbot --nginx -d oddfellos.coffee
   ```

---

## Key Deployment Configuration

### Environment Variables (Required)
```env
DB_PATH=data/odd-fellow.db
ADMIN_PASSWORD=<secure-password>
STRIPE_SECRET_KEY=sk_live_... (production key)
STRIPE_PUBLISHABLE_KEY=pk_live_... (production key)
STRIPE_WEBHOOK_SECRET=whsec_... (production secret)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=no-reply@oddfellos.coffee
SMTP_PASS=<password>
```

**See**: `/Volumes/Media/Documents/Work/Hosting/HOSTING-MAP.md` for credentials

### Docker Build
- **Base Image**: node:20-alpine
- **Build Command**: `npm run build` (during container build)
- **Runtime Command**: `node build`
- **Port**: 3200 (via docker-compose)
- **Volume**: `/opt/odd-fellow-coffee/data` (SQLite database persistence)

### VPS Details
- **Host**: 76.13.118.165 (Hostinger VPS)
- **OS**: Ubuntu (verify version via SSH)
- **Docker**: Required (install if not present)
- **Port 3200**: Must be open in firewall
- **Disk Space**: Ensure 5GB+ available for images and database

---

## Known Slow Points

### GitHub Push
**Issue**: Large SVG logo file (part of assets) making push slow
**Resolution**: Normal for first push; monitor progress in terminal
**Workaround**: Can SSH to VPS and build from main branch while push completes

### Docker Build Locally
**Issue**: Base image pulls were slow when tested locally
**Resolution**: VPS may have better bandwidth; alternatively use pre-built image or cached layers

---

## Testing Checklist (Pre-Deployment)

### Build
- [x] `npm install` succeeds
- [x] `npm run build` produces no errors
- [x] Build directory created with assets
- [x] `node build` starts server

### Pages (Manual or Playwright)
- [ ] Home page loads (hero, about, gallery visible)
- [ ] Shop displays all 10 products
- [ ] Categories filter correctly
- [ ] Add to cart works
- [ ] Cart persists across page refresh
- [ ] Reservations date picker functions
- [ ] Time slots display correctly
- [ ] Admin login accepts password
- [ ] Admin pages load all data
- [ ] API endpoints return JSON with correct structure

### API Validation
```bash
# GET /api/products
curl http://localhost:5173/api/products

# GET /api/slots
curl http://localhost:5173/api/slots

# Admin endpoints (POST /api/admin/login required first)
curl -X POST http://localhost:5173/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'
```

---

## Rollback Plan

If deployment encounters critical issues:

1. **Check logs**:
   ```bash
   docker logs -f odd-fellow-coffee
   ```

2. **Rebuild without cache**:
   ```bash
   docker-compose down
   docker system prune -a
   docker-compose up --build -d
   ```

3. **Restore from backup**:
   - Database backup located at: (TBD)
   - Previous image: available in Docker registry

4. **Downtime mitigation**:
   - Keep nginx error page ready
   - Have static fallback site available

---

## Post-Deployment Tasks

### Week 1
- [ ] Monitor logs for errors
- [ ] Test all checkout flows with real Stripe test mode
- [ ] Verify email delivery (order confirmations)
- [ ] Test admin password reset flow
- [ ] Verify database backups are running

### Week 2-4
- [ ] Setup monitoring (uptime, error tracking)
- [ ] Configure log rotation
- [ ] Test database recovery procedures
- [ ] User acceptance testing with stakeholders
- [ ] Performance tuning if needed

### Ongoing
- [ ] Daily log review (first 2 weeks)
- [ ] Weekly backup verification
- [ ] Monthly security updates
- [ ] Quarterly disaster recovery drill

---

## Support Resources

- **Repository**: https://github.com/nehibird/odd-fellow-coffee
- **Technical Docs**: See PROJECT.md for full architecture
- **Deployment Docs**: See this file for step-by-step VPS setup
- **Quick Ref**: See COMPLETION-SUMMARY.md for key facts

---

## Contact

- **Project**: Odd Fellow Coffee Website Rebuild
- **Owner**: Birdherd Media
- **Deployment Target**: Hostinger VPS (76.13.118.165)
- **Start Date**: 2026-01-XX
- **Expected Completion**: 2026-02-XX

---

*Last Updated: 2026-01-31*
*Status: Ready for browser testing and VPS deployment*
