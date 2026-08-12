import crypto from 'crypto';

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'ephemeris_session';
const SESSION_MAX_AGE = 60 * 60 * 8;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

export function verifyPassword(password, storedHash) {
  const [scheme, rounds, salt, expected] = String(storedHash).split('$');
  if (scheme !== 'pbkdf2_sha256' || !rounds || !salt || !expected) return false;

  const actual = crypto
    .pbkdf2Sync(password, salt, Number(rounds), Buffer.from(expected, 'hex').length, 'sha256')
    .toString('hex');

  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const rounds = 310000;
  const hash = crypto.pbkdf2Sync(password, salt, rounds, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$${rounds}$${salt}$${hash}`;
}

export function createSessionValue(user) {
  const payload = base64url(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  }));
  return `${payload}.${sign(payload)}`;
}

export function readSessionValue(value) {
  if (!value || !value.includes('.')) return null;
  const [payload, signature] = value.split('.');
  if (signature !== sign(payload)) return null;

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

export function sessionCookieOptions() {
  const options = {
    httpOnly: true,
    // 'lax' memungkinkan cookie terkirim saat navigasi antar subdomain
    // (admin.ephemeris.id ↔ staff.ephemeris.id) tanpa mengorbankan keamanan CSRF.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
  // Di produksi dengan subdomain terpisah, set SESSION_COOKIE_DOMAIN=.ephemeris.id
  // agar semua app berbagi sesi login yang sama.
  if (process.env.SESSION_COOKIE_DOMAIN) {
    options.domain = process.env.SESSION_COOKIE_DOMAIN;
  }
  return options;
}

export { SESSION_COOKIE };
