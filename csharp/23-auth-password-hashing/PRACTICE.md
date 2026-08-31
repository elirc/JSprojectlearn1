# 🏋️ Practice: Auth & Password Hashing

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Is this hash out of date? (warm-up)

The stored format records its own iteration count precisely so it can be upgraded later. Cash that in: add `PasswordHasher.NeedsRehash(string stored)` returning `true` when the entry was made with fewer iterations than the current constant — and `true` for anything unparseable or foreign-format, because a plaintext-era entry is the most out-of-date entry of all. Make `Iterations` `public const` so tests can reference it.
*Practices:* the pure domain layer — parsing the self-describing format, and failing *safe* (unknown means "upgrade me") rather than failing open.
**Hint:** it is `Verify`'s first three lines with a different ending. Every early return that `Verify` answers `false` to, this one answers `true` to.
**Check offline:** add these Check tests to `Tests.cs` — all should pass:
```csharp
var current = PasswordHasher.Hash("a-perfectly-fine-passphrase");
Check.Equal(false, PasswordHasher.NeedsRehash(current), "a hash made today is up to date");
Check.True(PasswordHasher.NeedsRehash(current.Replace($"${PasswordHasher.Iterations}$", "$1000$")),
    "a low-iteration entry needs upgrading");
Check.True(PasswordHasher.NeedsRehash("hunter2"), "a plaintext-era entry needs upgrading");
Check.True(PasswordHasher.NeedsRehash(""), "so does an empty one");
```

### ⭐⭐ 2. Upgrade credentials on the way in (core)

Knowing an entry is stale is useless unless something fixes it — and login is the only moment the app ever holds the plaintext password. Make `UserStore.CheckPassword` re-hash and store the password with today's settings when (and only when) verification **succeeds** and `NeedsRehash` says so. A wrong password must never touch the stored hash.
*Practices:* transparent credential migration, and being careful about what you do inside vs outside a lock.
**Hint:** hash outside the lock (it is deliberately slow), then take the lock and write only if the stored value is still the one you verified against — otherwise a concurrent password change could be clobbered by your upgrade.
**Check offline:** add a test helper that plants a genuine low-iteration hash, then these tests — all should pass:
```csharp
var store = new UserStore();
store.Register("alice", "a-perfectly-fine-passphrase");
store.PlantLegacy("alice", "a-perfectly-fine-passphrase");   // helper: see the solution
Check.Equal("1000", store.Snapshot()["alice"].Split('$')[1], "we start from a legacy entry");
Check.True(store.CheckPassword("alice", "a-perfectly-fine-passphrase"), "the legacy hash still verifies");
Check.Equal(PasswordHasher.Iterations.ToString(), store.Snapshot()["alice"].Split('$')[1],
    "logging in upgraded the stored hash");
Check.True(store.CheckPassword("alice", "a-perfectly-fine-passphrase"), "and the new hash verifies too");
store.PlantLegacy("alice", "a-perfectly-fine-passphrase");
Check.Equal(false, store.CheckPassword("alice", "wrong"), "a wrong password fails...");
Check.Equal("1000", store.Snapshot()["alice"].Split('$')[1], "...and does NOT trigger an upgrade");
```

### ⭐⭐ 3. A password policy worth having (core)

