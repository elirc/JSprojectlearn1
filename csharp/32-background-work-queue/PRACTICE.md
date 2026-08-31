# 🏋️ Practice: Background Work Queues

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. Every one of them is testable without starting the server: that is the point of keeping the domain out of the plumbing.

## Exercises

### ⭐ 1. Put a failure back in the pile (warm-up)

Add `Job Requeue()` to `Job`: `Failed → Queued`, clearing the error but **keeping** `Attempts`, so a retried job remembers how many times it has been tried. Every other state must refuse it.

Practices: adding a transition to a state machine — including the "which states refuse this?" half, which is the half people skip.

Hint: copy `Reject`'s shape. `this with { Status = JobStatus.Queued, Error = null }`, guarded by `Status is JobStatus.Failed`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var failed = Job.Queue("j1", "a@b.c", "hi", T0).Start().Fail("smtp down");
var again = failed.Requeue();
Check.Equal(JobStatus.Queued, again.Status, "a failed job can go back in the queue");
Check.Equal(null, again.Error, "the old error is cleared");
Check.Equal(1, again.Attempts, "but the attempt count is NOT — that is how retries end");
Check.Throws<InvalidOperationException>(() => again.Requeue(), "a Queued job is already queued");
Check.Throws<InvalidOperationException>(() => Job.Queue("j2", "a@b.c", "hi", T0).Start().Succeed().Requeue(),
    "and a succeeded job is never retried");
```

### ⭐⭐ 2. Try again, but not forever (core)

Add `JobRunner.RunWithRetriesAsync(JobStore store, WorkItem item, Func<WorkItem, CancellationToken, Task> work, int maxAttempts, CancellationToken ct)`. It runs the job; on failure it requeues and runs again, up to `maxAttempts` times; it stops the moment the work succeeds. The final job state is what it returns.

Practices: composing on top of `RunAsync` instead of duplicating it, and the retry loop every queue eventually grows.

Hint: a `for` loop over the attempts calling `RunAsync`. `if (result is null or { Status: JobStatus.Succeeded }) return result;` covers both exits (a missing job and a success). Requeue only when another attempt is coming — leaving the last failure as `Failed` is the whole point.

Check it offline: add to `Tests.cs` — all should pass (inside the async half):
```csharp
var store = new JobStore(() => T0);
var flaky = store.Add("ada@example.com", "hi");
int calls = 0;
var ok = await JobRunner.RunWithRetriesAsync(store, new WorkItem(flaky.Id, flaky.To, flaky.Subject),
    (i, ct) => { calls++; return calls < 3 ? throw new InvalidOperationException("smtp down") : Task.CompletedTask; },
    maxAttempts: 5, CancellationToken.None);
Check.Equal(JobStatus.Succeeded, ok!.Status, "the third attempt worked");
Check.Equal(3, ok.Attempts, "and the job counted all three");

var doomed = store.Add("nope", "hi");
var dead = await JobRunner.RunWithRetriesAsync(store, new WorkItem(doomed.Id, doomed.To, doomed.Subject),
    (i, ct) => throw new InvalidOperationException("always broken"), maxAttempts: 3, CancellationToken.None);
