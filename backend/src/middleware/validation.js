/**
 * Input validation and sanitization middleware
 */

/**
 * Sanitize a string to prevent XSS
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate username format
 */
function isValidUsername(username) {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate hex color
 */
function isValidColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate embed URL (only allow trusted sources)
 */
function isValidEmbedUrl(url, type) {
  if (!isValidUrl(url)) return false;

  const allowedDomains = {
    youtube: ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'],
    spotify: ['open.spotify.com'],
    soundcloud: ['soundcloud.com', 'w.soundcloud.com'],
    twitch: ['twitch.tv', 'www.twitch.tv', 'player.twitch.tv'],
    custom: [], // custom embeds are validated differently
  };

  if (type === 'custom') return true; // Admin-approved only

  try {
    const parsed = new URL(url);
    const domains = allowedDomains[type] || [];
    return domains.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

/**
 * Generate a unique 4-digit tag for a username
 */
function generateUniqueTag(db, username) {
  const existing = db.prepare('SELECT tag FROM users WHERE username = ? COLLATE NOCASE')
    .all(username)
    .map(r => r.tag);

  let tag;
  let attempts = 0;
  do {
    tag = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    attempts++;
    if (attempts > 100) throw new Error('Could not generate unique tag');
  } while (existing.includes(tag));

  return tag;
}

module.exports = {
  sanitizeString,
  isValidUsername,
  isValidUrl,
  isValidColor,
  isValidEmbedUrl,
  generateUniqueTag,
};
