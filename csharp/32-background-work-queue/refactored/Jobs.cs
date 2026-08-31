// The domain: what a job IS, and which moves are legal. No HTTP, no channel,
// no clock — which is why every rule below is pinned by a one-line test.

public enum JobStatus { Queued, Running, Succeeded, Failed }

/// One unit of background work and everything anyone will ever want to know
/// about it. A record, so every transition RETURNS A NEW STATE instead of
/// mutating one that another thread may be reading (cs#07, cs#02).
public sealed record Job(
    string Id,
    string To,
    string Subject,
    JobStatus Status,
    string? Error,
    int Attempts,
    DateTimeOffset QueuedAt)
{
    public static Job Queue(string id, string to, string subject, DateTimeOffset queuedAt) =>
        new(id, to, subject, JobStatus.Queued, Error: null, Attempts: 0, queuedAt);

    /// Queued -> Running. The guard is the point: a job that is already running
    /// (or finished) must never be started again, and saying so HERE means no
    /// caller can forget. The original had no states at all, so it had no rules
    /// to break — and no way to answer "what happened?".
    public Job Start() => Status is JobStatus.Queued
        ? this with { Status = JobStatus.Running, Attempts = Attempts + 1 }
        : throw new InvalidOperationException($"a {Status} job cannot be started");

    /// Running -> Succeeded.
    public Job Succeed() => Status is JobStatus.Running
        ? this with { Status = JobStatus.Succeeded, Error = null }
        : throw new InvalidOperationException($"a {Status} job cannot succeed");

    /// Running -> Failed, WITH a reason. A failure with no reason is how the
    /// original's silence gets re-invented, so the type refuses to store one.
    public Job Fail(string error) => (Status, string.IsNullOrWhiteSpace(error)) switch
    {
        (JobStatus.Running, false) => this with { Status = JobStatus.Failed, Error = error },
        (JobStatus.Running, true) => throw new ArgumentException("a failure needs a reason", nameof(error)),
        _ => throw new InvalidOperationException($"a {Status} job cannot fail"),
    };

    /// Queued -> Failed, without ever running: the queue was full, the address
    /// was refused, the host is shutting down. Attempts stays 0, which is how
    /// you later tell "tried and broke" from "never got a turn".
    public Job Reject(string reason) => Status is JobStatus.Queued
        ? this with { Status = JobStatus.Failed, Error = reason }
        : throw new InvalidOperationException($"a {Status} job cannot be rejected");

    public bool IsFinished => Status is JobStatus.Succeeded or JobStatus.Failed;
}

/// What the endpoint accepts, kept separate from what the system stores —
/// a client may not invent its own job id or status (cs#17's lesson).
public sealed record EmailRequest(string? To, string? Subject);

/// The message that travels through the channel. Deliberately small: an id and
/// the facts the worker needs. Passing whole objects through a queue is how
/// queues start holding memory they cannot let go of.
public sealed record WorkItem(string JobId, string To, string Subject);

public static class EmailAddress
{
    /// Not a validator — a smoke test. Real address validation is a swamp;
    /// what matters here is that the rule is a pure function with tests, not a
    /// `req.To.Contains('@')` buried in a lambda nobody can reach.
    public static bool LooksValid(string? address)
    {
        if (string.IsNullOrWhiteSpace(address)) return false;
        int at = address.IndexOf('@');
        return at > 0                            // something before the @
            && at == address.LastIndexOf('@')    // exactly one @
            && at < address.Length - 1           // something after it
            && !address.Contains(' ');           // and no spaces anywhere
    }
}
