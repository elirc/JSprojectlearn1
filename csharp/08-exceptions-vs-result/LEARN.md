# 📘 Learning Guide: Exceptions vs Result

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A signup-form validator: username, email, password, five rules. Something every web app needs — and one of the best places to learn *how failure should travel through a program*.

The original throws an exception the instant any rule fails. The consequences show up as user pain: the form has four problems, but the user is told about them **one submit at a time**, five round trips in all. The refactor changes one architectural decision — failures become *returned values* instead of thrown emergencies — and the user learns everything on the first submit.

## 2. Concepts you need first

### What an exception is

An **exception** is C#'s emergency signal. When code `throw`s, normal execution stops instantly, and the runtime races back up through every calling function looking for a `try/catch` willing to handle it:

```csharp
void Risky()
{
    throw new Exception("something went wrong");
    Console.WriteLine("this line NEVER runs");
}

try
{
    Risky();
}
catch (Exception ex)
{
    Console.WriteLine(ex.Message);  // "something went wrong"
}
```

If *nothing* catches it, the program crashes with a **stack trace** (the list of calls that led to the throw). JS has the identical mechanism with the identical keywords — `throw new Error("...")`, `try/catch` — so all of this should feel familiar.

The important properties for this project: a `throw` **stops everything after it** (rules #2–#5 never run), and it can carry only **one** payload up the chain.

### Exception types — the built-in vocabulary

C# rarely throws plain `Exception`. It has subtypes that *say what kind of bug happened*:

```csharp
throw new ArgumentException("percent can't be negative", nameof(percent));
throw new ArgumentNullException(nameof(form));    // "you passed me null"
throw new InvalidOperationException("can't advance a delivered order");
```

`catch` can then be selective: `catch (ArgumentException)` catches those and lets others keep flying. Compare `catch (Exception)` — the catch-everything net — which we'll see cause trouble below. (JS mirrors this weakly with `TypeError`/`RangeError`; js#30 builds custom error classes for the same reason.)

There's also a shortcut you'll see in the refactor:

```csharp
ArgumentNullException.ThrowIfNull(form);  // throws if form is null, else does nothing
```

### Control flow — and what "exceptions as control flow" means

**Control flow** is just: which line runs next. `if`, loops, `return` are control flow. Exceptions are control flow too — a very violent kind, a teleporter to the nearest catch.

"Using exceptions as control flow" means using that teleporter for *ordinary, expected* decisions — like "is this form valid?" The original does exactly this:

```csharp
try { Validate(user, mail, pass); /* valid! */ }
catch (Exception ex) { /* invalid! */ }
```

A yes/no question, answered via emergency machinery. It works, but you pay three prices: only the first failure survives, every caller must remember the try/catch, and the catch net snags real bugs too.

### The two kinds of failure (the heart of this project)

Sort every failure by one question — **who can fix it?**

| Failure | Who fixes it? | Example | Right tool |
|---|---|---|---|
| *Expected* | The caller / the user | typo'd email, short password, file not found | **return it as data** |
| *Genuine bug* | The programmer | `null` where null is impossible, index out of range | **throw an exception** |

A user typing `al.example.com` is not an emergency. It's Tuesday. Expected failures arrive constantly on the normal path, and the normal path's tool is the **return value**.

### The Result pattern

If failure is data, give it a shape. A **Result** is a small object that says "it worked" or "it didn't, and here's every reason":

```csharp
public record Result(bool Ok, IReadOnlyList<string> Errors)
{
    public static Result Success() => new(true, Array.Empty<string>());
    public static Result Failure(IEnumerable<string> errors) => /* ... */;
}
```

A record (project 07) with two members and two **factory methods** — static methods whose names say what you're building, so call sites read like sentences: `Result.Success()`, `Result.Failure(errors)`.

In JS you'd return `{ ok: true }` or `{ ok: false, errors: [...] }` — js#31 does exactly that, and ts#36 adds a type for it. The C# version is that same idea with a compiler behind it: `Validate` *declares* it returns `Result`, so no caller can forget failure exists — it's staring at them from the signature. (`IReadOnlyList` says "you may look at the errors, not edit them" — project 09 leans hard on that idea.)

### Accumulating instead of bailing

The one-line algorithm change that fixes the UX:

```csharp
var errors = new List<string>();
if (rule1Broken) errors.Add("message 1");   // no throw — keep going!
if (rule2Broken) errors.Add("message 2");   // this line RUNS even if rule 1 failed
return errors.Count == 0 ? Result.Success() : Result.Failure(errors);
```

Every rule gets its turn; failures pile up in a list. `throw` physically cannot do this — the first one exits the function.

## 3. Walking through the original code

The form has four problems planted (`"al"`, `"al.example.com"`, `"short"` — short *and* digit-less). The validator:

```csharp
void Validate(string user, string mail, string pass)
{
    // Each rule bails out at the FIRST failure — the rest never run.
    if (user.Length < 3) throw new Exception("username must be at least 3 characters");
    if (user.Contains(' ')) throw new Exception("username cannot contain spaces");
    if (!mail.Contains('@')) throw new Exception("email must contain an @");
    if (pass.Length < 8) throw new Exception("password must be at least 8 characters");
    if (!pass.Any(char.IsDigit)) throw new Exception("password needs at least one digit");
}
```

Each rule alone is fine. The structure is the bug: the first `throw` exits, so the function's knowledge of problems #2–#4 dies unspoken.

The caller:

```csharp
try
{
    Validate(user, mail, pass);
    Console.WriteLine($"  OK — welcome, {user}! Account created.");
}
catch (Exception ex)  // exceptions as everyday control flow
{
    Console.WriteLine($"  Sorry: {ex.Message}");
}
```

And the demo script plays out the user's evening: attempt 1 → "username too short." Fix. Attempt 2 → "email must contain an @." Fix. Attempt 3 → "password too short." Fix. Attempt 4 → "password needs a digit" — a rule that was *hiding behind* rule #4 the whole time. Attempt 5 → finally in. Five submits, four problems, all knowable up front.

## 4. What's wrong with it (in beginner terms)

**1. One error per submit, by accident.** Nobody designed the hostile UX; it fell out of `throw`'s mechanics. When your tool can only carry one failure, your product can only report one failure. Implementation details became user experience.

**2. The signature hides everything.** `void Validate(...)` looks like it always succeeds. Nothing in the type says "this throws five different ways" — C# (like JS, unlike Java) has no `throws` declaration, so the danger is invisible until runtime. A `Result`-returning signature *is* the documentation.

**3. `catch (Exception)` is a bug launderer.** It was written to catch validation failures, but it catches *everything*. Introduce a real defect into `Validate` — say a `NullReferenceException` from a genuinely broken line — and the user sees "Sorry: Object reference not set to an instance of an object." The crash you needed to hear about was dressed up as form feedback and shipped.

**4. Exceptions cost more than an `if`.** Building a stack trace is expensive; evaluating `errors.Count == 0` is nearly free. On a validator that runs on every keystroke or every request, "emergency machinery for ordinary questions" is also a performance smell — but note it's the *least* important problem on this list. Design first, speed later.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 The validator discovers four problems but can only *say* one. What could it hand back that holds all four?
2. 🌿 Change `Validate` to return something instead of throwing: run every rule, collect failure messages into a `List<string>`, and return it. An empty list means "valid."
3. 🌳 A bare `List<string>` makes callers write `errors.Count == 0` everywhere. Wrap it: a `record Result(bool Ok, IReadOnlyList<string> Errors)` with `Success()` and `Failure(errors)` factory methods. Update the caller to `if (result.Ok)` and to loop over `result.Errors`.
4. 🍎 Now redraw the exception line: `Validate(null)` is a *programmer* mistake, not a user mistake — start the method with `ArgumentNullException.ThrowIfNull(form);`. Write tests: an all-bad form yields all four messages; a good form is `Ok`; `Validate(null!)` throws. (The `!` is the null-forgiveness operator from project 05 — you're deliberately lying to the compiler to test the guard.)

## 6. Understanding the refactored solution

**`Result.cs`** — the whole pattern is one small record. Notice `Failure` itself throws:

```csharp
public static Result Failure(IEnumerable<string> errors)
{
    var list = errors.ToList();
    if (list.Count == 0)
        throw new ArgumentException("A failure needs at least one error.", nameof(errors));
    return new Result(false, list);
}
```

That's not hypocrisy — it's the dividing line in action. A `Failure` with no errors isn't bad user input; it's a broken *program* (some code claimed failure without saying why). Programmer mistakes throw. There's a test proving it.

**`SignupValidator.cs`** — the same five rules, restructured to accumulate:

```csharp
ArgumentNullException.ThrowIfNull(form);   // bug -> exception

var errors = new List<string>();
if (form.Username.Length < 3)
    errors.Add("username must be at least 3 characters");
/* ...every rule runs... */
return errors.Count == 0 ? Result.Success() : Result.Failure(errors);
```

Also note the input became `record SignupForm(string Username, string Email, string Password)` — three loose strings promoted to one named value (project 07's habit paying rent: you can't pass email and password in the wrong order anymore, and tests construct forms in one readable line).

**`Program.cs`** — the payoff, visible in the run output. Attempt 1 lists **all four** problems; attempt 2 succeeds. And look at what's *absent*: no `try`, no `catch`. Handling a Result is ordinary code:

```csharp
if (result.Ok) { ... }
else foreach (var error in result.Errors) { ... }
```

**`Tests.cs`** — the shape to copy into your own projects: the all-errors case asserts the *count* (4) and each message; boundaries pin the exact edges (3-char username passes, 2 fails); and the two `Check.Throws<>` tests document, in executable form, which failures remained exceptions and why.

One last thing the refactor deliberately did **not** do: replace every exception in the world with Results. File systems break, networks die, bugs happen — exceptions are the right tool for the unexpected. The skill is the sorting, not picking one tool forever.

## 7. Words you learned (glossary)

- **Exception** — C#'s emergency signal: `throw` stops execution and searches up the call chain for a `catch`.
- **`try` / `catch`** — the block that attempts risky code and the block that handles its escape.
- **Stack trace** — the "how we got here" call list attached to an exception.
- **Exception type** — the class of an exception (`ArgumentException`, `InvalidOperationException`...); lets `catch` be selective and messages be precise.
- **`ArgumentNullException.ThrowIfNull(x)`** — one-line guard: throws if `x` is null.
- **Control flow** — which line runs next; exceptions are its emergency form.
- **Exceptions as control flow** — using throw/catch for ordinary, expected decisions. The smell this project removes.
- **Expected failure** — a failure the *caller* can fix (bad input, not found). Model as data.
- **Genuine bug** — a failure only the *programmer* can fix (impossible null, broken invariant). Throw.
- **Result pattern** — returning success-or-failure as a value: `Result(bool Ok, IReadOnlyList<string> Errors)`.
- **Factory method** — a static creation method with a meaningful name (`Result.Success()`).
- **Accumulate** — collect every failure into a list instead of stopping at the first.
- **`IReadOnlyList<T>`** — a list the receiver can read but not modify.
- **Null-forgiveness (`null!`)** — "trust me, compiler" (project 05); used in tests to deliberately break a guard.

## 8. Experiments to try on the plane (no internet needed)

Rebuild after each change with `dotnet run --project csharp/08-exceptions-vs-result/refactored -- test`.

1. **Add a rule.** In `SignupValidator`, add: username may only contain letters and digits (`if (!form.Username.All(char.IsLetterOrDigit)) errors.Add("username can only contain letters and digits");`). Run the tests. Expected: the "all four problems" test still passes (`"al"` is all letters) — but the "exactly one error" test FAILS with count 2, because `"al ice"`'s space now breaks *two* rules. Decide the spec (keep both messages? merge them?) and fix the test to match. Lesson: with accumulation, adding a rule is one `if` — and the tests immediately show you every expectation the rule changed.
2. **Feel the original's ceiling.** In `original.cs`, try to make attempt 1 print *all four* problems without restructuring — you can't. The best you can do is reorder rules, which just changes *which single* error shows. That dead end is the whole argument for Results.
3. **Break the accumulator.** In the refactor, change one `errors.Add(...)` into `return Result.Failure(new[] { "..." });`. Expected: you've reinvented early-exit — the "all four problems reported at once" test fails with count 1. Revert.
4. **Launder a bug on purpose.** In `original.cs`, add `string s = null; _ = s.Length;` as the first lines of `Validate`, then run. Expected: the user-facing message becomes `Sorry: Object reference not set...` — the catch-everything net turning a crash into polite nonsense. (The refactored design has no net to hide it: the same bug would crash loudly with a stack trace pointing at the exact line. Crashes you can hear are fixable.)
5. **Make the Result generic (stretch goal).** Design `Result<T>`: on success it carries a value (`T Value`), on failure the errors. Give `Validate` a `Result<SignupForm>` return where success carries a *normalized* form (trimmed username, lowercased email). Tests: success carries the cleaned value; failure still carries every error.
