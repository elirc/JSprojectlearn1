# 🏋️ Practice: async / await Basics

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Retry something that returns nothing (warm-up)

`Retry.RunAsync` only accepts `Func<Task<T>>`, so retrying a fire-and-forget operation (`SaveAsync`, `SendEmailAsync`) means inventing a dummy return value at every call site. Add an overload taking `Func<Task>` and returning `Task`. Do **not** duplicate the loop — adapt the action and delegate to the existing method.

Practices: overloading on delegate type, and the adapter trick for bridging `Task` and `Task<T>`.

Hint: `await RunAsync<bool>(async () => { await action(); return true; }, maxAttempts, delayMs, ct);` — the `true` is a throwaway the caller never sees. Give it the same parameter names and defaults so both overloads feel identical.

Check it offline: add these Check tests to `Tests.RunAsync()` — all should pass (and confirm the existing generic calls still compile untouched):
```csharp
int saves = 0, doomed = 0;
await Retry.RunAsync(async () => { saves++; await Task.Delay(1); }, maxAttempts: 3, delayMs: 1);
Check.Equal(1, saves, "a value-less action that succeeds runs once");
Check.Throws<InvalidOperationException>(() =>
    Retry.RunAsync(async () => { doomed++; await Task.Delay(1); throw new InvalidOperationException("down"); },
        maxAttempts: 3, delayMs: 1).GetAwaiter().GetResult(),
    "the last failure still escapes unwrapped");
Check.Equal(3, doomed, "and it tried exactly maxAttempts times");
```

### ⭐⭐ 2. Give up waiting (core)

js#43 paired retry with *timeout*. Add `Timeouts.WithTimeoutAsync<T>(Task<T> task, int milliseconds)`: race the task against `Task.Delay`, and if the delay wins, throw `TimeoutException`. Use `Task.WhenAny`, which completes as soon as the *first* of its tasks does and hands you the winner.

