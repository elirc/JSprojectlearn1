# 🏋️ Practice: Null Safety in C#

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. The initial (warm-up)

Add `Initial(User? user)` to `Greeter`: the first letter of the user's name, or `"?"` when there's no user. One expression — no `if` allowed.

Practices: a `?.` chain ending in `??`, on your own method for the first time.

Hint: after `user?.`, the rest of the chain only runs for a real user; `Substring(0, 1)` grabs the first letter as a `string`.

Check it offline: add this Check test to `Tests.cs` — both should pass:
`Check.Equal("A", Greeter.Initial(directory.FindOrNull(1)), "Ada starts with A");`
`Check.Equal("?", Greeter.Initial(directory.FindOrNull(99)), "no user, question mark");`

### ⭐⭐ 2. Count the reachable users (core)

Add `CountWithEmail()` to `UserDirectory`: how many users actually have an email. The demo directory should say `1` (Ada yes, Grace no).

Practices: `is not null` inside a lambda, LINQ `Count` with a condition.

Hint: `_users.Count(u => ...)` — the condition is a null check, and `is not null` is the idiomatic spelling.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal(1, directory.CountWithEmail(), "only Ada is reachable");`
`Check.Equal(0, new UserDirectory(new List<User>()).CountWithEmail(), "empty directory, zero");`

### ⭐⭐ 3. Extend the record: nicknames (core)

Give `User` a fourth field `string? Nickname` with a default of `null` — so every existing `new User(...)` still compiles. Then add `DisplayName(User user)` to `Greeter`: the nickname if there is one, otherwise the name. Notice the parameter is `User`, not `User?` — this method *demands* a real user, and the compiler enforces that at every call site.

Practices: growing a record without breaking callers, `??` as "preferred value or fallback", choosing `T` vs `T?` in a signature deliberately.

Hint: the record line becomes `(..., string? Nickname = null)`; the method body is a single `??`.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal("Peggy", Greeter.DisplayName(new User(7, "Margaret", "m@x.com", "Peggy")), "nickname wins");`
`Check.Equal("Ada", Greeter.DisplayName(new User(1, "Ada", "ada@example.com")), "no nickname, real name");`

### ⭐⭐ 4. The third lookup shape: GetOrThrow (core)

`FindOrNull` returns `User?`; `TryFind` returns `bool` + `out`. Add the third classic shape to `UserDirectory`: `GetOrThrow(int id)` returns a **non-nullable** `User` — and throws `KeyNotFoundException` when the id doesn't exist. It's for call sites where a missing user is a *bug*, not a case to handle politely.

Practices: `?? throw` (an exception as the right-hand side of `??`), signatures as promises — returning `User` means callers never null-check.

Hint: one expression: reuse `FindOrNull(id)` and put `throw new KeyNotFoundException(...)` after `??`.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal("Ada", directory.GetOrThrow(1).Name, "no null check needed — the type says so");`
`Check.Throws<KeyNotFoundException>(() => directory.GetOrThrow(99), "missing id throws");`

### ⭐⭐⭐ 5. TryGetEmail — your own [NotNullWhen] (challenge)

Add `TryGetEmail(int id, out string? email)` to `UserDirectory`, returning `true` only when the user exists **and** has an email — two different nulls collapsed into one honest bool. Decorate the out parameter with `[NotNullWhen(true)]` so that inside `if (dir.TryGetEmail(1, out var email))` the compiler treats `email` as a real `string` — no warning on `email.Length`.

Practices: writing (not just consuming) the TryXxx pattern, `[NotNullWhen]`, `?.` collapsing two absence cases.

Hint: `email = FindOrNull(id)?.Email;` handles both nulls in one line — then `return email is not null;`. The attribute needs `using System.Diagnostics.CodeAnalysis;` (already at the top of the file).

Check it offline: add to `Tests.cs` — all three should pass:
```csharp
Check.True(directory.TryGetEmail(1, out var adaMail) && adaMail == "ada@example.com", "found and non-null");
Check.True(!directory.TryGetEmail(2, out _), "Grace exists but has no email -> false");
Check.True(!directory.TryGetEmail(99, out _), "missing user -> false");
```

### ⭐⭐⭐ 6. All the emails, provably non-null (challenge)

Add `Emails()` to `UserDirectory` returning `List<string>` — note: `string`, not `string?` — containing every email that exists. The interesting part is convincing the compiler: `_users.Select(u => u.Email)` is a sequence of `string?`, and filtering the nulls out with `Where` still leaves the *type* as `string?`. Find a way to end with genuine `List<string>`.

Practices: nullability flowing through LINQ, `OfType<T>()` as a filter-and-retype step.

Hint: `.OfType<string>()` keeps only items that actually are strings — nulls fail that test — and the result is typed `IEnumerable<string>`. (The alternative is `.Where(e => e is not null).Select(e => e!)` with the null-forgiving `!` — compare how each reads.)

Check it offline: add to `Tests.cs` — it should pass:
```csharp
var emails = directory.Emails();
Check.Equal(1, emails.Count, "one real email in the demo directory");
Check.Equal("ada@example.com", emails[0], "and it's Ada's");
```

## Solutions

### 1. The initial

```csharp
public static string Initial(User? user) =>
    user?.Name.Substring(0, 1) ?? "?";