Check.Equal(JobStatus.Failed, dead!.Status, "hopeless work ends Failed, not requeued forever");
Check.Equal(3, dead.Attempts, "after exactly maxAttempts tries");
Check.Equal("always broken", dead.Error, "with the last error kept");
```

### ⭐⭐ 3. Don't send it twice (core)

Clients retry. If a POST is retried because the response was lost, the customer should not get two emails. Add an idempotency key: `JobStore.AddOrGet(string key, string to, string subject)` returning `(Job Job, bool Created)` — the first call creates the job and remembers the key, later calls with the same key return the *same* job and `Created: false`.

Practices: the idea that makes at-least-once queues survivable, and returning a tuple so the caller can tell "made one" from "found one" (202 vs 200).

Hint: a second `ConcurrentDictionary<string, string>` mapping key → job id. `GetOrAdd` is not enough on its own, because you must not create a job before you know the key is new — look the key up first, then `Add`, then map it.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var store = new JobStore(() => T0);
var (first, created1) = store.AddOrGet("order-42", "ada@example.com", "receipt");
var (second, created2) = store.AddOrGet("order-42", "ada@example.com", "receipt");
Check.True(created1, "the first call created a job");
Check.Equal(false, created2, "the second call did not");
Check.Equal(first.Id, second.Id, "it returned the SAME job — one email, not two");
Check.Equal(1, store.Count, "and the store holds one job, not two");
var (other, created3) = store.AddOrGet("order-43", "ada@example.com", "receipt");
Check.True(created3, "a different key is a different job");
Check.Equal(2, store.Count, "so now there are two");
```

### ⭐⭐⭐ 4. Work that takes too long (challenge)

A hung SMTP call would park the worker forever, and one stuck item stops the whole queue. Add `JobRunner.WithTimeout(Func<WorkItem, CancellationToken, Task> work, TimeSpan timeout)` — a **decorator** returning a new work function that cancels the inner work after `timeout` and throws `TimeoutException`, so `RunAsync` records it as an ordinary failure.

Practices: `CancellationTokenSource.CreateLinkedTokenSource` + `CancelAfter`, an exception filter that tells "we timed out" apart from "the app is shutting down", and wrapping behaviour instead of editing it.

Hint: link the caller's token so shutdown still cancels, `timer.CancelAfter(timeout)`, then `catch (OperationCanceledException) when (timer.IsCancellationRequested && !ct.IsCancellationRequested) throw new TimeoutException(...)`. The `when` filter is what stops a shutdown being reported as a timeout.

Check it offline: add to `Tests.cs` — all should pass (inside the async half):
```csharp
var store = new JobStore(() => T0);
var slowJob = store.Add("ada@example.com", "hi");
var sw = System.Diagnostics.Stopwatch.StartNew();
var timedOut = await JobRunner.RunAsync(store, new WorkItem(slowJob.Id, slowJob.To, slowJob.Subject),
    JobRunner.WithTimeout((i, ct) => Task.Delay(TimeSpan.FromSeconds(30), ct), TimeSpan.FromMilliseconds(50)),
    CancellationToken.None);
sw.Stop();
Check.Equal(JobStatus.Failed, timedOut!.Status, "a job that hangs is a job that failed");
Check.Equal("work did not finish within 50ms", timedOut.Error, "...with a reason a human can act on");
Check.True(sw.ElapsedMilliseconds < 5000, "and it gave up after 50ms, not 30 seconds");

var quickJob = store.Add("grace@example.com", "hi");
var fine = await JobRunner.RunAsync(store, new WorkItem(quickJob.Id, quickJob.To, quickJob.Subject),
    JobRunner.WithTimeout((i, ct) => Task.CompletedTask, TimeSpan.FromSeconds(5)), CancellationToken.None);
Check.Equal(JobStatus.Succeeded, fine!.Status, "fast work is untouched by the wrapper");
```

### ⭐⭐⭐ 5. Leave nothing unaccounted for (challenge)

On shutdown, whatever is still in the channel is never going to run. Add `JobRunner.DrainAsync(WorkQueue queue, JobStore store, string reason)`: complete the writer so nothing new arrives, read everything that is left, and `Reject` each job with the reason — returning how many were rejected. Then call it from `EmailWorker.StopAsync`.

Practices: `ReadAllAsync` *ending* when a channel is completed (the property that makes clean shutdown possible), and the discipline that every job reaches a final state.

Hint: `queue.CompleteAdding();` then `await foreach (var item in queue.ReadAllAsync(CancellationToken.None))` — with the writer completed, the loop drains what is left and finishes on its own instead of waiting forever. `store.Update(item.JobId, j => j.Reject(reason))` returns null for jobs that are not there, so count only the non-nulls.