Practices: `Task.WhenAny` (JS's `Promise.race`), comparing task references, and re-awaiting an already-completed task to unwrap its result or its exception.

Hint: `var winner = await Task.WhenAny(task, timeout);` then `if (winner == timeout) throw ...;` and finish with `return await task;` — that final `await` is what surfaces the real value (or the real exception, unwrapped). Note `Task.WhenAny` never throws even if a task faults; it just tells you who finished.

Check it offline: add to `Tests.RunAsync()` — all should pass (`api` has 150 ms latency):
```csharp
Check.Equal("Ada Lovelace", await Timeouts.WithTimeoutAsync(api.FetchProfileAsync(), 5000), "a fast task passes through");
bool timedOut = false;
try { await Timeouts.WithTimeoutAsync(api.FetchProfileAsync(), 20); } catch (TimeoutException) { timedOut = true; }
Check.True(timedOut, "a 150 ms call loses a 20 ms race");
```

### ⭐⭐ 3. Report progress while retrying (core)

A retry that takes ten seconds looks identical to a hang. Add an optional `IProgress<int>? progress = null` parameter to `Retry.RunAsync` and `progress?.Report(attempt)` at the top of each attempt, so a caller can print "attempt 3 of 5…". `IProgress<T>` is the standard .NET interface for exactly this — one method, `void Report(T value)`.

Practices: `IProgress<T>`, optional parameters that keep every existing call site compiling, and the difference between `Progress<T>` and a plain implementation.

Hint: put the new parameter **last**, after `ct`, so positional callers are unaffected. In a test, do not use the built-in `Progress<T>` class — it marshals callbacks to a captured synchronization context, which in a console app means they arrive *later*, and your assertion runs first. Write a two-line class implementing `IProgress<int>` that appends to a list synchronously.

Check it offline: add this class to `Tests.cs` and the test — it should pass:
```csharp
// alongside Tests, at file scope
public class ListProgress : IProgress<int>
{
    private readonly List<int> sink;
    public ListProgress(List<int> sink) => this.sink = sink;
    public void Report(int value) => sink.Add(value);
}
// inside Tests.RunAsync()
var attemptsSeen = new List<int>();  int tries = 0;
await Retry.RunAsync(() => { tries++; if (tries < 3) throw new InvalidOperationException("x"); return Task.FromResult("done"); },
    maxAttempts: 5, delayMs: 1, progress: new ListProgress(attemptsSeen));
Check.Equal("1,2,3", string.Join(",", attemptsSeen), "each attempt was reported, in order");
```

### ⭐⭐ 4. Port from JS: `Promise.allSettled` (core)

`Task.WhenAll` is `Promise.all` — one failure and you lose the successful results. Port `Promise.allSettled`: add `Tasks.WhenAllSettledAsync<T>(params Task<T>[] tasks)` returning `IReadOnlyList<Settled<T>>` where `public readonly record struct Settled<T>(bool IsSuccess, T? Value, Exception? Error);`. It must **never throw**, and the results stay in argument order.

Practices: turning exceptions into data (project 08's Result idea, applied to tasks), `params`, and generic records.

Hint: the tasks passed in have already started, so awaiting them one at a time in a `foreach` costs nothing extra — and `try { ... await task ... } catch (Exception ex) { ... }` around each await is what converts the throw into a record. Do not use `Task.WhenAll` inside: it would throw before you could inspect anyone.

Check it offline: add to `Tests.RunAsync()` — all should pass:
```csharp
var settled = await Tasks.WhenAllSettledAsync(api.FetchProfileAsync(), api.FetchBrokenAsync(), api.FetchOrdersAsync());
Check.Equal(3, settled.Count, "one result per task, in argument order");
Check.True(settled[0].IsSuccess && settled[0].Value == "Ada Lovelace", "the first succeeded");
Check.Equal("InvalidOperationException", settled[1].Error!.GetType().Name, "the second failed with the REAL exception");
Check.True(settled[2].IsSuccess, "and one bad task did not sink the third");
```

### ⭐⭐⭐ 5. A promise pool (challenge)

`Task.WhenAll` on 500 jobs starts 500 jobs. Port js#42's pool: `Pool.RunAsync<T>(IEnumerable<Func<Task<T>>> jobs, int maxConcurrent, CancellationToken ct = default)` runs the jobs with **at most `maxConcurrent` in flight**, returning `T[]` in job order. Note the parameter type — `Func<Task<T>>`, not `Task<T>`: a task you were handed has already started, so the pool must be given *recipes* it can choose when to invoke.

Practices: `SemaphoreSlim` as an async lock, `try/finally` for guaranteed release, and the difference between a task and a factory for one.

Hint: `using var gate = new SemaphoreSlim(maxConcurrent);` then wrap each job in an async lambda: `await gate.WaitAsync(ct); try { return await job(); } finally { gate.Release(); }`. `Select(...).ToList()` starts them all — the semaphore is what makes most of them wait at the door — and `await Task.WhenAll(...)` collects them in order.

Check it offline: add to `Tests.RunAsync()` — all should pass:
```csharp
int running = 0, peak = 0;  object gateLock = new();
var jobs = Enumerable.Range(1, 8).Select(i => new Func<Task<int>>(async () =>
{
    lock (gateLock) { running++; if (running > peak) peak = running; }
    await Task.Delay(20);
    lock (gateLock) { running--; }
    return i * i;
})).ToList();
int[] squares = await Pool.RunAsync(jobs, maxConcurrent: 3);
Check.Equal("1,4,9,16,25,36,49,64", string.Join(",", squares), "results come back in JOB order");
Check.True(peak <= 3, $"never more than 3 jobs ran at once (peak was {peak})");
Check.Throws<ArgumentOutOfRangeException>(() => Pool.RunAsync(jobs, 0).GetAwaiter().GetResult(), "a pool needs at least one worker");
```

### ⭐⭐⭐ 6. Streaming results with `await foreach` (challenge)

A paged API should not make you wait for page 40 before showing page 1. Add `FakeApi.StreamPagesAsync(int pages, CancellationToken ct = default)` returning `IAsyncEnumerable<string>` — an `async` method that `await`s a delay and then `yield return`s each page. Consume it with `await foreach`. This is project 13's `yield return` with `await` allowed inside: an *async iterator*.

Practices: `IAsyncEnumerable<T>`, `await foreach`, and `[EnumeratorCancellation]` — the attribute that lets a consumer's `WithCancellation` token reach your loop.

Hint: the signature is `public async IAsyncEnumerable<string> StreamPagesAsync(int pages, [EnumeratorCancellation] CancellationToken ct = default)`, and you need `using System.Runtime.CompilerServices;`. There is no `return` statement, only `yield return` — the compiler builds the async state machine. Forget the attribute and it still compiles, but `WithCancellation` silently does nothing.

Check it offline: add to `Tests.RunAsync()` — all should pass:
```csharp
var pages = new List<string>();
await foreach (var page in api.StreamPagesAsync(3)) pages.Add(page);
Check.Equal("page 1,page 2,page 3", string.Join(",", pages), "pages arrive one at a time, in order");

using var stopEarly = new CancellationTokenSource();
stopEarly.CancelAfter(30);
var partial = new List<string>();  bool cancelled = false;
try
{
    await foreach (var page in api.StreamPagesAsync(50).WithCancellation(stopEarly.Token)) partial.Add(page);
}
catch (OperationCanceledException) { cancelled = true; }
Check.True(cancelled, "cancellation reaches inside the async iterator");
Check.True(partial.Count < 50, $"and it stopped early ({partial.Count} of 50 pages)");
```

## Solutions

### 1. Retry something that returns nothing

```csharp
// Retry.cs — adapt, don't duplicate: the throwaway `true` keeps the loop in ONE place.
public static async Task RunAsync(Func<Task> action, int maxAttempts, int delayMs = 50,
                                  CancellationToken ct = default)
    => await RunAsync<bool>(async () => { await action(); return true; }, maxAttempts, delayMs, ct);
```

WHY: `Task` and `Task<T>` are two types (`Task<T>` derives from `Task`), so a `Func<Task>` cannot be passed where `Func<Task<T>>` is expected — hence an overload rather than a default. The adapter is the whole body because duplicating the loop would mean two places to fix the next time the retry policy changes. Overload resolution still picks the generic version for `() => Task.FromResult(1)`: the lambda's inferred return type `Task<int>` is an *identity* match for `Func<Task<int>>` and only a reference conversion to `Func<Task>`, and identity wins — so every existing call site compiles unchanged.

### 2. Give up waiting

```csharp
// Timeouts.cs
public static class Timeouts
{
    public static async Task<T> WithTimeoutAsync<T>(Task<T> task, int milliseconds)
    {
        var timeout = Task.Delay(milliseconds);
        if (await Task.WhenAny(task, timeout) == timeout)   // Promise.race
            throw new TimeoutException($"the operation did not finish within {milliseconds} ms");
        return await task;   // already finished: unwraps the value, or rethrows the real error
    }
}
```

WHY: `Task.WhenAny` returns *the task that finished*, not its result, and it does not throw when the winner faulted — which is why the final `await task` matters twice over: it gets the value in the happy case and rethrows the original exception (unwrapped, no `AggregateException`) in the sad one. Be aware of what this does **not** do: the losing task keeps running, because nothing cancels it — a real timeout pairs this with a `CancellationTokenSource` so the abandoned work actually stops. (.NET 6+ ships `task.WaitAsync(TimeSpan)` which does all of this; building it once is how you learn what it is doing.)

### 3. Report progress while retrying

```csharp
// Retry.cs — `progress` goes LAST, so no existing call site has to move.
public static async Task<T> RunAsync<T>(Func<Task<T>> action, int maxAttempts, int delayMs = 50,
                                        CancellationToken ct = default, IProgress<int>? progress = null)
{
    if (maxAttempts < 1)
        throw new ArgumentOutOfRangeException(nameof(maxAttempts), "need at least one attempt");
    for (int attempt = 1; ; attempt++)
    {
        progress?.Report(attempt);        // nobody listening -> free
        try { return await action(); }
        catch (Exception ex) when (attempt < maxAttempts && ex is not OperationCanceledException)
        {
            await Task.Delay(delayMs, ct);
        }
    }
}
```

WHY: `IProgress<T>` is the .NET convention for "tell someone how it's going" and it inverts the dependency exactly like project 12's events — `Retry` reports, and has no idea whether the listener writes to a console, a log, or a WPF progress bar. The test-only detail is worth remembering: the framework's `Progress<T>` class deliberately posts callbacks to the *captured synchronization context*, so in a console app they land on the thread pool and your assertion can run before the report arrives. A synchronous hand-written implementation makes the test deterministic — the same reason project 11 injected a fake clock.

### 4. Port from JS: `Promise.allSettled`

```csharp
// Tasks.cs
public readonly record struct Settled<T>(bool IsSuccess, T? Value, Exception? Error);

public static class Tasks
{
    /// Never throws: every outcome, success or failure, comes back as data.
    public static async Task<IReadOnlyList<Settled<T>>> WhenAllSettledAsync<T>(params Task<T>[] tasks)
    {
        var results = new List<Settled<T>>(tasks.Length);
        foreach (var task in tasks)          // already running: awaiting in turn costs nothing
            try { results.Add(new Settled<T>(true, await task, null)); }
            catch (Exception ex) { results.Add(new Settled<T>(false, default, ex)); }
        return results;
    }
}
```

WHY: the `foreach` looks sequential and is not — the tasks were already running before this method was called, so awaiting them one by one just collects finished work in order (`await` on an already-completed task returns almost immediately). That is the same reason the README's `WhenAll` demo starts the three fetches *before* awaiting: what matters is when a task starts, not when you await it. Converting a throw into a `Settled<T>` record is project 08's Result pattern reaching async code, and it is the right shape whenever partial success is useful — a dashboard should render the two panels that loaded rather than showing one error for all three.

### 5. A promise pool

```csharp
// Pool.cs — inside `public static class Pool`
public static async Task<T[]> RunAsync<T>(IEnumerable<Func<Task<T>>> jobs, int maxConcurrent,
                                          CancellationToken ct = default)
{
    if (maxConcurrent < 1)
        throw new ArgumentOutOfRangeException(nameof(maxConcurrent), "need at least one worker");
    using var gate = new SemaphoreSlim(maxConcurrent);
    var running = jobs.Select(async job =>
    {
        await gate.WaitAsync(ct);         // wait for a free slot — asynchronously
        try { return await job(); }
        finally { gate.Release(); }       // ALWAYS, even if the job throws
    }).ToList();                          // ToList starts them all
    return await Task.WhenAll(running);   // results in job order
}
```

WHY: `SemaphoreSlim` is a counter with an async door — `WaitAsync` yields the thread instead of blocking it, which is the whole point (a `lock` here would burn threads doing nothing). The `finally` is not optional: a job that throws while holding a slot would shrink the pool permanently, and after `maxConcurrent` failures nothing would ever run again. The parameter being `Func<Task<T>>` rather than `Task<T>` is the subtle half — in both C# and JS, a task/promise is *already running*, so anything that promises to limit concurrency has to receive functions it can call later.

### 6. Streaming results with `await foreach`

```csharp
// FakeApi.cs — needs `using System.Runtime.CompilerServices;` at the top.
/// An ASYNC ITERATOR: project 13's yield return, with await allowed inside.
/// Each page is produced only when the consumer asks for the next one.
public async IAsyncEnumerable<string> StreamPagesAsync(
    int pages, [EnumeratorCancellation] CancellationToken ct = default)
{
    for (int page = 1; page <= pages; page++)
    {
        await Task.Delay(latencyMs / 4, ct);   // "fetching the next page"
        yield return $"page {page}";
    }
}
// consuming it: await foreach (var page in api.StreamPagesAsync(3)) Console.WriteLine(page);
```

WHY: `Task<List<string>>` says "wait for everything, then here it all is"; `IAsyncEnumerable<string>` says "here is the next one as soon as I have it" — the difference between a spinner and a list that fills in, and the reason ASP.NET Core can stream a JSON array straight from a database cursor. `[EnumeratorCancellation]` exists because the token is a parameter of the *method* but cancellation is requested by whoever enumerates, possibly much later; the attribute tells the compiler to feed `WithCancellation`'s token into that parameter. Without it the code still compiles and the cancellation is silently ignored — one of the few C# features whose failure mode is quiet, which is exactly why the test asserts that fewer than 50 pages arrived.
