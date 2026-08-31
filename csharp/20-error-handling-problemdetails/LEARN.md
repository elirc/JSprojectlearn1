# 📘 Learning Guide: Error Handling & ProblemDetails

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A small inventory API: list items, look one up, filter by category, add one, and "purchase" one (which lowers its stock by 1). The happy paths are trivial — this project is entirely about what happens when things go *wrong*: an id that doesn't exist, a category that's a typo, buying something that's sold out, a genuine bug in the server.

Both versions run on `http://localhost:5020`. The original answers each failure in a different, misleading way. The refactored version answers every failure in one consistent, honest format.

## 2. Concepts you need first

### Expected failure vs unexpected failure
This is the idea the whole project hangs on. An **expected failure** is a situation your program knows can happen and has an answer for: "there is no item 99", "that item is sold out". It's not a bug — it's Tuesday. An **unexpected failure** is a genuine bug: a null reference, a corrupted file, something you did *not* plan for. The two deserve opposite treatment:

- expected → tell the caller exactly what's wrong (and pick the right status code)
- unexpected → tell the caller almost nothing ("server error"), log the details privately, go fix it

The original treats both kinds identically (catch everything, improvise). The refactor separates them.

### HTTP status codes for failures (quick recap)
You met these in project 16. The ones this project uses:

- `400 Bad Request` — the client sent something invalid (blank name, negative stock)
- `404 Not Found` — the thing asked for doesn't exist
- `409 Conflict` — the request is fine but the current state forbids it (out of stock)
- `500 Internal Server Error` — *we* broke, not you

The rule of thumb: 4xx means "your fault, fix your request", 5xx means "our fault, we're on it". The original returns 500 for a missing item — telling the client "we broke" when really they asked for something that isn't there. Monitoring systems page people at 3am over 500s; a wrong 500 is a false alarm.

### Exceptions and `throw` (recap from project 08)
An **exception** is C#'s way to abandon the current work and signal failure up the call chain:

```csharp
Item Find(int id)
{
    var item = items.FirstOrDefault(i => i.Id == id);
    if (item == null) throw new Exception("not found");   // stop; propagate failure
    return item;
}
```

`throw` immediately exits the method (and its caller, and *its* caller...) until some `try/catch` catches it. If nothing catches it, the program — or in ASP.NET Core, the request — dies with an error.

### Custom exception types
`new Exception("message")` puts all the information into a *string*. Nobody can reliably act on a string. A **custom exception** is a class you define that inherits from `Exception`:

```csharp
public class ItemNotFoundException : Exception
{
    public ItemNotFoundException(int id) : base($"no item with id {id}") { }
}
```

`: Exception` means "is a kind of Exception" (inheritance, project 09/10 territory). `: base(...)` passes the message to the built-in constructor. Now code can react to the *type*:

```csharp
catch (ItemNotFoundException) { /* this IS a 404 story */ }
```

JS comparison: this is exactly js#30 (`class NotFoundError extends Error`) — same move, C# syntax.

### Pattern matching on exception types
Project 06's `switch` expressions work on types too:

```csharp
var status = ex switch
{
    ItemNotFoundException => 404,
    OutOfStockException   => 409,
    _                     => 500,   // "_" = anything else
};
```

Read: "if `ex` is an `ItemNotFoundException`, produce 404; ...". This one expression *is* the refactor's error policy.

### Middleware (recap from project 19)
Middleware is code that wraps EVERY request, like layers of an onion. A middleware that wraps `await next(context)` in try/catch will catch anything any endpoint throws:

```csharp
app.Use(async (context, next) =>
{
    try { await next(context); }               // run the rest of the pipeline
    catch (Exception ex) { /* one place to answer ALL failures */ }
});
```

That single catch replaces a try/catch inside every endpoint. (ASP.NET Core also ships `app.UseExceptionHandler(...)` which does this with more bells; we hand-roll it so you can see all the moving parts.)

### ProblemDetails — the standard error envelope
Instead of every API inventing `{"err": ...}` vs `{"error": ...}` vs `{"message": ...}`, the web standardized one JSON shape for errors (RFC 9457, "Problem Details for HTTP APIs"). It looks like:

```json
{
  "type":   "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title":  "Item not found",
  "status": 404,
  "detail": "no item with id 99"
}
```

- **title** — short, always-the-same-for-this-kind-of-error text
- **detail** — human explanation for this specific occurrence
- **status** — mirrors the HTTP status code
- **type** — a URI identifying the error kind (ASP.NET Core fills in a default)

ASP.NET Core produces this with one call: `Results.Problem(title: ..., detail: ..., statusCode: ...)`. It even sets the content type to `application/problem+json` so clients can *detect* "this is an error object".

### Why one shape matters to the frontend
Remember writing fetch code in js#65? With one error shape, the frontend error path is written **once**:

