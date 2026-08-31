# 📘 Learning Guide: Null Safety in C#

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A user directory and a greeting formatter: look up a user by id, greet them by name, mention their email. Three users' worth of drama: one normal, one with no email on file, one who doesn't exist. The original handles exactly one of those three. If you did `typescript/05-null-safety`, this will rhyme hard — `null` is the same monster in every language, and C#'s leash for it (**nullable reference types**) is the same idea as TypeScript's `strictNullChecks`.

## 2. Concepts you need first

(Projects 01–04 assumed: records, `List<T>`, lambdas, `FirstOrDefault` gets introduced properly below.)

### What `null` is
`null` means "no object here" — a reference pointing at nothing. It's JS's `null`/`undefined` rolled into one. Any *reference* variable can hold it:

```csharp
string name = null;      // legal in old C# — the box holds "nothing"
```

The catch: `null` travels. It rides along in variables, gets returned from methods, sits in fields — harmless — until some line finally asks it for a member:

```csharp
name.ToUpper();   // BOOM: NullReferenceException
```

**NullReferenceException** (NRE) is C#'s `TypeError: Cannot read properties of null`. The crash site is often nowhere near the line that produced the null — that's what makes these bugs miserable.

### The old world: `#nullable disable`
Before 2019, EVERY reference type silently permitted null, and the compiler stayed out of it. A file can opt into that old world with the `#nullable disable` directive — which `original.cs` does, both for authenticity (tons of production C# still runs this way) and so you can watch what life is like without the safety net.

### Nullable reference types: `string` vs `string?`
With `<Nullable>enable</Nullable>` (on in every `refactored.csproj` in this track), reference types split in two:

```csharp
string  name  = null;   // WARNING — `string` promises "never null"
string? email = null;   // fine — the ? declares "string or null"
```

Exactly TypeScript's `string` vs `string | null`. Two consequences follow:

1. **Producers must be honest.** A method that might return null must *say so* in its return type (`User?`), or the compiler warns at the `return null;`.
2. **Consumers must check.** Dereferencing a `User?` without a null check warns at *that exact line* — the compiler has already found your crash site for you.

(They're warnings, not errors, by default — a pragmatic choice so old code can adopt gradually. Read every one; this track's refactors compile with zero.)

### `?.` — the null-conditional operator
Same as JS optional chaining:

```csharp
user?.Name           // null if user is null; otherwise user.Name
user?.Email?.Length  // survives null at either link; type is int? here
```

If anything along the chain is null, the whole expression is null — no throw.

### `??` — the null-coalescing operator
Same as JS's `??`:

```csharp
var email = user.Email ?? "no email on file";   // fallback when null
```

`?.` and `??` are a duet: chain optionally, then land on a guaranteed-non-null fallback: `user?.Email ?? "(none)"`.

### `is null` / `is not null`
The idiomatic null test:

```csharp
if (found is null) return "nobody home";
if (user is not null) { ... }
```

(`== null` usually works too; `is null` is the modern habit — it can't be hijacked by custom `==` operators.)

### Guard clauses
Handle the bad case first and leave; the happy path then runs at zero indentation with everything guaranteed:

```csharp
public static string Greet(UserDirectory directory, int id)
{
    if (!directory.TryFind(id, out var user))
        return $"Hello, guest! (no user with id {id})";

    // from here down, user is 100% real — the compiler agrees
    return $"Hello, {user.Name.ToUpper()}!";
}
```

The alternative — wrapping the happy path in `if (user != null) { ... }` — nests deeper with every check. Guards keep code flat. (You saw this style all over the JS track; it matters even more when the compiler is tracking which branches proved what.)

### The TryFind pattern and `[NotNullWhen(true)]`
Project 03 met `Dictionary.TryGetValue(key, out value)`. Now we *write* one:

```csharp
public bool TryFind(int id, [NotNullWhen(true)] out User? user)
{
    user = FindOrNull(id);
    return user is not null;
}
```

The return value answers "did it work?"; the `out` parameter carries the result. The attribute `[NotNullWhen(true)]` (from `System.Diagnostics.CodeAnalysis`) is a promise to the compiler: *whenever this method returns true, the out value is not null*. That's why the guard-clause `Greet` above can use `user.Name` with no warning — the compiler understood the contract. (An **attribute** is a bracketed annotation attached to code — metadata the compiler and tools can read. TS analog: this is the same trick as a type-predicate function, `function isFound(u): u is User`.)

### `FirstOrDefault` — LINQ's honest "maybe"
`First(...)` throws when nothing matches (project 04); **`FirstOrDefault(...)`** returns the type's default instead — for reference types, `null`:

```csharp
public User? FindOrNull(int id) => _users.FirstOrDefault(u => u.Id == id);
```

Note the return type: `User?`. Under nullable reference types, `FirstOrDefault`'s "might be nothing" is *in the signature*, and every caller inherits the obligation to deal with it. That's the whole system working as designed.

### `string + null` — the quiet corruption
One more null behavior, and it's a sneaky one: concatenating null into a string *doesn't throw* — null becomes the empty string:

```csharp
Console.WriteLine("email: " + null);   // prints "email: " — no crash, wrong output
```

(JS is arguably louder here — it prints the literal text `null`.) The original's user 2 hits exactly this: a malformed sentence, shipped silently. Not all null bugs announce themselves.

## 3. Walking through the original code

The lie, in one signature:

```csharp
public User FindUser(int id)
{
    foreach (var user in users)
    {
        if (user.Id == id) return user;
    }
    return null;   // "not found" — a landmine the caller can't see in the type
}
```

The type says "always a User." The body says "...or null, good luck." Under `#nullable disable` the compiler is forbidden from noticing.

The trusting caller:

```csharp
User user = directory.FindUser(id);   // might be null. Who checks? Nobody.
return "Hello, " + user.Name.ToUpper() + "! We'll email you at " + user.Email;
```

One line, two independent null bugs: `user.Name` explodes when the *user* is missing (path 3), and `+ user.Email` silently vanishes when the *email* is missing (path 2). And the top level:

```csharp
try
{
    Console.WriteLine(Greeter.Greet(directory, 99));
}
catch (NullReferenceException ex) { ... prints the autopsy ... }
```

**try/catch** runs the risky block and jumps to `catch` if the named exception occurs (JS's `try { } catch { }` with a type filter). It's here so the demo exits cleanly and you can read what happened — but notice what it *can't* do: it can't make the greeting correct. The work simply failed. Catching an NRE at the top is a tarp over a hole, not a floor.

## 4. What's wrong with it (in beginner terms)

**1. The type signature lies.** `User FindUser(int)` promises a user; the implementation delivers "user or landmine." Every caller must *just know* to check — knowledge that lives in comments, folklore, and post-mortems instead of in the code.

**2. The crash is far from the cause.** The null is born in `FindUser`, travels through `Greet`'s local variable, and detonates at `user.Name`. In this 70-line file they're close; in a real app the null crosses five method calls and a cache before exploding in a module the author never touched. Stack traces point at the victim, not the culprit.

**3. The silent path is worse than the loud one.** Path 3 at least crashes where you can see it. Path 2 ships `We'll email you at ` to a customer. No exception, no log line, no test failure — a *data quality* bug, invisible until a human complains.

**4. try/catch treats the symptom.** After catching an NRE you still don't have a greeting — you've just chosen where to shrug. Compare the refactor's approach: make the "no user" case a *normal return value* (`"Hello, guest!"`) so there is nothing to catch, and the program still produces correct output for every input.

## 5. Try it yourself first!

Fix `original.cs` yourself (it's your scratch copy). Hints, vaguest first:

1. 🌱 Delete the `#nullable disable` line and rebuild. Read every warning the compiler now produces — it has literally marked each landmine, including the two inside `Greet`. (Expect warnings on the `= null` field, `return null;`, and the dereferences.)
2. 🌿 Make the types honest: `FindUser` should return `User?`, and `Email` should be declared `string?`. Watch the warnings *move*: producers are clean now, and only the careless consumers are flagged.
3. 🌳 Fix `Greet` with a guard clause: if the lookup came back null, return a guest greeting. Fix the email with `??`. Rebuild until zero warnings — each warning you clear is one runtime crash that can no longer happen.
4. 🍎 Upgrade the lookup to the TryFind shape: `bool TryFind(int id, out User? user)` (add `[NotNullWhen(true)]` and `using System.Diagnostics.CodeAnalysis;` if you want the compiler to fully trust your guard). Delete the try/catch at the bottom — prove to yourself there's nothing left that can throw.

## 6. Understanding the refactored solution

**`User.cs`** — the truth in one line:

```csharp
public record User(int Id, string Name, string? Email);
```

`Name` can't be null (compiler-enforced at every construction site); `Email` is explicitly optional. Grace's `new User(2, "Grace", null)` is *legal and honest*.

**`UserDirectory.cs`** — two honest lookup shapes, both built on `FirstOrDefault`. `FindOrNull` returns `User?` for callers who like `?.` chains; `TryFind` wraps it in the bool + `out` + `[NotNullWhen(true)]` pattern for callers who like guard clauses. Same information, two ergonomic styles — you'll meet both constantly in .NET.

**`Greeter.cs`** — each null handled in one visible line:

```csharp
if (!directory.TryFind(id, out var user))
    return $"Hello, guest! (no user with id {id})";

var email = user.Email ?? "no email on file";
return $"Hello, {user.Name.ToUpper()}! We'll email you at {email}";
```

Missing user → guard clause → friendly string. Missing email → `??` → friendly fallback. And the one-liner:

```csharp
public static string EmailDomain(User? user) =>
    user?.Email?.Split('@').ElementAtOrDefault(1) ?? "(none)";
```

Null user, null email, or email without an `@` — every hole in that chain drains to `"(none)"`. Three failure modes, zero branches, zero exceptions.

**`Program.cs`** runs the original's exact three lookups with **no try/catch anywhere** — path 3 now prints `Hello, guest! (no user with id 99)` because absence is a value, not an accident.

**`Tests.cs`** — read it as a checklist of everything the original couldn't survive: missing user returns a string (doesn't throw), null email gets the fallback, `TryFind` reports false with a null out value, an *empty* directory still greets politely. `Check.Equal("Ada", ada?.Name, ...)` even uses `?.` inside the tests themselves. The suite is runnable proof that no input reaches an NRE.

## 7. Words you learned (glossary)

- **`null`** — a reference to nothing; JS's `null`/`undefined` merged.
- **NullReferenceException (NRE)** — thrown when you dereference null; C#'s "cannot read properties of null."
- **Dereference** — asking an object for a member (`user.Name`).
- **Nullable reference types (NRT)** — the compiler feature making `T` mean never-null and `T?` mean maybe-null.
- **`#nullable disable`** — per-file opt-out; how all pre-2019 C# behaves.
- **`string?` / `User?`** — "or null," declared in the type (TS: `string | null`).
- **`?.`** — null-conditional access; whole chain yields null instead of throwing.
- **`??`** — null-coalescing fallback value.
- **`is null` / `is not null`** — idiomatic null tests.
- **Guard clause** — handle-and-return the bad case first; flat happy path after.
- **`out` parameter + Try-pattern** — `bool Try...(input, out result)`; bool says whether `result` is usable.
- **Attribute** — `[LikeThis]` metadata attached to code; read by compiler and tools.
- **`[NotNullWhen(true)]`** — attribute telling the compiler "true result ⇒ out value non-null" (TS: a type predicate).
- **`FirstOrDefault`** — LINQ's "first match or null" — honest absence in the signature.
- **try/catch** — run risky code, intercept a thrown exception; a tarp, not a fix, for null bugs.

## 8. Experiments to try on the plane (no internet needed)

1. **Make the compiler catch a fresh bug.** In `Greeter.Greet`, replace the email line with `var email = user.Email.ToUpper();`. Rebuild. Expected: warning CS8602 *"Dereference of a possibly null reference"* pointing at that exact spot — the compiler caught in seconds what the original shipped to production. Restore the `??` line and watch the build go quiet.
2. **Watch `[NotNullWhen]` earn its keep.** In `UserDirectory.cs`, delete the `[NotNullWhen(true)]` attribute. Expected: `Greeter.Greet` now warns on `user.Name` — the compiler no longer knows that `TryFind` returning true guarantees a user. Put it back; warning gone. That one attribute is the entire trust contract.
3. **Break a promise and follow the fallout.** In `User.cs`, change `string? Email` to `string Email`. Expected: a warning at `UserDirectory.Demo()`'s `new User(2, "Grace", null)` — the *producer* of the null gets flagged the moment the type stops allowing it. Notice the direction: honest types push errors to where the data is born, not where it dies. Revert.
4. **Reproduce the original's silent bug — and fail a test doing it.** In `Greet`, change the email line to `var email = user.Email;` (type must become `string?` — the compiler will hint). Run the tests. Expected: "user with null email gets the ?? fallback" FAILS with `expected: ...no email on file / actual: ...at ` — the exact malformed string the original shipped, caught by a 3-line test. Revert.
5. **Add "find by name," null-safely, end to end.** Add `public User? FindByName(string name)` to `UserDirectory` (`FirstOrDefault(u => u.Name == name)`), then a greeting line for it in `Program.cs` using `?.` and `??` only — no `if`. Then two tests: the found case and the missing case. Expected: green on the first try, because every tool you needed — `User?`, `?.`, `??` — you now own.
