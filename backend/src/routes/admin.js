/**
 * Admin panel routes
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { sanitizeString } = require('../middleware/validation');

const router = express.Router();

// All routes require admin
router.use(requireAdmin);

// GET /admin — Admin dashboard
router.get('/', (req, res) => {
  const db = getDb();
  const stats = {
    totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    totalProfiles: db.prepare('SELECT COUNT(*) as count FROM profiles').get().count,
    activeProfiles: db.prepare('SELECT COUNT(*) as count FROM profiles WHERE is_disabled = 0').get().count,
    bannedUsers: db.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 1').get().count,
    totalViews: db.prepare('SELECT SUM(profile_views) as total FROM profiles').get().total || 0,
  };

  res.render('admin/index', { title: 'Admin Panel', stats, user: res.locals.user });
});

// GET /admin/users — User management
router.get('/users', (req, res) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const users = db.prepare(`
    SELECT u.*, p.profile_views, p.is_disabled
    FROM users u LEFT JOIN profiles p ON u.id = p.user_id
    ORDER BY u.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.render('admin/users', {
    title: 'User Management',
    users,
    page,
    totalPages: Math.ceil(total / limit),
    user: res.locals.user,
  });
});

// POST /admin/users/:id/ban
router.post('/users/:id/ban', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET is_banned = 1 WHERE id = ? AND is_admin = 0').run(req.params.id);
  res.redirect('/admin/users');
});

// POST /admin/users/:id/unban
router.post('/users/:id/unban', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(req.params.id);
  res.redirect('/admin/users');
});

// POST /admin/users/:id/delete
router.post('/users/:id/delete', (req, res) => {
  const db = getDb();
  // Don't allow deleting admin users
  const target = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.params.id);
  if (target && !target.is_admin) {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  }
  res.redirect('/admin/users');
});

// POST /admin/users/:id/reset-password
router.post('/users/:id/reset-password', (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 8) {
    return res.redirect('/admin/users?error=invalid_password');
  }
  const db = getDb();
  const hash = bcrypt.hashSync(new_password, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.redirect('/admin/users');
});

// POST /admin/users/:id/toggle-profile
router.post('/users/:id/toggle-profile', (req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT is_disabled FROM profiles WHERE user_id = ?').get(req.params.id);
  if (profile) {
    db.prepare('UPDATE profiles SET is_disabled = ? WHERE user_id = ?').run(profile.is_disabled ? 0 : 1, req.params.id);
  }
  res.redirect('/admin/users');
});

// GET /admin/badges — Badge management
router.get('/badges', (req, res) => {
  const db = getDb();
  const badges = db.prepare('SELECT * FROM badges ORDER BY created_at').all();
  res.render('admin/badges', { title: 'Badge Management', badges, user: res.locals.user });
});

// POST /admin/badges — Create badge
router.post('/badges', (req, res) => {
  const { name, label, icon, color, description } = req.body;
  if (!name || !label) {
    return res.redirect('/admin/badges?error=missing_fields');
  }
  const db = getDb();
  try {
    db.prepare(
      'INSERT INTO badges (name, label, icon, color, description) VALUES (?, ?, ?, ?, ?)'
    ).run(
      sanitizeString(name).substring(0, 50),
      sanitizeString(label).substring(0, 50),
      sanitizeString(icon || '').substring(0, 10),
      color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#6750A4',
      sanitizeString(description || '').substring(0, 200)
    );
  } catch (e) {
    // Badge name already exists
  }
  res.redirect('/admin/badges');
});

// POST /admin/badges/:id/delete
router.post('/badges/:id/delete', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM badges WHERE id = ?').run(req.params.id);
  res.redirect('/admin/badges');
});

// POST /admin/users/:userId/badges/:badgeId/grant
router.post('/users/:userId/badges/:badgeId/grant', (req, res) => {
  const db = getDb();
  try {
    db.prepare(
      'INSERT OR IGNORE INTO user_badges (user_id, badge_id, granted_by) VALUES (?, ?, ?)'
    ).run(req.params.userId, req.params.badgeId, req.session.userId);
  } catch (e) {
    // Already granted
  }
  res.redirect('/admin/users');
});

// POST /admin/users/:userId/badges/:badgeId/revoke
router.post('/users/:userId/badges/:badgeId/revoke', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM user_badges WHERE user_id = ? AND badge_id = ?').run(req.params.userId, req.params.badgeId);
  res.redirect('/admin/users');
});

module.exports = router;
