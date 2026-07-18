/**
 * The three primitives every auth system is built from — done with
 * node:crypto, nothing else:
 *
 *   hashPassword / verifyPassword — scrypt with a per-user random
 *     salt. Slow ON PURPOSE (memory-hard), so leaked hashes resist
 *     brute force. bcrypt/argon2 are the same idea as npm packages.
 *
 *   signToken / verifyToken — an HMAC-signed, expiring token (the
 *     essence of a JWT). Unforgeable without the server secret;
 *     verification recomputes the signature and compares in
 *     CONSTANT TIME.
 *
 * Everything is data-in/data-out — HTTP appears only in middleware.js.
 */
import crypto from 'node:crypto';

const scrypt = (password, salt) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))));

// ---------- passwords -------------------------------------------------

/** -> "salthex:keyhex". The salt rides along with the hash — it's not
 *  a secret; its job is making identical passwords hash differently
 *  (so a cracked hash cracks ONE account, and rainbow tables die). */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = stored.split(':');
  const candidate = await scrypt(password, Buffer.from(saltHex, 'hex'));
  // timingSafeEqual: compare ALL bytes no matter what, so response
  // time can't whisper how close a guess was.
  return crypto.timingSafeEqual(candidate, Buffer.from(keyHex, 'hex'));
}

// ---------- tokens ----------------------------------------------------

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function hmac(payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

/** payload + expiry, signed: "<base64url payload>.<hmac>". Forging a
 *  token = producing a valid HMAC without the secret = breaking
 *  SHA-256. The original's forgery demo dies here. */
export function signToken(payload, secret, { ttlMs = 60 * 60 * 1000, now = Date.now } = {}) {
  const body = b64url(JSON.stringify({ ...payload, exp: now() + ttlMs }));
  return `${body}.${hmac(body, secret)}`;
}

/** -> payload, or null for ANY problem (tampered, forged, expired,
 *  garbage). Callers get one question answered: is this bearer real? */
export function verifyToken(token, secret, { now = Date.now } = {}) {
  const [body, signature] = String(token).split('.');
  if (!body || !signature) return null;

  const expected = hmac(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof payload.exp !== 'number' || payload.exp < now()) return null; // stolen tokens age out
    return payload;
  } catch {
    return null;
  }
}
