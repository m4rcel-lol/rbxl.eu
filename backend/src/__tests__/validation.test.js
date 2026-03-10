/**
 * Tests for validation middleware
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  sanitizeString,
  isValidUsername,
  isValidUrl,
  isValidColor,
  isValidEmbedUrl,
  generateUniqueTag,
} = require('../middleware/validation');

describe('sanitizeString', () => {
  it('should escape HTML entities', () => {
    assert.strictEqual(sanitizeString('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('should handle empty strings', () => {
    assert.strictEqual(sanitizeString(''), '');
  });

  it('should handle non-string input', () => {
    assert.strictEqual(sanitizeString(null), '');
    assert.strictEqual(sanitizeString(undefined), '');
    assert.strictEqual(sanitizeString(123), '');
  });

  it('should escape ampersands', () => {
    assert.strictEqual(sanitizeString('a&b'), 'a&amp;b');
  });

  it('should escape single quotes', () => {
    assert.strictEqual(sanitizeString("it's"), 'it&#x27;s');
  });
});

describe('isValidUsername', () => {
  it('should accept valid usernames', () => {
    assert.strictEqual(isValidUsername('m5rcel'), true);
    assert.strictEqual(isValidUsername('user_name'), true);
    assert.strictEqual(isValidUsername('user-name'), true);
    assert.strictEqual(isValidUsername('User123'), true);
    assert.strictEqual(isValidUsername('abc'), true);
  });

  it('should reject invalid usernames', () => {
    assert.strictEqual(isValidUsername('ab'), false); // too short
    assert.strictEqual(isValidUsername(''), false);
    assert.strictEqual(isValidUsername('a'.repeat(21)), false); // too long
    assert.strictEqual(isValidUsername('user name'), false); // spaces
    assert.strictEqual(isValidUsername('user@name'), false); // special chars
    assert.strictEqual(isValidUsername('user.name'), false); // dots
  });
});

describe('isValidUrl', () => {
  it('should accept valid URLs', () => {
    assert.strictEqual(isValidUrl('https://example.com'), true);
    assert.strictEqual(isValidUrl('http://example.com/path'), true);
    assert.strictEqual(isValidUrl('https://sub.domain.com/path?q=1'), true);
  });

  it('should reject invalid URLs', () => {
    assert.strictEqual(isValidUrl('not-a-url'), false);
    assert.strictEqual(isValidUrl('ftp://example.com'), false);
    assert.strictEqual(isValidUrl('javascript:alert(1)'), false);
    assert.strictEqual(isValidUrl(''), false);
  });
});

describe('isValidColor', () => {
  it('should accept valid hex colors', () => {
    assert.strictEqual(isValidColor('#6750A4'), true);
    assert.strictEqual(isValidColor('#000000'), true);
    assert.strictEqual(isValidColor('#ffffff'), true);
    assert.strictEqual(isValidColor('#ABCDEF'), true);
  });

  it('should reject invalid colors', () => {
    assert.strictEqual(isValidColor('#fff'), false); // 3 digit
    assert.strictEqual(isValidColor('red'), false);
    assert.strictEqual(isValidColor('#GGGGGG'), false);
    assert.strictEqual(isValidColor(''), false);
    assert.strictEqual(isValidColor('#12345'), false); // 5 digit
  });
});

describe('isValidEmbedUrl', () => {
  it('should accept valid YouTube URLs', () => {
    assert.strictEqual(isValidEmbedUrl('https://www.youtube.com/watch?v=abc', 'youtube'), true);
    assert.strictEqual(isValidEmbedUrl('https://youtu.be/abc', 'youtube'), true);
  });

  it('should accept valid Spotify URLs', () => {
    assert.strictEqual(isValidEmbedUrl('https://open.spotify.com/track/abc', 'spotify'), true);
  });

  it('should reject non-matching domains', () => {
    assert.strictEqual(isValidEmbedUrl('https://evil.com/video', 'youtube'), false);
    assert.strictEqual(isValidEmbedUrl('https://notyoutube.com', 'youtube'), false);
  });

  it('should reject invalid URLs', () => {
    assert.strictEqual(isValidEmbedUrl('not-a-url', 'youtube'), false);
  });
});

describe('generateUniqueTag', () => {
  it('should generate a 4-digit tag', () => {
    const mockDb = {
      prepare: () => ({
        all: () => [],
      }),
    };
    const tag = generateUniqueTag(mockDb, 'testuser');
    assert.match(tag, /^\d{4}$/);
  });

  it('should avoid existing tags', () => {
    const existingTags = [{ tag: '0001' }, { tag: '0002' }, { tag: '0003' }];
    const mockDb = {
      prepare: () => ({
        all: () => existingTags,
      }),
    };
    const tag = generateUniqueTag(mockDb, 'testuser');
    assert.match(tag, /^\d{4}$/);
    assert.ok(!['0001', '0002', '0003'].includes(tag), 'Tag should not be one of the existing tags');
  });
});
