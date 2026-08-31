# 📘 Learning Guide: WebSocket Chat (.NET)

Read this before or alongside the README — this project introduces two big ideas at once: connections that stay open, and code that runs at the same time as itself.

## 1. What are we building?

A chat room. Open the page in two browser windows, pick names, and messages typed in one appear instantly in the other — plus "alice joined" / "alice left" announcements and a short history replay when you connect.

In js#67 you built the WebSocket *protocol* itself from raw TCP bytes — framing, handshakes, the works. ASP.NET Core ships all of that, so this project is about what js#67 couldn't teach: what happens **inside the server** when many connections are alive at once and they all share the same data. The original gets that wrong in every way a server can; the refactor introduces the first `lock` of the track.

## 2. Concepts you need first

### HTTP vs WebSocket
HTTP is request→response: the client asks, the server answers, the conversation ends. That's perfect for todos and expenses, and useless for chat — the server can't *push* "bob said hi" to you through a connection that no longer exists.

A **WebSocket** starts life as an HTTP request with an "upgrade me" header. The server agrees (status 101), and then the connection *stays open*, both sides free to send messages at any time, until someone closes it. One connection per browser tab, alive for minutes or hours.

```
HTTP:       ask → answer → hang up.   ask → answer → hang up.
WebSocket:  connect → ...messages flow both ways whenever... → close
```

In the browser you've used it already (js#67): `new WebSocket(url)`, `onmessage`, `send()`. On the server, ASP.NET Core gives you `AcceptWebSocketAsync()` and a loop of `ReceiveAsync` calls.

### Concurrency: your code runs at the same time as itself
Node.js runs your JavaScript on one thread — two callbacks never execute simultaneously. **ASP.NET Core does not work that way.** Each request (and each open WebSocket loop) can run on a different thread, genuinely in parallel on different CPU cores.

So this code, run by two connections at once, is broken:

```csharp
sockets.Add(ws);   // two threads, one List, same instant → 💥
```

`List<T>` is not built for simultaneous writers. Two `Add`s can interleave their internal steps and corrupt the list; a `foreach` while another thread `Add`s throws `InvalidOperationException: Collection was modified`. This is a **race condition**: code whose result depends on accidental timing. The cruelest part: it usually *passes* when you test it, because you're one person clicking slowly.

### `lock` — one at a time, please
C#'s `lock` statement makes a block of code exclusive:

```csharp
private readonly object gate = new();   // any object works as the "token"

lock (gate)
{
    members.Add(m);    // only one thread can be in ANY lock(gate) block
}                      // at a time; others wait at the door
```

Think of `gate` as a talking stick: a thread must hold it to enter, and everyone else queues until it's released (automatically, at the closing brace). Rules the refactor lives by:

