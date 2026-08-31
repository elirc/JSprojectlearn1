// Tests.cs — the whole background system, tested without starting a server,
// a thread, or a mail client. That is the payoff of pulling the domain (job
// states, the store, the queue, the run-one-item loop) out of the plumbing:
// the interesting behaviour is reachable from an ordinary method call.
public static class Tests
{
    private static readonly DateTimeOffset T0 = new(2026, 1, 1, 9, 0, 0, TimeSpan.Zero);

    public static int Run()
    {
        Console.WriteLine("the job state machine");
        var queued = Job.Queue("j1", "ada@example.com", "hello", T0);
        Check.Equal(JobStatus.Queued, queued.Status, "a new job starts Queued");
        Check.Equal(0, queued.Attempts, "and has not been attempted");
        Check.Equal(false, queued.IsFinished, "Queued is not a finished state");

        var running = queued.Start();
        Check.Equal(JobStatus.Running, running.Status, "Queued -> Running");
        Check.Equal(1, running.Attempts, "starting counts as an attempt");
        Check.Equal(JobStatus.Queued, queued.Status, "...and the old value is untouched — transitions RETURN a new job");

        var done = running.Succeed();
        Check.Equal(JobStatus.Succeeded, done.Status, "Running -> Succeeded");
        Check.Equal(null, done.Error, "a success carries no error");
        Check.True(done.IsFinished, "Succeeded is a finished state");

        var failed = running.Fail("smtp said no");
        Check.Equal(JobStatus.Failed, failed.Status, "Running -> Failed");
        Check.Equal("smtp said no", failed.Error, "and the reason is kept — the original's vanished");
        Check.True(failed.IsFinished, "Failed is a finished state too");

        var rejected = queued.Reject("queue full");
        Check.Equal(JobStatus.Failed, rejected.Status, "Queued -> Failed without running (rejected)");
        Check.Equal(0, rejected.Attempts, "a rejected job was never attempted — that is how you tell them apart");

        Console.WriteLine("...and the moves it refuses");
        Check.Throws<InvalidOperationException>(() => running.Start(), "a Running job cannot start again");
        Check.Throws<InvalidOperationException>(() => done.Start(), "a finished job cannot be restarted");
        Check.Throws<InvalidOperationException>(() => queued.Succeed(), "a Queued job cannot succeed — it never ran");
        Check.Throws<InvalidOperationException>(() => queued.Fail("nope"), "a Queued job cannot fail — use Reject");
        Check.Throws<InvalidOperationException>(() => done.Fail("too late"), "a Succeeded job cannot fail afterwards");
        Check.Throws<InvalidOperationException>(() => running.Reject("nope"), "a Running job cannot be rejected");
        Check.Throws<ArgumentException>(() => running.Fail("   "), "a failure with no reason is refused");

        Console.WriteLine("the store");
        var now = T0;
        var store = new JobStore(() => now);
        var a = store.Add("ada@example.com", "hi");
        Check.Equal(JobStatus.Queued, a.Status, "Add stores a Queued job");
        Check.Equal(12, a.Id.Length, "and mints a short id — the thing the caller gets back");
        Check.Equal(T0, a.QueuedAt, "the clock is injected, so this is not a guess");
        Check.True(store.TryGet(a.Id, out var found) && found.To == "ada@example.com", "TryGet finds it");
        Check.Equal(false, store.TryGet("nope", out _), "TryGet reports a miss instead of throwing");
        Check.Throws<InvalidOperationException>(() => store.Add("x@y.z", "dup", a.Id), "two jobs cannot share an id");

        var started = store.Update(a.Id, j => j.Start());
        Check.Equal(JobStatus.Running, started!.Status, "Update applies a transition");
        Check.True(store.TryGet(a.Id, out var reread) && reread.Status == JobStatus.Running, "...and the store kept it");
        Check.Equal(null, store.Update("nope", j => j.Start()), "updating an unknown id returns null, not an exception");
        Check.Equal(1, store.Count, "the store holds one job");

        now = T0.AddMinutes(1);
        var b = store.Add("grace@example.com", "later");
        Check.Equal(2, store.Count, "two jobs now");
        Check.Equal(b.Id, store.All()[0].Id, "All() is newest first");
        Check.Equal(1, store.CountByStatus(JobStatus.Running), "CountByStatus sees the running one");
        Check.Equal(1, store.CountByStatus(JobStatus.Queued), "...and the queued one");
        Check.Equal(0, store.CountByStatus(JobStatus.Failed), "and nothing has failed");

        Console.WriteLine("address rules");
        Check.True(EmailAddress.LooksValid("ada@example.com"), "an ordinary address passes");
        Check.Equal(false, EmailAddress.LooksValid("not-an-email"), "no @, no pass");
        Check.Equal(false, EmailAddress.LooksValid("@example.com"), "nothing before the @");
        Check.Equal(false, EmailAddress.LooksValid("ada@"), "nothing after the @");
        Check.Equal(false, EmailAddress.LooksValid("a@b@c.com"), "two @s is not an address");
        Check.Equal(false, EmailAddress.LooksValid("ada lovelace@example.com"), "no spaces");
        Check.Equal(false, EmailAddress.LooksValid(""), "empty is not an address");
        Check.Equal(false, EmailAddress.LooksValid(null), "and neither is null");

        RunAsyncChecks().GetAwaiter().GetResult();   // Check has no async flavour; block once, here

        return Check.Summary();
    }

