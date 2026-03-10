/**
 * Authentication routes: register, login, logout
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { isValidUsername, generateUniqueTag } = require('../middleware/validation');

const router = express.Router();

// GET /register
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('register', { title: 'Register', error: null, user: res.locals.user });
});

// POST /register
router.post('/register', (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (!username || !password || !confirmPassword) {
    return res.render('register', { title: 'Register', error: 'All fields are required', user: null });
  }

  if (!isValidUsername(username)) {
    return res.render('register', {
      title: 'Register',
      error: 'Username must be 3-20 characters (letters, numbers, _ and - only)',
      user: null,
    });
  }

  if (password.length < 8) {
    return res.render('register', { title: 'Register', error: 'Password must be at least 8 characters', user: null });
  }

  if (password !== confirmPassword) {
    return res.render('register', { title: 'Register', error: 'Passwords do not match', user: null });
  }

  const db = getDb();

  // Check if username exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username);
  if (existing) {
    return res.render('register', { title: 'Register', error: 'Username already taken', user: null });
  }

  try {
    const hash = bcrypt.hashSync(password, 12);
    const tag = generateUniqueTag(db, username);

    const result = db.prepare(
      'INSERT INTO users (username, tag, password_hash) VALUES (?, ?, ?)'
    ).run(username, tag, hash);

    const userId = result.lastInsertRowid;

    // Create default profile
    db.prepare(
      'INSERT INTO profiles (user_id, display_name) VALUES (?, ?)'
    ).run(userId, username);

    // Set session
    req.session.userId = userId;
    req.session.username = username;
    req.session.isAdmin = false;

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Registration error:', err);
    res.render('register', { title: 'Register', error: 'Registration failed, please try again', user: null });
  }
});

// GET /login
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  const error = req.query.error === 'banned' ? 'Your account has been banned' : null;
  res.render('login', { title: 'Login', error, user: res.locals.user });
});

// POST /login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('login', { title: 'Login', error: 'All fields are required', user: null });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.render('login', { title: 'Login', error: 'Invalid username or password', user: null });
  }

  if (user.is_banned) {
    return res.render('login', { title: 'Login', error: 'Your account has been banned', user: null });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.isAdmin = !!user.is_admin;

  res.redirect('/dashboard');
});

// POST /logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// GET /logout (convenience)
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
