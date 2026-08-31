// The consumer side: one long-lived worker that pulls items off the channel
// and records what happened to each of them.

/// The bit worth testing: take one work item, walk the job through its states,
/// and make sure a thrown exception ends up WRITTEN DOWN instead of lost.
/// It is a plain static method taking the work as a delegate, so a test can
/// hand it a function that throws and check the resulting job — no host, no
/// HTTP, no waiting.
public static class JobRunner
{
    public static async Task<Job?> RunAsync(
        JobStore store,
        WorkItem item,
        Func<WorkItem, CancellationToken, Task> work,
        CancellationToken cancellationToken)
    {
        var running = store.Update(item.JobId, job => job.Start());
        if (running is null) return null;          // the job is not in the store

        try
        {
            await work(item, cancellationToken);
            return store.Update(item.JobId, job => job.Succeed());
        }
        catch (Exception ex)
        {
            // THE LINE THE ORIGINAL DID NOT HAVE. Catching everything is
            // usually a smell; in a worker loop it is the job description —
            // one poisoned item must not take the queue down with it.
            return store.Update(item.JobId, job => job.Fail(ex.Message));
        }
    }
}

/// Sending, behind an interface so the worker can be pointed at a fake in
/// tests and at SMTP in production (cs#18's dependency injection).
public interface IEmailSender
{
    Task SendAsync(WorkItem item, CancellationToken cancellationToken);
}

/// The stand-in for a mail server: slow, and picky about addresses.
public sealed class FakeSmtpSender : IEmailSender
{
    public async Task SendAsync(WorkItem item, CancellationToken cancellationToken)
    {
        await Task.Delay(500, cancellationToken);          // pretend SMTP is slow

        if (!EmailAddress.LooksValid(item.To))
            throw new InvalidOperationException($"'{item.To}' is not an email address");

        Console.WriteLine($"[worker] sent '{item.Subject}' to {item.To} (job {item.JobId})");
    }
}

/// `BackgroundService` is the base class for a hosted service: the host starts
/// ExecuteAsync when the app starts and waits for it to finish when the app
/// stops. Registered with AddHostedService — no package needed, it lives in
/// the shared framework next to ASP.NET Core itself.
public sealed class EmailWorker : BackgroundService
{
    private readonly WorkQueue queue;
    private readonly JobStore store;
    private readonly IEmailSender sender;

    public EmailWorker(WorkQueue queue, JobStore store, IEmailSender sender)
        => (this.queue, this.store, this.sender) = (queue, store, sender);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        Console.WriteLine("[worker] started, waiting for work");

        try
        {
            // One item at a time, forever. `await foreach` parks the worker with
            // no thread of its own while the queue is empty — this loop costs
            // nothing when there is nothing to do.
            await foreach (var item in queue.ReadAllAsync(stoppingToken))
            {
                var finished = await JobRunner.RunAsync(store, item, sender.SendAsync, stoppingToken);
                if (finished is { Status: JobStatus.Failed })
                    Console.WriteLine($"[worker] job {finished.Id} FAILED: {finished.Error}");
            }
        }
        catch (OperationCanceledException)
        {
            // Shutdown. Note what does NOT happen here: nothing is lost in
            // silence. Anything still Queued is still in the store, visible on
            // GET /jobs, waiting to be re-queued by a restart or an operator.
            Console.WriteLine("[worker] shutdown requested, stopping");
        }

        Console.WriteLine($"[worker] stopped. {store.CountByStatus(JobStatus.Queued)} job(s) never got a turn.");
    }

    /// Called by the host when the app is stopping, BEFORE it waits for
    /// ExecuteAsync. Completing the writer means "no new work" so the loop can
    /// drain what is already queued and end by itself.
    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        queue.CompleteAdding();
        await base.StopAsync(cancellationToken);
    }
}