Check it offline: add to `Tests.cs` — all should pass (inside the async half):
```csharp
var store = new JobStore(() => T0);
var queue = new WorkQueue(capacity: 10);
var jobs = new[] { store.Add("a@b.c", "1"), store.Add("c@d.e", "2"), store.Add("e@f.g", "3") };
foreach (var j in jobs) queue.TryEnqueue(new WorkItem(j.Id, j.To, j.Subject));
int rejected = await JobRunner.DrainAsync(queue, store, "shutting down");
Check.Equal(3, rejected, "every waiting job was accounted for");
Check.Equal(0, queue.Depth, "and the queue is empty");
Check.Equal(3, store.CountByStatus(JobStatus.Failed), "they are all Failed...");
store.TryGet(jobs[0].Id, out var one);
Check.Equal("shutting down", one!.Error, "...with the reason recorded");
Check.Equal(0, one.Attempts, "and 0 attempts — they never ran, which is different from breaking");
```

## Solutions

### 1. Put a failure back in the pile

```csharp
/// Failed -> Queued. The error is cleared (it is about to be tried again) but
/// Attempts is kept — a retry loop with no memory is an infinite loop.
public Job Requeue() => Status is JobStatus.Failed
    ? this with { Status = JobStatus.Queued, Error = null }
    : throw new InvalidOperationException($"a {Status} job cannot be requeued");
```

WHY: the guard is the interesting half. Without it, requeuing a `Succeeded` job would silently send a second email, and requeuing a `Running` one would let two workers process the same item — bugs that appear under load, at night, once a month. Keeping `Attempts` across the transition is what makes exercise 2 terminate: the counter lives on the job, so it survives the trip through the queue, which a local variable in a retry loop would not.

### 2. Try again, but not forever

```csharp
/// Retry on top of RunAsync, never inside it: the single-attempt logic stays
/// one thing, and the policy (how many, when to stop) stays another.
public static async Task<Job?> RunWithRetriesAsync(
    JobStore store,
    WorkItem item,
    Func<WorkItem, CancellationToken, Task> work,
    int maxAttempts,
    CancellationToken cancellationToken)
{
    Job? result = null;
    for (int attempt = 1; attempt <= maxAttempts; attempt++)
    {
        result = await RunAsync(store, item, work, cancellationToken);

        // Gone, or done: either way there is nothing left to try.
        if (result is null or { Status: JobStatus.Succeeded }) return result;

        // Only put it back if another attempt is actually coming — otherwise
        // the job must be left Failed, which is the honest final state.
        if (attempt < maxAttempts) store.Update(item.JobId, j => j.Requeue());
    }
    return result;
}
```

WHY: building the loop *around* `RunAsync` rather than inside it keeps two decisions separate — "how do I run one attempt and record it" versus "how many attempts are worth making" — so the retry policy can change without touching the code that writes to the store. `result is null or { Status: JobStatus.Succeeded }` is cs#31's patterns doing real work: one line covering "the job vanished" and "we are done". The missing `Requeue` on the last attempt is deliberate and is the kind of off-by-one that would otherwise leave every hopeless job sitting in `Queued` forever, looking like a backlog. Real systems add one thing this does not: a *delay* between attempts (exponential backoff), because retrying a broken mail server three times in three milliseconds is not a retry, it is a stampede.

### 3. Don't send it twice

```csharp
private readonly ConcurrentDictionary<string, string> byKey = new();   // key -> job id

/// Idempotency: the same key always maps to the same job. Created: false
/// tells the endpoint to answer 200 (here it is again) rather than 202
/// (I have taken a new one).
public (Job Job, bool Created) AddOrGet(string key, string to, string subject)
{
    if (byKey.TryGetValue(key, out var existingId) && TryGet(existingId, out var existing))
        return (existing, false);

    var job = Add(to, subject);
    var winnerId = byKey.GetOrAdd(key, job.Id);        // two threads, one winner

    // We lost the race: somebody else's job owns this key, so ours is spare.
    if (winnerId != job.Id && TryGet(winnerId, out var winner))
        return (winner, false);

    return (job, true);
}
```