1. Touch shared data **only** while holding the lock.
2. Keep the locked block tiny — get in, mutate/copy, get out.
3. **Never `await` inside `lock`** (C# forbids it, and for good reason: you'd hold the door shut for the whole network round-trip).

### The snapshot pattern
Rule 3 creates a puzzle: broadcasting means *sending* (slow, `await`) to every member (shared list, needs lock). The answer: copy under the lock, send outside it.

```csharp
List<Member> recipients;
lock (gate) { recipients = members.ToList(); }  // fast: just copy
foreach (var m in recipients) await m.SendAsync(json);  // slow: no lock held
```

The copy (a **snapshot**) is yours alone — no one mutates it while you loop.

### Interfaces for testability (recap of cs#10/cs#21)
How do you test "dead sockets get pruned" without a dead socket? The same move as the repository pattern: ChatRoom depends on an interface —

```csharp
public interface ISocketSink { bool IsOpen { get; } Task SendAsync(string json); }
```

— and tests supply a `FakeSink` whose `SendAsync` just appends to a `List<string>`, with switches like `IsOpen = false` or `ThrowOnSend = true` to simulate every disaster on demand. The production `WebSocketSink` wraps the real socket. ChatRoom can't tell the difference; that's the point.

### A message protocol
The original sends prose: `"bob: hi"`. The refactor sends structure:

```json
{ "type": "chat", "user": "bob", "text": "hi", "at": "2026-08-21T14:26:57-07:00" }
```

`type` is one of `"chat" | "join" | "leave"` — the client `switch`es on it to render differently. Records + `System.Text.Json` (cs#07, cs#17) make this three factory methods and one `Serialize` call.

## 3. Walking through the original code

The shared state, innocently at the top:

```csharp
var sockets = new List<WebSocket>();   // shared by every connection, no lock
var history = new List<string>();      // grows forever
```

Then one endpoint does everything. Connection arrives → `sockets.Add(ws)` (race #1). Replay history, then announce:

```csharp
foreach (var s in sockets)
    try { await Send(s, joined); } catch { }   // dead socket? pretend it's fine
```

That `catch { }` is the villain of the file. Sending to a closed socket throws; the empty catch swallows it and *leaves the corpse in the list*. Every future broadcast pays for every socket that ever existed — and if another thread `Add`s mid-`foreach`, the loop itself throws (race #2).

The receive loop glues strings (`name + ": " + text`), appends to a history that never shrinks, and broadcasts the same way. And after the loop:

```csharp
// The loop ended: this socket is dead. And yet... nothing happens here.
```

No removal. No leave message. The ghost stays forever. The inline client completes the set with `log.innerHTML += e.data` — chat text straight into the DOM as markup.

## 4. What's wrong with it (in beginner terms)

**1. It corrupts itself under load.** Two tabs joining at the same moment can break the socket list — not "show a wrong number" broken, but "undefined behavior inside List<T>" broken. You can't reproduce it by clicking; that's precisely what makes races terrifying.

**2. It leaks ghosts.** Every departed visitor makes every future broadcast slower and noisier. The `catch { }` means nobody ever finds out. This server doesn't crash — it *decays*.

**3. The wire has no grammar.** When "bob: hi" and "* bob joined *" are both just strings, the client can only guess what anything is. Want timestamps? Colors per user? A user named `* eve joined *`? Rewrite the parser of prose.

**4. Nothing is testable.** Join, broadcast, prune, history — all inline in a handler that requires real sockets. The refactor tests all of it with lists.

## 5. Try it yourself first!

Hints, vaguest first:

1. 🌱 List every piece of data that multiple connections touch. (There are two.) What guards them?
2. 🌿 Design the wire format first: three message shapes as a record + JSON. Update the browser client to `switch` on `type`.
3. 🌳 Move members + history into a `ChatRoom` class: `JoinAsync`, `SayAsync`, `LeaveAsync`, `BroadcastAsync`. Guard every touch with `lock`, snapshot before sending, and make broadcast *collect* failed/closed sockets and remove them after.
4. 🍎 Now the payoff: define `ISocketSink`, make ChatRoom use it, and write a `FakeSink`. Test: dead sink gets pruned; late joiner receives history; history caps; leaving announces. Zero real sockets.

## 6. Understanding the refactored solution

**The backend.** `ChatRoom.cs` is the whole game. Its state — `members`, `history` — is private, and every access sits inside `lock (gate)`. Walk through `BroadcastAsync`, the busiest method:

```csharp
lock (gate)
{
    history.Add(message);
    if (history.Count > historyLimit)
        history.RemoveRange(0, history.Count - historyLimit);   // capped
    recipients = members.ToList();                               // snapshot
}
var json = message.ToJson();          // encode ONCE for everyone (js#67)
foreach (var (_, sink) in recipients)
{
    if (!sink.IsOpen) { dead.Add(sink); continue; }
    try { await sink.SendAsync(json); }
    catch { dead.Add(sink); }         // noticed, not swallowed
}
lock (gate) members.RemoveAll(m => dead.Contains(m.Sink));       // prune
```

Same `catch` as the original — opposite philosophy. The original caught-and-forgot; this catches-and-*acts*: a throwing socket is a dead socket, and dead sockets leave the room. The ghost problem is not patched, it's structurally impossible.

`JoinAsync` sends the newcomer the history snapshot, adds them under the lock, then broadcasts the join (so the joiner sees their own arrival — a nice liveness check). `LeaveAsync` removes under the lock and announces only if the member was actually present. And in `Program.cs`, the socket loop is now just plumbing:

```csharp
var ticket = await room.JoinAsync(name, sink);
try {
    while (true) {
        var text = await WebSocketSink.ReceiveTextAsync(socket);
        if (text is null) break;                    // closed or died — same exit
        var incoming = IncomingMessage.Parse(text); // garbage-tolerant
        if (incoming is not null) await room.SayAsync(ticket.User, incoming.Text);
    }
} finally {
    await room.LeaveAsync(sink);   // EVERY exit path announces the departure
}
```

The `finally` is the fix for "nothing happens here": crash, close, or cable-yank, the room finds out.

**The frontend** (`wwwroot/app.js`) carries js#67's client lessons over intact. Connect with your name in the query string; on `message`, `JSON.parse` and switch on `type` — chat lines get `<strong>user</strong>` + text via `textContent` (never `innerHTML`), join/leave render as gray system lines. And the part demos skip:

```js
ws.addEventListener('close', () => {
  setStatus(`offline — retrying in ${retryDelay / 1000}s`, 'offline');
  setTimeout(connect, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 10000);  // exponential backoff
});
ws.addEventListener('open', () => {
  retryDelay = 1000;          // healthy again — reset
  messages.innerHTML = '';    // server resends history on every connect
});
```

Kill the server and the client doesn't die — it waits 1s, 2s, 4s… (backoff: be gentle to a server that's already having a bad day), and heals itself the moment the server returns, replaying the capped history the server hands every fresh connection.

**How they talk**: browser → `{"text":"hi"}` → socket loop → `SayAsync` → one JSON broadcast → every living sink → `show()` in every tab. One direction is a request; the other is a *push* — that's the WebSocket difference.

## 7. Words you learned (glossary)

- **WebSocket** — a connection that starts as HTTP, upgrades, and stays open for two-way messages.
- **Push** — the server sending without being asked (impossible over plain request/response).
- **Concurrency** — multiple pieces of your code executing in overlapping time, possibly truly in parallel.
- **Thread** — one lane of execution; ASP.NET Core uses many at once.
- **Race condition** — a bug whose appearance depends on accidental timing between threads.
- **Shared mutable state** — data multiple threads can change; the thing every race is made of.
- **`lock`** — a C# block only one thread may occupy at a time, per lock object.
- **Snapshot** — a private copy of shared data, taken under the lock, used outside it.
- **`SemaphoreSlim`** — an awaitable turn-taking token (used per-socket, since `lock` can't contain `await`).
- **Prune** — removing dead connections from the member list during broadcast.
- **Capped history** — a buffer that drops its oldest entries past a limit.
- **`ISocketSink` / fake** — the interface seam that lets tests replace sockets with lists.
- **Wire format / protocol** — the agreed JSON shape of every message (`type`, `user`, `text`, `at`).
- **Exponential backoff** — retrying with doubling delays, capped, reset on success (js#43/#67).
- **`finally`** — the block that runs on every exit path; where "always announce leave" lives.

## 8. Experiments to try on the plane (no internet needed)

Run the refactor (`dotnet run --project csharp/27-websocket-chat-dotnet/refactored`) and open http://localhost:5027 in two windows.

1. **See the push.** Type in window A while watching window B — no reload, no polling, the message just appears. Then watch the join/leave lines as you close and reopen window B. Expected: A hears about all of it.
2. **The self-healing client.** With both windows open, Ctrl+C the server. Expected: status pills go offline with a growing retry countdown (1s, 2s, 4s…). Restart the server and wait: both windows reconnect alone, replay recent history, and the retry delay is back to 1s for next time.
3. **Prove the prune with tests, not browsers.** Run `-- test` and find `ClosedSocketsArePruned`: bob's fake sink sets `IsOpen = false`, alice speaks, and `MemberCount` drops to 1 with nothing sent to the corpse. Now try to write that test against the *original*. (You can't — that's what the `ISocketSink` seam bought.)
4. **Recreate the original's ghost decay.** In `BroadcastAsync`, comment out the final prune (`members.RemoveAll(...)`). Run `-- test`: two prune tests fail. That two-line block is the difference between a server that decays and one that doesn't.
5. **Try to be evil.** Chat the message `<img src=x onerror=alert(1)>`. Expected: it displays as text, because `show()` uses `textContent`. The original's inline client would have executed it.
6. **Shrink history to feel the cap.** In `Program.cs`, register the room as `new ChatRoom(historyLimit: 5)` (`builder.Services.AddSingleton(new ChatRoom(5))`), restart, send eight messages, then open a third window. Expected: the newcomer sees only the last five — the cap is the difference between "server that runs for a year" and "list that grows forever".
7. **Race tourism (thought experiment edition).** Read the original's `foreach (var s in sockets)` broadcast and imagine a new tab calling `sockets.Add` halfway through. That's `InvalidOperationException: Collection was modified` — thrown inside a `try { } catch { }`... which swallows it, killing the broadcast for everyone after position N, silently. Count how many things had to go wrong for nobody to notice. Then reread `ChatRoom.BroadcastAsync` and count how many of them are still possible.
