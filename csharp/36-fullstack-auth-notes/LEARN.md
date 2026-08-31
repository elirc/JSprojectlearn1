# 📘 Learning Guide: Fullstack Auth Notes

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A notes app with accounts. Register, log in, write notes, edit them, delete them, log out. Your notes are yours; nobody else's notes are ever visible to you, and yours are never visible to them.

That last sentence is the whole project. Writing notes is a `List<T>`; making them *private* is where the design lives.

Both versions run on `http://localhost:5036`. The original has accounts in the sense that a party has name badges: you write a name on one, and everyone agrees to pretend. The refactored version has a frontend at `/`, real password storage, real sessions, and an ownership rule that no code path can skip.

This is the **track capstone**. Nothing here is new — it is cs#23's hashing, cs#21's locking, cs#08's results, cs#17's validation, cs#13's extension methods, cs#25's fetch frontend — assembled into something you could plausibly show someone. What *is* new is the composition, and one idea the earlier projects set up but never quite named: **authorization**.

## 2. Concepts you need first

### Authentication vs authorization

Two words that look alike, sound alike, get abbreviated the same way (authn/authz), and are completely different questions:

- **Authentication**: *who are you?* Answered by a password, then carried by a session token.
- **Authorization**: *are you allowed to do this to that?* Answered by a rule about the specific thing being touched.

The original fails both, and the order in which you fix them matters less than noticing they are two jobs. Suppose you fixed only authentication — real passwords, real sessions, the works. `GET /notes` still returns the one global list. Now every *verified* user reads every other user's diary. You would have built a login screen in front of a public wall.

Suppose instead you fixed only authorization — the ownership check works perfectly — but identity still comes from `?user=`. Now anyone types `?user=alice` and is authorized as alice. A perfect lock on a door anyone can rename.

You need both, and they live in different places: authentication in `SessionStore`, authorization in `NoteService`.

### The confused deputy, and why ownership checks get forgotten

The original's third bug is the interesting one because the data was *right there*:

```csharp
public string Owner { get; set; } = "";   // recorded on every note
```

...and no line of code ever reads it. This is not carelessness so much as a structural invitation. The method that fetches a note is `notes.FirstOrDefault(n => n.Id == id)` — it works, it compiles, it returns the note — and the ownership check is a *separate, optional* line the developer must remember to write next to it. Every new endpoint is a fresh chance to forget.

The fix is to remove the option:

```csharp
public NoteResult Get(string owner, int id)      // there is no Get(int id)
```

Now you cannot fetch a note without saying who is asking, because the method that would let you does not exist. This is the same instinct as cs#21's private `Load`/`Save` (callers can't rebuild the read-modify-write cycle wrong because they can't reach the pieces) and cs#09's encapsulation. **A rule enforced by the shape of the code beats a rule enforced by discipline**, every time, because discipline is a per-developer, per-Friday-afternoon quantity.

### 401 vs 403 (and 404)

Three status codes that all mean "no", and mixing them up makes an API confusing to use:

- **401 Unauthorized** — actually means *unauthenticated*: "I don't know who you are." The fix is to log in. (The name is a forty-year-old mistake we all live with.)
- **403 Forbidden** — "I know exactly who you are, and no." The fix is not to log in again; there is no fix.
- **404 Not Found** — "there is no such thing."

In this app: no session cookie → 401. Valid session, someone else's note → 403. Valid session, note id 999 → 404.

There is a real argument for returning **404 instead of 403** for another user's note. A 403 confirms the note *exists*, so someone can walk `/api/notes/1`, `/2`, `/3` and map how many notes the system holds and roughly who is active — an **enumeration** leak, the same family as cs#23's username enumeration. GitHub famously returns 404 for private repositories you cannot see, for exactly this reason. The trade is honesty versus discretion: 403 tells legitimate users the truth ("that's someone else's"), 404 tells everyone nothing. This project uses 403 because it makes the lesson visible; PRACTICE exercise 4 has you switch it and think about the cost.

### Sessions, recapped from cs#23

Login checks the password and mints an **opaque token** — 32 random bytes from `RandomNumberGenerator`, hex-encoded — recorded server-side in a `token → username` table. The token goes into a cookie. Every later request carries the cookie; the server looks the token up.

The properties that matter:

