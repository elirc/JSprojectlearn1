# 🏋️ Practice: Integration Testing

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Your first endpoint tested over HTTP (warm-up)

Add `GET /health` returning `200` with `{ "status": "ok", "orders": <count> }`, give `OrderStore` a
`Count` property, and assert all of it from `HttpTests.Suite`. The endpoint is three lines; the point is
to walk the harness loop once with something you cannot get wrong.
*Practices:* the shape of an HTTP assertion — status code, then parsed body.
**Hint:** declare a `private record HealthDto(string Status, int Orders);` next to the others in
`HttpTests`. `ReadFromJsonAsync` matches `status`/`orders` to `Status`/`Orders` case-insensitively, so
you never write a naming policy.
**Check offline:** add to `HttpTests.Suite`, at the very top (before anything is created):
```csharp
var health = await http.GetAsync("/health");
Check.Equal(200, (int)health.StatusCode, "[http] GET /health is 200");
var h = await health.Content.ReadFromJsonAsync<HealthDto>();
Check.Equal("ok", h!.Status, "[http] ...and says ok");
Check.Equal(0, h.Orders, "[http] ...with a zero order count on a fresh server");
```
and after the first successful POST:
```csharp
Check.Equal(1, (await (await http.GetAsync("/health")).Content.ReadFromJsonAsync<HealthDto>())!.Orders,
    "[http] the health count tracks reality");
```

### ⭐⭐ 2. PUT, and three status codes that only HTTP can check (core)

Add `PUT /orders/{id:int}` that replaces an order's lines and recomputes its totals: `200` with the
updated order, `404` if the id doesn't exist, `400` if the body is invalid. Add `OrderStore.Replace`.
Then decide — and defend in a test — what `PUT /orders/999` with an *empty* body should return: 400 or
404?
*Practices:* an endpoint whose entire risk surface is status codes, and ordering your guards on purpose.
**Hint:** `Replace` is `FindIndex` + a new `Order` with the same id, all inside the lock — the same
read-modify-write shape as cs#21. In the endpoint, validate the body **first**: an unparseable request
cannot be acted on whatever the id is, and answering 404 would tell a stranger which ids exist before
you have even accepted their request.
**Check offline:** add to `HttpTests.Suite`:
```csharp
var put = await http.PutAsJsonAsync("/orders/1", new { lines = new[] { new { sku = "B", qty = 4, unitPrice = 25m } } });
Check.Equal(200, (int)put.StatusCode, "[http] PUT on an existing order is 200");
var updated = await put.Content.ReadFromJsonAsync<OrderDto>();
Check.Equal(1, updated!.Id, "[http] ...keeping its id");
Check.Equal(100.00m, updated.Subtotal, "[http] ...and recomputing the totals");
Check.Equal(108.00m, updated.Total, "[http] ...including tax");
Check.Equal(108.00m, (await (await http.GetAsync("/orders/1")).Content.ReadFromJsonAsync<OrderDto>())!.Total,
    "[http] and the change was actually stored");

Check.Equal(404, (int)(await http.PutAsJsonAsync("/orders/999",
    new { lines = new[] { new { sku = "B", qty = 1, unitPrice = 1m } } })).StatusCode,
    "[http] PUT on a missing order is 404");
Check.Equal(400, (int)(await http.PutAsJsonAsync("/orders/1", new { lines = Array.Empty<object>() })).StatusCode,
    "[http] PUT with no lines is 400");
Check.Equal(400, (int)(await http.PutAsJsonAsync("/orders/999", new { lines = Array.Empty<object>() })).StatusCode,
    "[http] a bad body beats a missing id: 400, not 404");
```
Place these *before* the delete section, while order 1 still exists.

### ⭐⭐ 3. A discount, and the invariant that must survive it (core)

Orders of 100.00 or more get 10% off, and tax is charged on the **discounted** amount. Add `Discount`
to the tuple `Totals.For` returns and to the `Order` record. The interesting part is that the invariant
changes shape: it is no longer `Subtotal + Tax == Total` but `Subtotal - Discount + Tax == Total` — and
it must still hold exactly, for every input. Extend the property test to prove it.
*Practices:* growing pure arithmetic without breaking a guarantee, and boundary values.
**Hint:** round the discount, then compute tax on `subtotal - discount` and round that, then add three
already-rounded numbers. The threshold is *inclusive* — test 100.00 itself, and 99.99, because "greater
than" versus "greater than or equal" is the classic one-character bug.
**Check offline:** add to `Tests.cs`:
```csharp
var big = Totals.For([new OrderLine("A", 5, 25.00m)]);
Check.Equal(125.00m, big.Subtotal, "5 x 25.00 = 125.00");
Check.Equal(12.50m, big.Discount, "10% off over the threshold");
Check.Equal(9.00m, big.Tax, "tax is charged on the DISCOUNTED amount, not the subtotal");
Check.Equal(121.50m, big.Total, "125.00 - 12.50 + 9.00");

var exact = Totals.For([new OrderLine("A", 4, 25.00m)]);
Check.Equal(10.00m, exact.Discount, "the threshold is INCLUSIVE: exactly 100 qualifies");
Check.Equal(97.20m, exact.Total, "100 - 10 + 7.20");

var under = Totals.For([new OrderLine("A", 1, 99.99m)]);
Check.Equal(0m, under.Discount, "one cent under the threshold: no discount");
Check.Equal(107.99m, under.Total, "99.99 + 8.00");
```
and rewrite the property loop's condition to `subtotal - discount + tax != total`, also asserting
`Money.Round(discount) == discount`.

