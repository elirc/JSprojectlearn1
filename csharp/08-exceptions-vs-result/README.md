# CS 08 — Exceptions vs Result

**Lesson: expected failures are data, not emergencies — a `Result` carries ALL
the errors in the return type, and exceptions go back to meaning "bug."**

## Run it

```
dotnet run csharp/08-exceptions-vs-result/original.cs
dotnet run --project csharp/08-exceptions-vs-result/refactored
dotnet run --project csharp/08-exceptions-vs-result/refactored -- test
```

## What's wrong with the original?

Run it and count the submits: **five round trips to discover four problems**,
all of which the validator could have known on attempt 1.

1. **`throw` can only carry the first failure.** The moment rule #1 throws,
   rules #2–#5 never run. One error per submit is not a UX choice anyone made —
   it's an implementation detail of using exceptions for control flow.
2. **A wrong form is not an emergency.** Users typo emails all day; that's
   the *expected* case, arriving on the *normal* path. The original models it
   with the machinery meant for "something is broken" — so the caller needs
   `try/catch` just to ask a yes/no question.
3. **`catch (Exception)` catches everything** — including genuine bugs. If
   `Validate` ever hits a `NullReferenceException`, this catch would politely
   show the user "Sorry: Object reference not set..." and carry on. Real
   defects get laundered into form feedback.

This is ts#36's Result lesson (and js#31's error accumulation) in C#.

## What changed in the refactor

- **A tiny `Result` type**: `record Result(bool Ok, IReadOnlyList<string> Errors)`
  with `Success()` / `Failure(errors)` factory methods. Failure stops being a
  thrown emergency and becomes a *returned value* — visible in the signature
  (`Validate` returns `Result`), impossible to forget, trivial to test.
- **Validators accumulate.** Every rule runs; failures append to a list; the
  user sees all four problems on submit #1 and fixes them in one go. The demo
  replays the original's exact form: two attempts instead of five.
- **No try/catch anywhere in the demo.** Checking `result.Ok` is an `if`, not
  a disaster drill.
- **Exceptions are reserved for genuine bugs** — and there are still two:
  passing a `null` form (`ArgumentNullException`) and building a `Failure`
  with zero errors (`ArgumentException`). Users can't cause either; only
  broken code can. That's the dividing line: *caller-fixable* → Result,
  *programmer-fixable* → exception.
- **Tests read like the spec**: all-errors-collected, happy path, boundary
  values, and `Check.Throws<>` pinning the two genuine-bug cases.

## Key takeaway

Ask of every failure: *who fixes it?* If the answer is "the caller/user"
(bad input, not found, validation), return it as data — a Result that can
hold every reason at once. If the answer is "the programmer" (null that
can't be, impossible state), throw. Exceptions regain their meaning the
moment you stop spending them on ordinary bad input.
