# 📘 Learning Guide: Async & Await Basics

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A user dashboard that needs three pieces of data — profile, orders, recommendations — from a slow "API" (faked with timed delays, so everything runs offline). Three versions of the same fetch:

- the **original**: blocks on each call with `.Result`, one after another — ~900 ms of wall time for ~300 ms of necessary waiting, plus an error-handling section where the exception you threw is *not* the exception you catch;
- the **refactor**: `async`/`await` end to end, `Task.WhenAll` to overlap the independent calls (stopwatch drops to ~300 ms), honest try/catch, a retry helper for flaky calls, and cancellation for callers who stop caring.

You already know async from the JS track — js#42 taught you that `await` in a loop is accidental serialization; js#43 built retry. This project is the dictionary between the languages:

| JavaScript | C# |
|---|---|
| `Promise<string>` | `Task<string>` |
| `async function f()` | `async Task<string> F()` |
| `await p` | `await task` |
| `Promise.all([a, b])` | `await Task.WhenAll(a, b)` |
| `new Promise(res => setTimeout(res, ms))` | `Task.Delay(ms)` |
| `AbortController` / `AbortSignal` | `CancellationTokenSource` / `CancellationToken` |
| *(no equivalent — you can't block)* | `.Result` / `.Wait()` — **the trap** |

That last row is the whole project. JS physically cannot block on a promise; C# *can*, and that ability is a loaded footgun.

## 2. Concepts you need first

### `Task<T>`: a promise of a future value

A `Task<string>` is a receipt: "a string is being produced; check back later." Like a JS Promise it is *already running* the moment you receive it — you don't start a task, the method that returned it did. A plain `Task` (no `<T>`) is a promise of "done", with no value — like a JS Promise resolving `undefined`.

### `async` and `await`

Marking a method `async` lets you use `await` inside it, and makes it return a `Task`:

```csharp
public async Task<string> FetchProfileAsync()
{
    await Task.Delay(300);       // wait 300 ms WITHOUT holding a thread
    return "Ada Lovelace";       // becomes the task's result
}
```

`await` means: "pause *this method* here; free the thread to do other work; resume when the task finishes; hand me its unwrapped result." Just like JS's `await` — same keyword, same feel. The naming convention `...Async` on method names is C# custom for "this returns a Task; await it."

`Task.Delay(ms)` is the async sleep — the direct equivalent of wrapping `setTimeout` in a promise. We use it to simulate network latency so the whole lesson runs offline.

### The villain: `.Result` and `.Wait()` (sync-over-async)

C# lets you grab a task's value *without* awaiting:

```csharp
string s = FetchProfileAsync().Result;   // blocks the thread until done
```

`.Result` (and its void twin `.Wait()`) doesn't pause-and-free like `await` — it **freezes the current thread** until the task completes. Two separate punishments:

1. **Waste, or worse.** In a console app you "merely" burn a thread doing nothing. In a UI app or classic ASP.NET there's a rule that resumptions must run on the *one* special thread — which is exactly the thread you just froze. The task can't finish because you're blocking; you won't unblock until it finishes. That's a **deadlock**: the app hangs forever, no exception, no clue.
2. **Wrapped exceptions.** If the task failed, `.Result`/`.Wait()` don't throw the real exception — they throw an **`AggregateException`** (a container type that can hold *several* failures) with the real one inside `.InnerExceptions[0]`. Your `catch (InvalidOperationException)` silently stops matching. `await`, by contrast, always rethrows the original, unwrapped.

### `Task.WhenAll`: Promise.all with a C# accent

The key insight (same as js#42): **calling an async method starts it; `await` only waits.** So to overlap independent work, start everything *first*, then await together:

```csharp
Task<string> a = api.FetchProfileAsync();   // running...
Task<string> b = api.FetchOrdersAsync();    // running too...
string[] both = await Task.WhenAll(a, b);   // one combined wait
```

Three 300 ms calls: sequential awaits cost ~900 ms; WhenAll costs ~300 ms, because all three delays tick down simultaneously. Guarantees worth memorizing: results come back **in argument order** (slot 1 = task 1), never in finish order; and if a task fails, `await Task.WhenAll(...)` throws that task's *real* exception.

### `catch ... when`: exception filters

C# can attach a condition to a catch block:

```csharp
catch (Exception ex) when (attempt < maxAttempts)
```

The block only catches when the condition holds; otherwise the exception flies past *as if this catch didn't exist*. It's the clean way to say "handle this only sometimes" — our retry helper uses it so the final failure escapes untouched.

### Cancellation: `CancellationTokenSource` and `CancellationToken`

The .NET version of `AbortController`/`AbortSignal`, almost 1:1:

```csharp
using var cts = new CancellationTokenSource();   // the controller (owner side)
cts.CancelAfter(100);                            // or cts.Cancel() right now
await api.FetchProfileAsync(cts.Token);          // the token (worker side)
```

Async methods *accept* a token and pass it down to whatever actually waits — here, `Task.Delay(ms, ct)`. When the token trips, the delay stops early by throwing **`OperationCanceledException`**. Cancellation is *cooperative*: nothing is forcibly killed; work stops at its next check. Two conventions to copy: tokens ride along as the last parameter, defaulted (`CancellationToken ct = default`) so callers who don't care can ignore them; and cancellation *is* an exception, so "stopped because asked" and "finished" stay distinguishable.

### The one legal block: `GetAwaiter().GetResult()` at the entry point

Somewhere, a program's synchronous edge must meet its async core. Our `Tests.Run()` must return an `int` (the exit code), so it does:

```csharp
RunAsync().GetAwaiter().GetResult();
```

Why is this OK *here* and nowhere else? Because it's the **very top of the program** — nothing above it holds a special thread that the async work needs, so the deadlock scenario can't form; and blocking once at the top costs one thread for the duration, which a test runner doesn't care about. Why `GetAwaiter().GetResult()` instead of `.Wait()`? Identical blocking, but it rethrows the **original** exception instead of an `AggregateException` — so `Check.Throws<InvalidOperationException>` sees the true type. Everywhere below that single line, it's `await` all the way down.

## 3. Walking through the original code

The API itself is innocent — properly async, one `Task.Delay` per fake call. The crime scene is the caller:

```csharp
string profile = api.FetchProfile().Result;
string orders = api.FetchOrders().Result;
string recs = api.FetchRecommendations().Result;
```

Each `.Result` freezes the main thread for a full 300 ms. Only when one completes does the next even *start* — the stopwatch prints ~900-1000 ms. The comment in the file says it plainly: the calls never needed each other's answers.

Then the error section:

```csharp
try
{
    api.FetchBroken().Wait();
}
catch (Exception ex)
{
    Console.WriteLine($"caught:  {ex.GetType().Name}");   // AggregateException?!
```

`FetchBroken` throws `InvalidOperationException("orders database is down")`. The catch receives `AggregateException`, message "One or more errors occurred", real error one level down in `.InnerExceptions[0]`. The demo has to dig it out by hand — precisely the confusion `await` was designed to end.

## 4. What's wrong with it (in beginner terms)

**1. It pays triple for no reason.** Three independent waits, served strictly one at a time. This is js#42's "accidental serialization," and here it's not even the subtle `await`-in-a-loop version — it's explicit blocking. Users feel this as a dashboard that takes a second when it should take a third of one.

**2. `.Result` is a habit that kills elsewhere.** Today, a console app, so it "only" wastes a thread. Copy the habit into a desktop app's button handler or an old ASP.NET controller and you get the classic hang: UI frozen, request stuck, no error anywhere. The safe rule needs no case analysis: *async all the way down; never block on a task.*

**3. The exceptions lie.** Code that throws `InvalidOperationException` should be catchable with `catch (InvalidOperationException)`. With `.Wait()`/`.Result` it isn't — the wrapper breaks every specific catch below it, so people "fix" it with `catch (Exception)` and inner-exception spelunking, and error handling degrades into archaeology.

**4. Nothing can be cancelled.** The original's calls take no token. A user who navigates away, a timeout policy, a shutting-down service — all must wait out every delay in full, because no one can tell in-flight work to stop.

## 5. Try it yourself first!

Refactor the original before reading on. Hints, vaguest first:

1. 🌱 Replace every `.Result` with `await` (top-level statements may await directly). Re-run. Did the stopwatch change? Why not? (Hint: `await`-in-sequence is still a queue — js#42's lesson.)
2. 🌿 Now *start* all three fetches into `Task<string>` variables before awaiting anything, and await `Task.WhenAll(...)`. Expected: ~300 ms. One-third the time, zero cleverness.
3. 🌳 Change the error demo to `try { await api.FetchBroken(); } catch (InvalidOperationException ex)`. Expected: the real type, caught directly — the AggregateException confusion is gone.
4. 🍎 Add `CancellationToken ct = default` to each API method, pass it to `Task.Delay(ms, ct)`, and cancel from a `CancellationTokenSource` mid-call. Then write js#43's retry as `Retry.RunAsync(action, maxAttempts, delayMs)` — a loop, a try/catch that only swallows while attempts remain (`catch ... when`), and an async delay between tries.

## 6. Understanding the refactored solution

**`FakeApi.cs`** — every method is `async Task<string>`, takes a defaulted token, and forwards it to the delay:

```csharp
public async Task<string> FetchProfileAsync(CancellationToken ct = default)
{
    await Task.Delay(latencyMs, ct);
    return "Ada Lovelace";
}
```

That single `ct` argument is the whole cancellation implementation: `Task.Delay` watches the token and throws `OperationCanceledException` the moment it trips.

**`Program.cs`** — the demo runs the comparison you should carry in your head forever. Sequential (legitimate *when calls depend on each other* — this trio doesn't, it's here for the timing):

```csharp
string profile = await api.FetchProfileAsync();
string orders = await api.FetchOrdersAsync();      // ~900 ms total
```

Overlapped:

```csharp
Task<string> profileTask = api.FetchProfileAsync();   // all three START now
Task<string> ordersTask = api.FetchOrdersAsync();
Task<string> recsTask = api.FetchRecommendationsAsync();
string[] results = await Task.WhenAll(profileTask, ordersTask, recsTask);   // ~300 ms
```

The two stopwatch printouts are the most persuasive three lines in the project.

**`Retry.cs`** — js#43's helper with C# muscles:

```csharp
for (int attempt = 1; ; attempt++)
{
    try
    {
        return await action();
    }
    catch (Exception ex) when (attempt < maxAttempts && ex is not OperationCanceledException)
    {
        await Task.Delay(delayMs, ct);
    }
}
```

Three ideas in one filter: attempts remaining → swallow and wait (asynchronously — no thread naps); attempts exhausted → the filter is false, so the last exception escapes *unwrapped*; cancellation → never retried, because "the caller said stop" is not a flaky server (js#43's transient/permanent split, minimum viable version). Tests pin each: success on call 3, exactly `maxAttempts` calls then the real exception, and one single call when the token is already cancelled.

**`Tests.cs`** — note the entry-point pattern from section 2: `Run()` blocks once with `GetAwaiter().GetResult()` on a single async method, then everything inside `RunAsync` awaits. The cancellation tests show both flavors: an already-cancelled token (via `Check.Throws` with a sync wrapper — the lambda itself does `GetAwaiter().GetResult()` so the exception surfaces synchronously, unwrapped) and a mid-flight `CancelAfter(20)` against a 150 ms call.

The WhenAll timing test deserves a note: `Check.True(watch.ElapsedMilliseconds < 400, ...)` with three 150 ms tasks. Sequential would be ~450 ms minimum, so < 400 proves overlap while leaving slack for a busy machine — timing tests must assert the *shape* of the truth, not exact numbers.

## 7. Words you learned (glossary)

- **`Task` / `Task<T>`** — C#'s Promise: a receipt for work already in flight, optionally producing a `T`.
- **`async`** — method modifier enabling `await` inside; the method returns a Task.
- **`await`** — pause this method (not the thread) until a task completes; unwraps result and rethrows real exceptions.
- **`...Async` suffix** — naming convention for task-returning methods.
- **`Task.Delay(ms, ct)`** — async sleep; the offline stand-in for network latency.
- **Sync-over-async** — blocking a thread on a task via `.Result`/`.Wait()`; wasteful in consoles, deadlock-prone in UI/classic ASP.NET.
- **Deadlock** — two parties each waiting for the other, forever; here, a blocked thread waiting on work that needs that very thread.
- **`AggregateException`** — container exception thrown by `.Result`/`.Wait()` (and designed for multi-failure cases); real errors hide in `.InnerExceptions`.
- **`Task.WhenAll`** — await many tasks as one; results in argument order; total time ≈ the slowest task.
- **Accidental serialization** — independent operations forced single-file by awaiting each before starting the next (js#42).
- **Exception filter (`catch ... when`)** — a catch that applies only when its condition is true; otherwise the exception passes by untouched.
- **`CancellationTokenSource` / `CancellationToken`** — owner/worker halves of cooperative cancellation; .NET's AbortController/AbortSignal.
- **`OperationCanceledException`** — thrown by cancelled work, so "stopped" is distinguishable from "finished."
- **Cooperative cancellation** — work stops at its next token check; nothing is forcibly killed.
- **`GetAwaiter().GetResult()`** — block like `.Result` but rethrow the original exception; acceptable only at a program's synchronous entry point.
- **Stopwatch** — `System.Diagnostics` timer used to *measure* rather than guess.

## 8. Experiments to try on the plane (no internet needed)

Run tests after each change: `dotnet run --project csharp/14-async-await-basics/refactored -- test`

1. **Un-overlap WhenAll and watch the test catch it.** In `Tests.RunAsync`, replace the three unstarted calls inside `Task.WhenAll(...)` with pre-awaited values: `await Task.WhenAll(Task.FromResult(await api.FetchProfileAsync()), ...)` — or simpler, await each fetch into a string first and wrap with `Task.FromResult`. Expected: results still correct, but the "overlapped" timing test FAILS (~450 ms): you've rebuilt the original's serialization with prettier syntax. Awaiting *before* WhenAll defeats it.
2. **Make the retry back off exponentially.** In `Retry.cs`, change the delay to `delayMs * (1 << (attempt - 1))` (50, 100, 200...). Expected: all tests still pass — they assert *call counts*, not delays. Then add a test that proves backoff by measuring: 3 attempts at `delayMs: 40` should take at least 40+80 = 120 ms. (js#43 explains why backoff matters: don't pile onto a struggling server.)
3. **Watch a WhenAll failure surface cleanly.** In the demo, add a fourth task — `api.FetchBrokenAsync()` — to the `Task.WhenAll` call, wrapped in try/catch. Expected: `catch (InvalidOperationException)` catches the real exception (await unwraps even WhenAll failures), and the successful tasks still completed — add a `Console.WriteLine(profileTask.Result)` *after* the catch to prove it (safe: the task is already finished, so `.Result` can't block — the sin was blocking, not reading).
4. **Feel the AggregateException trap once more, deliberately.** In `Tests.RunAsync`, temporarily change one `GetAwaiter().GetResult()` to `.Wait()` in the retry-gives-up test. Expected: the `Check.Throws<InvalidOperationException>` FAILS — the thrown type is now `AggregateException`, which doesn't match. Change it back. Now you've *seen* why the entry point uses GetAwaiter().GetResult().
5. **Cancel the retry between attempts.** Write a test where the action always throws, `delayMs: 200`, `maxAttempts: 10`, and you pass a token you `CancelAfter(50)` — the token goes to `Retry.RunAsync`'s `ct` parameter (it's used by the between-attempt delay). Expected: `OperationCanceledException` after ~1 attempt instead of ten failures over two seconds — cancellation cuts through the waiting, exactly what a shutting-down service needs.
