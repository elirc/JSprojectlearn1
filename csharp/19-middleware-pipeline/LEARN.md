# 📘 Learning Guide: Middleware Pipeline

Read this before or alongside the README — it teaches what middleware is, why pipeline *order* matters, and how the assembly-line picture explains every web framework you'll ever meet.

## 1. What are we building?

A small API with two public endpoints (`/status`, `/time`) and three admin endpoints (`/admin/stats`, `/admin/users`, `POST /admin/reset`) that require a header: `X-Api-Key: letmein`. Every request should be logged, and every response should carry an `X-Elapsed` timing header.

Notice the shape of those requirements: logging, auth, and timing apply *across* endpoints — they're **cross-cutting concerns**. The original implements them by pasting three blocks into every endpoint (and famously forgets one paste — `/admin/users` ships unprotected). The refactor moves each concern into the **middleware pipeline**, written once.

## 2. Concepts you need first

### Cross-cutting concerns

Some code is about one endpoint ("what are the stats?"). Some code is about *every* request: log it, check permissions, measure it, handle errors. That second kind is called cross-cutting because it slices across all endpoints. Pasting it into each handler means N copies that must stay identical forever — and js#65 already showed you where that goes (each hand-rolled body parser was slightly different).

### The pipeline: an assembly line for requests

ASP.NET Core processes every request through a chain of **middleware** — think stations on an assembly line:

```
request  ──▶ [ logging ] ──▶ [ timing ] ──▶ [ auth gate ] ──▶ endpoint
response ◀── [ logging ] ◀── [ timing ] ◀── [ auth gate ] ◀──   │
```

The crucial mental picture: the request travels *down* through each station to the endpoint, and the response travels back *up* through the same stations **in reverse order**. Every station gets two moments: before (on the way in) and after (on the way out). js#65's refactor called this the "middleware onion" — same idea, now with framework support.

### Writing a station: `app.Use`

```csharp
app.Use(async (ctx, next) =>
{
    Console.WriteLine("before");   // request passing through, heading in
    await next(ctx);               // hand off to the REST of the pipeline
    Console.WriteLine("after");    // response passing through, heading out
});
```

Two parameters: `ctx` is the `HttpContext` (the whole request + response in one object), and `next` is *the rest of the pipeline* as a callable. Everything before `await next(ctx)` happens on the way in; everything after happens on the way out. Exactly js#65's `async (ctx, next)` middleware, down to the names.

### Short-circuiting: the gate says no

A station doesn't have to call `next`. Skip it, write a response, and the line stops there — inner stations and the endpoint never run:

```csharp
if (!keyIsValid)
{
    ctx.Response.StatusCode = 401;
    await ctx.Response.WriteAsJsonAsync(new { error = "..." });
    return;   // ⬅ no next(ctx): short-circuit
}
await next(ctx);
```

That's what a 401 *is*: the gate turned you away before the endpoint existed, as far as you're concerned.

### Order matters (and is finally visible)

Middleware runs in the order you `Use` it. That makes ordering a *policy you can read*:

- Logging **outermost** → it logs everything, including requests the gate rejects.
- Timing outside auth → 401s get timed too.
- Gate **innermost** → by the time an endpoint runs, the request is logged, timed, and authorized.

Swap logging and auth and rejected requests vanish from your logs. In the original, "order" was whatever each paste happened to do — five private guesses instead of one visible decision.

### `app.UseWhen`: a branch in the line

Auth shouldn't run for `/status`. Instead of an `if` inside the middleware, the pipeline itself can branch:

```csharp
app.UseWhen(
    ctx => PathRules.IsAdmin(ctx.Request.Path),   // predicate: which requests divert
    admin => admin.Use(...)                       // extra stations for that branch
);
```

Requests matching the predicate flow through the extra stations, then rejoin the main line. Everyone else skips them entirely.

### Response headers and `OnStarting` — the envelope rule

