using System.Threading.Channels;

// The queue itself. `Channel<T>` is .NET's built-in async producer/consumer
// pipe — part of the shared framework, no package to install. Think of it as
// an async `BlockingCollection`, or as a Go channel with C# spelling.
//
// Writers (the endpoints) and readers (the worker) never touch each other:
// one side writes, the other awaits. That is what makes the handoff safe
// without a single `lock`.
public sealed class WorkQueue
{
    private readonly Channel<WorkItem> channel;

    public WorkQueue(int capacity = 100)
    {
        if (capacity < 1) throw new ArgumentOutOfRangeException(nameof(capacity), "capacity must be at least 1");

        // BOUNDED, on purpose. An unbounded queue is the original's "pile of
        // Task.Runs" with extra steps: it absorbs a flood by eating memory
        // until the process dies. A bounded one runs out of room and SAYS so,
        // which is a decision the caller can act on (we answer 503).
        channel = Channel.CreateBounded<WorkItem>(new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait,   // TryWrite reports false rather than dropping
            SingleReader = true,                      // one worker drains it
            SingleWriter = false,                     // many requests fill it
        });

        Capacity = capacity;
    }

    public int Capacity { get; }

    /// How many items are waiting. The number you put on a dashboard, and the
    /// one the original could not have computed at all.
    public int Depth => channel.Reader.Count;

    /// Non-blocking enqueue: false means "full, try later". Backpressure is a
    /// feature — it moves the overload from your memory to the caller's retry.
    public bool TryEnqueue(WorkItem item) => channel.Writer.TryWrite(item);

    /// The worker's side: an async stream that yields items as they arrive and
    /// ENDS when the writer is completed and the queue is drained.
    public IAsyncEnumerable<WorkItem> ReadAllAsync(CancellationToken cancellationToken) =>
        channel.Reader.ReadAllAsync(cancellationToken);

    /// "No more work will be added." Called on shutdown so the worker's loop
    /// can finish the items already queued and then exit by itself, instead of
    /// being cut off mid-item.
    public void CompleteAdding() => channel.Writer.TryComplete();

    /// Direct reader access, for tests that want to pull one item without
    /// starting a host. (The worker uses ReadAllAsync; this is the same pipe.)
    public ChannelReader<WorkItem> Reader => channel.Reader;
}
