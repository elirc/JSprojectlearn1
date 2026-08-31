# 🏋️ Practice: Auth System

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. decodePayload — read without trusting (warm-up)

Write `decodePayload(token)` that returns a token's payload object *without checking the signature or expiry* — split off the part before the `.`, base64url-decode it, `JSON.parse` it; return `null` for anything malformed instead of throwing. Check: for `signToken({ sub: 'ada' }, 's')` it returns an object with `sub: 'ada'` and a numeric `exp` — and it returns the *same* payload even when you staple on a junk signature. That second check is the lesson: this function is for debugging displays only, never for deciding who someone is.

What it practices: the encoding-vs-signing distinction — anyone can read a token; only `verifyToken` can trust one.

Hint: `Buffer.from(String(token).split('.')[0], 'base64url').toString()`, wrapped in try/catch.

### ⭐⭐ 2. Test the exact expiry instant (core)

`auth.test.js` proves a token works 50ms before expiry and fails 100ms after — but what happens at the *exact* millisecond `exp` names? Read `verifyToken`'s comparison and predict, then pin it with a test: sign with `{ ttlMs: 500, now: () => 1000 }` (so `exp` is 1500) and assert the token verifies at `now: () => 1500` but returns `null` at `now: () => 1501`.

What it practices: boundary testing with an injected clock — no waiting, no flaky timing.

Hint: the check is `payload.exp < now()` — strictly less-than. At `now === exp` that's false, so the token is still alive.

### ⭐⭐ 3. refreshToken (core)

Sliding sessions re-issue a token on activity so users aren't logged out mid-work. Write `refreshToken(token, secret, opts)`: verify the old token (same `opts` so tests can inject `now`/`ttlMs`); if invalid or expired return `null`; otherwise re-sign the same claims — minus the old `exp`, which `signToken` replaces — with a fresh deadline. Check with fake clocks: a token signed at time 0 with `ttlMs` 1000, refreshed at 900, yields a token whose `sub` still verifies at 1200 (when the original is already dead) but not at 2000; refreshing an *expired* or garbage token gives `null`.

What it practices: composing the two primitives so expiry stays a hard limit on *inactivity*, not on session length.

Hint: `const { exp, ...claims } = payload;` then `signToken(claims, secret, opts)`.

### ⭐⭐ 4. requireRole — authorization on the onion (core)

Add a `role` claim at signing time (`signToken({ sub, role }, secret)`), then write middleware `requireRole(secret, role)` in the style of `requireAuth`: no/invalid token → `HttpError` 401; valid token whose `payload.role !== role` → 403 (`authenticated` but not `authorized`); otherwise set `ctx.user` and call `next(ctx)`. Prove it with **fake ctx objects** — no server needed: `{ req: { headers: { authorization: 'Bearer ' + token } } }` and a `next` that returns `'reached-handler'`. Check all four paths: admin token passes, user token → status 403, missing header → 401, garbage token → 401.

What it practices: authentication vs authorization as two different status codes, and testing middleware in isolation.

Hint: copy `requireAuth`'s header-parsing lines; assert with `assert.throws(() => mw(ctx, next), (e) => e.status === 403)`.

### ⭐⭐⭐ 5. Harden verifyPassword against corrupt storage (challenge)

