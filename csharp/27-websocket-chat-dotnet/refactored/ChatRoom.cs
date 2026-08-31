// All the shared, mutable chat state lives HERE, guarded by one lock.
// The rules:
//   * touch `members` or `history` ONLY while holding the lock
//   * never await while holding the lock (grab a snapshot, then send)
//   * a socket that is closed or that throws on send is dead — prune it

public sealed record JoinTicket(string User, IReadOnlyList<ChatMessage> History);

public sealed class ChatRoom
{
    private readonly object gate = new();
    private readonly List<(string Name, ISocketSink Sink)> members = new();
    private readonly List<ChatMessage> history = new();
    private readonly int historyLimit;

    public ChatRoom(int historyLimit = 50)
    {
        this.historyLimit = historyLimit;
    }

    public int MemberCount { get { lock (gate) return members.Count; } }

    public IReadOnlyList<ChatMessage> History { get { lock (gate) return history.ToList(); } }

    // Joining: catch the newcomer up on recent history, then announce them
    // to everyone. Returns what was sent so callers (and tests) can see it.
    public async Task<JoinTicket> JoinAsync(string? requestedName, ISocketSink sink)
    {
        var user = string.IsNullOrWhiteSpace(requestedName) ? "anon" : requestedName.Trim();

        IReadOnlyList<ChatMessage> snapshot;
        lock (gate)
        {
            snapshot = history.ToList();   // copy: safe to read outside the lock
        }

        foreach (var message in snapshot)
            await sink.SendAsync(message.ToJson());

        lock (gate)
        {
            members.Add((user, sink));
        }

        await BroadcastAsync(ChatMessage.Join(user));
        return new JoinTicket(user, snapshot);
    }

    public Task SayAsync(string user, string? text)
    {
        var trimmed = (text ?? "").Trim();
        if (trimmed.Length == 0) return Task.CompletedTask;   // empty sends are noise
        return BroadcastAsync(ChatMessage.Chat(user, trimmed));
    }

    public async Task LeaveAsync(ISocketSink sink)
    {
        string? user = null;
        lock (gate)
        {
            var index = members.FindIndex(m => ReferenceEquals(m.Sink, sink));
            if (index >= 0)
            {
                user = members[index].Name;
                members.RemoveAt(index);
            }
        }
        if (user is not null)
            await BroadcastAsync(ChatMessage.Leave(user));
    }

    public async Task BroadcastAsync(ChatMessage message)
    {
        List<(string Name, ISocketSink Sink)> recipients;
        lock (gate)
        {
            history.Add(message);
            if (history.Count > historyLimit)                       // capped, not immortal
                history.RemoveRange(0, history.Count - historyLimit);
            recipients = members.ToList();                          // snapshot, then unlock
        }

        var json = message.ToJson();   // encode ONCE, not once per client (js#67)

        List<ISocketSink>? dead = null;
        foreach (var (_, sink) in recipients)
        {
            if (!sink.IsOpen)
            {
                (dead ??= new()).Add(sink);
                continue;
            }
            try
            {
                await sink.SendAsync(json);
            }
            catch
            {
                // A send that throws means the socket died mid-flight.
                // Don't swallow-and-forget like the original: mark it.
                (dead ??= new()).Add(sink);
            }
        }

        if (dead is not null)
            lock (gate)
                members.RemoveAll(m => dead.Contains(m.Sink));      // prune the ghosts
    }
}