`/register`'s only rule is "8 characters". Write a pure `PasswordPolicy.Check(string? password, string? username)` returning `IReadOnlyList<string>` — at least 12 characters, not in a small hard-coded list of common passwords, and not containing the username. Return **all** violations, then have `/register` answer `400` with `{ "errors": [...] }` instead of one message.
*Practices:* pure, testable validation that collects every problem at once (project 22's `Validate()` shape), and a nod at what actually stops account takeovers.
**Hint:** `HashSet<string>` with `StringComparer.OrdinalIgnoreCase` for the common list, and `password.Contains(username, StringComparison.OrdinalIgnoreCase)` for the username rule. Return early with a single "password is required" when it is blank — every other rule would be noise.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
Check.Equal(0, PasswordPolicy.Check("a-perfectly-fine-passphrase", "alice").Count, "a good passphrase passes");
Check.Equal(1, PasswordPolicy.Check("short", "alice").Count, "too short is one error");
Check.True(PasswordPolicy.Check("password1234", "alice")[0].Contains("common"), "a common password is caught");
Check.True(PasswordPolicy.Check("alice-alice-alice", "alice")[0].Contains("username"), "the username rule fires");
Check.Equal(1, PasswordPolicy.Check(null, "alice").Count, "a missing password is one clear error, not four");
```
Then `curl -i -X POST http://localhost:5023/register -H "Content-Type: application/json" -d "{\"username\":\"alice\",\"password\":\"alice123\"}"` → `400` listing *both* the length and username problems.

### ⭐⭐ 4. Log out everywhere (core)

A stolen laptop means "kill every session I have, right now". Add `SessionStore.RevokeAllFor(string username)` returning how many sessions it removed, plus `POST /logout-all` that identifies the caller from their own cookie and revokes all of that user's sessions. Other users must be untouched.
*Practices:* what a server-side session table can do that a self-contained token cannot.
**Hint:** you cannot remove entries from a dictionary while iterating it — collect the doomed tokens into a list first, then remove them. The endpoint resolves the caller with `sessions.UserFor(ctx.Request.Cookies["session"])` and returns `401` when that is `null`.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var multi = new SessionStore();
var laptop = multi.Create("alice");  var phone = multi.Create("alice");  var bobs = multi.Create("bob");
Check.Equal(2, multi.RevokeAllFor("alice"), "both of alice's sessions were revoked");
Check.Equal(null, multi.UserFor(laptop), "the laptop session is dead");
Check.Equal(null, multi.UserFor(phone), "so is the phone session");
Check.Equal("bob", multi.UserFor(bobs), "bob was not logged out");
Check.Equal(0, multi.RevokeAllFor("nobody"), "revoking for an unknown user removes nothing");
```
Then, with two logins for the same user, `curl -X POST http://localhost:5023/logout-all -b "session=<token1>"` → `{"revoked":2}`, and `/me` with **either** token → `401`.

### ⭐⭐⭐ 5. Sessions that expire (challenge)

An immortal session is a stolen session that works forever. Give `SessionStore` a lifetime: store each token as a `record Session(string Username, DateTime ExpiresAt)`, treat an expired token as unknown (and purge it), and make every successful `UserFor` **slide** the deadline forward so an active user is never logged out mid-task. Inject the clock as a `Func<DateTime>` so tests can time-travel instead of sleeping, and keep a parameterless constructor so `AddSingleton<SessionStore>()` still works.
*Practices:* dependency-injecting time (project 11's trick again), sliding expiration, and constructor overloads that keep DI happy.
**Hint:** `public SessionStore() : this(TimeSpan.FromHours(8), () => DateTime.UtcNow) { }` gives DI the constructor it can call. In `UserFor`, check expiry *before* returning the username, and write back `session with { ExpiresAt = _now() + _lifetime }` afterwards.
**Check offline:** add to `Tests.cs` — all should pass, with no `Thread.Sleep` anywhere:
```csharp
var clock = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
var timed = new SessionStore(TimeSpan.FromMinutes(30), () => clock);
var active = timed.Create("alice");  var idle = timed.Create("alice");
Check.Equal("alice", timed.UserFor(active), "a fresh session resolves");
clock = clock.AddMinutes(20);
Check.Equal("alice", timed.UserFor(active), "20 minutes in, still valid — and the deadline slides");
clock = clock.AddMinutes(20);
Check.Equal("alice", timed.UserFor(active), "the active session survived 40 minutes of use");
Check.Equal(null, timed.UserFor(idle), "the idle one expired after 30 minutes untouched");
Check.Equal(1, timed.Count, "and the expired session was purged, not just hidden");
```

## Solutions

### 1. Is this hash out of date?

```csharp
// PasswordHasher.cs — Iterations becomes public so tests and callers can name it
public const int Iterations = 100_000;
/// True when this entry should be re-hashed with today's settings.
/// Anything we cannot read counts as out of date — a plaintext-era row is
/// the most out of date row there is.
public static bool NeedsRehash(string stored)
{
    var parts = stored.Split('$');
    if (parts.Length != 4 || parts[0] != "pbkdf2-sha256") return true;
    if (!int.TryParse(parts[1], out int iterations)) return true;
    return iterations < Iterations;
}
```

WHY: the self-describing format (`algorithm$iterations$salt$hash`) exists so that raising the cost next year does not invalidate everyone's password — old rows keep verifying with *their* recorded count, and this method is what notices they are behind. Every ambiguous case returns `true`, which is the security habit worth internalising: when in doubt, do the *more* protective thing. Compare `Verify`, whose ambiguous cases all return `false` — same instinct, opposite polarity, because there "I can't tell" must not mean "you're in".

### 2. Upgrade credentials on the way in

```csharp
// UserStore.cs
public bool CheckPassword(string username, string password)
{
    string? stored;
    lock (_lock) _hashByUsername.TryGetValue(username, out stored);
    bool ok = PasswordHasher.Verify(password, stored ?? DummyHash) && stored is not null;
    // The ONE moment we legitimately hold the plaintext: upgrade the stored hash.
    if (ok && PasswordHasher.NeedsRehash(stored!))
    {
        var upgraded = PasswordHasher.Hash(password);   // slow — do it outside the lock
        lock (_lock)
        {
            // Only overwrite what we actually verified against; if someone changed
            // the password while we were hashing, leave their new hash alone.
            if (_hashByUsername.TryGetValue(username, out var current) && current == stored)
                _hashByUsername[username] = upgraded;
        }
    }
    return ok;
}
// UserStore.cs, test-only helper — plants a GENUINE legacy (1000-iteration)
// hash. Add `using System.Security.Cryptography;` at the top of the file.
// (Editing the iteration count inside an existing string would not work: the
// hash bytes were computed with 100,000 rounds and would stop verifying.)
public void PlantLegacy(string username, string password)
{
    byte[] salt = RandomNumberGenerator.GetBytes(16);
    byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 1000, HashAlgorithmName.SHA256, 32);
    lock (_lock) _hashByUsername[username] =
        $"pbkdf2-sha256$1000${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
}
```

WHY: you can never re-hash a stored password in bulk, because you do not have the passwords — that is the entire point. Login is the one keyhole through which plaintext passes, so upgrade-on-login is how real systems migrate a user table across a decade of changing algorithms, one user at a time, with nobody noticing. The compare-before-write inside the lock is the small print: hashing takes tens of milliseconds, and writing back blindly could resurrect a password the user just changed. Note the strict `ok &&` ordering too — a failed login must be indistinguishable from any other failed login, and an upgrade would be an observable side effect.

### 3. A password policy worth having

```csharp
// PasswordPolicy.cs
public static class PasswordPolicy
{
    // A stand-in for a real breached-password list (which is a downloadable
    // file of hashes, not a NuGet package — this stays offline).
    private static readonly HashSet<string> Common = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "password1234", "hunter2hunter2", "letmein12345", "12345678", "qwertyuiop",
    };
    public static IReadOnlyList<string> Check(string? password, string? username)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add("password is required");
            return errors;                       // every other rule would just be noise
        }
        if (password.Length < 12)
            errors.Add("password must be at least 12 characters");
        if (Common.Contains(password))
            errors.Add("password is too common — pick something unguessable");
        if (!string.IsNullOrWhiteSpace(username)
            && password.Contains(username, StringComparison.OrdinalIgnoreCase))
            errors.Add("password must not contain your username");
        return errors;
    }
}
// Program.cs — /register replaces its length check with:
var problems = PasswordPolicy.Check(creds.Password, creds.Username);
if (problems.Count > 0) return Results.BadRequest(new { errors = problems });
```

WHY: length beats character-class rules — `Tr0ub4dor&3` satisfies every "one uppercase, one symbol" checkbox and is weaker than `correct horse battery staple`, which is why modern guidance (NIST 800-63B) asks for length and a breached-password check and drops the composition rules. Returning all errors at once is a user-experience decision with a security payoff: a form that reveals one rule per attempt trains people to make the smallest possible change. And note where the rules live — a pure static function with no HTTP in sight, so the tests above never start a server.

### 4. Log out everywhere

```csharp
// SessionStore.cs
public int RevokeAllFor(string username)
{
    lock (_lock)
    {
        // Collect first: removing while enumerating a Dictionary throws.
        var doomed = _userByToken.Where(kv => kv.Value == username).Select(kv => kv.Key).ToList();
        foreach (var token in doomed) _userByToken.Remove(token);
        return doomed.Count;
    }
}
// Program.cs
app.MapPost("/logout-all", (SessionStore sessions, HttpContext ctx) =>
{
    var user = sessions.UserFor(ctx.Request.Cookies["session"]);
    if (user is null) return Results.Unauthorized();
    var revoked = sessions.RevokeAllFor(user);
    ctx.Response.Cookies.Delete("session");
    return Results.Ok(new { revoked });
});
```

WHY: this endpoint is the concrete argument for server-side sessions. A self-contained token (a JWT, say) is *verified*, not *looked up* — nothing on the server knows it exists, so "log out everywhere" becomes impossible without inventing a revocation list, which is a session table with extra steps. Here it is a `Where` and a loop. The cost of the opaque-token design is a lookup per request; the benefit is that the server remains the authority on who is logged in, and can change its mind. Identifying the caller *from their own cookie* rather than from a request body matters too — otherwise `/logout-all` would be a free denial-of-service against any username an attacker can guess.

### 5. Sessions that expire

```csharp
// SessionStore.cs — the dictionary's value type changes; every signature stays.
private record Session(string Username, DateTime ExpiresAt);
private readonly Dictionary<string, Session> _sessions = new();   // was Dictionary<string, string>
private readonly TimeSpan _lifetime;
private readonly Func<DateTime> _now;
public SessionStore() : this(TimeSpan.FromHours(8), () => DateTime.UtcNow) { }   // the one DI can call
public SessionStore(TimeSpan lifetime, Func<DateTime> clock) { _lifetime = lifetime; _now = clock; }
public int Count { get { lock (_lock) return _sessions.Count; } }
public string Create(string username)
{
    var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    lock (_lock) _sessions[token] = new Session(username, _now() + _lifetime);
    return token;
}
public string? UserFor(string? token)
{
    if (token is null) return null;
    lock (_lock)
    {
        if (!_sessions.TryGetValue(token, out var session)) return null;
        if (_now() >= session.ExpiresAt) { _sessions.Remove(token); return null; }   // expired = unknown
        _sessions[token] = session with { ExpiresAt = _now() + _lifetime };          // sliding window
        return session.Username;
    }
}
// Revoke is unchanged; RevokeAllFor now matches on kv.Value.Username.
```

WHY: expiry bounds the damage of a leaked token — with revocation you need to *notice* the theft, whereas a deadline works while you sleep. Sliding renewal is the compromise every real site makes: absolute expiry is safer but logs people out mid-form, so the window resets on each use and only genuinely idle sessions die. Purging on read keeps the store from growing forever *and* makes the behaviour observable, which is what the `Count` assertion pins. The `Func<DateTime>` is the reason the whole thing is testable in microseconds: code that calls `DateTime.UtcNow` directly can only be tested by waiting, so in practice it never gets tested at all — and the parameterless constructor exists so the DI container, which cannot guess a `TimeSpan`, still has something to call.
