# 📘 Learning Guide: Auth & Password Hashing

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them. Everything here is about *defending your own app's users*; the original exists so you can see, on localhost, exactly what you're defending them from.

## 1. What are we building?

Register / login / who-am-I / logout — the smallest possible account system:

- `POST /register` — create an account
- `POST /login` — check credentials, start a "session"
- `GET /me` — who is currently logged in?
- `POST /logout` — end the session

Both versions run on `http://localhost:5023` and *appear* to behave identically in the happy path. The difference is what happens when something goes wrong: a leaked user table, a forged cookie, a stolen laptop. The original fails all three instantly. The refactor is built so those disasters cost the attacker as much as possible.

This mirrors js#66, where you built hashing and tokens with `node:crypto`. Here it's `System.Security.Cryptography` — same ideas, batteries also included.

## 2. Concepts you need first

### Hashing is not encryption
**Encryption** is two-way: encrypt with a key, decrypt with a key, the original comes back. **Hashing** is one-way: password in, fixed-size fingerprint out, and there is *no* function that turns the fingerprint back into the password. That asymmetry is the whole trick:

```
"hunter2"  --hash-->  "a1b2c3...64 chars"     easy
"a1b2c3..."  --????-->  "hunter2"             no such operation exists
```

For login you never need the password back — you only need to answer "is this the same password as before?" So: at registration, store `hash(password)`. At login, compute `hash(attempt)` and compare *hashes*. The real password is needed for milliseconds and stored never. That's the design goal in one sentence: **we never learn your password.** If we don't have it, we can't leak it.