```js
const res = await fetch('/items/99');
if (!res.ok) {
  const problem = await res.json();
  showToast(problem.title);       // works for EVERY endpoint, forever
}
```

Against the original API you'd need: "if it's `/items/{id}` read `.err`, if it's purchase read `.message`, if it's POST it's not even JSON...". Every new endpoint breaks the frontend's error handling again.

## 3. Walking through the original code

The data is a `List<Item>` and a static `Inventory` class holding the rules. Notice every rule fails the same lazy way:

```csharp
public static Item Find(List<Item> items, int id)
    => items.FirstOrDefault(i => i.Id == id)
       ?? throw new Exception($"no item with id {id}");
```

`FirstOrDefault` returns `null` when nothing matches, and `??` (null-coalescing, project 05) says "in that case, throw". But it throws **generic `Exception`** — the type says nothing; only the message string knows what happened.

Each endpoint then wraps itself in try/catch and improvises a response:

```csharp
catch (Exception ex)
{
    return Results.Json(new { err = ex.Message }, statusCode: 500);   // GET /items/{id}
}
```

Shape #1: `{"err": ...}`, status 500 — for a *not found*, which should be 404.

```csharp
catch (Exception ex)
{
    return Results.BadRequest(new { message = ex.Message, ok = false });   // purchase
}
```

Shape #2: different keys, status 400 — but this catch receives BOTH "no item with id 99" (a 404 story) and "out of stock" (a 409 story). Because both are plain `Exception`, the code *cannot* tell them apart without parsing English.

```csharp
catch (Exception ex)
{
    return Results.Text("ERROR: " + ex.Message, "text/plain", statusCode: 500);   // POST /items
}
```

Shape #3: not even JSON.

And the crown jewel, the category filter:

```csharp
catch
{
    // "An exception here probably just means nothing matched."
    return Results.Ok(new List<Item>());   // <-- THE BUG
}
```

`Inventory.ByCategory` throws only when the category doesn't exist *at all* — i.e. the caller made a mistake. This catch converts that mistake into `200 OK []`: a fake success identical to a genuinely empty category.

## 4. What's wrong with it (in beginner terms)

**1. The client can't write error handling.** Four endpoints, three error formats plus one fake success. Frontend code has to special-case every endpoint, and the next endpoint added will invent yet another shape. One consumer, four parsers.

**2. The swallowed exception ships bugs silently.** Imagine the frontend developer types `fetch('/items/by-category/electronixs')`. The API says 200 with `[]`. The page renders "No items in this category." Everyone moves on. The bug is *invisible* — there is no error to see, no log line, nothing. Weeks later someone asks why the electronics page is empty in production. A loud 400 on day one would have cost thirty seconds.

**3. Generic `Exception` throws away information at the source.** At the moment of failure, the code *knows* precisely what went wrong ("id 99 missing"). Packing that into `new Exception(string)` reduces it to prose. Downstream, catch blocks are reduced to guessing — which is why purchase returns 400 for a not-found and lookup returns 500 for the same thing.

**4. Try/catch in every endpoint is duplication of policy.** "How do we respond to failure" is a single app-wide decision, but here it's re-decided (differently!) in five places. Project 19's lesson applies verbatim: cross-cutting code that's copy-pasted will drift.

**5. 500s that aren't 500s.** Wrong status codes aren't cosmetic: caches, retry logic, and monitoring all key off them. A client is *supposed* to retry a 500 (maybe the server hiccupped) — retrying a not-found forever helps nobody.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 Could the *type* of the exception, not the message string, say what went wrong?
2. 🌿 Define `ItemNotFoundException`, `OutOfStockException`, `UnknownCategoryException` (each `: Exception`). Make `Inventory` throw those instead of `Exception`.
3. 🌳 Delete every try/catch from the endpoints. Add ONE `app.Use(...)` middleware before them that try/catches `await next(context)` and switches on the exception type to pick a status code.
4. 🍎 Write a pure function `Map(Exception ex)` returning `(int status, string title, string detail)` and have the middleware call `Results.Problem(...)` with the result. Now write tests for `Map` — no server needed. Make the `_` arm return a detail that does NOT include `ex.Message`.

## 6. Understanding the refactored solution

**`DomainExceptions.cs`** — three tiny classes. That's the whole file: a named type per expected failure. Creating them costs three lines each; they pay rent every time any code can now say `catch (OutOfStockException)`.

**`InventoryService.cs`** — the rules, promoted from static helpers to a proper injectable service (project 18). Same logic as the original, but every failure throws its *specific* type:

```csharp
public IReadOnlyList<Item> ByCategory(string category)
{
    if (!KnownCategories.Contains(category))
        throw new UnknownCategoryException(category);   // a typo is an ERROR
    ...
}
```

Note what it does **not** contain: no `Results.*`, no status codes, no HTTP anywhere. It doesn't know it lives in a web app — which is why `Tests.cs` can exercise every rule with plain method calls.

