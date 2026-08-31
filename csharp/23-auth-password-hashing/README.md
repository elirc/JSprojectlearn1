# CS 23 — auth-password-hashing

**Lesson: never store what you can derive — passwords become salted PBKDF2
hashes, and "who's logged in" becomes an opaque server-side session token.**

This is the defensive mirror of js#66: you're building *protection for your own
app's users*, and the original exists to show exactly what you're protecting
them from.

## Run it

```
dotnet run csharp/23-auth-password-hashing/original.cs
dotnet run --project csharp/23-auth-password-hashing/refactored
dotnet run --project csharp/23-auth-password-hashing/refactored -- test
```

Original (http://localhost:5023) — watch the horror:

```
curl -X POST "http://localhost:5023/register?username=alice&password=hunter2"
curl http://localhost:5023/debug/users        -> {"alice":"hunter2"}  readable passwords
curl http://localhost:5023/me -b "session=admin"   -> logged in as admin. No login. Forged.
```

Refactored (same port; credentials move to a JSON body):

```
curl -X POST http://localhost:5023/register -H "Content-Type: application/json" -d "{\"username\":\"alice\",\"password\":\"hunter2hunter2\"}"
curl -i -X POST http://localhost:5023/login -H "Content-Type: application/json" -d "{\"username\":\"alice\",\"password\":\"hunter2hunter2\"}"
curl http://localhost:5023/me -b "session=<token from the Set-Cookie header>"
curl http://localhost:5023/me -b "session=admin"      -> 401. Forgery dead.
curl http://localhost:5023/debug/users                -> salted hashes, no passwords
```

## What's wrong with the original?

1. **Passwords stored as typed** in a `Dictionary<string,string>`. One leaked
   backup/log/debug endpoint and every user's real password (reused on their
   email, of course) is public.
2. **Secrets compared with `==`** — bails at the first wrong byte, so response
   timing leaks how close a guess was.
3. **The "session" is the raw username in a cookie.** Cookies come *from the
   client* — this trusts the person being authenticated to say who they are.
   `curl -b "session=admin"` is a complete attack.
4. **Logout revokes nothing** — the server never remembered anything, so a
   copied cookie works forever.
5. Credentials in the query string land in shell history and server logs.

## What changed in the refactor

- **`PasswordHasher`** — PBKDF2 via built-in `Rfc2898DeriveBytes.Pbkdf2`
  (100k iterations, SHA-256) with a random per-user salt; verification uses
  `CryptographicOperations.FixedTimeEquals`. Stored format records its own
  algorithm + iteration count. Tests prove: round-trip verifies, wrong password
  rejects, same password → different hashes, corrupt entries verify false.
- **`SessionStore`** — login mints an opaque token (`RandomNumberGenerator`,
  32 bytes) mapped server-side to the username; the **HttpOnly** cookie carries
  only the token; logout revokes it server-side, killing even copied cookies.
- **`UserStore`** — register/check against hashes only; unknown users burn a
  dummy hash so timing can't enumerate usernames; login failure is one boring
  401 either way.
- The design goal, in one sentence: **"we never learn your password."**

## Key takeaway

Auth code faces an adversary, so the rules invert: store the hash, not the
secret; trust only what the server itself remembers (opaque tokens, not
client-editable claims); compare secrets in constant time; and make failures
boring and identical. All of it ships in the box — `System.Security.Cryptography`
is the `node:crypto` of .NET.
