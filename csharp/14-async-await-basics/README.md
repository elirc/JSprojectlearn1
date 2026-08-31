# CS 14 — async-await-basics

**Lesson: `Task` is C#'s `Promise` — await it end to end, overlap independent
work with `Task.WhenAll`, and never block on `.Result`/`.Wait()`, which cost
you time *and* wrap your exceptions.**

Mirror of js#42 (promise-pool) and js#43 (retry-timeout): the same async
lessons — accidental serialization, retries with breathing room — with
`AbortController` reborn as `CancellationToken`.

## Run it

```
dotnet run csharp/14-async-await-basics/original.cs
dotnet run --project csharp/14-async-await-basics/refactored
dotnet run --project csharp/14-async-await-basics/refactored -- test
```

## What's wrong with the original?

Run it and read the stopwatch:

1. **Sync-over-async: `.Result` blocks a whole thread** until the task
   finishes. The dashboard's three fetches are simulated ~300 ms network
   calls; blocking on each in turn means ~900 ms of wall time for ~300 ms of
   necessary waiting. (js#42's `await`-in-a-loop mistake, plus thread abuse
   on top — and in a UI app or classic ASP.NET, `.Result` can *deadlock*,
   not just dawdle. LEARN.md explains why.)
2. **The calls are independent, run dependently.** No fetch needs another's
   answer, so their waits could overlap entirely. Nothing in the code can
   express that.
3. **`.Wait()` in try/catch lies about errors.** The API throws
   `InvalidOperationException`; the catch block receives an
   **`AggregateException`** with the real error buried in
   `.InnerExceptions[0]`. Every `catch (InvalidOperationException)` you'd
   naturally write silently stops matching.

## What changed in the refactor

- **`async Task` end to end** — every method awaits; the only block in the
  whole project is `Tests.Run()` calling `.GetAwaiter().GetResult()` once at
  the program's entry point, with a comment explaining why that single spot
  is legitimate (nothing above it left to deadlock, no wrapper exception).
- **`Task.WhenAll` for the independent fetches** — start all three tasks
  *without* awaiting, then await them together. The demo's stopwatch shows
  ~300 ms instead of ~900; a test pins the overlap and the guarantee that
  results come back in *argument* order, not finish order.
- **Errors become honest**: `try { await ... } catch (InvalidOperationException)`
  catches the real type. A test asserts no `AggregateException` wrapper.
- **A retry helper (js#43 redux)**: `Retry.RunAsync(action, maxAttempts,
  delayMs)` — a `catch ... when` exception *filter* retries only while
  attempts remain, waits between tries, refuses to retry cancellation, and
  lets the final failure escape unwrapped. Tested: succeeds on attempt 3,
  gives up after exactly `maxAttempts`.
- **`CancellationToken` basics** — the simulated API honors tokens via
  `Task.Delay(ms, ct)`. Cancel mid-flight and the await throws
  `OperationCanceledException` immediately instead of waiting out the delay;
  the demo proves it with a stopwatch, the tests with `Check.Throws`.

## Key takeaway

Map your JS instincts across — `Promise`→`Task`, `await`→`await`,
`Promise.all`→`Task.WhenAll`, `AbortSignal`→`CancellationToken` — and then
respect the one rule JS never made you learn: **don't block on tasks.**
`.Result`/`.Wait()` trade your thread for a wrapped exception and, outside
console apps, a deadlock. When calls are independent, start them all, then
`await Task.WhenAll` — the speedup is the easiest performance win in .NET.