HTTP sends headers *first*, then the body. Once the body starts streaming, headers are sealed — like an envelope you must address **before** mailing. But timing wants to write its header at the *end* (that's when it knows the elapsed time). The escape hatch:

```csharp
ctx.Response.OnStarting(() =>
{
    ctx.Response.Headers["X-Elapsed"] = TimingFormat.Header(sw.Elapsed);
    return Task.CompletedTask;
});
```

`OnStarting` registers a callback that the framework runs at the last possible moment before the first body byte — the stopwatch has counted everything except the final send. Register early, execute late.

### Headers in, headers out

Request headers are read from `ctx.Request.Headers["X-Api-Key"]` — the curl side is `-H "X-Api-Key: letmein"`. A missing header comes back as an empty value that converts to `null` — which is why `ApiKeyChecker.IsValid(string?)` takes a nullable and rejects it.

### Keep the decisions out of the plumbing

Middleware lambdas juggle `HttpContext`, `next`, status codes — awkward to unit test. So the refactor keeps each lambda to 3–5 lines of *doing* and extracts every *decision* into pure static methods: `ApiKeyChecker.IsValid(key)`, `PathRules.IsAdmin(path)`, `TimingFormat.Header(elapsed)`. Same decide-vs-do split as every project since cs#01, applied to the pipeline itself.

## 3. Walking through the original code

Open `original.cs` and read `/admin/stats` — the fully-loaded specimen:

```csharp
Console.WriteLine($"--> GET /admin/stats");        // logging, copy #3
var sw = Stopwatch.StartNew();                     // timing, copy #3
string? key = ctx.Request.Headers["X-Api-Key"];    // auth, copy #1
if (key != "letmein") { ...401... }
var result = new { quotes = 3, uptimeHours = 12 }; // ⬅ the actual endpoint
Console.WriteLine($"<-- 200 GET /admin/stats ...");
return Results.Json(result);
```

Ten lines; one of them matters. Now scan all five endpoints and count the pasted blocks — and spot the rot that's *already* set in:

- `/time` lost its closing log line somewhere along the way.
- `/admin/reset`'s 401 body is `{denied = true}` while `/admin/stats` says `{error = "wrong key"}` — clients now need two parsers for the same failure.
- And the big one, marked ⚠️ in the file: **`/admin/users` has no auth block at all.** Whoever added it copied from `/time` (a public endpoint) instead of `/admin/stats`. It logs, it times... and it hands the user list to anyone who asks.

Nothing crashes. Nothing warns. The compiler is perfectly happy. That's what makes copy-paste concerns dangerous: the failure mode is *silent absence*.

## 4. What's wrong with it (in beginner terms)

**1. The bug is invisible because it's a missing paste, not a wrong line.** You can't grep for code that isn't there. Reviewing `/admin/users`, everything present is correct — you'd have to *remember* that admin endpoints need a block this one lacks. Structure that depends on everyone remembering everything, forever, fails on schedule.

**2. Fifteen-ish pasted blocks, and every change is a hunt.** New log format? Edit five places. Rotate the API key or return a proper 401 shape? Find every copy — including the drifted ones that no longer look alike, which is exactly what makes them hard to find.

**3. The endpoint's real work is buried.** `/status` exists to say `{status: "ok"}` — one line hidden in ten. Buried signal is where the next bug hides (nobody re-reads ceremony).

**4. None of it is testable.** "Is `LETMEIN` accepted?" "Is `/administrator` treated as admin?" In the original those questions are answerable only by booting the server and curling — so nobody asks them, and edge cases rot.

## 5. Try it yourself first!

Refactor the original. Hints, vaguest first:

1. 🌱 Write the no-op middleware first: `app.Use(async (ctx, next) => { await next(ctx); });` before the endpoints, run it, confirm nothing changed. Now you have a station to fill.
2. 🌿 Move logging into it: print method + path before `next`, status after. Delete all five pasted log blocks. The endpoints shrink immediately.
3. 🌳 Timing: `Stopwatch.StartNew()` before `next` — but you can't set a header *after* `next` (the envelope is sealed). Look up `ctx.Response.OnStarting` in section 2.
4. 🍎 The gate: `app.UseWhen(ctx => /* is the path /admin-ish? */, b => b.Use(/* check the header, 401 + return, or next */))`. Extract the three decisions into `ApiKeyChecker` / `PathRules` / `TimingFormat` static classes and unit-test them — including the `/administrator` trap and case-insensitive paths.

## 6. Understanding the refactored solution

**`PipelineParts.cs`** — three pure classes, three decisions:

- `ApiKeyChecker.IsValid` is one strict comparison — but now "case-sensitive", "no whitespace", "null rejected" are *tested facts*, not hopes.
- `PathRules.IsAdmin` is the subtle one: `p == "/admin" || p.StartsWith("/admin/")`. The naive `StartsWith("/admin")` would drag `/administrator` behind the gate — a real-world class of bug (prefix matching without the separator). There's a test proving we didn't.
- `TimingFormat.Header` formats with **invariant culture** so a server in a German locale doesn't emit `12,3ms`. Tiny function, real lesson: anything that crosses the wire gets formatted deliberately.

**`Program.cs`** — read it top to bottom and notice you're reading *policy*: log everything → time everything → gate `/admin` → endpoints. The gate middleware is five lines: check, 401 + `return` (short-circuit), or `next`. One consistent 401 body replaces the original's two drifted ones.

Then the payoff line at the end of the pipeline section: **the forgot-to-paste bug is structurally impossible.** `/admin/users` is protected because it's under `/admin` — so is `/admin/anything-added-next-year`, automatically, by someone who has never heard of this bug.

**`Tests.cs`** — twenty checks and not one HttpContext. That's the dividend of pulling decisions out of plumbing: the *rules* of the pipeline (who passes, which doors, what format) are ordinary functions. The plumbing that applies them is five lines you can verify with two curls.

## 7. Words you learned (glossary)

- **Cross-cutting concern** — behavior that applies to every request (logging, auth, timing), not to one endpoint.
- **Middleware** — one station in the request-processing chain; sees the request going in and the response coming out.
- **Pipeline** — the ordered chain of middleware ending at the endpoint; the assembly line.
- **`app.Use(async (ctx, next) => ...)`** — registers a station; code before `await next(ctx)` runs inbound, code after runs outbound.
- **`next`** — the rest of the pipeline, as a callable.
- **`HttpContext`** — the whole request + response pair, one object.
- **Short-circuit** — a station answering without calling `next`; inner stations and the endpoint never run.
- **`app.UseWhen(predicate, branch)`** — extra stations only for requests matching the predicate.
- **`Response.OnStarting`** — register a callback to run just before headers are sent; the only safe moment to set late-decided headers.
- **Envelope rule** — headers ship before the body; once the body streams, headers are sealed.
- **`Stopwatch`** — high-resolution timer; `StartNew()`, `.Elapsed`.
- **Invariant culture** — culture-neutral formatting so output doesn't change with the server's locale.
- **Prefix-matching trap** — `StartsWith("/admin")` catching `/administrator`; require the separator.

## 8. Experiments to try on the plane (no internet needed)

localhost works in airplane mode. Keep TWO terminals: one showing the server console (the log lines are half the show), one for curl. Both versions use port 5019.

1. **Exploit the original's bug, then watch the refactor close it.** Original running: `curl -i http://localhost:5019/admin/users` → `200` and the user list, no key — the hole is real. Refactored: same command → `401 {"error":"missing or wrong X-Api-Key header"}`; add `-H "X-Api-Key: letmein"` → `200`.
2. **Watch the assembly line in the console.** Refactored server: fire a rejected request (`curl http://localhost:5019/admin/stats`) and look at the server terminal: `--> GET /admin/stats` then `<-- 401 ...`. The gate said no, yet logging still saw both directions — because logging is *outside* the gate. That's ordering as policy.
3. **Prove order matters by breaking it.** Move the logging `app.Use` block to *after* the `UseWhen` gate. Restart, curl `/admin/stats` without a key → 401 arrives, but the server console is silent: rejected requests became invisible. This is exactly how real apps end up unable to answer "who's hammering our admin routes?". Move it back.
4. **Read the timing header.** `curl -i http://localhost:5019/status` → find `X-Elapsed: 0.8ms` (your number will vary). Then comment out the `OnStarting` wrapper and set the header directly after `await next(ctx)`, restart, and curl again — expect an error in the server console (headers are read-only once the response has started) and no header on the wire. The envelope rule, experienced. Revert.
5. **Add a station in one place.** A request-counter: declare `var count = 0;` above the middleware, then `app.Use(async (ctx, next) => { count++; ctx.Response.OnStarting(() => { ctx.Response.Headers["X-Request-Number"] = count.ToString(); return Task.CompletedTask; }); await next(ctx); });`. Curl anything twice → `X-Request-Number: 1`, then `2`, on every route. One block, all five endpoints — in the original this feature would be five more pastes.
6. **Break the prefix rule and watch a test catch it.** In `PathRules.IsAdmin`, "simplify" to `return p.StartsWith("/admin");` and run the tests. Expected: `FAIL /administrator is NOT under /admin...`. Revert, re-run, green. The trap is now permanently guarded.