- The token means **nothing** by itself. `session=alice` matches no entry, so forgery requires guessing a 256-bit number.
- The server can **revoke** it. Logout deletes the row, and every copy of that cookie anywhere in the world stops working immediately.
- The cookie is **HttpOnly**, so page JavaScript cannot read it — an XSS bug cannot steal it — and **SameSite=Lax**, so the browser won't attach it to cross-site POSTs, which blunts CSRF.

### Cookies and `fetch`: the part that surprises people

Look at `wwwroot/app.js` and notice what is *absent*: no `localStorage`, no `Authorization` header, no variable holding a token. There is nothing to hold, because the cookie is HttpOnly — the JavaScript literally cannot see it.

It still works, because the browser attaches cookies to **same-origin** requests automatically. `fetch('/api/notes')` from a page served by the same server sends the session cookie without being asked. (The default is `credentials: 'same-origin'`. For a *cross*-origin call you would need `credentials: 'include'` plus a CORS policy that allows it — cs#24's territory, and a good reason to serve your frontend from the same origin when you can.)

This is why the frontend is in `wwwroot/` rather than opened as a `file://` page: same origin means cookies just work, and no CORS configuration exists to get wrong.

### Normalizing identity

```csharp
public static string Normalize(string username) => username.Trim().ToLowerInvariant();
```

Three lines of consequence hide in that one. If `Alice` and `alice` register separately you have two accounts and a confused user. If they are the *same* account but a note is stored with `Owner = "Alice"` while a session resolves to `"alice"`, then `note.Owner == owner` is false and alice cannot see her own note. And if the comparison were case-*insensitive* in one place and case-sensitive in another, alice might see notes she shouldn't.

So: normalize once, at every entry point, and compare with `StringComparison.Ordinal`. Ordinal — not culture-sensitive — because string comparison rules that vary by the server's locale have no business deciding who reads what. (The classic hazard: in Turkish locales, uppercasing `i` yields `İ`, so a culture-sensitive `ToUpper` comparison can decide two names differ when they shouldn't. Identity comparisons are ordinal, always.)

### Results instead of exceptions, again

