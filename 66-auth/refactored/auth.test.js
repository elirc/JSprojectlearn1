import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.js';
import { createApp, jsonBody } from '../../65-rest-api/refactored/app.js';
import { createUsers, registerAuthRoutes, requireAuth } from './auth-routes.js';

// ---------- the primitives -------------------------------------------

test('password hashes verify, and the plaintext is nowhere in them', async () => {
  const stored = await hashPassword('correct horse battery staple');
  assert.ok(!stored.includes('correct horse'));
  assert.equal(await verifyPassword('correct horse battery staple', stored), true);
  assert.equal(await verifyPassword('wrong horse', stored), false);
});

test('same password, two users -> DIFFERENT hashes (salt kills rainbow tables)', async () => {
  const a = await hashPassword('hunter2hunter2');
  const b = await hashPassword('hunter2hunter2');
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('hunter2hunter2', a), true);
  assert.equal(await verifyPassword('hunter2hunter2', b), true);
});

test('tokens round-trip their payload', () => {
  const token = signToken({ sub: 'ada' }, 'server-secret');
  assert.equal(verifyToken(token, 'server-secret').sub, 'ada');
});

test("THE FORGERY TEST: the original's attack fails here", () => {
  // The original accepted base64("admin") as a token. Try the
  // equivalent here: a payload with no valid signature.
  const body = Buffer.from(JSON.stringify({ sub: 'admin', exp: Date.now() + 1e6 }))
    .toString('base64url');
  assert.equal(verifyToken(`${body}.fake-signature`, 'server-secret'), null);
  assert.equal(verifyToken(body, 'server-secret'), null); // no signature at all
});

test('tampering with the payload invalidates the signature', () => {
  const token = signToken({ sub: 'ada' }, 'server-secret');
  const [, signature] = token.split('.');
  const evil = Buffer.from(JSON.stringify({ sub: 'admin', exp: Date.now() + 1e6 }))
    .toString('base64url');
  assert.equal(verifyToken(`${evil}.${signature}`, 'server-secret'), null);
});

test('tokens expire; the wrong secret verifies nothing; garbage is null', () => {
  const now = () => 1_000_000;
  const token = signToken({ sub: 'ada' }, 's', { ttlMs: 100, now });
  assert.ok(verifyToken(token, 's', { now: () => 1_000_050 }));
  assert.equal(verifyToken(token, 's', { now: () => 1_000_200 }), null); // aged out
  assert.equal(verifyToken(token, 'other-secret'), null);
  for (const junk of ['', 'a.b', 'a.b.c', null, undefined]) {
    assert.equal(verifyToken(junk, 's'), null);
  }
});

// ---------- the wired API --------------------------------------------

let server, base;
const SECRET = 'test-secret';

before(async () => {
  const app = createApp();
  app.use(jsonBody());
  app.use(requireAuth(SECRET));
  registerAuthRoutes(app, createUsers(), SECRET);
  app.get('/me', (ctx) => ctx.json(200, { user: ctx.user })); // a protected route
  server = app.listen(0);
  await new Promise((r) => server.on('listening', r));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const post = (path, body) => fetch(base + path, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

test('the full story: register -> login -> access a protected route', async () => {
  assert.equal((await post('/register', { username: 'ada', password: 'longenough' })).status, 201);

  const login = await post('/login', { username: 'ada', password: 'longenough' });
  assert.equal(login.status, 200);
  const { token } = await login.json();

  const me = await fetch(`${base}/me`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { user: 'ada' });
});

test('no token / bad token -> 401; handlers never even run', async () => {
  assert.equal((await fetch(`${base}/me`)).status, 401);
  const bad = await fetch(`${base}/me`, { headers: { authorization: 'Bearer nonsense' } });
  assert.equal(bad.status, 401);
});

test('login failures are IDENTICAL for wrong password and unknown user', async () => {
  const wrongPass = await post('/login', { username: 'ada', password: 'wrongwrong' });
  const noUser = await post('/login', { username: 'ghost', password: 'wrongwrong' });
  assert.equal(wrongPass.status, 401);
  assert.equal(noUser.status, 401);
  assert.deepEqual(await wrongPass.json(), await noUser.json()); // no user enumeration
});

test('weak registrations are rejected', async () => {
  assert.equal((await post('/register', { username: 'x', password: 'longenough' })).status, 400);
  assert.equal((await post('/register', { username: 'newuser', password: 'short' })).status, 400);
  assert.equal((await post('/register', { username: 'ada', password: 'longenough' })).status, 409);
});
