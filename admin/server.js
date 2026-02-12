import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDb } from './lib/db.js';
import { createSessionStore } from './lib/auth.js';
import { flashMiddleware } from './middleware/flash.js';
import { requireAuth } from './middleware/requireAuth.js';
import { helpers } from './lib/helpers.js';

import loginRoutes from './routes/login.js';
import dashboardRoutes from './routes/dashboard.js';
import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';
import subscriptionRoutes from './routes/subscriptions.js';
import reservationRoutes from './routes/reservations.js';
import slotRoutes from './routes/slots.js';
import dropRoutes from './routes/drops.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.ADMIN_PORT || 3201;
const db = getDb();

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(join(__dirname, 'public')));

app.use(session({
  store: createSessionStore(db),
  secret: process.env.SESSION_SECRET || 'odd-fellow-admin-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES === 'true'
  }
}));

app.use(flashMiddleware);

app.use((req, res, next) => {
  res.locals.helpers = helpers;
  res.locals.currentPath = req.path;
  next();
});

app.use('/', loginRoutes);
app.use('/', requireAuth, dashboardRoutes);
app.use('/orders', requireAuth, orderRoutes);
app.use('/products', requireAuth, productRoutes);
app.use('/subscriptions', requireAuth, subscriptionRoutes);
app.use('/reservations', requireAuth, reservationRoutes);
app.use('/slots', requireAuth, slotRoutes);
app.use('/drops', requireAuth, dropRoutes);

app.listen(PORT, () => {
  console.log(`Odd Fellow Admin running on http://localhost:${PORT}`);
});
