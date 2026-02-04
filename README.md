# Odd Fellow Coffee — SvelteKit 5 Website

A modern full-stack e-commerce website for Odd Fellow Coffee, built with SvelteKit 5, Svelte 5, and Node.js backend with SQLite database.

## Project Status

**Code**: Complete and building ✓
**Build**: Succeeds with no errors ✓
**Deployment**: In progress (see DEPLOYMENT-STATUS.md)

## Quick Start

### Development

```bash
npm install
npm run dev
# Opens http://localhost:5173
```

### Production Build

```bash
npm run build
npm run preview
# Runs on port 3201
```

### Docker

```bash
docker-compose up --build
# Accessible at http://localhost:3200
```

## Documentation

- **PROJECT.md** — Complete technical architecture, database schema, API endpoints, and design decisions
- **DEPLOYMENT-STATUS.md** — Current deployment phase, testing checklist, and VPS setup instructions
- **COMPLETION-SUMMARY.md** — Quick reference of features and configuration

## Key Features

- **Product Catalog**: Browse coffee, bakery, and hotplate items
- **Shopping Cart**: Add items, manage quantities, persistent storage
- **Reservations**: Book table time slots for dine-in experiences
- **Checkout**: Stripe integration for secure payments
- **Admin Dashboard**: Manage orders, products, reservations, time slots, and subscriptions
- **Responsive Design**: Tailwind CSS styling for all devices

## Technology Stack

- **Framework**: SvelteKit 5 + Svelte 5
- **Styling**: Tailwind CSS 3.4
- **Backend**: Node.js + Express (via SvelteKit adapter-node)
- **Database**: SQLite 3 with WAL mode
- **Payment**: Stripe
- **Email**: Nodemailer
- **Container**: Docker + docker-compose

## Database

SQLite database with 5 core tables:
- `products` — 10 seed items (coffee, bakery, hotplate)
- `orders` — purchase and checkout sessions
- `reservations` — table booking records
- `time_slots` — 24 pre-configured hour slots (Mon-Sat, 7am-11am)
- `subscriptions` — recurring Stripe subscriptions

Auto-initialized on first startup.

## API Endpoints

**Customer**:
- `GET /api/products` — fetch catalog
- `GET /api/slots` — fetch available time slots
- `POST /api/checkout` — initiate Stripe session
- `POST /api/webhook/stripe` — payment confirmation

**Admin** (all require authentication):
- `POST /api/admin/login` — authenticate
- `GET /api/admin/orders` — fetch orders
- `GET /api/admin/products` — fetch products
- `GET /api/admin/reservations` — fetch reservations
- `GET /api/admin/slots` — fetch slots
- `GET /api/admin/subscriptions` — fetch subscriptions

## Pages

**Customer Pages**:
- `/` — Home (hero, about, gallery)
- `/shop` — Product catalog with category filters
- `/cart` — Shopping cart with checkout button
- `/reservations` — Table booking interface
- `/checkout/success` — Order confirmation
- `/checkout/cancel` — Cancellation fallback

**Admin Pages** (requires login):
- `/admin` — Dashboard home
- `/admin/orders` — Order management
- `/admin/products` — Product management
- `/admin/reservations` — Reservation management
- `/admin/slots` — Time slot configuration
- `/admin/subscriptions` — Subscription management

## Configuration

Create `.env` file with:

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

See `.env.example` for template.

## Deployment

Target: Hostinger VPS at **76.13.118.165** (port 3200)

**For detailed deployment instructions**, see **DEPLOYMENT-STATUS.md**.

Quick summary:
```bash
git clone https://github.com/nehibird/odd-fellow-coffee.git
cd odd-fellow-coffee
cp .env.example .env
# Edit .env with production values
docker-compose up -d
```

## Development

### Run Tests

```bash
npm run test
```

### Format Code

```bash
npm run format
```

### Lint

```bash
npm run lint
```

## Repository

- **GitHub**: https://github.com/nehibird/odd-fellow-coffee
- **Branch**: main
- **Node Version**: 20 (via Alpine container)

## Support

For technical questions, deployment issues, or architecture decisions:
- Review **PROJECT.md** for full documentation
- Check **DEPLOYMENT-STATUS.md** for deployment steps
- See git history for implementation context

## License

Birdherd Media

---

*Last Updated: 2026-01-31*
