# CS 36 — Capstone: Fullstack Auth Notes

**Lesson: authentication asks "who are you?", authorization asks "may you touch
this?" — and an app needs both. Real sessions, per-user ownership enforced in
one pure service, and a frontend that never sees a token.**

## Run it

```
dotnet run csharp/36-fullstack-auth-notes/original.cs
dotnet run --project csharp/36-fullstack-auth-notes/refactored
dotnet run --project csharp/36-fullstack-auth-notes/refactored -- test
```

Open http://localhost:5036 (refactored only). Three attacks on the original:

```
curl "http://localhost:5036/me?user=admin"        -> "you are admin". Type a name, be it.
curl "http://localhost:5036/notes?user=mallory"   -> everyone's notes, including alice's
curl -X DELETE "http://localhost:5036/notes/1?user=mallory"   -> alice's note is gone
```

Refactored, those get 401, 401, 403 (LEARN.md §8 has the login sequence).

## What's wrong with the original?

1. **`?user=alice` is the entire login system.** No password, no registration,
   no session. `?user=admin` and you are admin.
2. **One global notes list**, and `GET /notes` returns all of it to anyone.
3. **Ownership is recorded and never checked.** Each note carries `Owner` and
   no line of code reads it, so anyone can edit or destroy anyone's note.
   Fixing *only* the login would leave every note writable by every account.

## What changed in the refactor

- **`PasswordHasher`** (PBKDF2, 100k iterations, per-user salt,
  `FixedTimeEquals`) and **`SessionStore`** (opaque token → username,
  server-side, revocable) come straight from cs#23. **`UserStore`** normalizes
  usernames once, so `Alice` and `alice` cannot become two identities.
- **`NoteService` is the authorization layer**, and its design rule is the
  lesson: *every method takes the owner as its first parameter.* No `Get(id)`
  overload, no `AllNotes()`, so skipping the check is unreachable. Results, not
  exceptions: `Access.Ok / NotFound / Forbidden` (cs#08) become 200 / 404 / 403
  in one helper; a missing session is 401, everywhere.
- **`HttpAuth`** is the only place a request becomes a username. The
  **`wwwroot/` frontend** (register, log in, list, add, edit, delete) uses
  `fetch`, no libraries, and never sees the token: the cookie is `HttpOnly`.
- **72 tests**, all without a server, including one block per verb proving bob
  cannot read, edit, or delete alice's note.

## Which earlier project taught each piece

| Piece in this capstone | Taught by |
|---|---|
| `Note` as a record; `with` for edits | cs#02, cs#07 |
| `Access` result instead of exceptions | cs#08 (exceptions-vs-result) |
| `NoteService` hiding its list, defending invariants | cs#09 (encapsulation-bank) |
| `HttpAuth` as extension methods on `HttpContext` | cs#13 (extension-linq-utils) |
| REST resources, status codes, DTO validation; DI | cs#16, cs#17, cs#18 |
| `lock` around read-modify-write | cs#21 (json-file-repository) |
| PBKDF2, opaque tokens, HttpOnly cookies | cs#23 (auth-password-hashing) |
| `wwwroot` + `fetch` frontend; rules testable in isolation | cs#24, cs#25, cs#35 |

## Key takeaway

Two questions, two mechanisms, and you need both. Authentication is a session
token the server issued and can revoke; authorization is a comparison the code
cannot forget to make. The original had a note that *knew* its owner and an app
that never asked — the shape of most real access-control bugs. Put the check
where it cannot be skipped: make the owner a required parameter.
