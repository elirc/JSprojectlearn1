# 📘 Learning Guide: Auth System

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A login system for the API from project 65. Three abilities:

- **Register**: `POST /register` with `{"username":"ada","password":"longenough"}` → the server stores the account (but *never* the actual password) and answers `{"username":"ada"}`.
- **Login**: `POST /login` with the same credentials → the server answers with a **token**, a long string like `eyJzdWIiOiJhZGEi...`.`x7fQ...` that proves "this is ada" for the next hour.
- **Protected routes**: `GET /me` with the header `Authorization: Bearer <token>` → `{"user":"ada"}`. Without a valid token → `{"error":"missing or invalid token"}` and status 401.

Run `node 66-auth/original.js` and it demonstrates its own security holes, including forging an admin identity in one line. The refactor closes every hole using only Node's built-in `crypto` module — no internet, no packages.

## 2. Concepts you need first

This project builds on project 65 (HTTP, middleware, `HttpError`, the `ctx` object). Read that LEARN.md first if those words are fuzzy. New concepts:

**Authentication (auth)** = proving who you are (login). Different from *authorization* = what you're allowed to do. This project is about the first one.

**Hashing.** A hash function chews any input and spits out a fixed-size fingerprint. Same input → same output, always; but you cannot run it backwards to recover the input.

```js
import crypto from "node:crypto";
const h = crypto.createHash("sha256").update("hello").digest("hex");
console.log(h); // "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
// change ONE letter of the input and the whole fingerprint changes
```

So instead of storing passwords, you store their hashes. At login you hash what the user typed and compare fingerprints. A thief who steals the database gets fingerprints, not passwords.

**Why plain hashing isn't enough — salts.** If two users pick "hunter2", plain hashing gives identical rows — the thief instantly knows they share a password. Worse, attackers precompute giant tables of hash → common-password (called **rainbow tables**) and reverse millions of hashes at once. The fix: a **salt** — a random value generated per user, mixed into the hash. Same password, different salts, totally different hashes. The salt is stored right next to the hash, in plain sight — its job isn't secrecy, it's *uniqueness*.

**Why fast hashing isn't enough — slow hashes.** SHA-256 is designed to be fast; a modern GPU (graphics card, great at repetitive math) can try billions of guesses per second against a stolen hash. Password hashers like **scrypt** (built into Node), bcrypt, and argon2 are deliberately slow and memory-hungry, turning "billions per second" into "thousands per second." Slow is a *feature* here.

**Timing attacks.** JavaScript's `===` on strings gives up at the first mismatched character. That means comparing a guess against a secret takes *slightly longer* when more leading characters are right. An attacker who measures response times millions of times can recover a secret one character at a time — like a movie safecracker listening for clicks. The cure is **constant-time comparison**: `crypto.timingSafeEqual(a, b)` compares *every* byte no matter what, so timing reveals nothing.

**Encoding vs encryption.** Base64 is an *encoding*: a way to write bytes using only safe characters. Anyone can decode it — there's no key, no secret:

```js
const encoded = Buffer.from("admin").toString("base64");
console.log(encoded);                                    // "YWRtaW4="
console.log(Buffer.from(encoded, "base64").toString());  // "admin" — anyone can do this
```

Encoding is a costume, not a lock. (base64**url** is the same idea with URL-safe characters.)

**HMAC — a keyed signature.** An HMAC is a hash that also mixes in a secret key. Only someone who *knows the key* can produce the right output for a given message:

```js
const sig = crypto.createHmac("sha256", "server-secret").update("hello").digest("hex");
console.log(sig); // changes completely if the message OR the key changes
```

So the server can hand out `message + hmac(message)`; later, anyone can *present* a modified message, but they can't produce a matching HMAC without the secret. That property is called being **unforgeable**, and a message carrying such proof is **signed**.

**Tokens.** After login, the client needs to prove its identity on every later request without re-sending the password. A token = a **payload** (data like `{sub:"ada", exp:<deadline>}`; "sub" = subject = who, "exp" = expiry = until when) that the server signed. This is the essence of a **JWT** (JSON Web Token), the industry-standard format. Expiry matters: a stolen token stops working after the deadline. The client sends it in a header: `Authorization: Bearer <token>` — "Bearer" literally means "whoever bears (carries) this."

