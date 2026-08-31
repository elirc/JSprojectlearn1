# 📘 Learning Guide: Integration Testing

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A small orders API — create an order from some lines, look one up, list them, delete one — and, more to the point, **the test suite that would have caught its bugs**.

The original has three of them, chained: money computed in `double`, the pieces and the whole rounded inconsistently, and a missing order answered with `200 OK` and a body of `null`. Plus a fourth thing that is not exactly a bug but is definitely wrong: creating a resource returns `200` with no `Location` header.

The interesting part is not the bugs. It's that they fail *differently* under testing:

- The money bugs live in arithmetic. A unit test of one function catches all three.
- The `200`-instead-of-`404` and the missing `Location` live in the **translation between your code and HTTP**. There is no function to call that would reveal them. The mistake *is* the wiring.

That second category is what this project exists for. Both versions run on `http://localhost:5035`, and the refactored one carries a test suite that starts a real web server inside the test process, makes real HTTP requests, and shuts it down again — in about eight seconds, offline, with no packages.

This is the testing capstone of the track: cs#21 taught fakes and contract suites, cs#28 assembled a system, and this one asks the question those left open — *how do you test the part where your code meets the framework?*

## 2. Concepts you need first

### The test pyramid, in plain words

A picture people draw of how a healthy suite is proportioned:

```
        /\        few, slow, broad
       /  \       end-to-end (a browser, a real database)
      /----\
     /      \     some, medium
    / integr. \   integration (your app, over HTTP or against a real DB)
   /----------\
  /            \  many, fast, narrow
 /     unit     \ unit (one function, no I/O)
/----------------\
```

The shape encodes a trade-off, and it is worth naming both ends honestly:

**Unit tests** call a function directly. Microseconds each, so you can have thousands. When one fails it names the line. But they only test the piece you pointed them at — the *seams between* pieces are exactly what they cannot see, and it is entirely possible to have 100% unit coverage of an app that returns 200 for everything, including errors. (The original is a demonstration: a unit test of `BuildTotals` would have passed while `/orders/999` lied to every client.)

**Integration tests** exercise several real components together. Here that means the actual HTTP server, actual routing, actual model binding, actual JSON serialization, actual status codes. Slower — milliseconds to seconds — and when one fails you know *something in the system* is wrong without knowing what. But they see what unit tests structurally cannot.

**End-to-end tests** drive the real UI against a real deployment. Highest confidence, slowest, flakiest; not in this project.

You want the pyramid shape — mostly unit, a solid layer of integration, a few end-to-end — because the fast, precise tests are the ones you run every save, and the slow, broad ones are the ones that catch the mistakes you did not think to look for. An "ice cream cone" (mostly end-to-end, few units) is the classic failure: a suite that takes twenty minutes, fails for unrelated reasons, and gets ignored.

### What "integration" actually means here

When a request hits your app, a lot happens before your lambda runs and after it returns:

1. Kestrel accepts a TCP connection and parses the HTTP request
2. routing matches `/orders/1` to an endpoint, applying route constraints
3. model binding turns the JSON body into `NewOrder`, or fails
4. your handler runs
5. the `IResult` you returned becomes a status code, headers, and a JSON body
6. `System.Text.Json` serializes with the framework's naming policy (camelCase)

Steps 1, 2, 3, 5, and 6 are the framework doing work on your behalf, configured by decisions you made — `{id:int}`, `Results.Created`, the type of a parameter. **A unit test skips all of them.** It calls step 4 and nothing else. That is the gap an integration test fills, and every bug in the original's status codes lives inside it.

### Testing an ASP.NET Core app in-process

The naive approach — start the server with `dotnet run` in one terminal, run tests in another — is a bad test: it needs two commands, a fixed port, and a human to remember. Instead, start the server **in the same process as the tests**:

