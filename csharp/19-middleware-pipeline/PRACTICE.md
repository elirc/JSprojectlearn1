# 🏋️ Practice: Middleware Pipeline

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Stamp every response with an API version (warm-up)

Add a station that puts `X-Api-Version: 1.0` on *every* response — 200s, 401s, all of them. One
`app.Use` block; zero endpoint edits.
*Practices:* your first from-scratch station + choosing where in the order it goes.
**Hint:** setting a header *before* `await next(ctx)` is safe — the envelope isn't sealed yet.
**Check offline:** `curl -i http://localhost:5019/status` and `curl -i http://localhost:5019/admin/stats`
(no key) → both carry `X-Api-Version: 1.0`, the second alongside its 401.

### ⭐⭐ 2. A read-only API key (core)

Add a second key, `lookdonttouch`, that may pass the admin gate **only for GET requests** — it can
read `/admin/stats` but a `POST /admin/reset` with it stays 401. Put the decision in a new pure
`ApiKeyChecker.CanAccess(string? presented, string method)` and make the gate call it; `IsValid` and
its tests stay untouched.
*Practices:* extending a pure decision class + one-line middleware change; the domain layer without HTTP.
**Hint:** compare the method with `string.Equals(method, "GET", StringComparison.OrdinalIgnoreCase)` —
never `==`, header casing isn't guaranteed.
**Check offline:** add this Check test — it should pass:
`Check.True(!ApiKeyChecker.CanAccess("lookdonttouch", "POST"), "read-only key cannot POST");`
then `curl -i -H "X-Api-Key: lookdonttouch" http://localhost:5019/admin/stats` → `200`, and the same
header on `-X POST .../admin/reset` → `401`.

### ⭐⭐ 3. Turn away suspicious paths (core)

Add a station — outermost, before logging — that answers `400 {"error":"suspicious path"}` for any
path containing `..`, `//`, or a backslash, so path-traversal probes never reach a handler. Decision
in `PathRules.IsSuspicious(string? path)`, fully unit-tested.
*Practices:* a short-circuiting security station + pure predicate tests.
**Hint:** the middleware body is the gate's five-line shape: check → status + `WriteAsJsonAsync` + `return`, or `next`.
**Check offline:** `Check.True(PathRules.IsSuspicious("/admin/../secret"), "dot-dot is refused")` passes;
`curl -i "http://localhost:5019/status//x"` → `400`.

### ⭐⭐ 4. Flag slow requests in the log (core)

Extend the timing station: after `await next(ctx)`, if the request took 500 ms or more, print
`SLOW <method> <path> took <elapsed>`. Decide "is this slow?" in a pure
`TimingFormat.IsSlow(TimeSpan, double thresholdMs = 500)`. Add a `GET /slow` endpoint that
`await Task.Delay(600)`s so you can watch it fire.
*Practices:* on-the-way-out middleware work — code after `next` is the response half of the onion.
**Hint:** the stopwatch you already have keeps ticking; read `sw.Elapsed` after `next` returns.
**Check offline:** `Check.True(!TimingFormat.IsSlow(TimeSpan.FromMilliseconds(499)), "499ms is fine")`
passes; `curl http://localhost:5019/slow` → server console prints the SLOW line, `/status` doesn't.

### ⭐⭐⭐ 5. Correlation ids (challenge)

Every response should carry `X-Request-Id`, and both log lines (`-->` and `<--`) should include it so
you can match arrivals to departures in a busy log. If the *client* sent an `X-Request-Id` that is
sane (non-blank, ≤ 32 chars, only letters/digits/dashes), reuse it — that's how services chain traces
— otherwise mint a fresh short id. Sanity lives in a pure `RequestId.Normalize(string? incoming)`.
*Practices:* one station coordinating request-in, response-out, and logging; a pure normalize rule.
**Hint:** `Guid.NewGuid().ToString("N")[..12]` mints 12 hex chars; stamp the header via `OnStarting`.
**Check offline:** add this Check test — it should pass:
`Check.Equal("abc-123", RequestId.Normalize("abc-123"), "a sane client id survives");`
then `curl -i -H "X-Request-Id: trace-42" http://localhost:5019/status` → response header
`X-Request-Id: trace-42` and both console lines tagged `[trace-42]`.

## Solutions

### 1. Version header

```csharp
// Program.cs — first station, right after `var app = builder.Build();`
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Api-Version"] = "1.0";
    await next(ctx);
});
```

WHY: headers may be set any time before the response starts streaming, so writing it on the way *in*
is the simplest correct move — no `OnStarting` needed because nothing has to be computed at the end
(contrast `X-Elapsed`). Outermost placement means even the gate's 401s pass through it already stamped.

### 2. Read-only key

