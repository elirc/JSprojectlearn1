# 📘 Learning Guide: Background Work Queues

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them. cs#14 taught `async`/`await` inside a request. This one is about work that *outlives* the request, which is a different problem with a different answer.

## 1. What are we building?

An endpoint that accepts an email and answers immediately, because sending takes half a second and nobody should wait for it. The email is sent afterwards, in the background.

The original does that with `Task.Run(...)` and a discarded result — two lines that look like the obvious answer and lose your email in four different ways. The refactor keeps the same promise to the caller (answer instantly) and adds the three things that make it true: a queue to wait in, a worker the host owns, and a record of what happened.

## 2. Concepts you need first

### Fire-and-forget, and why `_ =` is a confession

```csharp
_ = Task.Run(async () => { ...work... });
```

`Task.Run` schedules work on the thread pool and hands back a `Task` — the object that will eventually hold "done" or "threw". Assigning it to `_` says "I am deliberately not keeping this". And if nobody keeps it, nobody can `await` it, so nobody ever sees the exception.

In .NET Framework 4.0, an unobserved task exception crashed the process when the Task was garbage collected. That was loud and unpopular, so .NET 4.5 changed it: unobserved exceptions are now **swallowed silently** by default. Your background work can fail forever with no log line, no alert, and no clue.

JavaScript has exactly the same trap, spelled `somePromise()` without `await` or `.catch()` — Node prints an unhandled-rejection warning (and, since Node 15, exits). C#'s version is quieter.

### The three questions fire-and-forget cannot answer

1. **Did it work?** No id, no result, no record.
2. **What if we shut down?** The thread pool is not asked for permission; in-flight work dies with the process.
3. **What if there is a lot of it?** `Task.Run` never says no. Ten thousand items become ten thousand concurrent tasks fighting over the same thread pool your web requests use.

Each has an answer, and together they are the project: a *store*, a *hosted service*, and a *bounded queue*.

### `Channel<T>`: an async pipe

```csharp
var channel = Channel.CreateBounded<WorkItem>(new BoundedChannelOptions(100));
channel.Writer.TryWrite(item);                       // producer (the endpoint)
await foreach (var item in channel.Reader.ReadAllAsync(token))   // consumer (the worker)
```

A channel is a thread-safe queue with an async reading end. Producers write; a consumer awaits items and is parked — using no thread at all — while the queue is empty. It is the `BlockingCollection` you may have met, without the blocked thread, and it is the same idea as a Go channel.

**Bounded** matters. An unbounded queue absorbs a flood by eating memory until the process dies; a bounded one runs out of room and *says so*, which is a fact the caller can act on (retry later). That is **backpressure**: pushing the overload back to the sender instead of hiding it.

### Hosted services: work the host starts and stops

```csharp
builder.Services.AddHostedService<EmailWorker>();

public sealed class EmailWorker : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) { ... }
}
```

A hosted service is a long-lived job the application host owns. It starts when the app starts, and on shutdown the host **waits** for it (up to `HostOptions.ShutdownTimeout`, 30 seconds by default). That waiting is the whole difference from `Task.Run`: shutdown becomes something the worker takes part in rather than something that happens to it.

`stoppingToken` is cancelled when the app is stopping. Passing it into `ReadAllAsync` and into the work itself is how "stop" reaches the innermost `await`.

### Immutable state machines

A job is a record, and every transition returns a *new* record:

```csharp
public Job Start() => Status is JobStatus.Queued
    ? this with { Status = JobStatus.Running, Attempts = Attempts + 1 }
    : throw new InvalidOperationException($"a {Status} job cannot be started");
```

Two things fall out. Illegal moves ("succeed a job that never ran") are refused in *one* place instead of being assumed everywhere. And because the value never mutates, a web request reading a job while the worker updates it can never see a half-changed object — the reader holds the old value, complete and consistent.

### `ConcurrentDictionary` and optimistic concurrency

The store is shared between the endpoints and the worker, so it must be safe from several threads at once. `ConcurrentDictionary` handles the collection; the interesting part is updating one entry:

```csharp
while (jobs.TryGetValue(id, out var current))
{
    var next = transition(current);
    if (jobs.TryUpdate(id, next, current)) return next;   // only if nobody changed it meanwhile
}
```

Read, compute, swap **if unchanged**, otherwise try again with what is there now. That is **optimistic concurrency** — the same compare-and-swap idea as an HTTP ETag or a database row version, and it needs no lock at all.

### 202 Accepted

