# 🏋️ Practice: Fullstack Auth Notes

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Search, without reopening the leak (warm-up)

Add `?q=` to `GET /api/notes` — a case-insensitive substring search over the note text — by giving
`ListFor` a second parameter. The exercise is one line of LINQ and one genuinely important habit:
the search filter is applied **after** the owner filter, never instead of it. Write it the other way
round once (a `Search(string q)` over `_notes`) and look at what you just rebuilt.
*Practices:* composing a new filter onto an access rule instead of around it.
**Hint:** `var mine = _notes.Where(n => n.Owner == name);` then a conditional second `Where`. Blank
searches mean "all of yours", not "none" — normalize with `string.IsNullOrWhiteSpace` as everywhere else.
**Check offline:** add to `Tests.cs`:
```csharp
var s = new NoteService();
s.Create("alice", "the alarm code is 1234");
s.Create("alice", "buy oat MILK");
s.Create("bob", "bob's milk run");
Check.Equal(2, s.ListFor("alice", null).Count, "no search still means all of YOUR notes");
Check.Equal(1, s.ListFor("alice", "milk").Count, "search filters within your own notes");
Check.Equal(1, s.ListFor("alice", "MILK").Count, "...case-insensitively");
Check.Equal(2, s.ListFor("alice", "   ").Count, "a blank search means everything of yours");
Check.Equal(1, s.ListFor("bob", "milk").Count, "bob's search finds only bob's milk");
Check.Equal(0, s.ListFor("mallory", "milk").Count, "a stranger's search finds NOTHING");
```
Then, in the frontend, add a search box that re-fetches `/api/notes?q=...` as you type.

### ⭐⭐ 2. Change your password (core)