```csharp
var app = Api.Build([], quiet: true);
app.Urls.Clear();
app.Urls.Add("http://127.0.0.1:0");

await app.StartAsync();            // non-blocking: returns once Kestrel is listening
// ...make requests...
await app.StopAsync();
```

`app.Run()` blocks forever, which is right for a server and useless for a test. `StartAsync` returns as soon as the socket is bound, leaving the rest of the method free to be a client.

### Port 0, and how you find out what you got

`http://127.0.0.1:0` means **"operating system, give me any free port"**. This matters more than it sounds:

- Hard-code 5035 and the test fails whenever you left the real server running. A test that fails for reasons unrelated to the code is a test people learn to ignore.
- Two test suites running at once (CI, several projects) would collide.

But if the OS picks the port, how do you know where to send requests? Kestrel **rewrites `app.Urls`** during startup with the address it actually bound:

```csharp
await app.StartAsync();
var baseAddress = app.Urls.First();     // "http://127.0.0.1:58596"
```

(`WebApplication.Urls` is a view over the server's `IServerAddressesFeature`, which is why it updates.) Read it *after* `StartAsync`, never before — before, it still says `:0`.

### `HttpClient`, and the one rule about it

```csharp
using var http = new HttpClient
{
    BaseAddress = new Uri(baseAddress),
    Timeout = TimeSpan.FromSeconds(15),
};

var res = await http.GetAsync("/orders");
Console.WriteLine((int)res.StatusCode);                       // 200
var order = await res.Content.ReadFromJsonAsync<OrderDto>();  // System.Net.Http.Json
```

`ReadFromJsonAsync<T>` uses camelCase-friendly, case-insensitive options by default, so it matches what ASP.NET Core wrote. And extra JSON properties are ignored, which lets a test declare a small DTO naming only the fields it cares about:

```csharp
private record OrderDto(int Id, decimal Subtotal, decimal Tax, decimal Total);   // no Lines: don't care
```

Always set a `Timeout`. A hung request should fail the suite, not hang it forever on a build machine at 3am.

The one rule: **in production code, never `new HttpClient()` per request** — you exhaust sockets. Use `IHttpClientFactory`. In a test that makes twenty requests and disposes it, `new` is fine.

### Asserting on a response

An integration test asserts on things a unit test has no access to:

```csharp
Check.Equal(201, (int)created.StatusCode, "POST answers 201 Created");
Check.Equal("/orders/1", created.Headers.Location?.ToString(), "...with a Location header");
Check.Equal("application/json", res.Content.Headers.ContentType?.MediaType, "...and says it is JSON");
```

Status code, headers, content type, and the parsed body. Note that `Location` lives on `res.Headers` while `Content-Type` lives on `res.Content.Headers` — .NET splits response headers from content headers, and looking in the wrong one returns null rather than erroring.

### Cleaning up, and why `finally` is not optional

```csharp
await app.StartAsync();
try   { await Suite(http); }
finally
{
    await app.StopAsync();
    await app.DisposeAsync();
}
```

If an assertion throws and the server is never stopped, the process keeps a listening socket and possibly never exits — so your test run *hangs* instead of reporting a failure. Any test that acquires a resource releases it in a `finally`; cs#21 did the same with temp files.

### Making it possible at all: build ≠ run

None of the above works if `Program.cs` both configures the app *and* blocks on `app.Run()`, because there is no moment where a test can get hold of the configured app. So the composition root becomes a function:

```csharp
// Api.cs
public static WebApplication Build(string[] args, bool quiet = false) { /* ...all the wiring... */ }

// Program.cs
var app = Api.Build(args);
app.Run("http://localhost:5035");

// HttpTests.cs
var app = Api.Build([], quiet: true);
app.Urls.Add("http://127.0.0.1:0");
await app.StartAsync();
```

Both callers get **the same app** — same endpoints, same DI, same serialization. That is what makes the suite meaningful: if you test a hand-assembled copy of your app, you are testing the copy.

### `WebApplicationFactory`: the tool this replaces

Real projects add `Microsoft.AspNetCore.Mvc.Testing` (a NuGet package), inject a
`WebApplicationFactory<Program>` into an xUnit class, and call `factory.CreateClient()`.
Map that onto what you built here:

| Our harness | `WebApplicationFactory` |
|---|---|
| `Api.Build([])` | finds your `Program` and builds the same host |
| `app.Urls.Add(":0")` + `StartAsync` | `factory.CreateClient()` |
| a real socket on a random port | an **in-memory transport** — no socket at all, so it is faster and cannot collide |
| `finally { StopAsync(); }` | the fixture's `Dispose` |
| — | `WithWebHostBuilder(b => b.ConfigureServices(...))` to swap a real service for a fake |

That last row is the real upgrade: it lets you run the whole HTTP stack while replacing the database with an in-memory fake — cs#21's seam, reached from the outside. The mechanism is the same one you just hand-rolled, which is the point of hand-rolling it.

### Money: `decimal`, and rounding you chose on purpose

Two defaults that are wrong for money, and invisible because they *are* defaults.

**`double` is a binary fraction.** `0.1` cannot be written exactly in binary any more than `1/3` can in decimal, so `19.99` is stored as `19.98999999999999844…`. Multiply by 3, add 8%, and the error reaches the JSON. `decimal` stores base-10 fractions exactly — which is why .NET has it, and why money is `decimal` (or an integer count of cents) everywhere that matters.

**`Math.Round` rounds to even.** `Math.Round(2.665m, 2)` is `2.66`, because ties go to the nearest even digit — statistically unbiased, and not what a receipt does. Invoices use `Math.Round(amount, 2, MidpointRounding.AwayFromZero)`.

And a third decision, subtler than either: **where** you round. Round only the total and the parts don't sum to it. Round each line, sum the rounded lines, round the tax, then add two already-rounded numbers — and `Subtotal + Tax == Total` is exact by construction, for every input. That is what `Totals.For` exists to guarantee, and what an 800-case property test pins down.

## 3. Walking through the original code

The money:

```csharp
double subtotal = 0;
foreach (var line in dto.Lines) subtotal += line.Qty * line.UnitPrice;
double tax = subtotal * 0.08;
double total = Math.Round(subtotal + tax, 2);
```

Three faults stacked: `double` (drift), only `total` rounded (the parts don't add up to the whole), and `Math.Round` without a `MidpointRounding` (banker's rounding on an invoice).

The lookup:

```csharp
var order = orders.FirstOrDefault(o => o.Id == id);
return Results.Ok(order);
```

`FirstOrDefault` returns `null` when nothing matches, and `Results.Ok(null)` is a cheerful `200` with the body `null`. The missing line is `if (order is null) return Results.NotFound();` — one line, and nothing in the file makes its absence visible.

The create:

```csharp
return Results.Ok(order);       // should be Results.Created($"/orders/{order.Id}", order)
```

Now ask cs#01's question — *how would I test this?* — of each. The first is a function; extract it and assert. The second and third are not functions at all. `Results.Ok(order)` is correct C#, it compiles, it runs, and it is the wrong answer. Only something that looks at the response can tell.

## 4. What's wrong with it (in beginner terms)

**1. The totals are wrong, and wrong in a way that erodes trust.** Not "crashes" — the response says `"subtotal":59.97, "tax":4.7976, "total":64.77`. Three numbers, and the first two don't add up to the third. Whichever one a screen decides to trust, some other screen disagrees, and the bug report says "the invoice is sometimes off by a penny", which is the kind of ticket that lives forever.

**2. A missing order is reported as a success.** This is the worst bug in the file, because it breaks a contract every client relies on. `if (!res.ok) return showError();` — the response *is* ok. So the client proceeds, reads `order.total` off `null`, and crashes somewhere unrelated. The error surfaces far from its cause, which is the property that makes bugs expensive.

**3. `200` instead of `201`, and no `Location`.** Status codes are the API's vocabulary (cs#16). Answering "I created something" with "sure, fine" throws away information the protocol has a word for, and forces every client to hand-build URLs it could have been handed.

**4. Zero tests, and a reason it stayed that way.** Totals are computed inline in an endpoint lambda. To test them you would need to start a server, which was awkward, so nobody did, so nothing was tested — including the parts that were easy. Untestable structure doesn't reduce testing a little; it reduces it to zero. And even good unit tests wouldn't have been enough: extract the arithmetic, test it thoroughly, watch the suite go green — `/orders/999` still returns `200 null`. That is the whole argument for the layer above.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 Two of these bugs can be tested by calling a function and two cannot. Sort them into those piles before writing any code — the sort *is* the design.
2. 🌿 Money: change every `double` to `decimal`, then write one `Round` helper with `MidpointRounding.AwayFromZero` and decide where in the calculation each rounding happens. Aim for a property you can assert: `subtotal + tax == total`, exactly, for any input.
3. 🌳 Move the app's wiring into `static WebApplication Build(string[] args)` and leave `Program.cs` as two lines. Now a test can obtain the app without running it.
4. 🍎 In your test method: add `http://127.0.0.1:0` to `app.Urls`, `await app.StartAsync()`, read the real address back from `app.Urls`, point an `HttpClient` at it, and assert on `(int)res.StatusCode` for `GET /orders/999`. Stop the app in a `finally`. If that one assertion goes red against the original's logic and green against yours, you have built the thing this project is about.

## 6. Understanding the refactored solution

**`Money.cs`** — one method, and a comment explaining both defaults it overrides. Worth noting how small the fix is relative to how much damage it prevents.

**`Order.cs`** — records, `decimal`, and `Totals.For`, whose doc comment states the invariant it exists to guarantee. The order of operations is the design:

```csharp
var subtotal = lines.Sum(line => Money.Round(line.Qty * line.UnitPrice));  // round each LINE
var tax = Money.Round(subtotal * TaxRate);
var total = subtotal + tax;      // two already-rounded numbers: exact, no third rounding
```

`OrderRules.Validate` returns every problem at once, named by line number counting from 1 — because the person reading the error is a human looking at a form.

**`OrderStore.cs`** — ids and locking (cs#21). Totals are computed *inside* `Add`, so an `Order` with wrong totals cannot exist: there is no other way to make one.

**`Api.cs`** — the composition root as a function, with the comment explaining why. Endpoints are pure translation; the parts that remain are precisely the parts only an integration test can check:

```csharp
app.MapGet("/orders/{id:int}", (int id, OrderStore store) =>
    store.Find(id) is { } order
        ? Results.Ok(order)
        : Results.NotFound(new { error = $"no order with id {id}" }));
```

**`Tests.cs`** — the pyramid, top to bottom. Unit tests of `Money`, `Totals` (including the 800-combination property test), `OrderRules`, and `OrderStore`; then one line handing over to the HTTP suite. Read the `Math.Round` assertions especially — they assert the *wrong* answer the default gives, right next to the right one, so the difference is documented in the suite itself.

**`HttpTests.cs`** — the harness, then 33 assertions across happy and error paths: 201 and `Location`, following that `Location`, the collection, `404` for a missing id, `404` for a non-integer id, `400` for no lines, `400` listing all three problems in a junk line, `400` for malformed JSON, `204` with an empty body for delete, `404` for a second delete, ids not recycled, and the money invariant checked on JSON that made a real round trip through a socket.

That last one is the point of the whole project: `subtotal + tax == total` is asserted twice, once in a unit test on the function's return value and once on the bytes a client actually receives. They are different claims, and the original would have failed both.

## 7. Words you learned (glossary)

- **Unit test** — exercises one function or class directly; fast and precise.
- **Integration test** — exercises several real components together (here: the whole HTTP stack).
- **End-to-end (E2E) test** — drives the real UI against a real deployment.
- **Test pyramid** — many unit, some integration, few E2E; the healthy proportion.
- **Ice cream cone** — the inverted, unhealthy proportion: slow, flaky, ignored.
- **In-process testing** — running the server inside the test process, no second terminal.
- **`StartAsync` / `StopAsync`** — non-blocking start and clean shutdown (vs `Run`, which blocks).
- **Port 0** — "OS, pick any free port"; the bound one appears in `app.Urls` after start.
- **`app.Urls`** — the server's bound addresses; rewritten by Kestrel during startup.
- **`HttpClient` / `BaseAddress`** — the test's client, and the root it resolves paths against.
- **`ReadFromJsonAsync<T>`** — parse a response body into a type, ignoring unknown fields.
- **Composition root** — the single place the app is wired together; here, `Api.Build`.
- **`WebApplicationFactory`** — `Microsoft.AspNetCore.Mvc.Testing`'s real version of this harness, with an in-memory transport and service overrides.
- **Route constraint** — `{id:int}`; a URL that doesn't fit doesn't match the route.
- **`decimal` vs `double`** — exact base-10 fractions vs binary approximations; money is `decimal`.
- **Banker's rounding (`MidpointRounding.ToEven`)** — .NET's default; ties go to the even digit.
- **`MidpointRounding.AwayFromZero`** — what invoices do; `.5` rounds up.
- **Property test** — asserting an invariant across many generated inputs, not one example.
- **Flaky test** — one that fails for reasons unrelated to the code; worse than no test.

## 8. Experiments to try on the plane (no internet needed)

All localhost, all offline.

1. **Watch the double drift.** Start the original and POST an order with `qty` 3 and `unitPrice` 19.99, then one with `qty` 7 and `unitPrice` 0.1. Read the raw JSON — the tails of nines, and the subtotal and tax that don't sum to the total. Do the same against the refactored server: clean cents, and the three numbers add up.
2. **Make the suite catch the original's bug.** In the refactored `Api.cs`, change the `/orders/{id:int}` handler to `Results.Ok(store.Find(id))`. Run `-- test`. The unit tests stay green — all 42 of them — and exactly two HTTP assertions go red. That contrast, on your own screen, is the entire thesis of this project.
3. **Now break it the other way.** Put that back, and instead delete `MidpointRounding.AwayFromZero` from `Money.Round`. Run `-- test`: unit tests fail *and* HTTP tests fail, because arithmetic errors propagate outward. Bugs in the middle are visible from everywhere; bugs at the edges are visible only from the edge.
4. **Prove port 0 is doing something.** In `HttpTests.RunAsync`, change the URL to `http://127.0.0.1:5035`. Run `-- test` — passes. Now start the real server (`dotnet run --project ...`) in another terminal and run `-- test` again: it fails with an address-already-in-use error. Put `:0` back and repeat: green while the other server keeps running. That is a whole class of flaky test designed out of existence by one character.
5. **Break the cleanup on purpose.** Remove the `finally` around `StopAsync` and make one assertion throw (e.g. `Check.Equal(999, (int)empty.StatusCode, ...)`). Run `-- test` and notice the process does not exit — you have to Ctrl+C it. A test suite that hangs is worse than one that fails, and one `finally` is the difference.
6. **Add an assertion for something you can't unit test.** In `HttpTests.Suite`, check that `GET /orders` responds with header `Content-Type: application/json; charset=utf-8` exactly (`res.Content.Headers.ContentType?.ToString()`). Nothing in your C# ever mentions charset — the framework decided it. That's the category of fact only an integration test knows. Then wrap the unit section and `HttpTests.Run()` in `Stopwatch`s: roughly a millisecond versus a few seconds. Multiply the second by a thousand tests and you have derived the pyramid's shape yourself.