**Sessions vs tokens, one sentence each:** a *session* keeps "who is logged in" in server memory (instantly revocable, but the server must remember everyone); a *signed token* carries the proof inside itself (nothing to store, but you can't un-sign it — expiry is your safety valve).

**User enumeration.** If login says "no such user" for bad usernames and "wrong password" for good ones, attackers can test which usernames exist — then aim password guesses (and phishing) only at real accounts. Fix: one boring identical message for both failures.

## 3. Walking through the original code

```js
function register(username, password) {
  users[username] = { username: username, password: password };
}
```

The password is stored exactly as typed, in a plain object. Print `users` and there it is.

```js
if (user.password === password) {
  return Buffer.from(username).toString("base64");
}
```

Two sins in two lines: `===` compares the secret character-by-character (timing leak), and the "token" is just the username in base64 — an encoding anyone can produce.

```js
function whoAmI(token) {
  return Buffer.from(token, "base64").toString();
}
```

"Verification" is just decoding. No signature to check, no expiry to enforce. Whatever string you hand it, it believes.

```js
var forged = Buffer.from("admin").toString("base64"); // no login needed
console.log("forged admin token:", forged, "->", whoAmI(forged)); // "admin". done.
```

The file then attacks itself: it mints an "admin" token with one line of code, never having registered or logged in as admin. That's the whole security model collapsing.

## 4. What's wrong with it (in beginner terms)

**1. Plaintext passwords.** Story: your side project's database backup leaks (a misplaced laptop, a public bucket — it happens constantly). Every user's real password is now readable. And because people reuse passwords, the attacker now logs into your users' *email accounts*. With hashes, the same leak yields only fingerprints that take years to crack per user.

**2. `===` on secrets.** Feels paranoid until you learn attacks are automated: a script sends thousands of guesses, measures microsecond timing differences, and statistically peels the secret one byte at a time. `timingSafeEqual` makes every comparison take identical time, so there's nothing to measure.

**3. base64 "tokens".** The token was supposed to *prove* identity, but anyone can write `base64("admin")`. It's like a nightclub accepting any piece of paper with a name written on it as ID.

**4. Verification = decoding, no expiry.** Even if minting were somehow hard, a token stolen once (leaked log, copied laptop) works *forever*. Signed tokens with `exp` mean stolen tokens die within the hour.

## 5. Try it yourself first!

Try patching the original yourself. Hints, vague to specific:

1. What could you store instead of the password so login still works, but a database thief learns nothing? (Node has `crypto.scrypt`.)
2. Two users pick the same password. How do you make their stored rows differ? Where do you keep that extra random ingredient?
3. What could a token contain so that the server can check it's genuine — but nobody without a server secret could make one? (Look up `crypto.createHmac`.)
4. Add a deadline inside the token *before* signing, so tampering with the deadline breaks the signature too.
5. Compare signatures with `crypto.timingSafeEqual` (careful: it throws if lengths differ — check length first).
6. Make wrong-password and no-such-user return the *identical* response.

## 6. Understanding the refactored solution

**`auth.js`** holds the pure primitives — data in, data out, no HTTP:

- `hashPassword(password)` generates 16 random bytes of salt, runs scrypt, and returns `"salthex:keyhex"` — salt and hash in one string. The salt is deliberately not secret; storing it beside the hash is standard practice.
- `verifyPassword(password, stored)` splits out the salt, re-runs scrypt on the guess, and compares with `timingSafeEqual`. Same password → same salt → same key.
- `signToken(payload, secret, {ttlMs})` stamps an expiry into the payload (`exp: now() + ttlMs`; ttl = "time to live"), base64url-encodes the JSON, and appends the HMAC: `"<payload>.<signature>"`. Twenty readable lines — the essence of a JWT.
- `verifyToken(token, secret)` recomputes the HMAC over the payload part, compares in constant time, then checks `exp`. *Any* problem — bad signature, tampered payload, expired, garbage, null — returns `null`. Callers ask one question and get one answer.

Notice `now = Date.now` is a parameter. That's **dependency injection**: tests pass a fake clock (`now: () => 1_000_200`) to prove expiry works without actually waiting an hour.

**`auth-routes.js`** wires the primitives into project 65's framework:

- `/register` validates username shape and password length, then stores `await hashPassword(password)` — the plaintext never touches storage.
- `/login` computes `ok = user && verifyPassword(...)`, and both failure paths land on the same line: `throw new HttpError(401, 'invalid credentials')`. Identical status, identical message — no enumeration oracle.
- `requireAuth(secret)` is middleware: it skips `/register` and `/login`, extracts the token from the `Authorization: Bearer ...` header, verifies it, and either sets `ctx.user` or throws 401 *before any handler runs*. Protection is declared once with `app.use(...)`; individual handlers just read `ctx.user` and never think about auth.

**The tests** (`auth.test.js`) are the best part — each one targets a specific hole in the original:
- Hash tests prove the plaintext isn't inside the stored string, and that hashing the same password twice gives *different* results (that's the salt working).
- "THE FORGERY TEST" replays the original's exact attack — a payload claiming `sub:"admin"` with a fake or missing signature — and asserts `verifyToken` returns `null`.
- The tampering test takes a *valid* signature from ada's token and staples it onto an admin payload: also `null`, because the signature covers the payload bytes.
- Expiry tests use the injected fake clock. Wrong secrets and garbage inputs all return `null`.
- HTTP tests boot a real server (port 0, real `fetch` — fully offline) and walk register → login → `/me`; then prove no-token and bad-token get 401, that wrong-password and ghost-user responses are byte-identical, and that weak registrations are rejected (short password, bad username, duplicate → 400/400/409).