`200 OK` means "done". For work that has not started, the honest status code is **202 Accepted**: "I have taken this, here is where to watch it", with a `Location` header pointing at `/jobs/{id}`. Choosing 202 is not pedantry — it is the difference between telling a client the email is sent and telling them it is queued.

### At-least-once, at-most-once, and where this one sits

Queues are usually described by their delivery guarantee. This store is in memory, so a restart loses queued jobs: **at-most-once**. Real systems get durability from a database or broker (RabbitMQ, SQS, Hangfire) and usually offer **at-least-once**, which is why real workers must be *idempotent* — processing the same item twice must be harmless. The structure you build here is the same; durability is the part you buy.

## 3. Walking through the original code

```csharp
app.MapPost("/send", (EmailRequest req) =>
{
    _ = Task.Run(async () =>
    {
        await Task.Delay(500);
        if (!req.To.Contains('@'))
            throw new InvalidOperationException($"'{req.To}' is not an email address");
        sent++;
        Console.WriteLine($"[background] sent '{req.Subject}' to {req.To}");
    });

    return Results.Ok(new { queued = true });
});
```

Read it as a promise: *the email will be sent*. Now list everything that can silently break the promise.

The `throw` goes nowhere — the Task holds the exception and the Task is `_`. `Ctrl+C` during the `Task.Delay(500)` kills the work with no trace. `sent++` from many thread-pool threads loses counts. And `{"queued": true}` gives the caller nothing to follow up with, so none of the above is even discoverable from outside.

Run it, POST the bad address, and watch the console stay empty.

## 4. What's wrong with it (in beginner terms)

**1. The failure mode is silence.** Not a 500, not a log line, not a crash. The system's own opinion is that everything is fine, which is the most expensive kind of wrong.

**2. A promise with no receipt.** Without an id there is no way to ask "did it go?" — so there is no retry button, no support answer, and no metric.

**3. Shutdown is data loss.** Deploys are routine; losing a slice of in-flight work every deploy is not.

**4. Load has nowhere to wait.** A queue is what turns a spike into a delay. Without one, a spike turns into ten thousand tasks, a starved thread pool, and slow responses for requests that had nothing to do with email.

## 5. Try it yourself first!

Before reading on, try building it yourself. Hints, vaguest first:

1. 🌱 Give the caller something to hold: mint an id, store a status, and return `202` with the id. Even with `Task.Run` still doing the work, you can now write down what happened.
2. 🌿 Replace `Task.Run` with a queue: `Channel.CreateBounded<WorkItem>(100)`, and write to it from the endpoint. Nothing reads it yet — check that POSTs still return instantly and the queue depth grows.
3. 🌳 Add the reader: a class deriving from `BackgroundService`, registered with `AddHostedService`, looping over `ReadAllAsync(stoppingToken)`. Wrap the work in try/catch and record success or failure on the job.
4. 🍎 Now make the states real: a record with `Start()`, `Succeed()`, `Fail(reason)` that throws on illegal transitions, and tests for each one — including "a Queued job cannot succeed". Then test the channel itself (enqueue three, read three, fill it and watch `TryEnqueue` return false) without starting a server.

## 6. Understanding the refactored solution

**`Jobs.cs`** — the domain. `Job` is an immutable record with four transitions, each guarded. `Fail` refuses a blank reason, because "failed, no reason given" is how the original's silence gets reinvented one level up. `Reject` exists so a job that never ran (queue full) is distinguishable from one that ran and broke — `Attempts` stays 0. `EmailAddress.LooksValid` is a pure predicate with eight tests, in the same spirit as cs#19's `ApiKeyChecker`.

**`JobStore.cs`** — a `ConcurrentDictionary` plus the compare-and-swap `Update` above. The clock is injected (`Func<DateTimeOffset>`), so `QueuedAt` is testable without waiting for real time — the same trick as cs#11's practice TTL cache.

**`WorkQueue.cs`** — a thin wrapper over `Channel<WorkItem>`: `TryEnqueue` (false when full), `ReadAllAsync`, `CompleteAdding`, `Depth`. The wrapper exists so the endpoints and the worker share one vocabulary and so the tests can drive the pipe directly.

**`EmailWorker.cs`** — two pieces on purpose. `JobRunner.RunAsync` is a static method taking the work as a `Func<...>`: it marks Running, awaits, and records Succeed/Fail. That is the interesting logic, and a test can hand it a delegate that throws. `EmailWorker` is the boring `BackgroundService` shell around it — `await foreach`, and a `StopAsync` override that completes the writer so the loop can finish naturally.