### ⭐⭐ 4. One server per scenario (core)

Right now `HttpTests.Suite` is one long story: order 1 must be created before it can be fetched, and
the "ids are not recycled" assertion depends on the delete that happened forty lines earlier. That is
fragile — reorder two blocks and things fail for reasons unrelated to the code. Extract a
`WithServer(Func<HttpClient, Task> scenario)` helper that starts a fresh app, runs one scenario, and
stops it, then split the suite into independent scenarios.
*Practices:* test independence, and paying an honest price for it.
**Hint:** the helper is the existing `RunAsync` body with the suite call replaced by `scenario(http)`.
Each call gets a brand-new `OrderStore` (it is registered per-app), so every scenario starts from an
empty world and every "the new order has id 1" assertion becomes true again.
**Check offline:** convert two scenarios and prove the isolation directly:
```csharp
await WithServer(async http =>
{
    var res = await http.PostAsJsonAsync("/orders", new { lines = new[] { new { sku = "A", qty = 1, unitPrice = 5m } } });
    Check.Equal(1, (await res.Content.ReadFromJsonAsync<OrderDto>())!.Id, "[http] scenario A: the first order is id 1");
});
await WithServer(async http =>
{
    var res = await http.PostAsJsonAsync("/orders", new { lines = new[] { new { sku = "B", qty = 1, unitPrice = 5m } } });
    Check.Equal(1, (await res.Content.ReadFromJsonAsync<OrderDto>())!.Id,
        "[http] scenario B: id 1 AGAIN — nothing leaked between scenarios");
});
```
Time the suite before and after. Fresh servers cost roughly a tenth of a second each; decide out loud
whether that is worth it here.

### ⭐⭐⭐ 5. Swap a service, the way `WebApplicationFactory` does (challenge)

The real testing package's headline feature is being able to run the whole HTTP stack with one service
replaced by a fake. Build that: give `Api.Build` an optional `Action<IServiceCollection>? configureServices`
applied **after** the app's own registrations, so a test's registration wins. Then use it twice — once
to start the server with a **pre-seeded** `OrderStore`, and once with a `FailingOrderStore` whose `All()`
throws, proving the API answers `500` when the store breaks.
*Practices:* the seam that makes integration tests fast and complete instead of only end-to-end.
**Hint:** the last `AddSingleton` for a type wins when you resolve one instance, so `configureServices`
just needs to run last. `FailingOrderStore : OrderStore` requires the methods you override to be
`virtual` — a small edit with a big payoff. Note that the failure test asserts something you cannot
provoke any other way: there is no valid request that makes a healthy store throw.
**Check offline:** add to `Tests.cs` / `HttpTests.cs`:
```csharp
var seeded = new OrderStore();
seeded.Add([new OrderLine("SEED-1", 1, 10m)]);
seeded.Add([new OrderLine("SEED-2", 2, 5m)]);
await WithServer(async http =>
{
    var list = await (await http.GetAsync("/orders")).Content.ReadFromJsonAsync<List<OrderDto>>();
    Check.Equal(2, list!.Count, "[http] the server started with a PRE-SEEDED store");
    Check.Equal(200, (int)(await http.GetAsync("/orders/1")).StatusCode, "[http] ...and the seeded orders are there");
    var next = await http.PostAsJsonAsync("/orders", new { lines = new[] { new { sku = "C", qty = 1, unitPrice = 1m } } });
    Check.Equal(3, (await next.Content.ReadFromJsonAsync<OrderDto>())!.Id, "[http] new orders continue the seeded ids");
}, services => services.AddSingleton(seeded));

await WithServer(async http =>
{
    Check.Equal(500, (int)(await http.GetAsync("/orders")).StatusCode,
        "[http] an injected failing store turns GET /orders into a 500");
    Check.Equal(200, (int)(await http.GetAsync("/health")).StatusCode,
        "[http] ...while unrelated endpoints still work");
}, services => services.AddSingleton<OrderStore>(new FailingOrderStore()));
```

## Solutions

