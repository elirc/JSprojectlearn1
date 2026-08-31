# CS 05 — null-safety-csharp

**Lesson: make "might be missing" part of the type. `string?` vs `string`, `?.`, `??`, guard clauses, and the TryFind pattern turn NullReferenceException from a runtime surprise into a compile-time conversation.**

This mirrors `typescript/05-null-safety` — same lesson, C# edition:
TypeScript's `strictNullChecks` is C#'s **nullable reference types**.

## Run it

From the repo root:

```
dotnet run csharp/05-null-safety-csharp/original.cs
dotnet run --project csharp/05-null-safety-csharp/refactored
dotnet run --project csharp/05-null-safety-csharp/refactored -- test
```

## What's wrong with the original?

It runs `#nullable disable` — how all C# worked before 2019 and how plenty of
old codebases still run: `null` can hide in ANY reference, and the compiler
never asks questions. Three lookups, three outcomes:

1. **User 1** (has an email): works. This is the path the author tested.
2. **User 2** (email is `null`): no crash — *worse*. `"...at " + null` quietly
   glues in nothing, printing `We'll email you at ` and shipping a malformed
   message. Nulls don't always explode; sometimes they corrupt output silently.
3. **User 99** (doesn't exist): `FindUser` returns `null` as "not found",
   `Greet` never checks, and `user.Name` throws **NullReferenceException** —
   C#'s `Cannot read properties of null`. The demo catches it at the top level
   purely so you can read the autopsy; in a real app this is the 500 page.

The rot is in the signature: `User FindUser(int id)` *claims* to always return
a user. The `return null` is a lie the type system was never allowed to see.

## What changed in the refactor

1. **`<Nullable>enable</Nullable>`** — now `User` means *never null*, and
   `User?` means *might be null*. The lie is unrepresentable: a `FindUser`
   that returns null must be *declared* `User?`, and every caller that
   forgets to check gets a compiler warning at the exact line that would
   have crashed.
2. **The truth moved into the types**: `record User(int Id, string Name,
   string? Email)` — Name never null, Email optionally null. What was tribal
   knowledge is now machine-checked documentation.
3. **Two honest lookup shapes**: `FindOrNull(id)` returns `User?` for
   null-aware callers; `TryFind(id, out user)` returns `bool` — the same
   pattern as `Dictionary.TryGetValue` — with `[NotNullWhen(true)]` teaching
   the compiler that a `true` result guarantees a real user.
4. **Callers handle absence in one line each**: a guard clause for the
   missing user, `??` for the null email, and a `?.` chain in `EmailDomain`
   that survives null user *and* null email. No try/catch anywhere — there's
   nothing left to throw.
5. **Tests cover the paths the original never had**: missing user, null
   email, empty directory — all return friendly strings, never exceptions.

## Key takeaway

Billion-dollar mistake, two-keyword fix: make absence *visible in the type*
(`User?`), then let the compiler hound every path that forgets. Same move as
TypeScript's `strictNullChecks`, same payoff: "can this be null?" stops being
a code-review guess and becomes something the build answers. Return `T?` or
`bool Try...(out T)` instead of a secret null — your callers can't mishandle
what they're forced to see.
