# 🏋️ Practice: Exceptions vs Result

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. One-line summary (warm-up)

Give `Result` a computed property `Summary`: `"ok"` when the result is a success, otherwise every error joined with `"; "`. Handy for logs and demo output.

Practices: computed properties on records, `string.Join`, the ternary.

Hint: a property with `=>` (no `set`, no stored field) — `Ok ? ... : string.Join("; ", Errors)`.

Check it offline: add this Check test to `Tests.cs` — both should pass:
`Check.Equal("ok", Result.Success().Summary, "success summarizes as ok");`
`Check.Equal("a; b", Result.Failure(new[] { "a", "b" }).Summary, "failures join with semicolons");`

### ⭐⭐ 2. A second validator in the house style (core)

Write `CouponValidator` (new file or below `SignupValidator`): `Validate(string code)` returns a `Result` with accumulated errors. Rules: the code must be exactly 6 characters; must not contain spaces; must start with a letter — but only test the first character *if there is one* (an empty code should report only the length problem, not crash).

Practices: the accumulate-don't-throw pattern from scratch, guarding an index with `&&` short-circuit.

Hint: `code.Length > 0 && !char.IsLetter(code[0])` — the right side never runs for an empty string, so `code[0]` can't throw.

Check it offline: add to `Tests.cs` — all three should pass:
`Check.True(CouponValidator.Validate("SAVE10").Ok, "a good code passes");`
`Check.Equal(3, CouponValidator.Validate("1 X").Errors.Count, "wrong length + space + bad first char, all at once");`
`Check.Equal(1, CouponValidator.Validate("").Errors.Count, "empty code: length error only, no crash");`

### ⭐⭐ 3. The record equality gotcha (core)

Records compare by value — so are two identical failures equal? Add a Check test asserting `Result.Failure(new[] { "x" }) != Result.Failure(new[] { "x" })` — it passes, because record equality compares the `Errors` *list field* by reference, and these are two different lists. Then write the fix: a helper `SameErrors(Result a, Result b)` that compares `Ok` and the error *contents*.

Practices: knowing where record value-equality stops, `SequenceEqual` for content comparison.

Hint: `a.Errors.SequenceEqual(b.Errors)` compares element by element, in order.

Check it offline: add to `Tests.cs` — all three should pass:
```csharp
Check.True(Result.Failure(new[] { "x" }) != Result.Failure(new[] { "x" }), "records compare list fields by REFERENCE");
Check.True(ResultCompare.SameErrors(Result.Failure(new[] { "x" }), Result.Failure(new[] { "x" })), "content comparison says equal");
Check.True(!ResultCompare.SameErrors(Result.Failure(new[] { "x" }), Result.Failure(new[] { "y" })), "different errors differ");
```

### ⭐⭐ 4. Merging results (core)

Add `Result.Merge(params Result[] results)`: combine any number of results into one — success only if *all* succeeded, otherwise a failure carrying every error from every input, in order. This is how you'd combine "validate the form" + "validate the coupon" into one answer for the user.

Practices: `params` (call it with as many results as you like), `SelectMany` to flatten lists of lists.

Hint: gather `results.SelectMany(r => r.Errors)` into a list; empty list → `Success()`, else `Failure(list)`.

Check it offline: add to `Tests.cs` — both should pass:
```csharp
var merged = Result.Merge(Result.Failure(new[] { "a", "b" }), Result.Success(), Result.Failure(new[] { "c" }));
Check.Equal(3, merged.Errors.Count, "all errors from all results, in order");
Check.True(Result.Merge(Result.Success(), Result.Success()).Ok, "all-success merges to success");
```

### ⭐⭐⭐ 5. Rules as data (challenge)

The five `if` statements in `Validate` all have the same shape: *a condition and a message*. Turn them into a table — a `List<(Func<SignupForm, bool> IsViolated, string Message)>` — and write `ValidateWithRules(SignupForm form)` that loops the table, collecting the message of every violated rule. Adding rule #6 should now mean adding one *row*, touching zero logic.

Practices: `Func<T, bool>` (a stored condition — a lambda in a variable), tuples in collections, data-driven design.

Hint: a row looks like `(f => f.Username.Length < 3, "username must be at least 3 characters"),` and the loop is `foreach (var (isViolated, message) in Rules) if (isViolated(form)) errors.Add(message);`.

Check it offline: add to `Tests.cs` — both should pass (same spec as `Validate`, new engine):
`Check.Equal(4, SignupValidator.ValidateWithRules(new SignupForm("al", "al.example.com", "short")).Errors.Count, "table engine finds all four");`
`Check.True(SignupValidator.ValidateWithRules(new SignupForm("alice", "alice@example.com", "longenough7")).Ok, "table engine passes the good form");`

### ⭐⭐⭐ 6. Parse, then validate (challenge)

Forms arrive as text: write `FormReader.ParseAndValidate(string line)` for lines like `"alice,alice@example.com,longenough7"`. Split on commas; if there aren't exactly 3 fields, return a `Failure` saying so — and notice this early return is *justified*: you can't run signup rules on fields that don't exist. Otherwise build a `SignupForm` and hand off to the existing `Validate`.