First prove the hole with a test: `await assert.rejects(() => verifyPassword('pw', 'no-colon-in-here'))` — a stored string without a `:` (or with a wrong-length key, like `'aa:bb'`) makes the primitive *throw* instead of returning false, because `timingSafeEqual` demands equal-length buffers. Then write `safeVerifyPassword(password, stored)` that returns `false` for any malformed `stored` value — missing parts, wrong key length, `null` — and still returns true/false correctly for real hashes. Stored data is input (project 63's rule), and a corrupted user row shouldn't 500 the login route.

What it practices: adversarial thinking about your *own* database as untrusted input, and the length-check ritual `timingSafeEqual` requires.

Hint: split, bail `false` if either half is falsy, compare lengths before `timingSafeEqual`, and wrap the whole body in try/catch as a last line of defense.

### ⭐⭐⭐ 6. Logout: a revocation list (challenge)

The README says signed tokens "cost nothing to check" but "you can't un-sign" them — so build the standard workaround. Write `createRevocations()` returning `{ revoke(token), isRevoked(token) }` backed by a `Set` of revoked *signature* parts (the bit after the `.` — unique per token, and storing it leaks no claims), plus `verifyWithRevocation(token, secret, revocations, opts)` that returns `null` for revoked tokens and defers to `verifyToken` otherwise. Check: after `revoke(a)`, token `a` fails through the wrapper while `verifyToken(a, secret)` alone *still succeeds* — that contrast is the whole sessions-vs-JWT trade-off — and other users' tokens are unaffected.

What it practices: the sessions-vs-tokens trade-off made concrete — revocation reintroduces exactly the server-side state that tokens were meant to avoid.

Hint: `String(token).split('.')[1]` is the signature; check the Set *before* calling `verifyToken`.

## Solutions

### 1. decodePayload

```js
export function decodePayload(token) {
  try {
    return JSON.parse(Buffer.from(String(token).split('.')[0], 'base64url').toString());
  } catch {
    return null;
  }
}
```

WHY: The payload is base64url — an encoding, not a lock — so reading it needs no secret; that's LEARN.md's "costume, not a lock" made runnable. Keeping this separate from `verifyToken` enforces the discipline: one function *reads*, one function *trusts*, and only the second one may ever gate a route. The try/catch mirrors `verifyToken`'s "garbage in, null out" contract.

### 2. The expiry-instant test

```js
test('a token is valid AT its exp instant, dead one ms later', () => {
  const t = signToken({ sub: 'ada' }, 's', { ttlMs: 500, now: () => 1000 }); // exp = 1500
  assert.ok(verifyToken(t, 's', { now: () => 1500 }));
  assert.equal(verifyToken(t, 's', { now: () => 1501 }), null);
});
```

WHY: `verifyToken` rejects when `payload.exp < now()`, so the boundary millisecond is *inclusive* — a fact nobody should have to rediscover in production logs. Dependency-injecting `now` (the project's own trick) turns a timing question into two deterministic assertions; without it this test would need real sleeps and still be flaky.

### 3. refreshToken

```js
export function refreshToken(token, secret, opts = {}) {
  const payload = verifyToken(token, secret, opts);
  if (!payload) return null;
  const { exp, ...claims } = payload; // drop the old deadline, keep the claims
  return signToken(claims, secret, opts);
}
```

WHY: Built entirely from the verified primitives: refusal to refresh anything `verifyToken` won't vouch for means an expired or forged token can't be laundered into a fresh one. Destructuring `exp` out matters — `signToken` spreads the payload *then* stamps `exp`, so leaving the stale one in would be harmless today but a trap after any reorder of that spread. Callers get the familiar contract: token or `null`, one question, one answer.

### 4. requireRole

```js
export function requireRole(secret, role) {
  return (ctx, next) => {
    const header = ctx.req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token && verifyToken(token, secret);
    if (!payload) throw new HttpError(401, 'missing or invalid token');
    if (payload.role !== role) throw new HttpError(403, 'insufficient role');
    ctx.user = payload.sub;
    return next(ctx);
  };
}

// tested with fakes — no server:
const mw = requireRole('s', 'admin');
const fake = (t) => ({ req: { headers: t ? { authorization: `Bearer ${t}` } : {} } });
const admin = signToken({ sub: 'grace', role: 'admin' }, 's');
assert.equal(mw(fake(admin), () => 'reached-handler'), 'reached-handler');
assert.throws(() => mw(fake(signToken({ sub: 'ada', role: 'user' }, 's')), () => {}),
  (e) => e.status === 403);
assert.throws(() => mw(fake(null), () => {}), (e) => e.status === 401);
```

WHY: 401 answers "who are you?" and 403 answers "you, specifically, may not" — collapsing them loses information clients rely on. The claim rides inside the signed payload, so a user cannot promote themselves without breaking the HMAC (the forgery test's guarantee, reused). And because middleware is just a function of `(ctx, next)`, a plain object impersonates the whole HTTP stack — protection logic gets unit tests, not just integration tests.

### 5. safeVerifyPassword

```js
const scrypt = (password, salt) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))));

export async function safeVerifyPassword(password, stored) {
  try {
    const [saltHex, keyHex] = String(stored).split(':');
    if (!saltHex || !keyHex) return false;
    const candidate = await scrypt(password, Buffer.from(saltHex, 'hex'));
    const key = Buffer.from(keyHex, 'hex');
    if (candidate.length !== key.length) return false;
    return crypto.timingSafeEqual(candidate, key);
  } catch {
    return false;
  }
}
```

WHY: The demonstration test shows the primitive trusts its second argument completely — reasonable for a private helper, dangerous the moment stored rows can be migrated, truncated, or hand-edited. The length check before `timingSafeEqual` is the same ritual `verifyToken` performs, and it leaks nothing: length mismatch means the stored blob is structurally broken, not that a guess was close. Failing *closed* (`false`, a boring 401) beats failing *loud* (a 500 revealing your storage format is corrupt).

### 6. Revocation list

```js
export function createRevocations() {
  const revoked = new Set();
  return {
    revoke(token) {
      const sig = String(token).split('.')[1];
      if (sig) revoked.add(sig);
    },
    isRevoked: (token) => revoked.has(String(token).split('.')[1]),
  };
}

export function verifyWithRevocation(token, secret, revocations, opts) {
  if (revocations.isRevoked(token)) return null;
  return verifyToken(token, secret, opts);
}
```

WHY: The contrast the checks demand — wrapper says `null`, bare `verifyToken` still says valid — *is* the README's one-sentence trade-off running on your machine: signatures can't be recalled, so logout requires the server to remember something again, exactly what tokens promised to avoid. Storing only the signature keys the Set on something unique per token without persisting claims. Expiry keeps the Set from growing forever: entries older than the TTL can never verify anyway and may be swept.