```

WHY: `user?.` short-circuits the whole rest of the chain when `user` is null — `Name` is never touched — and the `??` catches that null and substitutes `"?"`. Note there's no `?.` before `Substring`: once past `user?.`, `Name` is a non-nullable `string`, so the compiler knows nothing else in the chain can be null.

### 2. Count the reachable users

```csharp
public int CountWithEmail() => _users.Count(u => u.Email is not null);
```

WHY: `is not null` is the modern C# null test (it ignores any custom `==` operators a type might define, so it always means exactly "is this a null reference"). `Count(predicate)` fuses filter and count into one pass — no intermediate list.

### 3. Extend the record: nicknames

```csharp
public record User(int Id, string Name, string? Email, string? Nickname = null);
```

```csharp
public static string DisplayName(User user) => user.Nickname ?? user.Name;
```

WHY: the `= null` default keeps every existing 3-argument constructor call compiling — extension without breakage. `DisplayName` takes `User`, not `User?`: this method has nothing sensible to say about a missing user, so its signature refuses the case entirely and pushes that decision to callers — the compiler enforces it. The `??` reads exactly like the JS `user.nickname ?? user.name` you already know.

### 4. The third lookup shape: GetOrThrow

```csharp
public User GetOrThrow(int id) =>
    FindOrNull(id) ?? throw new KeyNotFoundException($"no user with id {id}");
```

WHY: `throw` can be an *expression* in C#, so it slots directly after `??`: real user → return it; null → throw. The return type `User` (no `?`) is the whole point — callers write `GetOrThrow(1).Name` with zero warnings, because the signature promises "a user or an exception, never a null." Three shapes, three contracts: `T?` = "absence is normal", `bool Try(out T)` = "absence is common, no exceptions please", `T` + throw = "absence is a bug."

### 5. TryGetEmail — your own [NotNullWhen]

```csharp
public bool TryGetEmail(int id, [NotNullWhen(true)] out string? email)
{
    email = FindOrNull(id)?.Email;
    return email is not null;
}
```

WHY: two independent absences — no user, or a user without an email — collapse through one `?.` into "is there an email at the end of this chain?" The attribute is the contract `TryFind` taught you, now written by you: it tells the compiler "when I return true, the out value is not null," which is what lets `if (TryGetEmail(...))` bodies use `email` without warnings. Attributes like this are how libraries make *flow* facts visible to the type system.

### 6. All the emails, provably non-null

```csharp
public List<string> Emails() =>
    _users.Select(u => u.Email).OfType<string>().ToList();
```

WHY: `Where(e => e is not null)` filters the values but the static type stays `string?` — the compiler doesn't narrow types across LINQ operators. `OfType<string>()` does both jobs at once: null is not an instance of `string`, so nulls are dropped, *and* the output type becomes `IEnumerable<string>`. The `!` alternative works too but is a promise the compiler takes on faith; `OfType` gets there without any promises.
