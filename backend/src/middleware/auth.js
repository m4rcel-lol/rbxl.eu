/**
 * Authentication middleware
 */

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId || !req.session.isAdmin) {
    return res.status(403).render('error', { title: 'Forbidden', message: 'Access denied', user: null });
  }
  next();
}

function loadUser(req, res, next) {
  res.locals.user = null;
  if (req.session && req.session.userId) {
    const { getDb } = require('../db/database');
    const db = getDb();
    const user = db.prepare('SELECT id, username, tag, is_admin, is_banned FROM users WHERE id = ?').get(req.session.userId);
    if (user && !user.is_banned) {
      res.locals.user = user;
    } else if (user && user.is_banned) {
      req.session.destroy(() => {});
      return res.redirect('/login?error=banned');
    }
  }
  next();
}

module.exports = { requireAuth, requireAdmin, loadUser };