Practices: staged validation (parse errors vs content errors), `string.Split`, knowing when early-exit is right — stages exit early, rules within a stage accumulate.

Hint: `var parts = line.Split(',');` then check `parts.Length != 3` before touching `parts[0]`.

Check it offline: add to `Tests.cs` — all three should pass:
`Check.Equal(4, FormReader.ParseAndValidate("al,al.example.com,short").Errors.Count, "parsed fine, then all four rule failures");`
`Check.Equal(1, FormReader.ParseAndValidate("justonefield").Errors.Count, "unparseable line: one structural error");`
`Check.True(FormReader.ParseAndValidate("alice,alice@example.com,longenough7").Ok, "good line sails through both stages");`

## Solutions

### 1. One-line summary

```csharp
public string Summary => Ok ? "ok" : string.Join("; ", Errors);
```

WHY: a computed property derives from existing state, so it can never disagree with `Ok`/`Errors` — no field to keep in sync. `string.Join` handles the one-error case (no stray separator) and would even handle zero, though `Failure`'s guard means a failed result always has at least one.

### 2. A second validator in the house style

```csharp
public static class CouponValidator
{
    public static Result Validate(string code)
    {
        ArgumentNullException.ThrowIfNull(code);
        var errors = new List<string>();
        if (code.Length != 6) errors.Add("code must be exactly 6 characters");
        if (code.Contains(' ')) errors.Add("code cannot contain spaces");
        if (code.Length > 0 && !char.IsLetter(code[0])) errors.Add("code must start with a letter");
        return errors.Count == 0 ? Result.Success() : Result.Failure(errors);
    }
}
```

WHY: same skeleton as `SignupValidator` — throw for the programmer bug (null), accumulate for the user mistakes. The `code.Length > 0 &&` guard is the subtle line: `&&` short-circuits, so `code[0]` is never evaluated for an empty string. An unguarded `code[0]` would have been a *genuine bug* (IndexOutOfRange) hiding inside your user-input validator — exactly the two categories this project separates.

### 3. The record equality gotcha

```csharp
public static class ResultCompare
{
    public static bool SameErrors(Result a, Result b) =>
        a.Ok == b.Ok && a.Errors.SequenceEqual(b.Errors);
}
```

WHY: record equality compares each field with that field's own `Equals` — and for a list field, that's reference equality. Two `Failure`s built from separate arrays therefore differ, which surprises everyone once. `SequenceEqual` walks both lists comparing contents in order, giving you the "same data" comparison you actually meant. Knowing exactly where value semantics end is what keeps records from biting you.

### 4. Merging results

```csharp
public static Result Merge(params Result[] results)
{
    var errors = results.SelectMany(r => r.Errors).ToList();
    return errors.Count == 0 ? Success() : Failure(errors);
}
```

WHY: because failures are *data*, combining them is just list concatenation — try writing `Merge` for two functions that throw! `SelectMany` flattens "a list of error-lists" into one stream, preserving order, and successes contribute nothing (their error lists are empty). `params` lets call sites stay clean: `Merge(a, b, c)`.

### 5. Rules as data

```csharp
static readonly List<(Func<SignupForm, bool> IsViolated, string Message)> Rules = new()
{
    (f => f.Username.Length < 3,          "username must be at least 3 characters"),
    (f => f.Username.Contains(' '),       "username cannot contain spaces"),
    (f => !f.Email.Contains('@'),         "email must contain an @"),
    (f => f.Password.Length < 8,          "password must be at least 8 characters"),
    (f => !f.Password.Any(char.IsDigit),  "password needs at least one digit"),
};

public static Result ValidateWithRules(SignupForm form)
{
    ArgumentNullException.ThrowIfNull(form);
    var errors = new List<string>();
    foreach (var (isViolated, message) in Rules)
    {
        if (isViolated(form)) errors.Add(message);
    }
    return errors.Count == 0 ? Result.Success() : Result.Failure(errors);
}
```

WHY: `Func<SignupForm, bool>` is a condition stored as a value — a lambda you call later with `isViolated(form)`, exactly like passing callbacks in JS. Once rules are rows, the engine is five lines and never changes; specs change by editing the table. This is the doorway to delegates (project 12): behavior as data.

### 6. Parse, then validate

```csharp
public static class FormReader
{
    public static Result ParseAndValidate(string line)
    {
        ArgumentNullException.ThrowIfNull(line);
        var parts = line.Split(',');
        if (parts.Length != 3)
            return Result.Failure(new[] { "expected 3 comma-separated fields: username,email,password" });
        return SignupValidator.Validate(new SignupForm(parts[0], parts[1], parts[2]));
    }
}
```

WHY: "no early exit" applies to rules *within* a stage, not *between* stages — with only one field there is no email to check, so continuing would produce nonsense errors, and stopping is the honest move. Once the shape is right, the existing validator runs unchanged and its accumulation still delivers all four content errors at once. Layered validation like this (structure first, content second) is exactly how request handling works in the web projects later in the track.
