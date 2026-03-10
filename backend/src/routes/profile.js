/**
 * Profile routes: public profile view, dashboard, profile editing
 */

const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { sanitizeString, isValidColor, isValidUrl } = require('../middleware/validation');

const router = express.Router();

// GET /@:username — Public profile page
router.get('/@:username', (req, res) => {
  const db = getDb();
  const { username } = req.params;

  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
  if (!user || user.is_banned) {
    return res.status(404).render('error', { title: 'Not Found', message: 'Profile not found', user: res.locals.user });
  }

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id);
  if (!profile || profile.is_disabled) {
    return res.status(404).render('error', { title: 'Not Found', message: 'Profile not available', user: res.locals.user });
  }

  // Increment view count
  db.prepare('UPDATE profiles SET profile_views = profile_views + 1 WHERE user_id = ?').run(user.id);

  const links = db.prepare('SELECT * FROM links WHERE user_id = ? AND is_visible = 1 ORDER BY sort_order').all(user.id);
  const embeds = db.prepare('SELECT * FROM embeds WHERE user_id = ? AND is_visible = 1 ORDER BY sort_order').all(user.id);
  const badges = db.prepare(`
    SELECT b.* FROM badges b
    JOIN user_badges ub ON b.id = ub.badge_id
    WHERE ub.user_id = ?
    ORDER BY ub.granted_at
  `).all(user.id);

  res.render('profile', {
    title: `@${user.username}`,
    profileUser: user,
    profile,
    links,
    embeds,
    badges,
    user: res.locals.user,
  });
});

// GET /dashboard — User dashboard
router.get('/dashboard', requireAuth, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  const links = db.prepare('SELECT * FROM links WHERE user_id = ? ORDER BY sort_order').all(userId);
  const embeds = db.prepare('SELECT * FROM embeds WHERE user_id = ? ORDER BY sort_order').all(userId);
  const badges = db.prepare(`
    SELECT b.* FROM badges b
    JOIN user_badges ub ON b.id = ub.badge_id
    WHERE ub.user_id = ?
  `).all(userId);

  res.render('dashboard', {
    title: 'Dashboard',
    profile,
    links,
    embeds,
    badges,
    user: res.locals.user,
  });
});

// POST /dashboard/profile — Update profile
router.post('/dashboard/profile', requireAuth, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const {
    display_name, bio, avatar, banner,
    theme_color, accent_color, background, background_type,
    gradient_start, gradient_end, card_style, font_family, layout,
    animations_enabled, hover_effects, animated_background, entry_animation,
    music_url,
  } = req.body;

  // Validate colors
  const safeTheme = isValidColor(theme_color) ? theme_color : '#6750A4';
  const safeAccent = isValidColor(accent_color) ? accent_color : '#D0BCFF';
  const safeGradStart = isValidColor(gradient_start) ? gradient_start : '#1C1B1F';
  const safeGradEnd = isValidColor(gradient_end) ? gradient_end : '#2B2930';

  const validCardStyles = ['elevated', 'filled', 'outlined'];
  const safeCardStyle = validCardStyles.includes(card_style) ? card_style : 'elevated';

  const validLayouts = ['centered', 'left', 'grid'];
  const safeLayout = validLayouts.includes(layout) ? layout : 'centered';

  const validBgTypes = ['solid', 'gradient', 'image'];
  const safeBgType = validBgTypes.includes(background_type) ? background_type : 'solid';

  db.prepare(`
    UPDATE profiles SET
      display_name = ?, bio = ?, avatar = ?, banner = ?,
      theme_color = ?, accent_color = ?, background = ?, background_type = ?,
      gradient_start = ?, gradient_end = ?, card_style = ?, font_family = ?, layout = ?,
      animations_enabled = ?, hover_effects = ?, animated_background = ?, entry_animation = ?,
      music_url = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    sanitizeString(display_name || '').substring(0, 50),
    sanitizeString(bio || '').substring(0, 500),
    (avatar && isValidUrl(avatar)) ? avatar : '',
    (banner && isValidUrl(banner)) ? banner : '',
    safeTheme, safeAccent,
    (background && isValidUrl(background)) ? background : '',
    safeBgType, safeGradStart, safeGradEnd,
    safeCardStyle, sanitizeString(font_family || 'Roboto').substring(0, 50), safeLayout,
    animations_enabled === 'on' ? 1 : 0,
    hover_effects === 'on' ? 1 : 0,
    animated_background === 'on' ? 1 : 0,
    entry_animation === 'on' ? 1 : 0,
    (music_url && isValidUrl(music_url)) ? music_url : '',
    userId
  );

  res.redirect('/dashboard');
});

// POST /dashboard/links — Add link
router.post('/dashboard/links', requireAuth, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const { title, url, link_type } = req.body;

  if (!title || !url) {
    return res.redirect('/dashboard?error=missing_fields');
  }

  if (!isValidUrl(url)) {
    return res.redirect('/dashboard?error=invalid_url');
  }

  const validTypes = ['website', 'discord', 'twitter', 'github', 'youtube', 'twitch', 'spotify', 'soundcloud', 'custom'];
  const safeType = validTypes.includes(link_type) ? link_type : 'custom';

  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM links WHERE user_id = ?').get(userId);
  const nextOrder = (maxOrder && maxOrder.m !== null) ? maxOrder.m + 1 : 0;

  db.prepare(
    'INSERT INTO links (user_id, title, url, link_type, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, sanitizeString(title).substring(0, 100), url, safeType, nextOrder);

  res.redirect('/dashboard');
});

// POST /dashboard/links/:id/delete — Delete link
router.post('/dashboard/links/:id/delete', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM links WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.redirect('/dashboard');
});

// POST /dashboard/embeds — Add embed
router.post('/dashboard/embeds', requireAuth, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const { embed_url, embed_type, title } = req.body;

  if (!embed_url || !embed_type) {
    return res.redirect('/dashboard?error=missing_fields');
  }

  const validTypes = ['youtube', 'spotify', 'soundcloud', 'twitch', 'custom'];
  if (!validTypes.includes(embed_type)) {
    return res.redirect('/dashboard?error=invalid_type');
  }

  if (!isValidUrl(embed_url)) {
    return res.redirect('/dashboard?error=invalid_url');
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM embeds WHERE user_id = ?').get(userId);
  const nextOrder = (maxOrder && maxOrder.m !== null) ? maxOrder.m + 1 : 0;

  db.prepare(
    'INSERT INTO embeds (user_id, embed_type, embed_url, title, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, embed_type, embed_url, sanitizeString(title || '').substring(0, 100), nextOrder);

  res.redirect('/dashboard');
});

// POST /dashboard/embeds/:id/delete — Delete embed
router.post('/dashboard/embeds/:id/delete', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM embeds WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.redirect('/dashboard');
});

module.exports = router;
