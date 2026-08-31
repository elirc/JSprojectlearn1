using System.Text.Json;

// ChatRoom never touches a real WebSocket — it only knows ISocketSink.
// So the tests hand it FakeSinks: a "socket" that is just a list of what
// it received, plus switches to play dead. No network, no ports, no sleep.
public class FakeSink : ISocketSink
{
    public List<string> Received { get; } = new();
    public bool IsOpen { get; set; } = true;
    public bool ThrowOnSend { get; set; }

    public Task SendAsync(string json)
    {
        if (ThrowOnSend) throw new InvalidOperationException("socket burst into flames");
        Received.Add(json);
        return Task.CompletedTask;
    }

    // Parse everything this fake received back into typed messages.
    public List<ChatMessage> Messages() =>
        Received.Select(j => JsonSerializer.Deserialize<ChatMessage>(j, ChatMessage.JsonOptions)!).ToList();

    public ChatMessage Last() => Messages()[^1];
}

public static class Tests
{
    public static int Run() => RunAsync().GetAwaiter().GetResult();

    static async Task<int> RunAsync()
    {
        Console.WriteLine("ChatRoom");
        await JoinNormalizesNamesAndAnnounces();
        await JoinDeliversHistoryFirst();
        await SayBroadcastsToEveryone();
        await EmptyMessagesAreIgnored();
        await HistoryIsCapped();
        await ClosedSocketsArePruned();
        await ThrowingSocketsArePruned();
        await LeaveAnnouncesToTheOthers();
        await WireFormatIsCamelCaseJson();
        return Check.Summary();
    }

    static async Task JoinNormalizesNamesAndAnnounces()
    {
        var room = new ChatRoom();
        var alice = new FakeSink();
        var ticket = await room.JoinAsync("  Alice  ", alice);
        Check.Equal("Alice", ticket.User, "names are trimmed");
        Check.Equal(1, room.MemberCount, "joining adds you to the room");
        Check.Equal("join", alice.Last().Type, "everyone (including you) hears the join");
        Check.Equal("Alice", alice.Last().User, "the join names the joiner");

        var anon = await room.JoinAsync("   ", new FakeSink());
        Check.Equal("anon", anon.User, "blank names become anon");
    }

    static async Task JoinDeliversHistoryFirst()
    {
        var room = new ChatRoom();
        var alice = new FakeSink();
        await room.JoinAsync("alice", alice);
        await room.SayAsync("alice", "hello?");

        var bob = new FakeSink();
        var ticket = await room.JoinAsync("bob", bob);

        Check.Equal(2, ticket.History.Count, "the ticket reports what catch-up was sent");
        var got = bob.Messages();
        Check.Equal("join,chat,join", string.Join(",", got.Select(m => m.Type)),
            "bob gets history in order, then his own join announcement");
        Check.Equal("hello?", got[1].Text, "history includes the words, not just the fact");
    }

    static async Task SayBroadcastsToEveryone()
    {
        var room = new ChatRoom();
        var alice = new FakeSink();
        var bob = new FakeSink();
        await room.JoinAsync("alice", alice);
        await room.JoinAsync("bob", bob);

        await room.SayAsync("alice", "  hi bob!  ");

        Check.Equal("hi bob!", alice.Last().Text, "the sender hears their own message (trimmed)");
        Check.Equal("hi bob!", bob.Last().Text, "the other member hears it too");
        Check.Equal("alice", bob.Last().User, "the message carries who said it");
        Check.Equal("chat", bob.Last().Type, "and what kind it is");
    }

    static async Task EmptyMessagesAreIgnored()
    {
        var room = new ChatRoom();
        var alice = new FakeSink();
        await room.JoinAsync("alice", alice);
        var before = alice.Received.Count;
        await room.SayAsync("alice", "");
        await room.SayAsync("alice", "   ");
        await room.SayAsync("alice", null);
        Check.Equal(before, alice.Received.Count, "blank chat messages go nowhere");
        Check.Equal(1, room.History.Count, "and never enter history (only the join is there)");
    }

    static async Task HistoryIsCapped()
    {
        var room = new ChatRoom(historyLimit: 3);
        for (var i = 1; i <= 5; i++)
            await room.SayAsync("bot", $"m{i}");
        var history = room.History;
        Check.Equal(3, history.Count, "history never grows past its cap");
        Check.Equal("m3,m4,m5", string.Join(",", history.Select(m => m.Text)),
            "the OLDEST messages are the ones dropped");
    }

    static async Task ClosedSocketsArePruned()
    {
        var room = new ChatRoom();
        var alice = new FakeSink();
        var bob = new FakeSink();
        await room.JoinAsync("alice", alice);
        await room.JoinAsync("bob", bob);
        Check.Equal(2, room.MemberCount, "two members before the disconnect");

        bob.IsOpen = false;                     // bob's laptop lid snaps shut
        var bobHeard = bob.Received.Count;
        await room.SayAsync("alice", "you still there?");

        Check.Equal(1, room.MemberCount, "the dead socket was pruned by the broadcast");
        Check.Equal(bobHeard, bob.Received.Count, "nothing was sent to the corpse");
        Check.Equal("you still there?", alice.Last().Text, "the living still get the message");
    }

    static async Task ThrowingSocketsArePruned()
    {
        var room = new ChatRoom();
        var alice = new FakeSink();
        var bob = new FakeSink();
        await room.JoinAsync("alice", alice);
        await room.JoinAsync("bob", bob);

        bob.ThrowOnSend = true;                 // dies mid-send instead of quietly
        await room.SayAsync("alice", "anyone?");

        Check.Equal(1, room.MemberCount, "a socket that throws on send is pruned too");
        Check.Equal("anyone?", alice.Last().Text, "one bad socket can't block the others");
    }

    static async Task LeaveAnnouncesToTheOthers()
    {
        var room = new ChatRoom();
        var alice = new FakeSink();
        var bob = new FakeSink();
        await room.JoinAsync("alice", alice);
        await room.JoinAsync("bob", bob);

        var aliceHeard = alice.Received.Count;
        await room.LeaveAsync(alice);

        Check.Equal(1, room.MemberCount, "leaving removes you from the room");
        Check.Equal("leave", bob.Last().Type, "the others hear you left");
        Check.Equal("alice", bob.Last().User, "by name");
        Check.Equal(aliceHeard, alice.Received.Count, "you don't hear your own goodbye");

        await room.LeaveAsync(new FakeSink());  // never joined
        Check.Equal(1, room.MemberCount, "leaving with an unknown socket changes nothing");
    }

    static async Task WireFormatIsCamelCaseJson()
    {
        var room = new ChatRoom();
        var alice = new FakeSink();
        await room.JoinAsync("alice", alice);
        await room.SayAsync("alice", "wire check");
        var raw = alice.Received[^1];
        Check.True(raw.Contains("\"type\":\"chat\""), "JSON uses a lowercase `type` field");
        Check.True(raw.Contains("\"user\":\"alice\""), "and a lowercase `user` field");
        Check.True(raw.Contains("\"text\":\"wire check\""), "and a lowercase `text` field");
        Check.True(raw.Contains("\"at\":"), "with a timestamp the browser can parse");
    }
}