## 7. Words you learned (glossary)

- **authentication** — proving who you are (vs authorization: what you may do).
- **hash** — one-way fixed-size fingerprint of data; can't be reversed.
- **salt** — random per-user value mixed into a hash so identical passwords differ.
- **rainbow table** — precomputed hash→password lookup table; salts defeat it.
- **scrypt / bcrypt / argon2** — deliberately slow, memory-hungry password hashers.
- **brute force** — attacking by trying every possibility.
- **timing attack** — recovering secrets by measuring how long comparisons take.
- **constant-time comparison** — comparing all bytes regardless, leaking no timing (`timingSafeEqual`).
- **base64 / base64url** — encodings for writing bytes as safe text; anyone can decode.
- **encoding vs encryption** — a costume vs a lock; encoding needs no key.
- **HMAC** — hash + secret key: only key-holders can produce a valid one.
- **signature / signed** — proof, attached to data, that a secret-holder produced it.
- **unforgeable** — can't be fabricated without the secret.
- **token** — signed payload the client presents to prove identity per-request.
- **JWT** — JSON Web Token; the standard "payload.signature" token format this mimics.
- **payload / sub / exp** — the token's data / subject (who) / expiry timestamp.
- **TTL** — time to live; how long something stays valid.
- **Bearer header** — `Authorization: Bearer <token>`; whoever carries the token is trusted.
- **session** — server-side memory of who's logged in (the alternative to tokens).
- **user enumeration** — deducing which usernames exist from differing error messages.
- **middleware** — a function that runs before handlers (here: the auth gate).
- **dependency injection** — passing dependencies (like a clock) in as parameters so tests can substitute fakes.

## 8. Experiments to try on the plane (no internet needed)

Everything here uses built-in Node modules and localhost — perfect offline. Run tests with `node --test 66-auth/`.

1. **Watch the forgery die.** In the Node REPL (`node` then paste), import the module: `const { verifyToken } = await import('./66-auth/refactored/auth.js')`. Build the original's attack: `verifyToken(Buffer.from(JSON.stringify({sub:'admin',exp:Date.now()+1e6})).toString('base64url') + '.anything', 'server-secret')`. Expected: `null`.
2. **Peek inside a real token.** `const { signToken } = await import('./66-auth/refactored/auth.js'); const t = signToken({sub:'ada'}, 's'); console.log(Buffer.from(t.split('.')[0], 'base64url').toString())`. Expected: you can *read* `{"sub":"ada","exp":...}` in plain sight — tokens are signed, not hidden. Never put secrets in a payload.
3. **Shrink the TTL to 1ms.** In `auth-routes.js`, change the login route to `signToken({ sub: user.username }, secret, { ttlMs: 1 })`. Expected: the "register → login → /me" test now fails with a 401 — the token expires before it's used.
4. **Break constant-time on purpose (read-only thought experiment made real).** In `verifyToken`, replace the length-check + `timingSafeEqual` with `signature === expected`. Expected: all tests still pass — that's the scary part. Timing holes are invisible to functional tests; only discipline (and code review) catches them. Undo it!
5. **Feel the slowness.** Time 100 hashes: `console.time('h'); for (let i=0;i<100;i++) await hashPassword('x'.repeat(10)); console.timeEnd('h')` in the REPL. Expected: on the order of *seconds* — now imagine an attacker needing billions of tries.
