# 66 — Auth system

**Lesson: security thinking begins here — passwords become salted slow
hashes, tokens become unforgeable signed claims, and protection becomes
middleware.**

## Run it

```
node 66-auth/original.js     # it demonstrates its own holes, including the forgery
node --test 66-auth/
```

## What's wrong with the original?

The version that gets people breached, one line at a time:

1. **Passwords stored as typed.** One leaked backup and every user's real
   password (reused on their email, of course) is public.
2. **Secrets compared with `===`** — string comparison bails at the first
   wrong byte, so response *timing* leaks how close a guess was; secrets
   can be recovered byte-by-byte.
3. **The "token" is `base64(username)`.** Encoding is not encryption and
   definitely not authentication — the demo forges an admin token in one
   line, no login required.
4. **"Verification" is decoding**: no signature, no expiry — a stolen
   token works forever.

## What changed in the refactor

- **`hashPassword` = scrypt + per-user random salt** (node:crypto —
  bcrypt/argon2 are the same idea as packages). Slow *on purpose*, so
  leaked hashes resist brute force; salted, so two users with the same
  password get different hashes (the test proves it) and rainbow tables
  die. The salt rides along in the stored string — it's not a secret.
- **`verifyPassword` and token checks use `timingSafeEqual`** — all bytes
  compared, always, so timing whispers nothing.
- **Tokens are HMAC-signed payloads with expiry** — the essence of a JWT
  in 20 readable lines. Forging one means producing a valid HMAC without
  the server secret, i.e. breaking SHA-256; the test replays the
  original's forgery attack and watches it die. Sessions vs JWT in one
  sentence: sessions store state server-side and revoke instantly; signed
  tokens carry state and cost nothing to check — expiry is how you cap
  their theft window.
- **`requireAuth` is middleware on project 65's onion**: routes after it
  simply *have* `ctx.user`; unauthenticated requests never reach a
  handler. Protection is declared once, not re-checked per route.
- **Login failures are identical for wrong-password and no-such-user**
  (tested by comparing the responses) — differing messages are a username
  enumeration oracle.

## Key takeaway

Auth is the first place your code faces an *adversary*, and the rules are
inverted from normal programming: never store what you can derive
(hashes, not passwords), never trust what you didn't sign, compare
secrets in constant time, and make failure messages boring on purpose.
None of it needed a framework — just `node:crypto` and the discipline.