Add `UserStore.ChangePassword(username, currentPassword, newPassword)` and
`POST /api/password`. Three rules: the current password must verify (this is not a "you're logged in, so
sure" operation); the new one must meet the length rule; and success must **revoke every other session**
and re-issue one for the device that made the change — otherwise a thief who already has your cookie
keeps it after you "secured" your account.
*Practices:* re-authenticating for a sensitive action, and remembering that sessions outlive passwords.
**Hint:** `ChangePassword` is `CheckPassword` + a re-hash + a write; hash outside the lock, as `Register`
does. In the endpoint, call `sessions.RevokeAllFor(user)` and then `ctx.SetSessionCookie(sessions.Create(user))`
— in that order, so this device is not logged out by its own success.
**Check offline:** add to `Tests.cs`:
```csharp
var users = new UserStore();
var sessions = new SessionStore();
users.Register("alice", "alice-passphrase");
var laptop = sessions.Create("alice");
var phone = sessions.Create("alice");
var bobs = sessions.Create("bob");

Check.Equal(false, users.ChangePassword("alice", "wrong-current", "brand-new-passphrase"),
    "a wrong current password is refused");
Check.True(users.CheckPassword("alice", "alice-passphrase"), "...and the old password still works");
Check.Equal(true, users.ChangePassword("alice", "alice-passphrase", "brand-new-passphrase"),
    "the right current password succeeds");
Check.Equal(false, users.CheckPassword("alice", "alice-passphrase"), "the OLD password stops working");
Check.True(users.CheckPassword("alice", "brand-new-passphrase"), "the new one works");
Check.Equal(2, sessions.RevokeAllFor("alice"), "both of alice's sessions can be revoked");
Check.Equal(null, sessions.UserFor(laptop), "the laptop session is dead");
Check.Equal("bob", sessions.UserFor(bobs), "bob was not logged out");
```

### ⭐⭐ 3. Share a note, read-only (core)

Let the owner grant another user **read** access: `Share(owner, id, withUser)` and
`Unshare(owner, id, withUser)`, plus `SharedWith(user)` listing notes shared *to* you. Reading now has
two ways to succeed; editing and deleting still have one. Only the owner may share.
*Practices:* the moment an ownership check becomes an access-control *list*, and read/write permissions
diverging.
**Hint:** a `Dictionary<int, HashSet<string>>` of note id → reader names. Split the single `Owns` check
into `Owns` (used by `Update`, `Delete`, `Share`, `Unshare`) and `CanRead` (used by `Get`), where
`CanRead` is `Owns(...) || the reader set contains them`. A shared note must **not** appear in the
recipient's `ListFor` — it is not theirs — which is why `SharedWith` is a separate list.
**Check offline:** add to `Tests.cs`:
```csharp
var shared = new NoteService();
var secret = shared.Create("alice", "the alarm code is 1234");
Check.Equal(Access.Forbidden, shared.Get("bob", secret.Id).Access, "before sharing, bob cannot read it");
Check.Equal(Access.Forbidden, shared.Share("bob", secret.Id, "bob").Access, "and cannot share it to himself");
Check.Equal(Access.Ok, shared.Share("alice", secret.Id, "Bob").Access, "the OWNER can share it");
Check.Equal(Access.Ok, shared.Get("bob", secret.Id).Access, "now bob can READ it");
Check.Equal(Access.Forbidden, shared.Update("bob", secret.Id, "hah").Access, "but still cannot EDIT it");
Check.Equal(Access.Forbidden, shared.Delete("bob", secret.Id).Access, "nor DELETE it");
Check.Equal(0, shared.ListFor("bob", null).Count, "a shared note is not in bob's OWN list");
Check.Equal(1, shared.SharedWith("bob").Count, "it is in his shared-with-me list");
Check.Equal(Access.Ok, shared.Unshare("alice", secret.Id, "bob").Access, "the owner can revoke it");
Check.Equal(Access.Forbidden, shared.Get("bob", secret.Id).Access, "and bob loses access again");
```

### ⭐⭐ 4. 404 instead of 403 — and one place to change it (core)

A `403` on someone else's note confirms the note exists, so anyone can walk `/api/notes/1, /2, /3` and
count the system's notes. Switch to the discreet policy: a note you may not see is a note that does not
exist. First move the `Respond` helper out of `Program.cs` into a testable
`NoteResponses.ForNote(NoteResult)`, then change **one line**. Note what does *not* change:
`NoteService` still distinguishes `Forbidden` from `NotFound`, so your logs and your tests keep the truth.
*Practices:* separating a domain fact from a disclosure policy, and testing an `IResult` directly.
**Hint:** minimal-API results implement `IStatusCodeHttpResult`, so
`((IStatusCodeHttpResult)NoteResponses.ForNote(x)).StatusCode` is assertable without a server.
Keep the *body* identical between the two cases too — a different error message would leak exactly what
the status code no longer does.
**Check offline:** add to `Tests.cs`:
```csharp
static int StatusOf(IResult r) => ((IStatusCodeHttpResult)r).StatusCode ?? 0;

var any = new NoteService().Create("alice", "x");
Check.Equal(200, StatusOf(NoteResponses.ForNote(NoteResult.Found(any))), "Ok maps to 200");
Check.Equal(404, StatusOf(NoteResponses.ForNote(NoteResult.Missing)), "NotFound maps to 404");
Check.Equal(404, StatusOf(NoteResponses.ForNote(NoteResult.Denied)),
    "Forbidden ALSO maps to 404 under the discreet policy");
```
and keep every existing `Access.Forbidden` assertion exactly as it is — they must all still pass, because
the rule did not change, only what you tell strangers about it.

### ⭐⭐⭐ 5. The whole auth flow, over real HTTP (challenge)

Apply cs#35 to this app. Extract `Api.Build(string[] args, bool quiet = false)` from `Program.cs`, start
it on port 0, and drive it with **two `HttpClient`s that have separate cookie jars** — two browsers, two
users, one process. Then assert the flow end to end: register, wrong password, login, the cookie is
HttpOnly, alice creates a note, **bob's list is empty**, bob gets 404 by id, logout kills the session.
*Practices:* proving the wiring, not just the rules — that the owner really does come from the cookie,
and that the cookie really does carry the flags you set.
**Hint:** `new HttpClientHandler { CookieContainer = new CookieContainer(), UseCookies = true }` per
user; a third client with no handler is the logged-out stranger. Read the cookie back with
`handler.CookieContainer.GetCookies(baseUri)["session"]` and assert `.HttpOnly` — a flag no unit test
can see, because it exists only in the `Set-Cookie` header. Stop the app in a `finally`.
**Check offline:** the full suite is in the solution; the four assertions that matter most:
```csharp
Check.Equal(true, cookie!.HttpOnly, "[http] the session cookie is HttpOnly");
Check.Equal("alice", note!.Owner, "[http] the note is owned by the SESSION, not by anything she sent");
Check.Equal(0, (await (await bob.GetAsync("/api/notes")).Content.ReadFromJsonAsync<List<NoteDto>>())!.Count,
    "[http] BOB'S LIST IS EMPTY");
Check.Equal(401, (int)(await alice.GetAsync("/api/notes")).StatusCode, "[http] after logout her session is dead");
```

## Solutions

### 1. Search, without reopening the leak

```csharp
// NoteService.cs
public IReadOnlyList<Note> ListFor(string owner, string? search)
{
    var name = UserStore.Normalize(owner);
    lock (_lock)
    {
        var mine = _notes.Where(n => n.Owner == name);          // access first, ALWAYS
        if (!string.IsNullOrWhiteSpace(search))
            mine = mine.Where(n => n.Text.Contains(search.Trim(), StringComparison.OrdinalIgnoreCase));
        return mine.OrderByDescending(n => n.Id).ToList();
    }
}

// Program.cs
app.MapGet("/api/notes", (string? q, NoteService notes, SessionStore sessions, HttpContext ctx) =>
{
    if (ctx.CurrentUser(sessions) is not { } user) return Results.Unauthorized();
    return Results.Ok(notes.ListFor(user, q));
});
```

WHY: the order of those two `Where` clauses is the entire exercise. They look symmetric — two filters,
both narrowing — and are not the same kind of thing. The owner filter is an **access rule**; the search
filter is a **convenience**. Swap them and nothing breaks. *Remove* the owner filter, as you would if
you had written a general-purpose `Search(string q)` helper and called it from the endpoint, and you
have rebuilt the original's leak with a nicer API.

That is how the bug reaches production: not as `GET /notes` returning everything, but as a search
endpoint added later by someone who reasonably assumed the access rule lived elsewhere. The defence is
structural — `ListFor` takes the owner first and there is no method that doesn't — which is why the new
parameter went onto the existing method rather than into a new one.

### 2. Change your password

```csharp
// UserStore.cs
public bool ChangePassword(string username, string currentPassword, string newPassword)
{
    // Re-authenticate. "You have a valid session" is not enough for this one.
    if (!CheckPassword(username, currentPassword)) return false;

    var name = Normalize(username);
    var hash = PasswordHasher.Hash(newPassword);      // slow on purpose — outside the lock
    lock (_lock)
    {
        if (!_hashByUsername.ContainsKey(name)) return false;
        _hashByUsername[name] = hash;
        return true;
    }
}

// Program.cs
app.MapPost("/api/password", (ChangePassword dto, UserStore users, SessionStore sessions, HttpContext ctx) =>
{
    if (ctx.CurrentUser(sessions) is not { } user) return Results.Unauthorized();
    if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 8)
        return Results.BadRequest(new { errors = new[] { "new password must be at least 8 characters" } });
    if (dto.CurrentPassword is null || !users.ChangePassword(user, dto.CurrentPassword, dto.NewPassword))
        return Results.Unauthorized();     // one boring answer, as always

    sessions.RevokeAllFor(user);                        // every OTHER device is logged out...
    ctx.SetSessionCookie(sessions.Create(user));        // ...and this one gets a fresh session
    return Results.Ok(new { changed = true });
});

public record ChangePassword(string? CurrentPassword, string? NewPassword);
```

WHY: two habits worth keeping, both of which look like extra work until the day they don't.

**Re-authenticating.** The caller already proved who they are — so why ask again? Because a session can
be *borrowed*: an unlocked laptop, a shared machine, a stolen cookie. Requiring the current password
means a borrowed session cannot become a permanent takeover, which is why every real site asks before
changing an email address or deleting an account. Sensitive actions re-check.

**Revoking the other sessions.** This is the bit people miss, and missing it makes the feature nearly
pointless. The usual reason someone changes their password is that they think somebody else has it — and
if the attacker already logged in, they hold a session token that a password change does not touch.
`RevokeAllFor` is what evicts them, and it is only possible because sessions live server-side (cs#23's
argument, cashed in). Re-issuing for the current device *after* the revoke is a small ordering detail
with an obvious symptom if you get it wrong: you log yourself out by succeeding.

### 3. Share a note, read-only

```csharp
// NoteService.cs
private readonly Dictionary<int, HashSet<string>> _readers = new();

public NoteResult Share(string owner, int id, string withUser)
{
    var reader = UserStore.Normalize(withUser);
    lock (_lock)
    {
        var i = IndexOf(id);
        if (i < 0) return NoteResult.Missing;
        if (!Owns(owner, _notes[i])) return NoteResult.Denied;      // only the OWNER may share
        if (!_readers.TryGetValue(id, out var set))
            _readers[id] = set = new HashSet<string>(StringComparer.Ordinal);
        set.Add(reader);
        return NoteResult.Found(_notes[i]);
    }
}

// Unshare is the mirror image: same two guards, then `set.Remove(reader)`.

public IReadOnlyList<Note> SharedWith(string user)
{
    var name = UserStore.Normalize(user);
    lock (_lock)
        return _notes.Where(n => _readers.TryGetValue(n.Id, out var set) && set.Contains(name))
                     .OrderByDescending(n => n.Id).ToList();
}

// Get() switches to CanRead; Update, Delete, Share and Unshare keep using Owns.
// Delete also cleans up with `_readers.Remove(id);`.
private bool CanRead(string user, Note note)
    => Owns(user, note)
       || (_readers.TryGetValue(note.Id, out var set) && set.Contains(UserStore.Normalize(user)));
```

WHY: this is the moment a one-line ownership check becomes an **access-control list**, and it is worth
noticing how quickly the concept splits. Up to now there was one question ("is it yours?") and one
answer. Now there are two verbs' worth of question — reading and writing — with different answers, and
the code has to say which is which at every call site. `Get` uses `CanRead`; `Update`, `Delete`, `Share`
and `Unshare` use `Owns`. Get one of those five wrong and a reader becomes an editor.

Real systems keep going down this road — roles, groups, inherited folder permissions — and each step
multiplies the places a mistake can hide. Which is the argument for the shape this class already had:
every permission decision goes through `Owns` or `CanRead`, both private, both one line, both called
from methods that *cannot* be invoked without a user. When the rules get complicated, having exactly two
places where they are evaluated is what keeps them reviewable.

Two smaller decisions worth defending. Sharing does not put the note in the recipient's `ListFor` — "my
notes" should mean the ones that are mine. And `Delete` removes the reader set: leaving it behind would
let a recycled id inherit a stranger's permissions, which is the kind of bug that surfaces years later
and is never diagnosed correctly.

### 4. 404 instead of 403 — and one place to change it

```csharp
// NoteResponses.cs — moved out of Program.cs so tests can reach it
public static class NoteResponses
{
    public static IResult ForNote(NoteResult result) => result.Access switch
    {
        Access.Ok => Results.Ok(result.Note),
        Access.NotFound => Results.NotFound(new { error = "no such note" }),

        // THE DISCREET POLICY: a note you may not see is a note that does not
        // exist. Byte-identical to the line above, deliberately — a different
        // message would leak exactly what the status code no longer does.
        Access.Forbidden => Results.NotFound(new { error = "no such note" }),

        _ => Results.StatusCode(500),
    };
}

// Program.cs — endpoints call NoteResponses.ForNote(...) instead of the local helper.
```

WHY: the payoff for having kept the domain HTTP-free arrives here. `NoteService` still returns
`Access.Forbidden` — it still *knows* the difference, so your logs can record an attempted access and
your tests can assert the rule — and the only thing that changed is what a stranger is told. One line,
one file, and every ownership test keeps passing untouched. Compare the original, where the policy would
have been three separate `Results.Forbid()` calls in three endpoints, guaranteed to diverge the first
time someone added a fourth.

Whether 404 is the *right* policy is a judgement call, not a rule. It costs legitimate users a clear
message: alice clicking a stale link to a revoked note is told it doesn't exist, which is confusing and
slightly untrue. GitHub accepts that trade for private repositories because the alternative leaks the
existence of every private project to anyone who can guess a URL; a small internal tool probably should
not. Make the call deliberately and keep it in one function so the next person can change their mind
cheaply. (Asserting on `IResult` is a bonus technique: minimal-API results implement
`IStatusCodeHttpResult`, so a mapping like this is unit-testable in microseconds.)

### 5. The whole auth flow, over real HTTP

```csharp
// Api.cs — Program.cs's wiring, extracted verbatim (cs#35's move): the three
// AddSingleton calls, UseDefaultFiles/UseStaticFiles, and every MapGet/MapPost,
// with `if (quiet) builder.Logging.ClearProviders();` for the test run.
// Program.cs shrinks to the test guard, `var app = Api.Build(args);`, and
// `app.Run("http://localhost:5036");`.

// HttpTests.cs  (`using System.Net;` at the top, for CookieContainer)
public static class HttpTests
{
    public static void Run() => RunAsync().GetAwaiter().GetResult();

    private static async Task RunAsync()
    {
        var app = Api.Build([], quiet: true);
        app.Urls.Clear();
        app.Urls.Add("http://127.0.0.1:0");
        await app.StartAsync();
        try
        {
            var baseUri = new Uri(app.Urls.First());

            // TWO cookie jars = two browsers = two users, in one process.
            using var aliceJar = new HttpClientHandler { CookieContainer = new CookieContainer(), UseCookies = true };
            using var bobJar = new HttpClientHandler { CookieContainer = new CookieContainer(), UseCookies = true };
            using var alice = new HttpClient(aliceJar) { BaseAddress = baseUri, Timeout = TimeSpan.FromSeconds(15) };
            using var bob = new HttpClient(bobJar) { BaseAddress = baseUri, Timeout = TimeSpan.FromSeconds(15) };
            using var stranger = new HttpClient { BaseAddress = baseUri, Timeout = TimeSpan.FromSeconds(15) };

            Check.Equal(401, (int)(await stranger.GetAsync("/api/notes")).StatusCode, "[http] no cookie, no notes");

            // register alice + bob (201 each); "Alice" is a 409; a wrong password is 401
            await alice.PostAsJsonAsync("/api/register", new { username = "alice", password = "alice-passphrase" });
            await bob.PostAsJsonAsync("/api/register", new { username = "bob", password = "bob-passphrase" });
            Check.Equal(409, (int)(await bob.PostAsJsonAsync("/api/register",
                new { username = "Alice", password = "whatever8" })).StatusCode, "[http] \"Alice\" is taken by \"alice\"");
            Check.Equal(401, (int)(await alice.PostAsJsonAsync("/api/login",
                new { username = "alice", password = "nope" })).StatusCode, "[http] a wrong password is 401");

            Check.Equal(200, (int)(await alice.PostAsJsonAsync("/api/login",
                new { username = "alice", password = "alice-passphrase" })).StatusCode, "[http] alice logs in");
            await bob.PostAsJsonAsync("/api/login", new { username = "bob", password = "bob-passphrase" });

            // Facts that exist only in the Set-Cookie header:
            var cookie = aliceJar.CookieContainer.GetCookies(baseUri)["session"];
            Check.Equal(true, cookie!.HttpOnly, "[http] the session cookie is HttpOnly");
            Check.Equal(64, cookie.Value.Length, "[http] ...carrying a 64-hex-char opaque token");
            Check.True(!cookie.Value.Contains("alice"), "[http] ...that says nothing about who she is");

            var made = await alice.PostAsJsonAsync("/api/notes", new { text = "the alarm code is 1234" });
            Check.Equal(201, (int)made.StatusCode, "[http] alice creates a note");
            var note = await made.Content.ReadFromJsonAsync<NoteDto>();
            Check.Equal("alice", note!.Owner, "[http] owned by her SESSION, not by anything she sent");

            Check.Equal(1, (await (await alice.GetAsync("/api/notes"))
                .Content.ReadFromJsonAsync<List<NoteDto>>())!.Count, "[http] alice's list has it");
            Check.Equal(0, (await (await bob.GetAsync("/api/notes"))
                .Content.ReadFromJsonAsync<List<NoteDto>>())!.Count, "[http] BOB'S LIST IS EMPTY");
            Check.Equal(404, (int)(await bob.GetAsync($"/api/notes/{note.Id}")).StatusCode, "[http] 404 by id");
            Check.Equal(404, (int)(await bob.DeleteAsync($"/api/notes/{note.Id}")).StatusCode, "[http] nor delete it");

            Check.Equal(200, (int)(await alice.PostAsync("/api/logout", null)).StatusCode, "[http] alice logs out");
            Check.Equal(401, (int)(await alice.GetAsync("/api/notes")).StatusCode, "[http] her session is dead");
            Check.Equal(200, (int)(await bob.GetAsync("/api/me")).StatusCode, "[http] bob is unaffected");
        }
        finally
        {
            await app.StopAsync();
            await app.DisposeAsync();
        }
    }

    private record NoteDto(int Id, string Owner, string Text);
}
```

WHY: the unit tests already prove the ownership *rule*. This proves the **wiring** — and in an auth
system the wiring is where the real failures live, because every one of them is a one-line mistake that
compiles. Three things here are unreachable from a unit test, and each is a genuine bug class.

**`cookie.HttpOnly`** exists only as text in a `Set-Cookie` header. Delete `HttpOnly = true` from
`HttpAuth` and every unit test in this project still passes, while an XSS bug becomes an account
takeover. **`note.Owner == "alice"` on a POST body that never mentioned alice** asserts that the owner
really is taken from the session — the exact substitution the original got wrong, and the test that
catches someone later "helpfully" adding an `owner` field to the request DTO. And **bob's empty list,
from a real second client**: two `HttpClientHandler`s with separate `CookieContainer`s is the cheapest
simulation of two people, turning "the service filters by owner" into "a different logged-in human
cannot see her notes", which is the claim you actually care about. The `stranger` client with no handler
is worth keeping too — the logged-out case is the one people skip because it feels too obvious to break.

Two practical notes. The suite shares one server, which is fine here because the story *is* a story;
splitting it into fresh servers (cs#35 exercise 4) would only cost time. And if you built this before
exercise 4, expect `403`s where this listing has `404`s — either is right, as long as your tests say
which one you chose.
