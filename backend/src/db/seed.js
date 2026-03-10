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

  closeDb();
  console.log('Seeding complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
