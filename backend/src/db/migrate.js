/**
 * Run database migrations
 */

const { getDb, closeDb } = require('./database');

console.log('Running database migrations...');

try {
  const db = getDb();
  console.log('Database schema applied successfully.');
  closeDb();
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}
