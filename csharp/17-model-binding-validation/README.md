# CS 17 — model-binding-validation

**Lesson: let the framework turn HTTP into typed values (model binding), and
make validation a pure function that reports every problem at once.**

## Run it

```
dotnet run csharp/17-model-binding-validation/original.cs
dotnet run --project csharp/17-model-binding-validation/refactored
dotnet run --project csharp/17-model-binding-validation/refactored -- test
```

Poke it (server running, second terminal — `/discount` also works in a browser):

```
curl -X POST http://localhost:5017/signup -H "Content-Type: application/json" -d "{\"email\":\"sam@site.com\",\"password\":\"supersecret\",\"age\":30}"
curl -i -X POST http://localhost:5017/signup -H "Content-Type: application/json" -d "{\"email\":\"nope\",\"password\":\"pw\",\"age\":5}"
curl "http://localhost:5017/discount?age=70"
curl -i "http://localhost:5017/discount?age=abc"
```

## What's wrong with the original?

1. **It re-does the framework's job, badly.** `/signup` reads the body
   stream, `JsonDocument.Parse`s it, and digs each field out with
   `TryGetProperty` + `ValueKind` checks — 30 lines of plumbing before any
   actual rule. `/discount` hand-parses the query with `int.Parse`, which
   *throws* on `?age=abc`; a blanket try/catch was bolted on after the 500s.
2. **First-error-wins.** A user who got everything wrong plays
   fix-one-resubmit four times before seeing all four problems.
3. **Every exit invents its own error shape** — `{ok, problem}`, `{error}`,
   `{signup_failed, why}` — and all of them ship with **status 200**, so no
   client can react without parsing three bespoke formats (cs#16's sin again).
4. **The rules are untestable** — welded inside an endpoint that needs a
   real HTTP body stream to run at all.

## What changed in the refactor

- **`record SignupRequest(string? Email, string? Password, int? Age)`** —
  the framework binds the JSON body into it automatically. Unreadable JSON
  never reaches our code: ASP.NET answers 400 itself.
- **`SignupValidator.Validate`** — a pure function returning
  `Dictionary<field, messages[]>` with **all** errors accumulated (cs#08's
  Result idea). Empty dictionary = valid.
- **`Results.ValidationProblem(errors)`** — one standard 400 body
  (ProblemDetails) instead of three ad-hoc shapes.
- **`(int age)`** on `/discount` — typed query binding: `?age=abc` becomes an
  automatic 400 and the handler never sees it. `DiscountRules.Percent` is a
  pure switch.
- **Tests** hit the validator and rules directly — including the
  three-fields-broken-at-once case no manual test would ever bother with.

## Key takeaway

Parsing is the framework's job; *deciding* is yours. Declare the shape you
want (a DTO, a typed parameter) and validation becomes a pure function you
can test in a blink — and your callers get one consistent, honest 400 shape
instead of a museum of improvised errors.
