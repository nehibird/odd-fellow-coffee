const BASE = process.env.BASE_PATH?.replace(/\/+$/, '') || '';

export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = BASE + req.originalUrl;
  res.redirect(BASE + '/login');
}
