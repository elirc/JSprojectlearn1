# 🏋️ Practice: WebSocket Chat (.NET)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Who is in the room? (warm-up)

Add `public IReadOnlyList<string> Members` to `ChatRoom` — a snapshot of the current member names — and a plain `GET /api/members` endpoint returning it, so you can check the roster with curl while two browsers are connected. Follow the house rule exactly: read `members` only under the lock, and hand back a **copy**, never the live list.
*Practices:* lock discipline for reads, and why a "read-only" property still needs a snapshot when other threads are writing.
**Hint:** `{ lock (gate) return members.Select(m => m.Name).ToList(); }` — the `ToList()` happens inside the lock, so nothing can mutate the list while LINQ walks it.
**Check offline:** add these Check tests to `Tests.cs` — all should pass:
```csharp
var room = new ChatRoom();  var bobSink = new FakeSink();
await room.JoinAsync("alice", new FakeSink());
await room.JoinAsync("bob", bobSink);
Check.Equal("alice,bob", string.Join(",", room.Members), "Members lists everyone, in join order");
await room.LeaveAsync(bobSink);
Check.Equal("alice", string.Join(",", room.Members), "and forgets people who left");
```
Then, with the server running and one browser connected, `curl http://localhost:5027/api/members`.

### ⭐⭐ 2. Two people called bob (core)

Right now two tabs can join as "bob" and nobody can tell them apart — including `LeaveAsync`'s announcement. Make `JoinAsync` hand out a unique name: if the requested name is taken (case-insensitively), append `-2`, `-3`, … until it is free. Return the assigned name in the `JoinTicket` as it already does, so the socket loop keeps using the right one.
*Practices:* making a decision *inside* the lock (checking and claiming must be one atomic step), and testing a concurrency-shaped rule with fakes instead of browsers.
**Hint:** the uniqueness check and the `members.Add` must happen under the *same* lock acquisition, or two simultaneous joins can both see "bob" as free. That means computing the name before the history-sending `await`, and adding to `members` in one guarded block.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var busy = new ChatRoom();
var one = await busy.JoinAsync("bob", new FakeSink());
var two = await busy.JoinAsync("  bob  ", new FakeSink());   // trimmed, then suffixed
var three = await busy.JoinAsync("BOB", new FakeSink());
Check.Equal("bob", one.User, "the first bob keeps the name");
Check.Equal("bob-2", two.User, "the second is renamed");
Check.Equal("bob-3", three.User, "and so is the third, case-insensitively");
Check.Equal("bob,bob-2,bob-3", string.Join(",", busy.Members), "every member has a distinct name");
```

### ⭐⭐ 3. A roster on the wire (core)

Announcements say "alice joined" but a client that connects late has no way to know who is *already* here. Add a second message shape — `record RosterMessage(string Type, IReadOnlyList<string> Users, DateTimeOffset At)` with a factory that fills `Type` with `"roster"` — and broadcast one after every join and every leave. The wire now carries two record types serialized with the same options; the client switches on `type` as it already does.
*Practices:* extending a protocol without breaking it, and reusing the existing send-and-prune path instead of writing a second one.
**Hint:** `BroadcastAsync` does two jobs — append to history *and* send to everyone. A roster is ephemeral, so extract the sending half into a private `SendToAllAsync(string json)` and have both the message broadcast and the roster broadcast call it. Roster messages must **not** enter history, or a newcomer would replay stale ones.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var r = new ChatRoom();
var alice = new FakeSink();  var bobSink2 = new FakeSink();
await r.JoinAsync("alice", alice);
await r.JoinAsync("bob", bobSink2);
var rosters = alice.Received.Where(j => j.Contains("\"type\":\"roster\"")).ToList();
Check.Equal(2, rosters.Count, "alice saw a roster for her own join and for bob's");
Check.True(rosters[^1].Contains("\"users\":[\"alice\",\"bob\"]"), "the latest roster lists both");
await r.LeaveAsync(bobSink2);
Check.True(alice.Received[^1].Contains("\"users\":[\"alice\"]"), "leaving publishes a fresh roster");
Check.Equal(3, r.History.Count, "history holds join, join, leave — never a roster");
```

### ⭐⭐ 4. Show the roster in the UI (core — builds on 3)

Render the member list in `app.js`: an aside (or a header strip) listing who is online, redrawn every time a `roster` message arrives. Names are user-supplied, so build each entry with `createElement` + `textContent` — the same vaccine `show()` already uses for chat text. Add a `roster` branch to the message handler before the existing chat/system split.
*Practices:* extending the client's protocol switch, and applying the XSS habit in a new place.
**Hint:** `if (message.type === 'roster') { renderRoster(message.users); return; }` at the top of `show()`. `replaceChildren()` clears the list in one call. Note the roster arrives *unprompted* — this is push, not request/response, which is the whole reason for a WebSocket.
**Check offline:** open http://localhost:5027 in two windows. Expected: both lists show both names within a moment of the second join, with no reload and no polling in the Network tab; close one window and the other's list shrinks by itself. Then join as `<img src=x onerror=alert(1)>` — no alert, and the name shows as literal text.