    private static async Task RunAsyncChecks()
    {
        Console.WriteLine("the channel, exercised through its own reader and writer");
        var queue = new WorkQueue(capacity: 3);
        Check.Equal(0, queue.Depth, "a new queue is empty");
        Check.True(queue.TryEnqueue(new WorkItem("j1", "a@b.c", "one")), "enqueue succeeds while there is room");
        queue.TryEnqueue(new WorkItem("j2", "a@b.c", "two"));
        queue.TryEnqueue(new WorkItem("j3", "a@b.c", "three"));
        Check.Equal(3, queue.Depth, "the queue reports its depth");
        Check.Equal(false, queue.TryEnqueue(new WorkItem("j4", "a@b.c", "four")),
            "a FULL bounded queue says no — backpressure instead of an unbounded pile");

        var first = await queue.Reader.ReadAsync();
        Check.Equal("j1", first.JobId, "items come out in the order they went in (FIFO)");
        Check.Equal("one", first.Subject, "...with their payload intact — a channel round trip");
        Check.Equal(2, queue.Depth, "and the queue shrank");
        Check.True(queue.TryEnqueue(new WorkItem("j4", "a@b.c", "four")), "which makes room for the item that was refused");

        queue.CompleteAdding();
        Check.Equal(false, queue.TryEnqueue(new WorkItem("j5", "a@b.c", "five")), "a completed queue accepts nothing new");
        var drained = new List<string>();
        await foreach (var item in queue.ReadAllAsync(CancellationToken.None))
            drained.Add(item.JobId);
        Check.Equal("j2,j3,j4", string.Join(",", drained),
            "ReadAllAsync drains what is left and then ENDS — that is what makes a clean shutdown possible");

        Console.WriteLine("running one item: what the original could not do");
        var now = T0;
        var store = new JobStore(() => now);
        var good = store.Add("ada@example.com", "hi");
        int workRuns = 0;
        var afterSuccess = await JobRunner.RunAsync(store, new WorkItem(good.Id, good.To, good.Subject),
            (item, ct) => { workRuns++; return Task.CompletedTask; }, CancellationToken.None);
        Check.Equal(JobStatus.Succeeded, afterSuccess!.Status, "work that finishes marks the job Succeeded");
        Check.Equal(1, afterSuccess.Attempts, "one attempt");
        Check.Equal(1, workRuns, "the work ran exactly once");
        Check.True(store.TryGet(good.Id, out var storedGood) && storedGood.Status == JobStatus.Succeeded,
            "and the store — the thing GET /jobs/{id} reads — agrees");

        var bad = store.Add("not-an-email", "oops");
        var afterFailure = await JobRunner.RunAsync(store, new WorkItem(bad.Id, bad.To, bad.Subject),
            (item, ct) => throw new InvalidOperationException($"'{item.To}' is not an email address"),
            CancellationToken.None);
        Check.Equal(JobStatus.Failed, afterFailure!.Status, "work that throws marks the job Failed");
        Check.Equal("'not-an-email' is not an email address", afterFailure.Error,
            "and the exception message is WRITTEN DOWN — in the original it was swallowed whole");
        Check.True(store.TryGet(bad.Id, out var storedBad) && storedBad.Error is not null,
            "the failure survives in the store, ready to be served or retried");
        Check.Equal(1, store.CountByStatus(JobStatus.Failed), "one failure on the books");

        var ghost = await JobRunner.RunAsync(store, new WorkItem("missing", "a@b.c", "x"),
            (item, ct) => Task.CompletedTask, CancellationToken.None);
        Check.Equal(null, ghost, "an item whose job is not in the store is skipped, not crashed on");

        Console.WriteLine("the real sender, without a mail server");
        var sender = new FakeSmtpSender();
        var senderStore = new JobStore(() => now);
        var real = senderStore.Add("grace@example.com", "hello");
        var sent = await JobRunner.RunAsync(senderStore, new WorkItem(real.Id, real.To, real.Subject),
            sender.SendAsync, CancellationToken.None);
        Check.Equal(JobStatus.Succeeded, sent!.Status, "a good address goes through the real send path");
        var refused = senderStore.Add("nope", "hello");
        var refusedResult = await JobRunner.RunAsync(senderStore, new WorkItem(refused.Id, refused.To, refused.Subject),
            sender.SendAsync, CancellationToken.None);
        Check.Equal(JobStatus.Failed, refusedResult!.Status, "a bad one fails...");
        Check.Equal("'nope' is not an email address", refusedResult.Error, "...loudly, and on the record");
    }
}
