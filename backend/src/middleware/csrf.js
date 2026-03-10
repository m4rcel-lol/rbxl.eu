/**
 * CSRF protection middleware
 * Uses double-submit pattern with session-stored tokens
 */

const crypto = require('crypto');

/**
 * Generate a CSRF token and store in session
 */
function generateCsrfToken(req) {
  if (!req.session._csrf) {
    req.session._csrf = crypto.randomBytes(32).toString('hex');
  }
  return req.session._csrf;
}

/**
 * Middleware to inject CSRF token into res.locals for templates
 */
function csrfToken(req, res, next) {
  res.locals.csrfToken = generateCsrfToken(req);
  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 */
function csrfProtection(req, res, next) {
  // Only check POST/PUT/DELETE requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip API routes (they use different auth mechanisms)
  if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) {
    return next();
  }

  const token = req.body._csrf || req.headers['x-csrf-token'];
  const sessionToken = req.session._csrf;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).render('error', {
      title: 'Forbidden',
      message: 'Invalid or missing CSRF token. Please try again.',
      user: res.locals.user || null,
    });
  }

  next();
}

module.exports = { csrfToken, csrfProtection };