### 1. Your first endpoint tested over HTTP

```csharp
// OrderStore.cs
public int Count { get { lock (_lock) return _orders.Count; } }

// Api.cs — in MapEndpoints
app.MapGet("/health", (OrderStore store) => Results.Ok(new { status = "ok", orders = store.Count }));

// HttpTests.cs — next to the other DTOs
private record HealthDto(string Status, int Orders);
```

WHY: a health endpoint is the smallest thing that is nonetheless *only* checkable over HTTP —
`store.Count` is trivially unit-testable, but "is it reachable, does it return 200, is the JSON shaped
the way clients expect" are three facts that live in the wiring. It is also the endpoint a load balancer
will call every few seconds forever, which makes it the one most worth testing and the one most likely
to be written without a test.

Note the property-name mapping you did not configure: the server writes `status` and `orders` (ASP.NET
Core's camelCase policy) and `ReadFromJsonAsync` reads them into `Status`/`Orders` because
`System.Net.Http.Json` defaults to case-insensitive web options. Two defaults happening to agree is
exactly what an integration test verifies and a unit test cannot see.

### 2. PUT, and three status codes that only HTTP can check

```csharp
// OrderStore.cs
public Order? Replace(int id, IReadOnlyList<OrderLine> lines)
{
    var (subtotal, tax, total) = Totals.For(lines);      // slow-ish work OUTSIDE the lock
    lock (_lock)
    {
        var index = _orders.FindIndex(o => o.Id == id);
        if (index < 0) return null;
        var updated = new Order(id, lines, subtotal, tax, total);   // the id is not the caller's to change
        _orders[index] = updated;
        return updated;
    }
}

// Api.cs
app.MapPut("/orders/{id:int}", (int id, NewOrder? dto, OrderStore store) =>
{
    // Guard order is a decision, not an accident: a request we cannot parse is
    // bad regardless of whether the resource exists.
    var errors = OrderRules.Validate(dto);
    if (errors.Count > 0) return Results.BadRequest(new { errors });

    return store.Replace(id, OrderRules.ToLines(dto!)) is { } order
        ? Results.Ok(order)
        : Results.NotFound(new { error = $"no order with id {id}" });
});
```

WHY: look at what this endpoint actually *does* — one validation call, one store call, then it picks
between three status codes. That is the entire risk surface, and all of it is invisible to a unit test:
`Results.Ok`, `Results.NotFound`, and `Results.BadRequest` are all valid C# that compiles and runs
whichever one you pick. Same shape as the original's bug, which is why PUT is worth adding here rather
than another calculation.

The 400-before-404 ordering is worth defending because both orders ship in real APIs. Validating first
gives a malformed request one consistent answer whether or not the id exists — simpler to document, and
it declines to leak which ids exist to someone who has not sent a well-formed request. The opposite order
is defensible when existence is public anyway. What is *not* defensible is having no opinion, because
then the answer depends on which check the last person happened to write first. (Re-stamping the id
inside `Replace` is cs#21's `Mutate` instinct: PUT replaces *contents*, not identity.)

### 3. A discount, and the invariant that must survive it

```csharp
// Order.cs
public record Order(int Id, IReadOnlyList<OrderLine> Lines,
                    decimal Subtotal, decimal Discount, decimal Tax, decimal Total);

public static class Totals
{
    public const decimal TaxRate = 0.08m;
    public const decimal DiscountThreshold = 100m;
    public const decimal DiscountRate = 0.10m;

    /// INVARIANT: Subtotal - Discount + Tax == Total, exactly, for all inputs.
    public static (decimal Subtotal, decimal Discount, decimal Tax, decimal Total) For(IReadOnlyList<OrderLine> lines)
    {
        var subtotal = lines.Sum(line => Money.Round(line.Qty * line.UnitPrice));
        var discount = subtotal >= DiscountThreshold ? Money.Round(subtotal * DiscountRate) : 0m;
        var tax = Money.Round((subtotal - discount) * TaxRate);
        var total = subtotal - discount + tax;      // three rounded numbers: exact by construction
        return (subtotal, discount, tax, total);
    }
}

// Tests.cs — the property loop, updated
for (int qty = 1; qty <= 30; qty++)
    for (int step = 1; step <= 40; step++)
    {
        var (subtotal, discount, tax, total) = Totals.For([new OrderLine("X", qty, step * 0.255m)]);
        checkedCombinations++;
        if (subtotal - discount + tax != total) violations++;
        if (Money.Round(discount) != discount || Money.Round(tax) != tax) violations++;
    }
```

WHY: the shape of the invariant changed, and that is the lesson. `Subtotal + Tax == Total` was never the
real rule — the real rule is "the numbers the customer can see add up the way the customer will add
them", and adding a discount line changes what that sentence means. A property test you must *edit* when
the business rule changes is doing its job; one that keeps passing unchanged was probably asserting the
wrong thing.

Charging tax on the discounted amount rather than the subtotal is a genuine business decision (in some
jurisdictions a legal one) hiding inside one pair of parentheses. And the boundary: `>=` versus `>` is
one character, worth ten pence on every order landing exactly on 100.00, and completely invisible
without a test that uses exactly 100.00. Every threshold deserves three tests — below, on, above.

### 4. One server per scenario

```csharp
// HttpTests.cs
public static void Run() => RunAsync().GetAwaiter().GetResult();

private static async Task RunAsync()
{
    await WithServer(CreateAndFetchScenario);
    await WithServer(ValidationScenario);
    await WithServer(DeleteScenario);
}

/// Starts a fresh app on a fresh random port, runs ONE scenario against it,
/// and shuts it down — so no scenario can see another's data.
private static async Task WithServer(Func<HttpClient, Task> scenario)
{
    var app = Api.Build([], quiet: true);
    app.Urls.Clear();
    app.Urls.Add("http://127.0.0.1:0");

    await app.StartAsync();
    try
    {
        using var http = new HttpClient
        {
            BaseAddress = new Uri(app.Urls.First()),
            Timeout = TimeSpan.FromSeconds(15),
        };
        await scenario(http);
    }
    finally
    {
        await app.StopAsync();
        await app.DisposeAsync();
    }
}
```

WHY: shared state between tests is the number one cause of suites that pass individually and fail
together, or pass in one order and fail in another — and the failure message never mentions the real
cause, because the real cause is a test that ran earlier. Every scenario starting from an empty world
means a red test tells you about the code, not about its neighbours.

The cost is real and worth naming: each `WithServer` pays app startup, roughly a tenth of a second.
Thirty scenarios is three seconds — fine. Three hundred is thirty, at which point you either share one
server and reset state between scenarios, or move to `WebApplicationFactory`, whose in-memory transport
removes the socket entirely. Note where the leverage is: `OrderStore` is registered *per app*, so "fresh
app" and "fresh data" are the same act. With a static, or a real database, isolation would need its own
design — which is why in-memory-by-default is worth keeping as long as you can.

### 5. Swap a service, the way `WebApplicationFactory` does

```csharp
// Api.cs
public static WebApplication Build(string[] args, bool quiet = false,
                                   Action<IServiceCollection>? configureServices = null)
{
    var builder = WebApplication.CreateBuilder(args);
    if (quiet) builder.Logging.ClearProviders();

    builder.Services.AddSingleton<OrderStore>();

    // LAST, so a test's registration overrides the app's. This one line is
    // what WebApplicationFactory's WithWebHostBuilder(...ConfigureServices...)
    // gives you, and it is the whole reason that package exists.
    configureServices?.Invoke(builder.Services);

    var app = builder.Build();
    MapEndpoints(app);
    return app;
}

// OrderStore.cs — the members a double needs to replace become virtual
public virtual IReadOnlyList<Order> All() { lock (_lock) return _orders.ToList(); }
public virtual Order? Find(int id) { lock (_lock) return _orders.FirstOrDefault(o => o.Id == id); }
public virtual Order Add(IReadOnlyList<OrderLine> lines) { /* ...unchanged... */ }
public virtual bool Delete(int id) { lock (_lock) return _orders.RemoveAll(o => o.Id == id) > 0; }

// HttpTests.cs — the fault-injecting double
private class FailingOrderStore : OrderStore
{
    public override IReadOnlyList<Order> All() => throw new InvalidOperationException("the database is down");
}

// ...and the overload that takes it
private static async Task WithServer(Func<HttpClient, Task> scenario, Action<IServiceCollection>? configure = null)
{
    var app = Api.Build([], quiet: true, configure);
    // ...as before...
}
```

WHY: this is the move that makes integration testing *practical* rather than merely possible. Without
it, every integration test must reach the state it needs through the API itself — three POSTs before the
assertion you care about — which is slow and, worse, couples every test to endpoints it is not testing.
Break POST and forty unrelated tests go red. Seeding the store directly means a test about *reading*
depends only on reading.

The failure case is the part you cannot get any other way. "What does this API do when the database is
down?" has no valid request that provokes it. Injecting a store that throws answers it in milliseconds,
about the *real* pipeline: routing, the exception reaching Kestrel, and a 500 with no stack trace
attached because the app is not in Development. (Set `ASPNETCORE_ENVIRONMENT=Development` and run it
again — the body changes completely, which is worth knowing before a customer finds it.)

Ordering is the one thing to get right: `configureServices` runs after the app's own registrations
because resolving a single service returns the **last** registration for that type. Run it first and the
app overwrites your double, the test passes against the real store, and you believe something false —
the worst outcome available to a test.