### ⭐⭐⭐ 5. Slow down the flooder (challenge)

Add rate limiting: a member may send at most `maxPerWindow` messages (default 10) per 10-second window. `SayAsync` becomes `Task<bool>` — `false` means refused — and a refused message is broadcast to nobody; instead the offender alone receives a `"system"` message explaining the limit. Inject the clock as `Func<DateTimeOffset>` so the test can jump forward eleven seconds instead of sleeping.
*Practices:* per-member state guarded by the same lock, sending to **one** sink instead of broadcasting, and injected time (project 11's trick) meeting concurrency.
**Hint:** `Dictionary<string, List<DateTimeOffset>>` keyed case-insensitively; inside the lock, drop stamps older than the window, refuse if `Count >= maxPerWindow`, otherwise record and allow. Give both new constructor parameters defaults, exactly like `historyLimit = 50`, so `AddSingleton<ChatRoom>()` keeps working. Drop a member's stamps in `LeaveAsync` so the dictionary cannot grow forever.
**Check offline:** add to `Tests.cs` — all should pass, with no `Thread.Sleep`:
```csharp
var now = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
var strict = new ChatRoom(historyLimit: 50, maxPerWindow: 3, clock: () => now);
var loud = new FakeSink();  var quiet = new FakeSink();
await strict.JoinAsync("loud", loud);
await strict.JoinAsync("quiet", quiet);
for (var i = 1; i <= 3; i++)
    Check.Equal(true, await strict.SayAsync("loud", $"m{i}"), $"message {i} is within the limit");
var heard = quiet.Received.Count;
Check.Equal(false, await strict.SayAsync("loud", "m4"), "the 4th message in the window is refused");
Check.Equal(heard, quiet.Received.Count, "and nobody else heard it");
Check.True(loud.Received[^1].Contains("\"type\":\"system\""), "the flooder alone gets a warning");
now = now.AddSeconds(11);
Check.Equal(true, await strict.SayAsync("loud", "m5"), "once the window passes, talking works again");
```

## Solutions

### 1. Who is in the room?

```csharp
// ChatRoom.cs
public IReadOnlyList<string> Members { get { lock (gate) return members.Select(m => m.Name).ToList(); } }
// Program.cs — an ordinary HTTP endpoint alongside the socket route
app.MapGet("/api/members", (ChatRoom room) => Results.Ok(room.Members));
```

WHY: the `ToList()` is not politeness, it is the point — returning `members` itself (or a lazy LINQ query over it) would hand the caller a reference into state another thread is editing, and iterating it outside the lock is precisely the `InvalidOperationException: Collection was modified` the original suffered from. Copying inside the lock and returning the copy is the same snapshot-then-use pattern `BroadcastAsync` already follows, and it is why this class's rules are stated as three lines at the top of the file rather than rediscovered per method.

### 2. Two people called bob

```csharp
// ChatRoom.cs — JoinAsync's opening changes to decide the name under the lock:
IReadOnlyList<ChatMessage> snapshot;
string user;
lock (gate)
{
    snapshot = history.ToList();
    user = UniqueName(requested);     // decided under the lock; claimed by members.Add below
}
// ...the rest of JoinAsync is unchanged, using `user` where it used the raw name.
// caller must already hold the lock
private string UniqueName(string requested)
{
    if (!members.Any(m => string.Equals(m.Name, requested, StringComparison.OrdinalIgnoreCase))) return requested;
    for (int suffix = 2; ; suffix++)
    {
        var candidate = $"{requested}-{suffix}";
        if (!members.Any(m => string.Equals(m.Name, candidate, StringComparison.OrdinalIgnoreCase)))
            return candidate;
    }
}
```

WHY: this is the classic check-then-act race — between "is bob free?" and "I'm bob now", another connection can claim it, and both tabs end up as bob. Strictly, the airtight version computes *and* adds in a single locked block; the split above keeps the `await` (which must never happen while holding a lock) between them, which is the pragmatic trade this codebase already makes elsewhere. If you want it truly atomic, add the member first with a placeholder sink and send history afterwards — worth trying, and worth noticing that the "obvious" fix moves a different problem around rather than removing it. That discomfort is what concurrency feels like.

### 3. A roster on the wire

```csharp
// ChatMessage.cs — a second shape on the same wire, same JsonOptions
public record RosterMessage(string Type, IReadOnlyList<string> Users, DateTimeOffset At)
{
    public static RosterMessage Of(IReadOnlyList<string> users) => new("roster", users, DateTimeOffset.Now);
    public string ToJson() => JsonSerializer.Serialize(this, ChatMessage.JsonOptions);
}
// ChatRoom.cs — the sending half, extracted so two callers can share it
public Task BroadcastRosterAsync() => SendToAllAsync(RosterMessage.Of(Members).ToJson());
public async Task BroadcastAsync(ChatMessage message)
{
    lock (gate)
    {
        history.Add(message);
        if (history.Count > historyLimit) history.RemoveRange(0, history.Count - historyLimit);
    }
    await SendToAllAsync(message.ToJson());
}
// This is BroadcastAsync's old body from the snapshot line down — unchanged,
// pruning included; only the history bookkeeping stayed behind.
private async Task SendToAllAsync(string json)
{
    List<(string Name, ISocketSink Sink)> recipients;
    lock (gate) recipients = members.ToList();       // snapshot, then unlock
    List<ISocketSink>? dead = null;
    foreach (var (_, sink) in recipients)
    {
        if (!sink.IsOpen) { (dead ??= new()).Add(sink); continue; }
        try { await sink.SendAsync(json); }
        catch { (dead ??= new()).Add(sink); }
    }
    if (dead is not null)
        lock (gate) members.RemoveAll(m => dead.Contains(m.Sink));
}
// ...then `await BroadcastRosterAsync();` at the end of JoinAsync and after the
// leave announcement in LeaveAsync.
```

WHY: splitting `BroadcastAsync` in two is the whole exercise — "record it in history" and "send it to everyone" turned out to be separate jobs the moment a message existed that only needed the second. The pruning logic came along for free, so a roster send also cleans up dead sockets, and there is still exactly one loop that knows how to talk to members. Keeping rosters out of history matters for a subtle reason: history is *replayed* to newcomers, and replaying a snapshot of who was online three minutes ago would be worse than useless — a live roster follows immediately anyway.

### 4. Show the roster in the UI

```html
<!-- index.html, inside <main> -->
<aside id="roster-panel">
  <h2>Online</h2>
  <ul id="roster"></ul>
</aside>
```

```js
// app.js
const roster = document.querySelector('#roster');
function renderRoster(users) {
  roster.replaceChildren();
  for (const user of users) {
    const li = document.createElement('li');
    li.textContent = user;      // names are user input, like everything else here
    roster.appendChild(li);
  }
}
// show() gains one branch, above the existing chat / system rendering:
if (message.type === 'roster') { renderRoster(message.users); return; }
```

WHY: the client's `show()` was already a switch on `type`, so a new message kind cost one branch — that is the dividend the refactor's "messages are records, not glued strings" decision pays out. `replaceChildren()` redraws from the server's list rather than diffing, which is the same render-the-whole-truth policy as projects 25 and 26 and is what makes a dropped or duplicated roster message harmless. And note what makes this *feel* different from the fetch-based projects: nobody asked for the roster. The server pushed it, unprompted, the instant the room changed.

### 5. Slow down the flooder

```csharp
// ChatRoom.cs
private readonly Dictionary<string, List<DateTimeOffset>> recentByUser = new(StringComparer.OrdinalIgnoreCase);
private readonly int maxPerWindow;
private readonly Func<DateTimeOffset> clock;
private static readonly TimeSpan Window = TimeSpan.FromSeconds(10);
// Every parameter has a default, so AddSingleton<ChatRoom>() still works.
public ChatRoom(int historyLimit = 50, int maxPerWindow = 10, Func<DateTimeOffset>? clock = null)
{
    this.historyLimit = historyLimit;
    this.maxPerWindow = maxPerWindow;
    this.clock = clock ?? (() => DateTimeOffset.Now);   // real time unless a test says otherwise
}
public async Task<bool> SayAsync(string user, string? text)
{
    var trimmed = (text ?? "").Trim();
    if (trimmed.Length == 0) return false;
    if (!TryRecordSend(user))
    {
        var offender = FindSink(user);            // tell the flooder, and nobody else
        if (offender is not null)
            await offender.SendAsync(ChatMessage.System(
                $"Slow down — at most {maxPerWindow} messages every {Window.TotalSeconds:0} seconds.").ToJson());
        return false;
    }
    await BroadcastAsync(ChatMessage.Chat(user, trimmed));
    return true;
}
private bool TryRecordSend(string user)
{
    lock (gate)
    {
        var now = clock();
        if (!recentByUser.TryGetValue(user, out var stamps)) recentByUser[user] = stamps = new();
        stamps.RemoveAll(t => now - t >= Window);      // forget what left the window
        if (stamps.Count >= maxPerWindow) return false;
        stamps.Add(now);
        return true;
    }
}
private ISocketSink? FindSink(string user)
{
    lock (gate)
    {
        var i = members.FindIndex(m => string.Equals(m.Name, user, StringComparison.OrdinalIgnoreCase));
        return i < 0 ? null : members[i].Sink;
    }
}
// ChatMessage.cs gains one factory, and LeaveAsync one line inside its lock:
public static ChatMessage System(string text) => new("system", "server", text, DateTimeOffset.Now);
recentByUser.Remove(user);   // don't let the counter dictionary grow forever
```

WHY: a sliding window of timestamps is the simplest correct rate limiter — no background timer, no reset boundary a flooder can synchronise with, and the pruning happens lazily on the next attempt. It lives inside the same `gate` as `members` because the counters *are* shared mutable state, and a second lock would only create a chance to deadlock. Two design details are worth arguing about: the refusal is private (broadcasting "loud is spamming" would give the flooder the attention they wanted), and it is a `"system"` message rather than a dropped connection, because being briefly wrong about who is abusive is much cheaper than kicking a legitimate fast typist. And once again, the clock is a parameter — the alternative test takes eleven real seconds and will one day be deleted for being slow.
