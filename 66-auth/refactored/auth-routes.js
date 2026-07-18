/**
 * Auth wired into project 65's framework: register, login, and a
 * requireAuth middleware that protects whatever comes after it.
 *
 * Layering matches 65: users repo (storage) / auth service (rules,
 * from auth.js) / routes (translation). The interesting new piece is
 * requireAuth — auth as MIDDLEWARE, so protection is declared per
 * route, not re-checked inside each handler.
 */
import { HttpError } from '../../65-rest-api/refactored/app.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.js';

export function createUsers() {
  const byName = new Map();
  return {
    get: (username) => byName.get(username),
    insert(username, passwordHash) {
      byName.set(username, { username, passwordHash });
    },
  };
}

export function registerAuthRoutes(app, users, secret) {
  app.post('/register', async (ctx) => {
    const { username, password } = ctx.body ?? {};
    if (typeof username !== 'string' || !/^[a-z0-9_]{2,30}$/i.test(username)) {
      throw new HttpError(400, 'username must be 2-30 word characters');
    }
    if (typeof password !== 'string' || password.length < 8) {
      throw new HttpError(400, 'password must be at least 8 characters');
    }
    if (users.get(username)) throw new HttpError(409, 'username taken');

    users.insert(username, await hashPassword(password)); // hash only — never the password
    ctx.json(201, { username });
  });

  app.post('/login', async (ctx) => {
    const { username, password } = ctx.body ?? {};
    const user = users.get(String(username));
    // ONE error for both "no such user" and "wrong password" — a
    // different message per case tells attackers which usernames
    // exist (user enumeration).
    const ok = user && (await verifyPassword(String(password), user.passwordHash));
    if (!ok) throw new HttpError(401, 'invalid credentials');

    ctx.json(200, { token: signToken({ sub: user.username }, secret) });
  });
}

/** Middleware: everything registered AFTER app.use(requireAuth(...))
 *  sees ctx.user or the request never gets that far. Handlers stay
 *  clean of auth checks entirely. */
export function requireAuth(secret, { skip = ['/register', '/login'] } = {}) {
  return (ctx, next) => {
    if (skip.includes(ctx.path)) return next(ctx);

    const header = ctx.req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token && verifyToken(token, secret);
    if (!payload) throw new HttpError(401, 'missing or invalid token');

    ctx.user = payload.sub; // downstream handlers just read ctx.user
    return next(ctx);
  };
}