**`ErrorMapper.cs`** — the policy table:

```csharp
public static (int Status, string Title, string Detail) Map(Exception ex) => ex switch
{
    ItemNotFoundException e    => (404, "Item not found", e.Message),
    UnknownCategoryException e => (400, "Unknown category", e.Message),
    OutOfStockException e      => (409, "Out of stock", e.Message),
    ArgumentException e        => (400, "Invalid input", e.Message),
    _                          => (500, "Unexpected server error",
                                   "Something went wrong on our side. The details were logged."),
};
```

Read the last arm carefully. Anything we didn't anticipate is by definition a bug, and bugs get the generic treatment: the client learns "500, our fault", the true message goes to the server log. The tests literally assert that a fake secret in an unexpected exception's message does *not* appear in the mapped detail.

**`Program.cs`** — one middleware, thin endpoints:

```csharp
app.Use(async (context, next) =>
{
    try { await next(context); }
    catch (Exception ex)
    {
        var (status, title, detail) = ErrorMapper.Map(ex);
        if (status == 500) app.Logger.LogError(ex, "Unhandled exception");
        await Results.Problem(title: title, detail: detail, statusCode: status)
            .ExecuteAsync(context);
    }
});
```

`Results.Problem` builds the ProblemDetails body; `.ExecuteAsync(context)` writes it to the current response (we're in middleware, not an endpoint, so we execute the result by hand). Every endpoint below shrank to one line of "call the service, wrap in Ok/Created" — go look, there is not a single try/catch among them.

The flow for `GET /items/99` is now: endpoint calls `inv.Get(99)` → service throws `ItemNotFoundException` → middleware catches → mapper says `(404, "Item not found", "no item with id 99")` → client receives a proper `application/problem+json`. Every failure in the app travels that same road.

## 7. Words you learned (glossary)

- **Expected failure** — a foreseen "no" (not found, sold out); handled with a specific status and message.
- **Unexpected failure** — a bug; handled with a generic 500 and a server-side log entry.
- **Exception** — C#'s mechanism for abandoning work and signaling failure up the call chain.
- **Custom / domain exception** — your own class inheriting `Exception`, so the *type* carries meaning.
- **`throw`** — raises an exception; execution jumps to the nearest matching `catch`.
- **Swallowed exception** — caught and ignored, converting an error into fake success. The silent killer.
- **Middleware** — code wrapping every request; ideal home for app-wide policies like error handling.
- **ProblemDetails** — the standard JSON error envelope (RFC 9457): `type`, `title`, `status`, `detail`.
- **`Results.Problem(...)`** — ASP.NET Core helper that produces a ProblemDetails response.
- **Status codes 400/404/409/500** — bad input / doesn't exist / state conflict / our bug.
- **Type pattern (`ex switch { ItemNotFoundException => ... }`)** — switching on what *kind* of object a value is.
- **Cross-cutting concern** — behavior every endpoint needs (logging, auth, error handling); belongs in one place.

## 8. Experiments to try on the plane (no internet needed)

Start the refactored server (`dotnet run --project csharp/20-error-handling-problemdetails/refactored`) and keep a second terminal for curl. Everything is localhost — no internet required.

1. **Tour every failure.** `curl -i http://localhost:5020/items/99`, then `/items/by-category/nope`, then purchase item 3 twice, then `curl -i http://localhost:5020/boom`. Expected: four different situations, ONE response shape — only `title`/`status`/`detail` vary. Then repeat the same four against the original and count the formats.
2. **Prove the 500 leaks nothing.** `curl -i http://localhost:5020/boom` — the body says "Something went wrong on our side", while the server's console shows the full "simulated bug" message and stack trace. Client-facing vs log-facing, in one screen.
3. **Add a domain rule + exception.** Invent `PurchaseLimitException`: in `InventoryService.Purchase`, throw it if `Stock` would drop below... say, items named "Webcam" can't go below 1 (a display unit!). Map it to 409 in `ErrorMapper`, add two tests (rule throws; mapper returns 409). Expected: `-- test` shows your new greens, and the endpoint code needed ZERO changes — that's the payoff.
4. **Break the mapper on purpose.** Change the `ItemNotFoundException` arm to return 500 and run `-- test`. Expected: a FAIL naming exactly that mapping. Your error policy is now regression-protected — the original's policy lived in five catch blocks and could rot invisibly.
5. **Watch a swallowed exception get born.** In the refactored `Program.cs`, wrap the by-category endpoint's body in `try { ... } catch { return Results.Ok(new List<Item>()); }` like the original. Hit `/items/by-category/typo` — 200 `[]` again. Now run the tests: still green! Feel why this bug is so dangerous — it lives in the HTTP layer, above what the domain tests can see. (Undo it, and note the middleware version can't have this bug because endpoints don't catch at all.)
