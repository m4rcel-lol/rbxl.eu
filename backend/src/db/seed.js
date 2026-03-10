/**
 * Seed database with default data
 */

const bcrypt = require('bcryptjs');
const { getDb, closeDb } = require('./database');

async function seed() {
  const db = getDb();

  console.log('Seeding database...');

  // Create default badges
  const badges = [
    { name: 'early_user', label: 'Early User', icon: '⭐', color: '#FFD700', description: 'One of the first users' },
    { name: 'verified', label: 'Verified', icon: '✓', color: '#4CAF50', description: 'Verified profile' },
    { name: 'developer', label: 'Developer', icon: '🛠', color: '#2196F3', description: 'Platform developer' },
    { name: 'donator', label: 'Donator', icon: '💎', color: '#E040FB', description: 'Supporter of the platform' },
    { name: 'admin', label: 'Admin', icon: '🛡', color: '#F44336', description: 'Platform administrator' },
  ];

  const insertBadge = db.prepare(
    'INSERT OR IGNORE INTO badges (name, label, icon, color, description) VALUES (?, ?, ?, ?, ?)'
  );

  for (const badge of badges) {
    insertBadge.run(badge.name, badge.label, badge.icon, badge.color, badge.description);
  }

  // Create admin user if not exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existing) {
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(adminPass, 12);
    const tag = '0001';

    const result = db.prepare(
      'INSERT INTO users (username, tag, password_hash, is_admin) VALUES (?, ?, ?, 1)'
    ).run('admin', tag, hash);

    db.prepare(
      'INSERT INTO profiles (user_id, display_name, bio) VALUES (?, ?, ?)'
    ).run(result.lastInsertRowid, 'Admin', 'Platform administrator');

    // Grant admin badge
    const adminBadge = db.prepare('SELECT id FROM badges WHERE name = ?').get('admin');
    if (adminBadge) {
      db.prepare(
        'INSERT OR IGNORE INTO user_badges (user_id, badge_id, granted_by) VALUES (?, ?, ?)'
      ).run(result.lastInsertRowid, adminBadge.id, result.lastInsertRowid);
    }

    console.log(`Admin user created (username: admin, password: ${adminPass})`);
  }

  // Create demo/test user if not exists
  const existingDemo = db.prepare('SELECT id FROM users WHERE username = ?').get('testuser');
  if (!existingDemo) {
    const demoPass = 'testuser123';
    const hash = bcrypt.hashSync(demoPass, 12);
    const tag = '1234';

    const result = db.prepare(
      'INSERT INTO users (username, tag, password_hash, is_admin) VALUES (?, ?, ?, 0)'
    ).run('testuser', tag, hash);

    const userId = result.lastInsertRowid;

    // Create a fully populated profile
    db.prepare(`
      INSERT INTO profiles (user_id, display_name, bio, avatar, banner,
        theme_color, accent_color, background_type, gradient_start, gradient_end,
        card_style, font_family, layout,
        animations_enabled, hover_effects, animated_background, entry_animation,
        profile_views)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 1, 42)
    `).run(
      userId,
      'Test User',
      'Hello! 👋 This is a demo profile showcasing all the features of rbxl.eu.\nCustom bio with emoji support and multiline text.',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser',
      'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200&h=400&fit=crop',
      '#7C4DFF',
      '#B388FF',
      'gradient',
      '#1A1A2E',
      '#16213E',
      'elevated',
      'Roboto',
      'centered'
    );

    // Add sample links
    const insertLink = db.prepare(
      'INSERT INTO links (user_id, title, url, link_type, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    insertLink.run(userId, 'My GitHub', 'https://github.com/testuser', 'github', 0);
    insertLink.run(userId, 'Follow on Twitter', 'https://twitter.com/testuser', 'twitter', 1);
    insertLink.run(userId, 'Join Discord', 'https://discord.gg/example', 'discord', 2);
    insertLink.run(userId, 'YouTube Channel', 'https://youtube.com/@testuser', 'youtube', 3);
    insertLink.run(userId, 'My Website', 'https://example.com', 'website', 4);

    // Grant badges to test user
    const earlyBadge = db.prepare('SELECT id FROM badges WHERE name = ?').get('early_user');
    const verifiedBadge = db.prepare('SELECT id FROM badges WHERE name = ?').get('verified');
    const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

    if (earlyBadge && adminUser) {
      db.prepare(
        'INSERT OR IGNORE INTO user_badges (user_id, badge_id, granted_by) VALUES (?, ?, ?)'
      ).run(userId, earlyBadge.id, adminUser.id);
    }
    if (verifiedBadge && adminUser) {
      db.prepare(
        'INSERT OR IGNORE INTO user_badges (user_id, badge_id, granted_by) VALUES (?, ?, ?)'
      ).run(userId, verifiedBadge.id, adminUser.id);
    }

    console.log(`Test user created (username: testuser, password: ${demoPass})`);
  }

  closeDb();
  console.log('Seeding complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
