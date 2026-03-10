/**
 * Tests for database schema and operations
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');
const { SCHEMA } = require('../db/schema');

let db;

before(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
});

after(() => {
  db.close();
});

describe('Database Schema', () => {
  it('should create all tables', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tableNames = tables.map(t => t.name);

    assert.ok(tableNames.includes('users'));
    assert.ok(tableNames.includes('profiles'));
    assert.ok(tableNames.includes('links'));
    assert.ok(tableNames.includes('badges'));
    assert.ok(tableNames.includes('user_badges'));
    assert.ok(tableNames.includes('embeds'));
    assert.ok(tableNames.includes('sessions'));
  });

  it('should create indexes', () => {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all();
    assert.ok(indexes.length >= 4);
  });
});

describe('User Operations', () => {
  it('should insert a user', () => {
    const result = db.prepare(
      'INSERT INTO users (username, tag, password_hash) VALUES (?, ?, ?)'
    ).run('testuser', '0001', 'hashed_password');

    assert.ok(result.lastInsertRowid > 0);
  });

  it('should enforce unique username', () => {
    assert.throws(() => {
      db.prepare(
        'INSERT INTO users (username, tag, password_hash) VALUES (?, ?, ?)'
      ).run('testuser', '0002', 'hashed_password');
    });
  });

  it('should query user by username case-insensitively', () => {
    const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get('TESTUSER');
    assert.ok(user);
    assert.strictEqual(user.username, 'testuser');
  });

  it('should have correct default values', () => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('testuser');
    assert.strictEqual(user.is_admin, 0);
    assert.strictEqual(user.is_banned, 0);
    assert.ok(user.created_at);
  });
});

describe('Profile Operations', () => {
  it('should create a profile for user', () => {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get('testuser');
    const result = db.prepare(
      'INSERT INTO profiles (user_id, display_name, bio) VALUES (?, ?, ?)'
    ).run(user.id, 'Test User', 'This is my bio');

    assert.ok(result.lastInsertRowid > 0);
  });

  it('should have correct default profile settings', () => {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get('testuser');
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id);

    assert.strictEqual(profile.theme_color, '#6750A4');
    assert.strictEqual(profile.accent_color, '#D0BCFF');
    assert.strictEqual(profile.animations_enabled, 1);
    assert.strictEqual(profile.hover_effects, 1);
    assert.strictEqual(profile.entry_animation, 1);
    assert.strictEqual(profile.profile_views, 0);
    assert.strictEqual(profile.is_disabled, 0);
  });

  it('should enforce one profile per user', () => {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get('testuser');
    assert.throws(() => {
      db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(user.id);
    });
  });
});

describe('Link Operations', () => {
  it('should add links to a user', () => {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get('testuser');
    db.prepare(
      'INSERT INTO links (user_id, title, url, link_type, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(user.id, 'My GitHub', 'https://github.com/test', 'github', 0);

    db.prepare(
      'INSERT INTO links (user_id, title, url, link_type, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(user.id, 'My Twitter', 'https://twitter.com/test', 'twitter', 1);

    const links = db.prepare('SELECT * FROM links WHERE user_id = ? ORDER BY sort_order').all(user.id);
    assert.strictEqual(links.length, 2);
    assert.strictEqual(links[0].link_type, 'github');
  });
});

describe('Badge Operations', () => {
  it('should create badges', () => {
    db.prepare(
      'INSERT INTO badges (name, label, icon, color, description) VALUES (?, ?, ?, ?, ?)'
    ).run('early_user', 'Early User', '⭐', '#FFD700', 'One of the first');

    const badge = db.prepare('SELECT * FROM badges WHERE name = ?').get('early_user');
    assert.ok(badge);
    assert.strictEqual(badge.label, 'Early User');
  });

  it('should grant badge to user', () => {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get('testuser');
    const badge = db.prepare('SELECT id FROM badges WHERE name = ?').get('early_user');

    db.prepare(
      'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)'
    ).run(user.id, badge.id);

    const userBadges = db.prepare(`
      SELECT b.* FROM badges b
      JOIN user_badges ub ON b.id = ub.badge_id
      WHERE ub.user_id = ?
    `).all(user.id);

    assert.strictEqual(userBadges.length, 1);
    assert.strictEqual(userBadges[0].name, 'early_user');
  });

  it('should prevent duplicate badge grants', () => {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get('testuser');
    const badge = db.prepare('SELECT id FROM badges WHERE name = ?').get('early_user');

    assert.throws(() => {
      db.prepare(
        'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)'
      ).run(user.id, badge.id);
    });
  });
});

describe('Cascade Deletes', () => {
  it('should delete profile when user is deleted', () => {
    // Create a user to delete
    const result = db.prepare(
      'INSERT INTO users (username, tag, password_hash) VALUES (?, ?, ?)'
    ).run('deletetest', '9999', 'hash');
    const userId = result.lastInsertRowid;

    db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(userId);
    db.prepare('INSERT INTO links (user_id, title, url) VALUES (?, ?, ?)').run(userId, 'Test', 'https://test.com');

    // Delete user
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
    const links = db.prepare('SELECT * FROM links WHERE user_id = ?').all(userId);

    assert.strictEqual(profile, undefined);
    assert.strictEqual(links.length, 0);
  });
});
