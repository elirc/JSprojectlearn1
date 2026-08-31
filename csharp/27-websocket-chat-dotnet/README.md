# CS 27 — WebSocket chat (.NET)

**Lesson: a server handles many connections at once, so shared mutable
state needs a lock, dead sockets need pruning, and messages need a real
format — the track's first honest look at concurrency.**

## Run it

```
dotnet run csharp/27-websocket-chat-dotnet/original.cs
dotnet run --project csharp/27-websocket-chat-dotnet/refactored
dotnet run --project csharp/27-websocket-chat-dotnet/refactored -- test
```

Open http://localhost:5027 in **two browser windows** and chat (one app at a
time). With the refactor running, kill the server mid-chat and restart it:
watch the status pill go offline and the client reconnect by itself.

## What's wrong with the original?

1. **A bare `List<WebSocket>` shared by every connection, no lock.** Each
   connection's handler runs concurrently with the others. Two joins at the
   same moment can corrupt the list; a join during a broadcast's `foreach`
   throws "collection was modified". Races don't fail in demos — they fail
   at 3am under load. (js#67 never met this: Node is single-threaded.
   Welcome to .NET.)
2. **Ghosts accumulate forever.** Closing a tab removes nothing. Every
   broadcast still loops over every socket that ever connected, and sends to
   dead ones throw — swallowed by `catch { }`, the error-handling equivalent
   of closing your eyes.
3. **No message format.** The wire carries glued strings (`"bob: hi"`,
   `"* bob joined *"`). The client can't tell chat from announcements
   without parsing prose, and renders it all with `innerHTML` (XSS, js#14).
4. **Everything in one loop**: history catch-up, join announcements, chat,
   broadcast — inline in the socket handler. Untestable without two real
   browsers and four hands.

## What changed in the refactor

- **`ChatRoom` owns all shared state behind one `lock`** with three rules:
  touch `members`/`history` only under the lock, never `await` while holding
  it (snapshot, then send), and anything that's closed or throws on send is
  dead. `Broadcast` collects the dead and prunes them; history is capped.
- **Messages are records serialized to JSON**: `{type:"chat"|"join"|"leave",
  user, text, at}` (cs#07). The client switches on `type`; the server
  serializes each broadcast once for all recipients (js#67's encode-once).
- **`ISocketSink` splits the room from real sockets** (cs#10/#21): ChatRoom
  talks to "something sendable". Tests hand it `FakeSink`s — lists that
  record JSON, with switches to play dead or throw — so join/broadcast/
  prune/cap logic is provable without one real socket. `WebSocketSink`
  adapts the real thing (and serializes concurrent sends with a semaphore).
- **The socket loop shrank to receive → parse → room call**, with
  `LeaveAsync` in a `finally` so every exit — clean close, crash, yanked
  cable — announces the departure and frees the seat.
- **The client plans for drops** (js#67): auto-reconnect with exponential
  backoff (1s→2s→4s… capped), reset on success, a `readyState` check before
  send, and `textContent` for everything user-typed.

## Key takeaway

Concurrency turns "it works when I click" into a lie: correctness now
depends on *timing you don't control*. The cure is the same decide-vs-do
split as ever — pull the shared state and its rules into one class, guard
it with a lock, and hand it fakes in tests. If your chat logic can only be
tested with two browsers, it isn't designed yet.
