using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;

// Where job states live. In-memory on purpose: swapping this for a table or a
// Redis hash is a change of one class (cs#21's repository idea), and none of
// the rules in Jobs.cs would notice.
//
// It is a SINGLETON shared by the web endpoints and the background worker, so
// every method has to be safe to call from several threads at once —
// ConcurrentDictionary plus immutable records does that without a single lock.
public sealed class JobStore
{
    private readonly ConcurrentDictionary<string, Job> jobs = new();
    private readonly Func<DateTimeOffset> clock;

    public JobStore(Func<DateTimeOffset>? clock = null)
        => this.clock = clock ?? (() => DateTimeOffset.UtcNow);   // injected time, so tests are instant

    public int Count => jobs.Count;

    /// Create a Queued job and remember it. The id is ours to mint: handing the
    /// caller an id is the entire difference between this and the original's
    /// `{"queued": true}`.
    public Job Add(string to, string subject, string? id = null)
    {
        var job = Job.Queue(id ?? NewId(), to, subject, clock());
        if (!jobs.TryAdd(job.Id, job))
            throw new InvalidOperationException($"job '{job.Id}' already exists");
        return job;
    }

    public bool TryGet(string id, [MaybeNullWhen(false)] out Job job) => jobs.TryGetValue(id, out job);

    /// Apply a transition from Jobs.cs to the stored state.
    ///
    /// The loop is optimistic concurrency: read the current state, compute the
    /// next one, and swap it in ONLY IF nobody else changed it meanwhile
    /// (TryUpdate compares against `current`). If they did, try again with what
    /// is there now. Returns null when the id is unknown.
    public Job? Update(string id, Func<Job, Job> transition)
    {
        while (jobs.TryGetValue(id, out var current))
        {
            var next = transition(current);
            if (jobs.TryUpdate(id, next, current)) return next;
        }
        return null;
    }

    /// A snapshot, newest first. Copying is deliberate: callers get a list that
    /// cannot change under them while they are iterating it.
    public IReadOnlyList<Job> All() =>
        jobs.Values.OrderByDescending(j => j.QueuedAt).ThenBy(j => j.Id, StringComparer.Ordinal).ToList();

    public int CountByStatus(JobStatus status) => jobs.Values.Count(j => j.Status == status);

    /// 12 hex characters: short enough to paste into a curl, long enough that
    /// two of them will not collide before the heat death of the sprint.
    public static string NewId() => Guid.NewGuid().ToString("N")[..12];
}
