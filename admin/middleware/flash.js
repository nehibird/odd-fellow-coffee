export function flashMiddleware(req, res, next) {
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;

  res.flash = function (type, message) {
    req.session.flash = { type, message };
  };

  next();
}