**`Program.cs`** — three singletons and one hosted service, then endpoints that do no work at all: validate, store, enqueue, return 202 with the id (or 503 if the queue is full). `GET /jobs/{id}` is four lines, and it is the entire answer to the question the original could not hear.

**`Tests.cs`** — 66 checks, no server. The async half runs through `RunAsync().GetAwaiter().GetResult()` because `Check` is synchronous; everything else is ordinary method calls. Note especially the channel tests: filling a bounded queue to prove `TryEnqueue` returns false, and completing it to prove `ReadAllAsync` *ends* — which is what makes clean shutdown possible.

## 7. Words you learned (glossary)

- **Fire-and-forget** — starting work and discarding the `Task`; nobody can observe the outcome.
- **Unobserved task exception** — an exception on a Task nobody awaited; silently dropped since .NET 4.5.
- **Producer/consumer** — one side adds work, the other takes it; the queue between them is the contract.
- **`Channel<T>`** — .NET's async producer/consumer pipe; `Writer.TryWrite`, `Reader.ReadAllAsync`.
- **Bounded channel** — one with a capacity; full means "no", not "grow forever".
- **Backpressure** — refusing work you cannot take, so the overload stays with the caller.
- **Hosted service / `BackgroundService`** — a long-lived job the host starts and stops; `ExecuteAsync`.
- **`AddHostedService<T>()`** — registers it; the host waits for it on shutdown.
- **`stoppingToken`** — the `CancellationToken` cancelled when the app is stopping.
- **Graceful shutdown** — stop accepting new work, finish or record what is in flight.
- **State machine** — a fixed set of states plus the legal moves between them.
- **`ConcurrentDictionary`** — a thread-safe dictionary; `TryAdd`, `TryUpdate`, `TryGetValue`.
- **Optimistic concurrency** — read, compute, swap only if unchanged, retry if not.
- **202 Accepted** — "taken, not finished"; pair it with a `Location` header.
- **Idempotent** — safe to do twice; required of workers on at-least-once queues.
- **At-most-once / at-least-once** — delivery guarantees; in-memory queues give the first.

## 8. Experiments to try on the plane (no internet needed)

localhost works in airplane mode. Keep TWO terminals: one for the server (its console is half the show), one for curl. Tests never start the server: `dotnet run --project csharp/32-background-work-queue/refactored -- test`.

1. **Watch a failure get recorded.** Start the refactored server, POST `{"to":"not-an-email","subject":"oops"}`, note the id from the 202, then `curl http://localhost:5032/jobs/<id>` immediately (Queued or Running) and again a second later (`Failed`, with the reason). Now do the same against the original: 200, no id, nothing in the console, no way to ask. That contrast is the project.
2. **Prove the shutdown difference.** POST three jobs quickly, then Ctrl+C the server within the first half-second. Refactored: the console prints `[worker] shutdown requested` and how many jobs never got a turn — they are accounted for. Original: nothing at all is printed, and nothing anywhere knows those emails existed.
3. **Fill the queue.** Change `new WorkQueue(capacity: 100)` to `capacity: 2` in `Program.cs`, restart, and POST four jobs in a row (each takes 500ms to send). Expected: the last ones come back `503` with `"queue full, retry shortly"` and a job recorded as Failed/rejected with `attempts: 0`. Backpressure, visible. Put it back to 100.
4. **Break the try/catch.** In `JobRunner.RunAsync`, delete the `catch` block (let the exception escape) and re-run the tests. Expected: `work that throws marks the job Failed` fails — and if you then run the server and POST a bad address, the worker's `await foreach` loop dies on the first bad item and every later job stays `Queued` forever. One missing catch, one dead worker: that is why worker loops catch everything.
5. **Add a second worker.** Register `AddHostedService<EmailWorker>()` twice and set `SingleReader = false` in `WorkQueue`. Expected: two workers drain the same channel and jobs finish about twice as fast — and nothing else changes, because the store's transitions already refuse double-starts. Then try it *without* changing `SingleReader` and read the option's documentation comment again.
6. **Make it retry.** In the worker, when `RunAsync` returns a `Failed` job with `Attempts < 3`, put the item back on the queue (you will need a `Requeue` transition: `Failed → Queued`). Add tests for the new transition first. Expected: the bad address fails three times and stops. Then notice what you have quietly built — and why real queues make you think hard about idempotency.