WHY: `GetOrAdd` is doing the concurrency work — if two identical POSTs arrive at once, both may create a job, but only one can own the key, and the loser hands back the winner's job. (The loser's job is left orphaned in the store, which is a fair trade for keeping the method lock-free; a production version would remove it.) Idempotency keys are how Stripe, and every payment API since, let clients retry safely, and they are the standard partner of an at-least-once queue: the *sender* may repeat, so the *receiver* must be able to recognise a repeat. Notice this is pure domain logic — it needs no HTTP to exist, and no HTTP to test.

### 4. Work that takes too long

```csharp
/// A decorator: same shape in, same shape out, one behaviour added. The inner
/// work is cancelled after `timeout`, and the result is an ordinary exception
/// that RunAsync records like any other failure.
public static Func<WorkItem, CancellationToken, Task> WithTimeout(
    Func<WorkItem, CancellationToken, Task> work, TimeSpan timeout) =>
    async (item, cancellationToken) =>
    {
        // Linked, so BOTH deadlines apply: our timeout and the app's shutdown.
        using var timer = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timer.CancelAfter(timeout);

        try
        {
            await work(item, timer.Token);
        }
        catch (OperationCanceledException)
            when (timer.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
        {
            // Ours fired, not the app's: this is a timeout, not a shutdown.
            throw new TimeoutException($"work did not finish within {timeout.TotalMilliseconds:0}ms");
        }
    };
```

WHY: three ideas in twelve lines. **Decorating** rather than editing means `RunAsync`, the worker and the tests all stay as they were — `WithTimeout(sender.SendAsync, TimeSpan.FromSeconds(10))` is the only change at the wiring site. **Linked tokens** are how .NET composes deadlines: the inner work is cancelled if *either* the timeout elapses or the app is stopping, and you do not have to choose which. And the **exception filter** (`when`) is what makes the failure message honest — without it, a Ctrl+C during a send would be recorded as "timed out", which is a lie that would send somebody hunting a performance problem that does not exist. Filters run before the stack unwinds and can inspect any state, which is exactly what this needs.

### 5. Leave nothing unaccounted for

```csharp
/// Shutdown, honestly: nothing new gets in, everything already waiting is
/// marked Failed with a reason, and the count is returned so the log can say
/// what happened. Returns when the queue is empty.
public static async Task<int> DrainAsync(WorkQueue queue, JobStore store, string reason)
{
    queue.CompleteAdding();          // ⬅ without this, the loop below never ends

    int rejected = 0;
    await foreach (var item in queue.ReadAllAsync(CancellationToken.None))
        if (store.Update(item.JobId, job => job.Reject(reason)) is not null)
            rejected++;

    return rejected;
}

// EmailWorker.StopAsync, after the base call:
int abandoned = await JobRunner.DrainAsync(queue, store, "shutting down");
if (abandoned > 0) Console.WriteLine($"[worker] recorded {abandoned} job(s) as not-run");
```

WHY: `CompleteAdding()` is load-bearing and the reason this exercise is worth doing. `ReadAllAsync` on an open channel waits forever for the next item — it is *supposed* to — so a drain loop over a channel nobody closed hangs on shutdown, which is the exact bug this project exists to avoid. Completing the writer first turns "wait for more" into "there is no more", and the loop ends by itself. `Reject` (rather than `Fail`) is the right transition because these jobs never ran: `Attempts` stays 0, so afterwards you can tell "we shut down on it" from "it broke", which is the difference between a job you can safely re-run and one you should look at first. The general principle is worth keeping: every job should end in a final state, and "the process exited" is not one of them.