`NoteService` returns `NoteResult(Access, Note?)` where `Access` is `Ok`, `NotFound`, or `Forbidden`. Not exceptions — because "that note isn't yours" is an ordinary outcome of an ordinary request, not an emergency (cs#08). It also keeps the domain HTTP-free: `NoteService` has never heard of 403, and one `Respond` helper in `Program.cs` does the translation.

### Where each thing lives (the capstone's real content)

| Concern | Where | Why there |
|---|---|---|
| "is this the right password?" | `PasswordHasher` / `UserStore` | pure, adversarial, tested without HTTP |
| "who is this request from?" | `SessionStore` + `HttpAuth` | one place turns a cookie into a name |
| "may this user touch that note?" | `NoteService` | pure, and the owner is a required argument |
| "which status code says that?" | `Program.cs` | translation only — no rules live here |
| "what does the user see?" | `wwwroot/` | mirrors server state; owns no truth |

If you can say which file a change belongs in without hesitating, the layering is doing its job.

## 3. Walking through the original code

The storage — one list, for everybody:

```csharp
var notes = new List<Note>();
```

The "login":

```csharp
app.MapGet("/me", (string user) => Results.Ok(new { you = user }));
```

There is no lookup. The parameter is the answer. `?user=admin` and the server agrees.

The read:

```csharp
app.MapGet("/notes", (string user) => Results.Ok(notes));
```

`user` is accepted and then never mentioned again. The `.Where(n => n.Owner == user)` that should be there was never written — in the demo there was one user, and it "worked fine".

The write:

```csharp
app.MapPut("/notes/{id}", (int id, string user, string text) =>
{
    var note = notes.FirstOrDefault(n => n.Id == id);
    if (note is null) return Results.NotFound();
    note.Text = text;          // no ownership check. anyone can edit anything.
    return Results.Ok(note);
});
```

One missing line: `if (note.Owner != user) return Results.Forbid();`. And `DELETE` is worse — it doesn't even fetch the note first, it just `RemoveAll`s by id.

## 4. What's wrong with it (in beginner terms)

**1. Identity is a text box.** `?user=alice` makes you alice. Not "weak authentication" — *no* authentication. There is no password in this file at all, so there is nothing to be weak.

**2. Everyone's notes are in one pile, and the pile is public.** `GET /notes` returns all of them. Mallory, who has no account, reads alice's diary with a single curl and no cleverness.

**3. Ownership is decoration.** This is the bug worth remembering, because it is the one that ships in serious applications. The `Owner` field exists. It is populated correctly. Nothing reads it. Real access-control bugs almost always look like this — the data needed to make the right decision is present and simply not consulted, usually on the one endpoint added last, by someone who didn't know the check was expected.

**4. Fixing the login would not fix the leak.** Worth sitting with: imagine bolting cs#23's whole auth system onto this file. Passwords hashed, sessions opaque, cookies HttpOnly. Now `GET /notes` returns everyone's notes to a *verified* user. Authentication cannot substitute for authorization.

**5. There is nothing to log out of.** No session was issued, so none can be revoked. "Log out" would be a button that clears a text field.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 Two separate questions are being got wrong. Name them before writing code — the fix for one is not the fix for the other.
2. 🌿 Steal cs#23 wholesale: `PasswordHasher`, `SessionStore`, `UserStore`, and a `POST /login` that sets an HttpOnly cookie holding an opaque token. Then delete every `string user` parameter from every endpoint, and resolve the caller from the cookie instead. If any endpoint still accepts a username from the client, you have not finished.
3. 🌳 Now the second question. Write a `NoteService` where **every** method takes the owner first, and where no method returns anyone else's data. Make it impossible to call `Get(id)` — not "remember not to", *impossible*.
4. 🍎 Return `Ok` / `NotFound` / `Forbidden` from the service (not exceptions, not HTTP), translate them in one helper, and write tests where bob tries to read, edit, and delete alice's note. Those three assertions are the ones that matter; write them before the endpoints.

## 6. Understanding the refactored solution

**`PasswordHasher.cs`, `SessionStore.cs`, `UserStore.cs`** — cs#23, substantially unchanged, and *that is the point*. Security-critical code is code you don't reinvent per project. `SessionStore` gains `RevokeAllFor` (log out everywhere) and `UserStore` gains `Normalize`, which is the small piece this app needed that cs#23 didn't.

**`NoteService.cs`** — the heart. Read the header comment, then notice the API surface:

```csharp
public IReadOnlyList<Note> ListFor(string owner);
public Note Create(string owner, string text);
public NoteResult Get(string owner, int id);
public NoteResult Update(string owner, int id, string text);
public NoteResult Delete(string owner, int id);
```

Five methods, five owners. There is no `All()`. The single comparison the app's privacy rests on:

```csharp
private static bool Owns(string owner, Note note)
    => string.Equals(note.Owner, UserStore.Normalize(owner), StringComparison.Ordinal);
```

And the edit path is worth a look, because records do real work here:

```csharp
var updated = _notes[index] with { Text = text.Trim() };
```

`with` copies everything and changes one field, so `Owner`, `Id`, and `CreatedAt` are carried over untouched. An edit cannot re-home a note to another user or forge its age — not because the code checks for that, but because there is no code that would do it. Three tests pin all three.

**`HttpAuth.cs`** — extension methods on `HttpContext` (cs#13), and the only place a request becomes a username:

```csharp
public static string? CurrentUser(this HttpContext ctx, SessionStore sessions)
    => sessions.UserFor(ctx.Request.Cookies[CookieName]);
```

Because it is the only place, changing how identity travels — a bearer header, a renamed cookie — is a one-file edit.

**`Program.cs`** — every notes endpoint opens the same way:

```csharp
if (ctx.CurrentUser(sessions) is not { } user) return Results.Unauthorized();
```

and then passes `user` — never a client-supplied name — into the service. The three-way translation happens once:

```csharp
static IResult Respond(NoteResult result) => result.Access switch
{
    Access.Ok => Results.Ok(result.Note),
    Access.NotFound => Results.NotFound(new { error = "no such note" }),
    Access.Forbidden => Results.Json(new { error = "that note is not yours" }, statusCode: 403),
    _ => Results.StatusCode(500),
};
```

**`wwwroot/`** — one page with two halves (signed out / signed in), switched by asking `GET /api/me` who we are. Every mutation re-fetches and re-renders (js#14). `span.textContent = note.text` rather than `innerHTML`, so a note containing `<script>` is text, not markup. And, again, no token anywhere in the file.

**`Tests.cs`** — 72 assertions, no server. The block worth reading twice is the one per verb where bob attacks alice's note: he cannot read it, cannot edit it (and the note is verified unchanged *afterwards*, which is the assertion people forget), and cannot delete it. Then an end-to-end block wires all three stores together — register, log in, write, fail to peek, log out — proving the pieces compose without a single HTTP request.

## 7. Words you learned (glossary)

- **Authentication (authn)** — establishing *who* the caller is.
- **Authorization (authz)** — deciding whether that caller may perform *this action on this thing*.
- **Access control** — the general term for authorization rules.
- **Ownership check** — comparing a resource's owner with the current user.
- **Confused deputy** — a program with authority acting on someone else's behalf without checking they were entitled to it.
- **Enumeration leak** — learning which ids/usernames exist from differing responses (403 vs 404).
- **401 vs 403** — "I don't know you" vs "I know you, and no".
- **Session token** — opaque random value in a cookie; meaningful only via the server's table.
- **Revocation** — server-side deletion of a session; kills every copy of the cookie at once.
- **HttpOnly / SameSite** — cookie flags: invisible to page JS / withheld from cross-site requests.
- **Same-origin request** — same scheme, host and port; the browser attaches cookies automatically.
- **PBKDF2 / salt / constant-time comparison** — cs#23's password toolkit.
- **Normalization** — reducing a value to one canonical form (`Trim().ToLowerInvariant()`) before comparing.
- **Ordinal comparison** — byte-for-byte string comparison, independent of locale; what identity checks use.
- **`with` expression** — copy a record changing named fields; the rest are carried over unchanged.
- **`textContent` vs `innerHTML`** — inserting text vs inserting markup; the first is XSS-safe.

## 8. Experiments to try on the plane (no internet needed)

All localhost, all offline.

1. **Run all three attacks against the original**, then all three against the refactored server. Impersonation (`/me?user=admin` vs `-b "session=alice"` → 401), the leak (`/notes?user=mallory` vs `/api/notes` with no cookie → 401), and the tampering (`DELETE /notes/1?user=mallory` succeeding vs `403 "that note is not yours"`). Seeing them fail one by one is the point of the original existing.
2. **Two browsers, two users.** Open http://localhost:5036 in a normal window and a private window. Register alice in one, bob in the other, and write notes in both. Neither list ever mentions the other. Now, in bob's window, open DevTools and run `fetch('/api/notes/1').then(r => console.log(r.status))` against a note id you know is alice's — `403`, from *inside* his authenticated session.
3. **Try to steal the cookie with JavaScript.** In DevTools on the signed-in page: `document.cookie`. The session cookie is not there — that is `HttpOnly` working. Then look at Application → Cookies, where the browser itself will show it to you, and note the distinction: the *browser* can see it, page *script* cannot. That gap is what stops an XSS bug from becoming an account takeover.
4. **Kill a stolen session.** Log in with `curl -c alice.txt`, copy the token out of `alice.txt`, and confirm `curl -b "session=<token>" http://localhost:5036/api/me` works. Now `curl -b alice.txt -X POST http://localhost:5036/api/logout` and retry with the *same copied token*: 401. Server-side revocation killed a copy you never had access to.
5. **Break the ownership check on purpose.** In `NoteService.Owns`, `return true;`. Run `-- test`: watch exactly the bob-attacks-alice assertions go red while everything else stays green. That is what a well-aimed test suite looks like — the failures point at the rule you broke, not at forty unrelated things.
6. **Now break it the subtle way.** Put `Owns` back, but in `ListFor` change the filter to `n.Owner != null`. Run `-- test`: the per-verb ownership tests still pass (they use `Get`/`Update`/`Delete`), and only the list assertions fail. Two different endpoints, two different holes — which is precisely why the tests check the ownership rule once per verb instead of once.
7. **Prove the notes are XSS-safe.** Add a note whose text is `<img src=x onerror="alert(1)">`. It renders as literal text. Then, in `app.js`, change `span.textContent = note.text` to `span.innerHTML = note.text` and reload: the alert fires. Change it back, and note that this is the bug `HttpOnly` was defending against — layered defences, because one of them always fails eventually.
8. **Confirm identity really is normalized.** Register `Alice`, then try to register `alice` (409 conflict), then log in as `ALICE` (works), and check that the notes you wrote as `Alice` are visible. One `Normalize` call is holding all three of those together.