### Why fast hashes aren't enough: brute force
SHA-256 of a password is one-way, but a GPU computes *billions* of SHA-256 hashes per second. Given a stolen hash table, an attacker just hashes every common password and compares. The defense is a hash that is **deliberately slow**: PBKDF2 runs the hash function 100,000 times in a chain. Your server pays ~50ms once per login — an attacker pays it *per guess*, turning billions-per-second into thousands-per-second. bcrypt, scrypt (js#66's choice), and argon2 are the same idea with different internals; PBKDF2 is the one built into .NET:

```csharp
byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
    password, salt, 100_000, HashAlgorithmName.SHA256, 32);
```

### Salt: why identical passwords must not hash identically
If `hash("hunter2")` were always the same bytes, two bad things happen: attackers can precompute a dictionary of common-password hashes once and reuse it forever (a **rainbow table**), and anyone holding your table can see *which users share a password*. The fix: mix a random per-user **salt** into each hash. Now `hash(salt1 + "hunter2") != hash(salt2 + "hunter2")` — every user's hash is unique even when their passwords aren't, and precomputed tables match nothing.

The salt is **not a secret**. It's stored in plain sight next to the hash; its only job is making each hash computation unique. Our stored format:

```
pbkdf2-sha256$100000$<salt-base64>$<hash-base64>
```

Self-describing on purpose: when you raise the iteration count next year, old entries still verify using *their* recorded count, and get re-hashed at next successful login.

### Timing attacks and constant-time comparison
`==` on strings returns false at the *first* differing character — so comparing secrets with `==` answers faster the wronger the guess is. Precise timing measurements can then recover a secret byte by byte. It sounds exotic; it's been demonstrated over networks. The cure is a comparison that always inspects every byte:

```csharp
CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
```

Same idea as js#66's `timingSafeEqual`. Rule: **secrets are compared in constant time, always.** Related rule you'll see in `UserStore`: when the *username* doesn't exist, we hash a dummy value anyway, so "unknown user" takes as long as "wrong password" — otherwise attackers could discover which usernames exist by timing (username **enumeration**).

### Cookies, and why the client can't be trusted to say who they are
A **cookie** is a little named value the server asks the browser to store (`Set-Cookie: session=xyz`), which the browser then attaches to every future request to that site. Crucial detail: the request's cookie header is composed *by the client*. curl will happily send `-b "session=admin"`. So a cookie's contents prove nothing — if your cookie literally contains the username, everyone is whoever they feel like being today.

Two cookie flags matter here: **HttpOnly** (page JavaScript can't read the cookie — so an XSS bug can't exfiltrate it) and **SameSite=Lax** (the browser won't attach it to cross-site POSTs — blunting "your browser gets tricked into acting while logged in", CSRF). Production adds `Secure` (HTTPS only).

### Sessions: opaque tokens + server-side memory
If the cookie can't carry identity, what goes in it? A **session token**: a large random value that *means nothing by itself* — a claim-check, like a coat-check ticket. The server keeps a private table `token -> username`. Login mints a token and records it; `/me` looks the cookie's token up in the table; logout deletes the entry, which instantly invalidates every copy of that cookie anywhere in the world.

Forging a login now requires guessing a 256-bit random number. There are ~10^77 of them. Guessing is not a plan.

(js#66 also showed the other family — *signed* tokens like JWTs, where the server stores nothing and verifies a signature instead. Server-side sessions are the simpler tool and revoke instantly; signed tokens shine when many servers must verify without shared state. Learn sessions first.)

### Randomness that's safe for security
`Random`/`Random.Shared` is predictable — fine for dice, catastrophic for tokens (an attacker who learns a few outputs can predict the rest). Security randomness comes from the OS: `RandomNumberGenerator.GetBytes(32)`. Rule: if guessing it helps an attacker, it comes from `RandomNumberGenerator`.

## 3. Walking through the original code

The storage:

```csharp
var users = new Dictionary<string, string>();   // username -> password. The actual password.
users[username] = password;                     // stored AS TYPED
```

The login check:

```csharp
if (!users.TryGetValue(username, out var stored) || stored != password)
    return Results.BadRequest("wrong username or password");
ctx.Response.Cookies.Append("session", username);   // the "session" is... the username
```

`stored != password` is a plain string comparison of a secret (timing leak — the least of this file's problems). Then the cookie: the server literally tells the browser "remember that you are alice", and later...

```csharp
var who = ctx.Request.Cookies["session"];
return Results.Ok($"logged in as {who}");   // ...believes whatever comes back
```

`/me` performs no lookup, no verification — the client's own claim is the authentication. And `/debug/users` returns the dictionary: every password, readable. The file's comments walk you through both attacks; run them from the README.

## 4. What's wrong with it (in beginner terms)

**1. The password table is a bomb.** Databases leak: backups get misplaced, logs capture the wrong thing, an admin gets phished, a laptop gets stolen. Plaintext storage converts *any* of those events into "every user's real password is public" — and users reuse passwords, so the blast radius is their email, their bank. Hashing means the same leak yields fingerprints that cost years of GPU time instead of seconds of reading.

**2. Anyone can be anyone.** `curl -b "session=admin" http://localhost:5023/me` → "logged in as admin". No registration, no password, one flag to curl. The server outsourced the question "who are you?" to the person asking.

**3. Logout is theater.** `Cookies.Delete` just tells *your* browser to forget the cookie. The server kept no session state, so a copied cookie (public computer, network sniff on plain HTTP) keeps working forever. There's nothing to revoke because nothing was ever issued.

**4. Even the comparison leaks.** `==` short-circuits; response timing correlates with how many leading characters were right. Fixable for free with `FixedTimeEquals` — but only if the code compares hashes rather than plaintext in the first place.

**5. Passwords in the query string** get written into shell history and access logs — one more copy of the secret, in the least protected places.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 What's the *minimum* the server must remember to check a password later? (Hint: not the password.)
2. 🌿 Write `PasswordHasher.Hash(password)` using `RandomNumberGenerator.GetBytes(16)` for a salt and `Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32)`. Store salt + hash together in one string (base64, with a separator). Write `Verify(password, stored)` that re-computes with the *stored* salt and compares via `CryptographicOperations.FixedTimeEquals`.
3. 🌳 Replace the cookie's contents: on login, generate `Convert.ToHexString(RandomNumberGenerator.GetBytes(32))`, keep a `Dictionary<string,string>` of token → username on the server, and have `/me` look the cookie's value up there. Mark the cookie HttpOnly.
4. 🍎 Make logout `Remove` the token from the dictionary. Then test everything with no HTTP at all: hash round-trip, wrong password, two hashes of the same password differ, token create/lookup/revoke.

## 6. Understanding the refactored solution

Three small classes, each testable without a server, plus thin endpoints.

**`PasswordHasher.cs`** — pure functions, no state:

```csharp
public static string Hash(string password)
{
    byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
    byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);
    return $"pbkdf2-sha256${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
}
```

`Verify` parses that format back, re-derives with the stored salt and *stored* iteration count, and calls `FixedTimeEquals`. Note its defensive posture: malformed or tampered entries return `false` — never throw. The tests hammer this: garbage strings, wrong part counts, invalid base64.

**`SessionStore.cs`** — the coat-check counter. `Create` mints a 64-hex-char token from 32 crypto-random bytes and records it; `UserFor` answers the only question the app has ("whose token is this, if anyone's?"); `Revoke` deletes. A `lock` guards the dictionary (project 21's lesson — web servers are concurrent).

**`UserStore.cs`** — glue with two subtleties. Hashing happens *outside* the lock (it's slow by design; don't hold the door for 50ms). And:

```csharp
return PasswordHasher.Verify(password, stored ?? DummyHash) && stored is not null;
```

Unknown user? Verify against a dummy hash anyway, then still return false. The work done is identical for "no such user" and "wrong password" — timing reveals nothing, and the endpoint returns the same boring 401 for both.

**`Program.cs`** — reads like a policy document now: credentials arrive in a JSON body; register enforces a minimum length; login's cookie is `HttpOnly` + `SameSite=Lax` and carries only the token; logout revokes server-side *first*, then clears the cookie; `/debug/users` still exists — go look at it. Salted hashes. A breach now steals homework, not identities.

## 7. Words you learned (glossary)

- **Hashing** — one-way transformation to a fixed-size fingerprint; cannot be reversed.
- **Encryption** — two-way transformation with a key; the wrong tool for passwords.
- **Brute force** — guessing passwords by trying millions of candidates against stolen hashes.
- **PBKDF2** — a deliberately slow hash (repeat SHA-256 100k times); .NET: `Rfc2898DeriveBytes.Pbkdf2`.
- **Salt** — random per-user bytes mixed into the hash; public, but makes every hash unique.
- **Rainbow table** — precomputed hash dictionary of common passwords; salts kill it.
- **Timing attack** — extracting secrets by measuring how long comparisons take.
- **Constant-time comparison** — `CryptographicOperations.FixedTimeEquals`; every byte, every time.
- **Username enumeration** — discovering valid usernames from differing responses/timing; blunted by dummy hashing + identical failures.
- **Cookie** — server-assigned value the browser re-sends; contents are client-controlled.
- **HttpOnly / SameSite** — cookie flags: invisible to page JS / withheld from cross-site requests.
- **Session token** — large random value in the cookie; meaningful only via the server's table.
- **Opaque token** — a token that carries no information itself (vs a signed token like a JWT).
- **Revocation** — server-side deletion of a session; kills all copies of the cookie at once.
- **`RandomNumberGenerator`** — OS-grade crypto randomness; `Random` is for games only.

## 8. Experiments to try on the plane (no internet needed)

All attacks below are against *your own* localhost server — that's the point: see them once so you never build the vulnerable shape again.

1. **Run both attacks against the original.** Start it; register alice; then `curl http://localhost:5023/me -b "session=admin"` (total forgery, works) and `curl http://localhost:5023/debug/users` (readable passwords). Now start the refactored server and repeat both. Expected: 401 for the forgery; hashes-only for the table.
2. **Watch the salt work.** Refactored server: register `bob` and `carol` with the *same* password (JSON bodies per the README), then `curl http://localhost:5023/debug/users`. Expected: two completely different hash strings. The stored table doesn't even reveal that they share a password.
3. **Kill a stolen cookie.** Log in, copy the token from `Set-Cookie`, and use it via `-b "session=<token>"` — works. Now `curl -X POST http://localhost:5023/logout -b "session=<token>"`, then retry `/me` with the *same copied token*. Expected: 401. Server-side revocation killed the copy — replay the same against the original and note its cookie never dies.
4. **Feel the deliberate slowness.** In `Tests.cs`, time it: `var sw = System.Diagnostics.Stopwatch.StartNew(); PasswordHasher.Hash("x"); Console.WriteLine(sw.ElapsedMilliseconds);`. Expected: tens of milliseconds — then flip iterations to 1,000 and watch it drop. That cost difference, multiplied by billions of guesses, is the entire defense. (Put it back to 100_000; the format test pins it and will fail until you do.)
5. **Prove tampering can't crash Verify.** Add a test: take a real hash, replace its last 4 chars with `AAAA`, `Check.True(!PasswordHasher.Verify(...))`. Expected: false, no exception — corrupted stores must fail closed.
6. **One boring failure message.** `curl -i` a login with a wrong password, then with a nonexistent username. Expected: byte-identical 401s. Now find the original's code path that returns "wrong username or password" for both but *instantly* for unknown users — the timing, not the text, is the tell.
