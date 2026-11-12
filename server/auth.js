// Password hashing (scrypt, NFR-06) and session cookies (HttpOnly, NFR-08).
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { q } from './db.js';

const scrypt = promisify(crypto.scrypt);
export const COOKIE = 'vm_session';
const SESSION_HOURS = 12;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, salt, hex] = String(stored).split('$');
  if (alg !== 'scrypt' || !salt || !hex) return false;
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, 'hex');
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
}

export async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await q("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' hours')::interval)", [token, userId, String(SESSION_HOURS)]);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_HOURS * 3600 * 1000,
    path: '/'
  });
}

export async function destroySession(req, res) {
  const token = readCookie(req);
  if (token) await q('DELETE FROM sessions WHERE token = $1', [token]);
  res.clearCookie(COOKIE, { path: '/' });
}

export function readCookie(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

// Loads the signed-in user (or null) into req.user.
export async function sessionMiddleware(req, res, next) {
  try {
    req.user = null;
    const token = readCookie(req);
    if (token) {
      const r = await q(`SELECT u.* FROM sessions s JOIN users u ON u.user_id = s.user_id
        WHERE s.token = $1 AND s.expires_at > now() AND u.is_blocked = FALSE`, [token]);
      req.user = r.rows[0] || null;
    }
    next();
  } catch (e) {
    next(e);
  }
}
