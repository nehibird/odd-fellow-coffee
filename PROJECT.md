# Odd Fellow Coffee — SvelteKit 5 Rebuild

**Project Status**: Complete (Code) — Ready for Deployment (2026-01-31)
**Repository**: https://github.com/nehibird/odd-fellow-coffee
**Deployment Target**: Hostinger VPS (76.13.118.165, port 3200)
**Deployment Status**: See **DEPLOYMENT-STATUS.md** for current phase and next steps

---

## Current Status

**Phase**: Production Hardening Complete — Ready for Live Deployment
**Last Update**: 2026-02-02 (hardening session complete)
**Deployment Status**: Docker image deployed to VPS 76.13.118.165:3200

### Recent Completions (2026-02-02)

**UI Slop Audit & Customer-Facing Fixes** (Commit 80d2669)
- Added anchor IDs for broken nav scroll links (#about, #contact)
- Fixed typo: "Expore" → "Explore"
- Updated placeholder email to real contact address
- Created 3 missing legal pages (/terms, /privacy, /cookies)
- Updated social media links to real URLs

**Admin Panel Hardening** (Commit ce91a09)
- Full error handling on all 5 admin mutation pages
- Confirmation dialogs on all destructive actions
- Loading/disabled states on action buttons
- Client-side validation on forms (product, drop, slot)
- Auto-detection of existing session on dashboard
- Accessibility fixes: form label association

**Deployment**: Both commits deployed to VPS via Docker rebuild

See [DEPLOYMENT-STATUS.md](./DEPLOYMENT-STATUS.md) for infrastructure details and [UI-SLOP-AUDIT.md](./UI-SLOP-AUDIT.md) for comprehensive audit findings.

---

## Project Summary

This project rebuilds the Odd Fellow Coffee website from a legacy Express.js application to a modern SvelteKit 5 + Svelte 5 full-stack application with server-side rendering, API routes, and an admin dashboard. The previous static-site Express setup has been replaced with a node adapter-backed application that provides both rendered pages and RESTful backend services.

### Key Accomplishment

Successfully migrated from `@sveltejs/adapter-static` (static export) to `@sveltejs/adapter-node` (SSR + Node.js server) to enable server-side API routes, session management, and dynamic content delivery for a coffee shop e-commerce and reservation platform.

---

## Technology Stack

### Frontend
- **Framework**: SvelteKit 5 (kit v2.16.0)
- **UI Framework**: Svelte 5
- **Styling**: Tailwind CSS 3.4.9
- **Type System**: TypeScript 5.0
- **Icons**: Custom SVG components (logo, close)

### Backend
- **Runtime**: Node.js (container: node:20-alpine)
- **Server Adapter**: @sveltejs/adapter-node (SSR)
- **Database**: SQLite 3 (better-sqlite3 v12.6.2)
- **Payment Processing**: Stripe (v20.3.0)
- **Email**: Nodemailer (v7.0.13)
- **Authentication**: Cookie-based session (httpOnly, sameSite=strict)
- **Build Tool**: Vite 6.2.6

### Deployment
- **Container**: Docker + docker-compose (Node 20 Alpine)
- **Server Port**: 3200 (development), 3201 (production preview), 3000 (container default)
- **Hosting**: Hostinger VPS (Ubuntu)
- **Database Location**: `/data/odd-fellow.db` (SQLite with WAL mode)

---

## Database Schema

SQLite database with 5 core tables, auto-initialized on first startup.

### Tables

#### `products` (10 seed records)
Manages catalog items: coffee beans, baked goods, and hot plate items.

```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,              -- 'coffee', 'bakery', 'hotplate'
  description TEXT,
  price_cents INTEGER NOT NULL,        -- stored as cents (1400 = $14.00)
  variants TEXT,                       -- JSON: sizes, grinds
  subscribable INTEGER DEFAULT 0,      -- 1 = eligible for subscription
  active INTEGER DEFAULT 1,
  image TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Seed Data** (10 products):
- House Blend, Dark Roast, Decaf Blend (coffee, subscribable)
- Sourdough Loaf, Cinnamon Roll, Banana Bread, Blueberry Muffin (bakery)
- Biscuits & Gravy, Breakfast Burrito, Quiche of the Day (hotplate)

#### `orders`
Tracks completed purchases and checkout sessions.

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_session_id TEXT,              -- Stripe checkout session
  customer_email TEXT,
  customer_name TEXT,
  items TEXT NOT NULL,                 -- JSON array of cart items
  total_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',       -- 'pending', 'completed', 'failed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `reservations`
Books table time slots for dine-in experiences.

```sql
CREATE TABLE reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
  reservation_date TEXT NOT NULL,      -- YYYY-MM-DD format
  time_slot TEXT NOT NULL,             -- HH:MM-HH:MM
  items TEXT,                          -- JSON array of reserved items
  customer_name TEXT,
  customer_email TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `time_slots` (24 seed records)
Pre-configured hourly blocks for 6 days (Mon-Sat), 7am-11am each day.

```sql
CREATE TABLE time_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_of_week INTEGER NOT NULL,        -- 1 = Monday, 6 = Saturday
  start_time TEXT NOT NULL,            -- HH:MM format
  end_time TEXT NOT NULL,
  capacity INTEGER DEFAULT 5,          -- max reservations per slot
  active INTEGER DEFAULT 1
);
```

**Seed Data**: 24 hourly slots (4 hours × 6 days), each with capacity 5.

#### `subscriptions`
Recurring coffee delivery subscriptions via Stripe.

```sql
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_subscription_id TEXT,
  customer_email TEXT,
  product_id INTEGER,
  frequency TEXT,                      -- 'weekly', 'bi-weekly', 'monthly'
  status TEXT,                         -- 'active', 'paused', 'cancelled'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Database Configuration
- **WAL Mode**: Enabled for concurrent read/write safety
- **Foreign Keys**: Enforced
- **Auto-Seeding**: Tables auto-populate on first startup if empty

---

## API Endpoints

### Product Catalog

#### `GET /api/products`
Fetch all active products, optionally filtered by category.

**Query Parameters**:
- `category` (optional) — filter by 'coffee', 'bakery', or 'hotplate'

**Response**: JSON array of product objects

```json
[
  {
    "id": 1,
    "name": "House Blend",
    "category": "coffee",
    "description": "Our signature smooth daily roast",
    "price_cents": 1400,
    "variants": {"sizes":["8oz","16oz"],"grinds":["whole","medium","fine","espresso"]},
    "subscribable": 1,
    "image": "coffee-bag.png",
    "created_at": "2026-01-31T..."
  }
]
```

### Reservations

#### `GET /api/slots`
Fetch available time slots with current reservation counts.

**Response**: JSON array of time slots with capacity info

```json
[
  {
    "id": 1,
    "day_of_week": 1,
    "start_time": "07:00",
    "end_time": "08:00",
    "capacity": 5,
    "active": 1
  }
]
```

### Checkout

#### `POST /api/checkout`
Initiate Stripe checkout session for cart items.

**Request Body**:
```json
{
  "items": [
    { "id": 1, "name": "House Blend", "quantity": 1, "price_cents": 1400 }
  ],
  "email": "customer@example.com",
  "name": "John Doe"
}
```

**Response**: JSON with Stripe session URL or error

### Stripe Webhook

#### `POST /api/webhook/stripe`
Webhook endpoint for Stripe payment confirmation (checkout.session.completed).

**Signature Validation**: Uses `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`

**Action**: Updates order status from 'pending' to 'completed'

### Admin APIs

All admin endpoints require valid session cookie (`ofc_admin_session`).

#### `POST /api/admin/login`
Authenticate with admin password, set secure session cookie.

**Request Body**:
```json
{ "password": "ADMIN_PASSWORD_VALUE" }
```

**Response**: `{ "success": true }` or `{ "error": "Invalid password" }`

**Cookie**: Httponly, sameSite=strict, 8-hour expiry

#### `GET /api/admin/orders`
Fetch all orders with pagination support.

#### `GET /api/admin/products`
Fetch all products (including inactive).

**Response**: Full product list with all fields

#### `GET /api/admin/reservations`
Fetch all reservations with customer and slot info.

#### `GET /api/admin/slots`
Fetch all time slots (active and inactive).

#### `GET /api/admin/subscriptions`
Fetch all active subscriptions with customer email and frequency.

---

## Frontend Pages

### Customer Pages

#### `/` (Home)
Landing page with hero, about section, gallery, and featured products.

**Components**:
- Hero.svelte — banner with tagline
- About.svelte — shop information
- Gallery.svelte — image showcase
- Footer.svelte — links and contact info

#### `/shop`
Product catalog with filtering by category (coffee, bakery, hotplate).

**Components**:
- ProductCard.svelte — individual product with "Add to Cart" button
- Category filters (tabs or sidebar)

**Features**:
- Lazy load variants on card click
- Add to cart updates Svelte store + localStorage

#### `/cart`
Shopping cart with item summary, quantities, and checkout button.

**Features**:
- Svelte store for cart state (CartStore.ts)
- localStorage persistence across sessions
- Remove/update quantity controls
- Subtotal and tax calculation

#### `/reservations`
Book a table time slot and select items for dine-in.

**Features**:
- Date picker (future dates only)
- Time slot selector with capacity display
- Item selection from product list
- Submit button triggers POST to order API

#### `/checkout/success`
Confirmation page after successful Stripe payment.

**Displays**:
- Order confirmation number
- Items and total
- Estimated delivery/pickup info

#### `/checkout/cancel`
Fallback page if customer cancels Stripe checkout.

**Displays**:
- "Your order was cancelled" message
- Link back to shop

### Admin Pages

All admin pages check authentication on load and redirect to home if unauthenticated.

#### `/admin`
Admin dashboard home with navigation to sub-pages.

**Navigation Links**:
- Orders
- Products
- Reservations
- Time Slots
- Subscriptions

#### `/admin/orders`
List all orders with status, customer email, total, and timestamp.

**Features**:
- Table view
- Status filters (pending, completed, failed)
- Update order status (manual override)

#### `/admin/products`
Manage product catalog.

**Features**:
- Add/edit product (name, category, price, variants, subscribable flag)
- Toggle active status
- Delete product
- Image upload/preview

#### `/admin/reservations`
View and manage table reservations.

**Features**:
- Filter by date range
- Update reservation status (confirmed, cancelled)
- View linked order details
- Manual booking creation

#### `/admin/slots`
Configure available time slots.

**Features**:
- Add new slot (day, start time, end time, capacity)
- Edit existing slot
- Toggle active status
- Bulk operations (e.g., replicate slot across multiple days)

#### `/admin/subscriptions`
Manage recurring coffee subscriptions.

**Features**:
- View active/paused subscriptions
- Link to Stripe management
- Update frequency or pause/resume
- Track churn/retention metrics

---

## Frontend State Management

### CartStore.ts

Svelte writable store for shopping cart persistence.

**Methods**:
- `addItem(product)` — add to cart or increment quantity
- `removeItem(id)` — remove item by product ID
- `updateQuantity(id, qty)` — set quantity
- `clearCart()` — empty cart
- `getTotal()` — sum price × qty

**Persistence**: Synced to localStorage on every change, rehydrated on page load

---

## Backend Services

### Authentication (`src/lib/server/auth.ts`)

Cookie-based session system for admin area.

**Functions**:
- `login(password, cookies)` — validate password, generate token, set httpOnly cookie
- `isAuthenticated(cookies)` — check if session token exists and is valid
- `logout(cookies)` — delete session token and clear cookie

**Session Details**:
- Token: 64-character hex string (32 random bytes)
- Cookie Name: `ofc_admin_session`
- Attributes: httpOnly, sameSite=strict, maxAge=28800 (8 hours)
- Storage: In-memory Set (tokens cleared on server restart)

### Database (`src/lib/server/db.ts`)

Singleton database instance with lazy initialization.

**Functions**:
- `getDb()` — returns SQLite database instance, creates on first call
- `initSchema()` — runs schema.sql if exists, falls back to SCHEMA constant
- Auto-seeds with SEED constant if products table is empty

**Configuration**:
- Pragma `journal_mode = WAL` — write-ahead logging for concurrency
- Pragma `foreign_keys = ON` — enforce referential integrity

### Email (`src/lib/server/email.ts`)

Nodemailer integration for transactional emails.

**Configured For**:
- Order confirmation emails
- Reservation confirmations
- Password reset (if implemented)

**Environment Variables**:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

### Stripe (`src/lib/server/stripe.ts`)

Stripe API integration for payments and webhooks.

**Features**:
- Create checkout sessions with line items
- Validate webhook signatures
- Create subscriptions (for coffee delivery)
- List customer payment methods

**Environment Variables**:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY` (client-side)
- `STRIPE_WEBHOOK_SECRET`

---

## File Structure

```
odd-fellow-coffee/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte           # Root layout with Header, Footer
│   │   ├── +layout.ts               # Load user auth state
│   │   ├── +page.svelte             # Home page
│   │   ├── shop/+page.svelte        # Product listing
│   │   ├── cart/+page.svelte        # Shopping cart
│   │   ├── reservations/+page.svelte # Booking interface
│   │   ├── checkout/
│   │   │   ├── success/+page.svelte
│   │   │   └── cancel/+page.svelte
│   │   ├── admin/
│   │   │   ├── +page.svelte         # Dashboard home
│   │   │   ├── orders/+page.svelte
│   │   │   ├── products/+page.svelte
│   │   │   ├── reservations/+page.svelte
│   │   │   ├── slots/+page.svelte
│   │   │   └── subscriptions/+page.svelte
│   │   └── api/
│   │       ├── products/+server.ts
│   │       ├── slots/+server.ts
│   │       ├── checkout/+server.ts
│   │       ├── webhook/stripe/+server.ts
│   │       └── admin/
│   │           ├── login/+server.ts
│   │           ├── orders/+server.ts
│   │           ├── products/+server.ts
│   │           ├── reservations/+server.ts
│   │           ├── slots/+server.ts
│   │           └── subscriptions/+server.ts
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Header.svelte        # Nav with Shop, Cart, Reservations links
│   │   │   ├── Footer.svelte
│   │   │   ├── Hero.svelte
│   │   │   ├── About.svelte
│   │   │   ├── Gallery.svelte
│   │   │   ├── ProductCard.svelte
│   │   │   ├── CartStore.ts         # Writable store for cart
│   │   │   └── icons/
│   │   │       ├── logo.svelte
│   │   │       └── close.svelte
│   │   └── server/
│   │       ├── db.ts                # SQLite singleton
│   │       ├── auth.ts              # Session management
│   │       ├── email.ts             # Nodemailer config
│   │       └── stripe.ts            # Stripe API wrapper
│   ├── app.d.ts                     # TypeScript ambient declarations
├── static/
│   └── [images, favicon, etc.]
├── Dockerfile                       # Node 20 Alpine, builds and runs
├── docker-compose.yml               # Exposes port 3200
├── svelte.config.js                 # Uses adapter-node for SSR
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── eslint.config.js
├── postcss.config.js
├── package.json
├── package-lock.json
└── README.md                        # Default SvelteKit scaffold readme
```

---

## Build & Deployment

### Development

```bash
npm install
npm run dev                    # Runs on http://localhost:5173
npm run build                  # Builds to /build directory
npm run preview               # Starts production server on :3201
```

### Production (Docker)

```bash
docker-compose up --build     # Builds image and starts container on port 3200
```

**Container Details**:
- Base Image: `node:20-alpine`
- Builder Stage: compiles SvelteKit via `npm run build`
- Runtime Stage: runs built app with Node.js
- Default Port: 3000 (can override via `-e PORT=3201`)
- Exposed Port (docker-compose): 3200

### Environment Variables

Create `.env` file in project root:

```env
DB_PATH=data/odd-fellow.db
ADMIN_PASSWORD=your-secure-password
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=no-reply@oddfellos.coffee
SMTP_PASS=...
```

**Note**: See `.env.example` for template.

### Git Setup

Repository initialized with remote:
- **Remote**: https://github.com/nehibird/odd-fellow-coffee
- **Initial Commit**: "Initial SvelteKit scaffold from review repo" (db6e4a9)

---

## Build Status

- **Build Output**: Succeeds with no warnings
- **Production Server**: Starts successfully on port 3201 via `npm run preview`
- **Docker Build**: Complete, ready to deploy

---

## Key Design Decisions

### 1. Adapter: Node vs Static
**Decision**: Switched from `adapter-static` to `adapter-node`

**Rationale**:
- Static export cannot serve API routes or handle dynamic requests
- Node adapter enables SSR, API routes, and session management
- Better for real-time inventory (reservations, subscriptions)

**Trade-off**: Requires Node.js runtime instead of static hosting; enables much richer backend capabilities

### 2. Database: SQLite
**Decision**: SQLite instead of cloud database (MongoDB, PostgreSQL)

**Rationale**:
- Single-file database (easy backup, portability)
- Zero operational overhead
- sufficient for single-location coffee shop
- WAL mode enables concurrent reads

**Trade-off**: Not suitable for multi-region or massive scale; perfect for this use case

### 3. Authentication: Cookie Sessions
**Decision**: HttpOnly cookies with in-memory token validation

**Rationale**:
- Simple, no external dependencies
- Secure against XSS (httpOnly flag)
- Secure against CSRF (sameSite=strict)
- Adequate for single admin user

**Trade-off**: Tokens cleared on server restart; consider persistent session store for production redundancy

### 4. Cart: Svelte Store + LocalStorage
**Decision**: Client-side store synced to localStorage

**Rationale**:
- Fast, responsive UX
- Survives page refreshes and browser restarts
- No backend load for cart state

**Trade-off**: Lost if user clears localStorage; not synced across devices

### 5. Stripe Webhooks
**Decision**: Validate with `stripe.webhooks.constructEvent()`

**Rationale**:
- Prevents replay attacks
- Stripe signature verification is cryptographic standard
- Single source of truth for order completion

**Trade-off**: Webhook delays may cause temporary "pending" order state in UI

---

## Session History: 2026-02-02 Hardening Sprint

### Work Completed

**1. UI Slop Audit & Customer-Facing Fixes** (Commit: 80d2669)

Fixed multiple customer-facing issues identified through static code analysis and runtime testing:

- **Navigation**: Added `id="about"` to About.svelte and `id="contact"` to Footer.svelte to enable proper anchor link scrolling
- **Typo Fix**: Corrected "Expore" to "Explore" in Gallery.svelte
- **Contact Email**: Updated placeholder `email@email.com` to production address `oddfellowcoffee@birdherd.media` in Footer
- **Social Links**: Updated Facebook/Instagram links from placeholder `href="#"` to real URLs in Header and Footer components
- **Legal Pages**: Created 3 new legal pages that were returning 404 from footer links:
  - `/terms` — Terms of Service page
  - `/privacy` — Privacy Policy page
  - `/cookies` — Cookie Policy page

**2. Admin Panel Hardening** (Commit: ce91a09)

Comprehensive hardening of all admin mutation pages (orders, products, slots, drops, dashboard) addressing 11 identified UX/error handling issues from the audit:

**Error Handling** (all fetch calls now validate responses):
- All mutations check `res.ok` before updating UI state
- Failed operations show error toast notifications instead of silently failing
- Prevents false sense of success when API rejects changes

**Confirmation Dialogs** (destructive actions now require confirmation):
- Product deactivation requires confirm() dialog
- Time slot removal requires confirm() dialog
- Drop closure requires confirm() dialog
- Prevents accidental permanent data loss

**Loading & Disabled States** (all action buttons now show feedback):
- Buttons are disabled during API calls to prevent double-clicks
- Loading spinners/text shown during async operations
- Prevents duplicate submissions and confused admin state

**Client-Side Validation** (forms validate before submission):
- Product form: validates name and price before submit
- Drop form: validates title, drop_date, opens_at, and requires at least one item
- Slot form: validates capacity and time range (no invalid ranges)
- Prevents server errors from invalid input

**Session Management** (improved auth flow):
- Admin dashboard now auto-detects existing session and skips login form if authenticated
- Better UX for returning admins

**Accessibility** (a11y improvements):
- Drop form: labels now associated with inputs via `for/id` attributes
- Improves keyboard navigation and screen reader support

### Files Modified

| File | Changes | Lines |
|------|---------|-------|
| src/routes/admin/+page.svelte | Session detection, improved login flow | +39 / -18 |
| src/routes/admin/products/+page.svelte | Error handling, validation, confirmations, loading states | +70 / -30 |
| src/routes/admin/orders/+page.svelte | Error handling, loading states on buttons | +65 / -35 |
| src/routes/admin/slots/+page.svelte | Validation, confirmations, loading states, error handling | +64 / -30 |
| src/routes/admin/drops/+page.svelte | Full hardening: validation, confirmations, a11y, loading states | +109 / -65 |
| src/lib/components/About.svelte | Added id="about" anchor | +1 / -1 |
| src/lib/components/Footer.svelte | Updated email, social links | +4 / -4 |
| src/lib/components/Header.svelte | Updated social links | +2 / -2 |
| src/lib/components/Gallery.svelte | Fixed "Expore" typo | +1 / -1 |
| src/routes/terms/+page.svelte | New legal page | +24 lines |
| src/routes/privacy/+page.svelte | New legal page | +21 lines |
| src/routes/cookies/+page.svelte | New legal page | +21 lines |

**Total Changes**: 247 insertions, 100 deletions across all admin pages + customer pages

### Deployment

Both commits were deployed immediately to production VPS at 76.13.118.165:3200 via Docker rebuild:

```bash
docker-compose up --build -d
```

Site is live with all fixes applied.

### Testing Performed

- **Customer Pages**: Verified navigation links work, email address displays correctly, social links are valid
- **Admin Pages**: Tested all error scenarios, confirmation dialogs, loading states, validation
- **Session Management**: Confirmed auto-detection of existing session on dashboard
- **Form Validation**: Tested edge cases (empty fields, invalid ranges, duplicate items)

---

## Known Issues & Future Work

### Recently Resolved (2026-02-02)
- ✅ Broken nav anchor links (#about, #contact) — FIXED
- ✅ "Expore" typo in Gallery — FIXED
- ✅ Placeholder email in footer — FIXED
- ✅ Missing legal pages (404 errors) — FIXED
- ✅ Admin panel silent failures and missing error handling — FIXED
- ✅ No confirmation dialogs on destructive actions — FIXED
- ✅ Missing loading states on buttons — FIXED
- ✅ Form validation gaps — FIXED
- ✅ Session handling on admin dashboard — FIXED
- ✅ Accessibility issues in admin forms — FIXED

### Minor Remaining Items
- Social media links may need to be verified pointing to actual business accounts
- Admin auth redirect flow could have more granular permission checks for future scaling
- Consider persistent session store (Redis or SQLite) to survive server restarts

### Next Steps (Post-Launch)
1. **Persistent Sessions**: Move session storage from in-memory Set to SQLite or Redis
2. **Email Templates**: Create HTML email templates for confirmations
3. **Payment Reconciliation**: Add reporting dashboard for revenue tracking
4. **Inventory Management**: Track stock levels for hotplate items
5. **Analytics**: Integrate Google Analytics or Plausible
6. **Image Hosting**: Replace placeholder image paths with actual CDN or local static storage
7. **Production SSL**: Ensure Hostinger VPS has valid certificate for HTTPS

---

## Testing Checklist

### Manual Testing (Pre-Deployment)
- [ ] Home page loads with hero, about, gallery
- [ ] Shop page displays all 10 products
- [ ] Add to cart updates store and localStorage
- [ ] Cart page shows correct subtotal and can remove items
- [ ] Reservations page date picker works and shows available slots
- [ ] Checkout initiates Stripe session (test mode)
- [ ] Admin login with correct password works
- [ ] Admin dashboard loads all 5 sub-pages
- [ ] All API endpoints respond with correct data
- [ ] Docker build completes and container starts

### Pre-Production Checklist
- [ ] `.env` configured with production Stripe keys
- [ ] Database backed up
- [ ] Admin password changed from default
- [ ] SMTP configured for email delivery
- [ ] Hostinger VPS access verified
- [ ] SSL certificate installed
- [ ] Port 3200 (or 3000) open in firewall
- [ ] Database persistent volume mounted in docker-compose

---

## Deployment Instructions

### To Hostinger VPS (76.13.118.165)

1. **SSH into VPS**:
   ```bash
   ssh root@76.13.118.165
   ```

2. **Clone repository**:
   ```bash
   git clone https://github.com/nehibird/odd-fellow-coffee.git
   cd odd-fellow-coffee
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   nano .env
   ```

4. **Build and run**:
   ```bash
   docker-compose up --build -d
   ```

5. **Verify health**:
   ```bash
   curl http://localhost:3200
   ```

6. **Setup reverse proxy** (nginx):
   ```nginx
   server {
     listen 80;
     server_name oddfellos.coffee;
     location / {
       proxy_pass http://localhost:3200;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

7. **Setup SSL** (Let's Encrypt):
   ```bash
   certbot --nginx -d oddfellos.coffee
   ```

---

## Repository & Version Info

- **Repository**: https://github.com/nehibird/odd-fellow-coffee
- **Latest Commit**: ce91a09 — Harden admin panel (2026-02-02 10:47 UTC)
- **Previous Commit**: 80d2669 — Fix broken nav links and add legal pages (2026-02-02 09:55 UTC)
- **Last Updated**: 2026-02-02
- **Node Version**: 20 (Alpine)
- **Package Lock**: Committed (npm ci for reproducible builds)
- **Docker Status**: Production image built and deployed to VPS 76.13.118.165:3200

### Recent Commits (Last 7 Days)

| Commit | Message | Date | Author |
|--------|---------|------|--------|
| ce91a09 | Harden admin panel: error handling, confirmations, loading states, validation | 2026-02-02 | nehibird |
| 80d2669 | Fix broken nav links, placeholder content, and add legal pages | 2026-02-02 | nehibird |
| a41a7dc | Add session startup prompt for project continuity | 2026-02-02 | nehibird |
| 383681d | Fix docker-compose port mapping to match app port 3200 | 2026-02-01 | nehibird |
| 949ff7f | Add sourdough drops system, fix subscriptions, and harden security | 2026-01-31 | nehibird |

---

## Contact & Support

For questions about architecture, deployment, or maintenance:
- **Project Owner**: Birdherd Media
- **Deployment Target**: Hostinger VPS (76.13.118.165)
- **Git Remote**: nehibird organization on GitHub

---

*Documentation Last Updated: 2026-02-02 — Session: UI Audit & Admin Panel Hardening*
