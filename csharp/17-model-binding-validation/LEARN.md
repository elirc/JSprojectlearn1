# 📘 Learning Guide: Model Binding & Validation

Read this before or alongside the README — it teaches the two ideas this project runs on: *binding* (HTTP text → typed C# values) and *validation as a pure function*.

## 1. What are we building?

Two endpoints:

- `POST /signup` — takes JSON like `{"email":"sam@site.com","password":"supersecret","age":30}`, checks the rules (email shaped right, password ≥ 8 chars, age 13–120), and answers "welcome" or a list of problems.
- `GET /discount?age=70` — computes a discount percent from an age in the query string.

The **original** does everything with tweezers: reads the raw body stream, parses JSON by hand, digs out fields one at a time, bails at the first problem with a made-up error shape (status 200!), and `int.Parse`s the query string inside a panic try/catch. The **refactor** declares *shapes* and lets the framework do the plumbing, leaving validation as one pure, thoroughly tested function.

## 2. Concepts you need first

### Everything in HTTP is text

A request body is a stream of bytes; a query string is text; route segments are text. `"age": 30` in JSON and `?age=30` in a URL both arrive as characters, not numbers. *Something* must convert text to `int`/`string`/`bool` and complain when it can't. The whole question of this project is: **who does that job — you or the framework?**

In js#65 there was no choice: you collected stream chunks and `JSON.parse`d them yourself. ASP.NET Core gives you a choice, and the original chooses wrong.

### Model binding: declare what you want, receive it typed

You met this quietly in cs#15; now it gets named. **Model binding** is the framework filling your handler's parameters from the request, converting types as needed:

```csharp
app.MapGet("/discount", (int age) => ...);         // from ?age=30 → int 30
app.MapGet("/todos/{id:int}", (int id) => ...);    // from the path
app.MapPost("/signup", (SignupRequest body) => ...); // from the JSON body
```

The rules are simple: simple types (`int`, `string`, `bool`) come from the route or query string; a complex type (your record) comes from the JSON body. One parameter of each kind, no ceremony.

### The free 400s

Here's the part that kills the original's try/catch: **when binding fails, the framework answers `400 Bad Request` on its own.** `?age=abc` with a declared `(int age)` → 400, handler never runs. Malformed JSON body → 400. Body says `"age": "thirty"` where the DTO wants `int?` → 400. Your code only ever sees values that fit the declared types. Compare that to the original, where `int.Parse("abc")` throws and someone had to discover it in production.

(JS flashback: `parseInt("abc")` gives `NaN` and quietly poisons arithmetic. C#'s `int.Parse` throws instead — louder, but still your problem. Declared binding makes it *nobody's* problem.)

### DTOs and nullable fields: the shape of what clients send

```csharp
public record SignupRequest(string? Email, string? Password, int? Age);
```

A **DTO** (data transfer object) describes what crosses the wire. Every field is nullable (`string?`, `int?` — cs#05's honest types) because clients omit fields, and a missing field should be a *validation message*, not a crash. The DTO answers "what might arrive?"; the validator answers "what's acceptable?" — two different questions, two different pieces of code.

### `JsonDocument` — manual JSON, the tool the original overuses

`JsonDocument.ParseAsync(stream)` gives a tree of `JsonElement`s you interrogate by hand: `TryGetProperty("email", out var prop)`, check `prop.ValueKind`, call `GetString()` / `GetInt32()` (which throws on `29.5`). It's the right tool when you genuinely don't know the shape in advance — and pure busywork when you do. The refactor deletes ~30 lines of it by declaring one record.

### Validation as a pure function, and accumulating errors

cs#08 taught the Result pattern: return what happened instead of throwing. Validation is its natural home. The shape we use:

```csharp
Dictionary<string, string[]> Validate(SignupRequest req)
// {} = valid
// { "email": ["email is required"], "age": ["you must be at least 13 to sign up"] } = invalid
```

Key design choice: **accumulate**. The original returns at the *first* problem, so a user with four mistakes needs four round trips. The validator instead checks every field and returns all messages keyed by field name — exactly what a frontend needs to light up each input red, in one trip.

### `Results.ValidationProblem` and ProblemDetails — the standard error envelope

The web already agreed on a JSON shape for "your request had problems": **ProblemDetails**. ASP.NET Core speaks it natively:

```csharp
Results.ValidationProblem(errors)   // takes our Dictionary<string, string[]>!
```

produces status **400** with a body like:

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "email": ["email is required"], "age": ["you must be at least 13 to sign up"] }
}
```

One shape, every endpoint, standard enough that client libraries recognize it. Compare the original's three home-made shapes — `{ok, problem}`, `{error}`, `{signup_failed, why}` — all wearing status 200. (cs#20 builds on ProblemDetails for *unexpected* errors.)

### Switch expressions with ranges (used by `DiscountRules`)

```csharp
public static int Percent(int age) => age switch
{
    < 0 => 0,
    < 18 => 20,
    >= 65 => 30,
    _ => 0,
};
```

cs#06's switch expressions, now with **relational patterns** (`< 18`, `>= 65`). Arms are checked top to bottom; `_` catches the rest. The whole pricing policy in five readable lines.

## 3. Walking through the original code

`POST /signup` starts by doing the framework's job:

```csharp
doc = await JsonDocument.ParseAsync(req.Body);
```

wrapped in try/catch because clients send garbage. Then the digging begins: `TryGetProperty("email", ...)`, `ValueKind != JsonValueKind.String`, `GetString()!` — and the first rule check, which `return`s immediately with `{ok = false, problem = "no email"}`. Status? 200 — nobody chose it, it's just `Results.Json`'s default.

Password: same digging, but this exit invents `{signup_failed = true, why = "password too short"}` — a different author on a different day, and now clients must recognize both. Age is worse: `GetInt32()` throws if the client sent `"thirty"` or `29.5`, so there's a *nested* try/catch — plumbing wrapped around plumbing.

Count the exits: six error returns, three different JSON shapes, one status code (200) for all of them, and the *rules* — the only interesting part — are single comparisons buried in the rubble.

`GET /discount` is the same disease in miniature: `req.Query["age"]` (text), `int.Parse` (throws), blanket `catch (Exception)` (hides everything, answers 200).

## 4. What's wrong with it (in beginner terms)

**1. Thirty lines of tweezers before any decision.** The endpoint's actual business — three rules — is outnumbered five-to-one by parsing ceremony. Every new field means more digging code, another ValueKind check, another exception to discover.

**2. First-error-wins wastes the user's time.** Wrong email, short password, age 5? You'll learn that one mistake at a time, resubmitting after each. The fix requires restructuring — early `return`s *can't* accumulate — which is why it never happens once an endpoint grows this way.

**3. Error responses are a private museum.** Three shapes, all status 200. A frontend needs three parsers and can't use `res.ok`. cs#16 taught why lying 200s break generic tooling; this project shows how the lie *evolves* — one improvised exit at a time.

**4. The rules can't be tested.** "Is 13 old enough?" lives inside a lambda that requires a real HTTP body stream. Nobody will boot a server to check a boundary condition, so nobody tests it, so `age <= 13` vs `age < 13` bugs live forever.

## 5. Try it yourself first!

Refactor the original. Hints, vaguest first:

1. 🌱 What *shape* does `/signup` want? Write it as a record with nullable fields. Change the endpoint's parameter from `HttpRequest` to that record and delete the JsonDocument code. It just works — that's binding.
2. 🌿 Move the rules into `static Dictionary<string, string[]> Validate(SignupRequest req)`. No early returns — build up per-field message lists (cs#01's "build up parts", back again).
3. 🌳 In the endpoint: empty dictionary → `Results.Ok(...)`; otherwise `Results.ValidationProblem(errors)`. Two lines.
4. 🍎 For `/discount`: change the parameter to `(int age)`, delete the try/catch, and move the percent policy into a pure `DiscountRules.Percent(int)`. Then write tests: every rule, every boundary (7 vs 8 chars, 12 vs 13, 120 vs 121), and one request with *everything* wrong asserting all three fields are reported.

## 6. Understanding the refactored solution

**`Signup.cs`** — the record plus the validator. Notice the validator's skeleton: for each field, build a `List<string>` of messages, then add it to the dictionary only if non-empty. No exceptions, no HTTP, no early exits — every field gets its say. The email check is deliberately modest (one `@` with text around it, a dot after, no spaces): real email validation is famously a tar pit, and *where the rule lives* matters more than how clever it is. Upgrade the rule later and nothing else moves — that's "easy to change".

**`DiscountRules.cs`** — the pricing policy as a switch expression, including the `< 0 => 0` arm: the original would happily compute a 20% discount for age −5 (it's `< 18`, after all). Hand-parsing was so loud nobody looked at the *rule*.

**`Program.cs`** — read `/signup` end to end:

```csharp
app.MapPost("/signup", (SignupRequest body) =>
{
    var errors = SignupValidator.Validate(body);
    return errors.Count > 0
        ? Results.ValidationProblem(errors)
        : Results.Ok(new { message = $"welcome, {body.Email!.Trim()}" });
});
```

That's the whole endpoint: bind → validate → translate. The `body.Email!` is cs#05's null-forgiveness operator, and it's *justified* here: the validator guarantees Email is non-null on the success path — the `!` documents that promise.

**`Tests.cs`** — 30 checks, each one line: `V("sam@", "supersecret", 30)` builds a request, `Validate` judges it, `ContainsKey("email")` asserts. The star is the accumulation test — three broken fields, one call, three keys. Try writing that test against the original: you'd need a server, a socket, and JSON three shapes deep.

## 7. Words you learned (glossary)

- **Model binding** — the framework converting request text (route, query, body) into your handler's typed parameters.
- **Binding failure** — when the text can't become the declared type; ASP.NET answers 400 automatically.
- **DTO** — data transfer object; a record describing what crosses the wire.
- **Nullable DTO fields** — `string?`/`int?` so *missing* is representable and validation (not a crash) decides.
- **`JsonDocument` / `JsonElement`** — manual JSON parsing; for unknown shapes, not for DTOs.
- **`ValueKind`** — what a `JsonElement` actually holds (String, Number, True...); manual parsing must check it.
- **Validation** — deciding whether well-formed input is *acceptable*.
- **Accumulated errors** — collecting every problem before answering, instead of first-error-wins.
- **ProblemDetails** — the standard JSON shape for HTTP error responses.
- **`Results.ValidationProblem`** — 400 + ProblemDetails from a `Dictionary<string, string[]>`.
- **Relational pattern** — `< 18`, `>= 65` inside a switch expression.
- **`!` (null-forgiving operator)** — "compiler, I *know* this isn't null here"; use only when something guarantees it.

## 8. Experiments to try on the plane (no internet needed)

localhost needs no wifi — your machine is both client and server. Run one version at a time (both use port 5017).

1. **See all errors arrive at once.** Refactored server: `curl -s -X POST http://localhost:5017/signup -H "Content-Type: application/json" -d "{\"email\":\"nope\",\"password\":\"pw\",\"age\":5}"` → one 400 with `"errors"` holding **email, password, and age** together. Now send the same body to the original and count the round trips to learn all three.
2. **Watch the free 400.** `curl -i "http://localhost:5017/discount?age=abc"` on the refactor → `400 Bad Request`, and your handler never ran. Same URL on the original → `200` with `{"error":"bad age"}` — a hand-written lie replacing a free truth.
3. **Break the boundary, watch a test catch it.** In `SignupValidator`, change `age < 13` to `age <= 13` and run `dotnet run --project csharp/17-model-binding-validation/refactored -- test`. Expected: `FAIL 13 is allowed`. That boundary is exactly the kind of bug manual testing never catches — revert and re-run to green.
4. **Add a rule in the right place.** Require passwords to contain at least one digit. Write the failing test first (`V("sam@site.com", "abcdefgh", 30)` should have a password error), then add one `else if` with `!password.Any(char.IsDigit)`. Count the endpoint changes: zero.
5. **Send age as a string.** `curl -i -X POST http://localhost:5017/signup -H "Content-Type: application/json" -d "{\"email\":\"sam@site.com\",\"password\":\"supersecret\",\"age\":\"thirty\"}"` → the refactor 400s before your code runs (binding failure). The original needed a nested try/catch to survive the same input — find it in `original.cs`.
6. **Read the standard shape closely.** Pipe experiment 1's output and look at the ProblemDetails fields: `title`, `status`, `errors`. Sketch (on paper) the frontend loop from js#14 that walks `errors` and puts each message next to its form field — the dictionary-keyed-by-field design exists precisely for that loop.
