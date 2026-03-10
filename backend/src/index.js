/**
 * rbxl.eu — Really Beautiful eXtraordinary Link
 * Main application entry point
 */

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

// Initialize database
const { getDb, closeDb } = require('./db/database');
getDb();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.SESSION_SECRET || 'rbxl-dev-secret-change-in-production';

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com",
        "https://open.spotify.com", "https://w.soundcloud.com", "https://player.twitch.tv"],
    },
  },
}));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later',
});
app.use(globalLimiter);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later',
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again later',
});
app.use('/login', authLimiter);
app.use('/register', authLimiter);

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many requests, please try again later',
});
app.use('/admin', adminLimiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session management with SQLite store
const SQLiteStore = require('connect-sqlite3')(session);
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, '..', 'data'),
  }),
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : '0',
}));

// Load user into all requests
const { loadUser } = require('./middleware/auth');
const { csrfToken, csrfProtection } = require('./middleware/csrf');
app.use(loadUser);
app.use(csrfToken);
app.use(csrfProtection);

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

app.use('/', authRoutes);
app.use('/', profileRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Home page
app.get('/', (req, res) => {
  res.render('home', { title: 'rbxl.eu', user: res.locals.user });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { title: 'Not Found', message: 'Page not found', user: res.locals.user });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).render('error', { title: 'Error', message: 'Something went wrong', user: res.locals.user });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`rbxl.eu running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    closeDb();
    process.exit(0);
  });
});

module.exports = app;