```csharp
// PipelineParts.cs — ApiKeyChecker grows; IsValid stays for the old tests
private const string ReadOnlyKey = "lookdonttouch";

/// Admin key: everything. Read-only key: GET only. Anything else: nothing.
public static bool CanAccess(string? presented, string method) =>
    presented == Secret
    || (presented == ReadOnlyKey && string.Equals(method, "GET", StringComparison.OrdinalIgnoreCase));

// Program.cs — the gate's condition changes, nothing else does
if (!ApiKeyChecker.CanAccess(ctx.Request.Headers[ApiKeyChecker.HeaderName], ctx.Request.Method))

// Tests.cs
Check.True(ApiKeyChecker.CanAccess("letmein", "POST"), "admin key can do anything");
Check.True(ApiKeyChecker.CanAccess("lookdonttouch", "GET"), "read-only key can GET");
Check.True(ApiKeyChecker.CanAccess("lookdonttouch", "get"), "method casing doesn't matter");
Check.True(!ApiKeyChecker.CanAccess("lookdonttouch", "POST"), "read-only key cannot POST");
Check.True(!ApiKeyChecker.CanAccess(null, "GET"), "no key is still no key");
```

WHY: "who may do what" is policy, so it lands in the pure class where five one-line tests pin down
every combination — the middleware stays a dumb applier. GET-only is the *safe method* idea from
cs#16 turned into an authorization tier; case-insensitive method comparison avoids a trap that would
only surface with certain clients.

### 3. Suspicious paths

```csharp
// PipelineParts.cs — PathRules grows
/// Path-traversal and double-slash probes: refuse before any handler runs.
public static bool IsSuspicious(string? path) =>
    path is not null && (path.Contains("..") || path.Contains("//") || path.Contains('\\'));

// Program.cs — OUTERMOST station (even before logging, or right after it — decide and say why)
app.Use(async (ctx, next) =>
{
    if (PathRules.IsSuspicious(ctx.Request.Path))
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsJsonAsync(new { error = "suspicious path" });
        return;   // short-circuit: nothing inside ever sees this request
    }
    await next(ctx);
});
```

WHY: refusing garbage at the outermost ring is defense-in-depth — the fewer stations a hostile
request touches, the less can go wrong. `ctx.Request.Path` converts to `string?` implicitly, so the
pure predicate needs no ASP.NET types, which is exactly what keeps it testable in one line each.

### 4. Slow-request flag

```csharp
// PipelineParts.cs — TimingFormat grows
public static bool IsSlow(TimeSpan elapsed, double thresholdMs = 500) =>
    elapsed.TotalMilliseconds >= thresholdMs;

// Program.cs — the timing station gains an after-next tail
app.Use(async (ctx, next) =>
{
    var sw = Stopwatch.StartNew();
    ctx.Response.OnStarting(() =>
    {
        ctx.Response.Headers["X-Elapsed"] = TimingFormat.Header(sw.Elapsed);
        return Task.CompletedTask;
    });
    await next(ctx);
    if (TimingFormat.IsSlow(sw.Elapsed))
        Console.WriteLine($"SLOW {ctx.Request.Method} {ctx.Request.Path} took {TimingFormat.Header(sw.Elapsed)}");
});

// Program.cs — something to catch
app.MapGet("/slow", async () => { await Task.Delay(600); return new { slow = true }; });
```

WHY: the header must be decided *before* the body ships (`OnStarting`), but a console line has no such
deadline — code after `await next` is the natural place for anything that reacts to how the request
went. The threshold hides behind a pure function so "what counts as slow" is a tested number, not a
magic literal buried in plumbing.

### 5. Correlation ids

```csharp
// PipelineParts.cs — new pure class
public static class RequestId
{
    /// Keep the caller's id when it is sane; otherwise mint a fresh short one.
    public static string Normalize(string? incoming) =>
        !string.IsNullOrWhiteSpace(incoming)
        && incoming.Length <= 32
        && incoming.All(c => char.IsAsciiLetterOrDigit(c) || c == '-')
            ? incoming
            : Guid.NewGuid().ToString("N")[..12];
}

// Program.cs — REPLACES the logging station (station 1)
app.Use(async (ctx, next) =>
{
    var id = RequestId.Normalize(ctx.Request.Headers["X-Request-Id"]);
    ctx.Response.OnStarting(() =>
    {
        ctx.Response.Headers["X-Request-Id"] = id;
        return Task.CompletedTask;
    });
    Console.WriteLine($"--> [{id}] {ctx.Request.Method} {ctx.Request.Path}");
    await next(ctx);
    Console.WriteLine($"<-- [{id}] {ctx.Response.StatusCode} {ctx.Request.Method} {ctx.Request.Path}");
});

// Tests.cs
Check.Equal("abc-123", RequestId.Normalize("abc-123"), "a sane client id survives");
Check.Equal(12, RequestId.Normalize(null).Length, "a missing id is minted at 12 chars");
Check.True(RequestId.Normalize("bad id!") != "bad id!", "spaces/punctuation get replaced");
Check.True(RequestId.Normalize(new string('x', 33)).Length == 12, "over-long ids get replaced");
```

WHY: the id is *born* on the way in, *logged* on both passes, and *stamped* on the way out — one
station owning one concern across both directions, which is the whole middleware mental model in a
single block. Validating client-supplied ids matters because headers are attacker-controlled input:
`Normalize` means a hostile value can garble at most itself, never your log format. The local `var id`
is captured by both the `OnStarting` callback and the departure log line, so all three uses agree.
