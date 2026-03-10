/**
 * REST API routes for programmatic access
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { isValidUsername, isValidUrl, isValidColor, sanitizeString, generateUniqueTag } = require('../middleware/validation');

const router = express.Router();

// POST /api/register
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  try {
    const hash = bcrypt.hashSync(password, 12);
    const tag = generateUniqueTag(db, username);

    const result = db.prepare(
      'INSERT INTO users (username, tag, password_hash) VALUES (?, ?, ?)'
    ).run(username, tag, hash);

    db.prepare('INSERT INTO profiles (user_id, display_name) VALUES (?, ?)').run(result.lastInsertRowid, username);

    res.status(201).json({
      id: result.lastInsertRowid,
      username,
      tag,
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.is_banned) {
    return res.status(403).json({ error: 'Account banned' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.isAdmin = !!user.is_admin;

  res.json({ id: user.id, username: user.username, tag: user.tag });
});

// GET /api/profile/:username
router.get('/profile/:username', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, tag, created_at FROM users WHERE username = ? COLLATE NOCASE AND is_banned = 0').get(req.params.username);

  if (!user) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ? AND is_disabled = 0').get(user.id);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not available' });
  }

  const links = db.prepare('SELECT id, title, url, link_type, sort_order FROM links WHERE user_id = ? AND is_visible = 1 ORDER BY sort_order').all(user.id);
  const badges = db.prepare(`
    SELECT b.name, b.label, b.icon, b.color FROM badges b
    JOIN user_badges ub ON b.id = ub.badge_id WHERE ub.user_id = ?
  `).all(user.id);
  const embeds = db.prepare('SELECT id, embed_type, embed_url, title FROM embeds WHERE user_id = ? AND is_visible = 1 ORDER BY sort_order').all(user.id);

  res.json({
    user: { username: user.username, tag: user.tag, created_at: user.created_at },
    profile: {
      display_name: profile.display_name,
      bio: profile.bio,
      avatar: profile.avatar,
      banner: profile.banner,
      theme_color: profile.theme_color,
      accent_color: profile.accent_color,
      views: profile.profile_views,
    },
    links,
    badges,
    embeds,
  });
});

// PUT /api/profile — Update own profile
router.put('/profile', requireAuth, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const allowed = ['display_name', 'bio', 'avatar', 'banner', 'theme_color', 'accent_color',
    'background', 'background_type', 'gradient_start', 'gradient_end', 'card_style',
    'font_family', 'layout', 'animations_enabled', 'hover_effects', 'animated_background',
    'entry_animation', 'music_url'];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);

  db.prepare(`UPDATE profiles SET ${setClauses}, updated_at = datetime('now') WHERE user_id = ?`).run(...values, userId);

  res.json({ success: true });
});

// POST /api/links — Add link
router.post('/links', requireAuth, (req, res) => {
  const { title, url, link_type } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL required' });
  if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL' });

  const db = getDb();
  const userId = req.session.userId;
  const validTypes = ['website', 'discord', 'twitter', 'github', 'youtube', 'twitch', 'spotify', 'soundcloud', 'custom'];
  const safeType = validTypes.includes(link_type) ? link_type : 'custom';

  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM links WHERE user_id = ?').get(userId);
  const nextOrder = (maxOrder && maxOrder.m !== null) ? maxOrder.m + 1 : 0;

  const result = db.prepare(
    'INSERT INTO links (user_id, title, url, link_type, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, sanitizeString(title).substring(0, 100), url, safeType, nextOrder);

  res.status(201).json({ id: result.lastInsertRowid });
});

// DELETE /api/links/:id
router.delete('/links/:id', requireAuth, (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM links WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Link not found' });
  res.json({ success: true });
});

module.exports = router;
