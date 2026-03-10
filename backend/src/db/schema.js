/**
 * Database schema for rbxl.eu
 * Uses SQLite via better-sqlite3 for lightweight Alpine-friendly deployment
 */

const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  tag TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(username, tag)
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  banner TEXT DEFAULT '',
  theme_color TEXT DEFAULT '#6750A4',
  accent_color TEXT DEFAULT '#D0BCFF',
  background TEXT DEFAULT '',
  background_type TEXT DEFAULT 'solid' CHECK(background_type IN ('solid','gradient','image')),
  gradient_start TEXT DEFAULT '#1C1B1F',
  gradient_end TEXT DEFAULT '#2B2930',
  card_style TEXT DEFAULT 'elevated' CHECK(card_style IN ('elevated','filled','outlined')),
  font_family TEXT DEFAULT 'Roboto',
  layout TEXT DEFAULT 'centered' CHECK(layout IN ('centered','left','grid')),
  animations_enabled INTEGER NOT NULL DEFAULT 1,
  hover_effects INTEGER NOT NULL DEFAULT 1,
  animated_background INTEGER NOT NULL DEFAULT 0,
  entry_animation INTEGER NOT NULL DEFAULT 1,
  music_url TEXT DEFAULT '',
  music_autoplay INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  is_disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Links table
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '',
  link_type TEXT DEFAULT 'custom' CHECK(link_type IN ('website','discord','twitter','github','youtube','twitch','spotify','soundcloud','custom')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#6750A4',
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User badges junction table
CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_id INTEGER NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  granted_by INTEGER,
  UNIQUE(user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- Embeds table
CREATE TABLE IF NOT EXISTS embeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  embed_type TEXT NOT NULL CHECK(embed_type IN ('youtube','spotify','soundcloud','twitch','custom')),
  embed_url TEXT NOT NULL,
  title TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions table (for connect-sqlite3)
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_embeds_user_id ON embeds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
`;

module.exports = { SCHEMA };
