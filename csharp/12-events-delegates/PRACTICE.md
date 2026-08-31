# 🏋️ Practice: Events & Delegates

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. All clear (warm-up)

Alarms need an "it's fine now" counterpart. Add `public event Action<double>? Recovered;` to `TemperatureMonitor`, firing when a reading is at or below the threshold **after** at least one reading went over. A quiet run never raises it, and a long hot spell followed by one cool reading raises it exactly once.

Practices: raising events with `?.Invoke`, and giving the announcer a scrap of private state without any knowledge of its listeners.

Hint: a `private bool wasOverThreshold;` field is all the memory you need. Set it in the over-threshold branch; in the `else` branch raise `Recovered` only if it was set, then clear it.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var rec = new TemperatureMonitor(30);
var backToNormal = new List<double>();
rec.Recovered += backToNormal.Add;
rec.Submit(20); rec.Submit(25);                                   // never hot
Check.Equal(0, backToNormal.Count, "never hot -> never recovered");
rec.Submit(35); rec.Submit(31); rec.Submit(28); rec.Submit(27);   // hot, hot, cool, cool
Check.Equal(1, backToNormal.Count, "one hot spell -> exactly one all-clear at 28");
```

### ⭐⭐ 2. Listen exactly once (core)

Add `EventHub<T>.SubscribeOnce(Action<T> handler)`: the handler runs for the very next message and then unsubscribes itself, so `SubscriberCount` drops back to zero. It should still return an `Action` so a caller can cancel *before* the message arrives. This is `emitter.once(...)` from js#38.

Practices: closures that capture their own unsubscribe action, and appreciating why `Publish` iterates a snapshot.

Hint: you need the unsubscribe action inside the handler that produces it — declare a placeholder first, then reassign: `Action off = () => { }; off = Subscribe(m => { off(); handler(m); });`. Unsubscribing *before* calling the handler is deliberate; think about a handler that publishes.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var onceHub = new EventHub<string>();
var heard = new List<string>();
onceHub.SubscribeOnce(heard.Add);
onceHub.Publish("one"); onceHub.Publish("two");
Check.Equal("one", string.Join(",", heard), "it heard only the first message");
Check.Equal(0, onceHub.SubscriberCount, "and removed itself afterwards");
var cancel = onceHub.SubscribeOnce(heard.Add); cancel(); onceHub.Publish("three");
Check.Equal("one", string.Join(",", heard), "cancelling before delivery works too");
```

### ⭐⭐ 3. The .NET house style (core)

`Action<double>` is fine, but almost every event in the BCL has the signature `(object? sender, TEventArgs e)`. Add one in that style: `public event EventHandler<ReadingEventArgs>? ReadingRecorded;`, where `ReadingEventArgs : EventArgs` carries a `double Celsius`. Raise it from `Submit` with `this` as the sender, so a subscriber can tell *which* monitor spoke.

Practices: the conventional .NET event pattern, deriving from `EventArgs`, and why "sender" exists at all.

Hint: `EventHandler<T>` is just a predefined delegate — `delegate void EventHandler<T>(object? sender, T e)`. Give `ReadingEventArgs` get-only properties set in its constructor (project 09's habit).

Check it offline: add to `Tests.cs` — both should pass:
```csharp
var std = new TemperatureMonitor(30);
object? sender = null; double got = 0;
std.ReadingRecorded += (s, e) => { sender = s; got = e.Celsius; };
std.Submit(21.5);
Check.Equal(21.5, got, "the payload rides in the EventArgs");
Check.True(ReferenceEquals(std, sender), "and sender is the monitor that raised it");
```

### ⭐⭐ 4. Port from JS: named channels (core)

js#38's emitter keyed handlers by an event *name* — `emitter.on("save", fn)` and `emitter.emit("save", doc)`, with different listeners on one emitter. Port that to `NamedEventHub<T>` with `Action On(string channel, Action<T> handler)` and `void Emit(string channel, T message)`. Emitting on a channel nobody subscribed to must be a silent no-op, not a `KeyNotFoundException`. Build it by *holding* `EventHub<T>` instances in a dictionary rather than reimplementing the handler list.

Practices: `Dictionary<string, EventHub<T>>`, composition over duplication, and porting a dynamic JS API to a typed one.

Hint: `if (!channels.TryGetValue(channel, out var hub)) channels[channel] = hub = new EventHub<T>();` creates a channel on first subscribe. `Emit` uses `TryGetValue` and simply returns when there is no hub.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var named = new NamedEventHub<string>();
var log = new List<string>();
named.On("save", m => log.Add($"save:{m}"));
named.On("delete", m => log.Add($"delete:{m}"));   // a second, independent channel
named.Emit("save", "doc1");
named.Emit("nobody-listens", "x");                 // silent no-op, not an exception
Check.Equal("save:doc1", string.Join(",", log), "only the matching channel's handlers ran");
Check.Equal(1, named.SubscriberCount("save"), "channels count their own subscribers");
```

### ⭐⭐⭐ 5. Unsubscribe by scope (challenge)

Returning an `Action` works, but nothing makes you *call* it — forgotten unsubscribes are the classic managed-memory leak. Add `IDisposable SubscribeScoped(Action<T> handler)`, backed by a small `sealed class Subscription : IDisposable` that wraps the unsubscribe action and ignores a second `Dispose()`. Now a subscription can be scoped with `using`, and the compiler emits the cleanup even if the block throws.

Practices: `IDisposable`, the `using` statement, idempotent cleanup — the C# answer to "who turns this off?".

Hint: `Subscription` holds an `Action unsubscribe` and a `private bool disposed;` guard; `SubscribeScoped` is one line. This is how Rx's `IObservable.Subscribe` and ASP.NET Core's change-token registrations work.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var scoped = new EventHub<string>();
var inside = new List<string>();
using (scoped.SubscribeScoped(inside.Add)) { scoped.Publish("during"); }
scoped.Publish("after");
Check.Equal("during", string.Join(",", inside), "the subscription died at the closing brace");
var sub = scoped.SubscribeScoped(inside.Add); sub.Dispose(); sub.Dispose();
Check.Equal(0, scoped.SubscriberCount, "disposing twice is harmless");
```

### ⭐⭐⭐ 6. Catch-up for latecomers (challenge)

A dashboard that connects after the last reading shows an empty screen. Write `ReplayEventHub<T>` (constructed with a `replayCount`) that remembers the most recent N messages and delivers them **immediately, in order, to each new subscriber** before wiring them up for future ones. A negative count is an `ArgumentOutOfRangeException`; `replayCount: 0` behaves exactly like the plain hub.

Practices: `Queue<T>` as a bounded buffer, composition (hold an `EventHub<T>`, don't inherit), and a delivery guarantee that changes what "subscribe" means.

Hint: `Publish` enqueues then trims — `while (recent.Count > replayCount) recent.Dequeue();` — before delegating to the inner hub. `Subscribe` loops the buffer calling `handler(past)` *first*, then returns `inner.Subscribe(handler)`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var replay = new ReplayEventHub<int>(2);
replay.Publish(1); replay.Publish(2); replay.Publish(3);
var late = new List<int>();
replay.Subscribe(late.Add);
Check.Equal("2,3", string.Join(",", late), "a latecomer catches up on the last 2, oldest first");
replay.Publish(4);
Check.Equal("2,3,4", string.Join(",", late), "then live messages arrive normally");
Check.Throws<ArgumentOutOfRangeException>(() => new ReplayEventHub<int>(-1), "a negative buffer is rejected");
```

## Solutions

### 1. All clear

```csharp
// Monitor.cs
private bool wasOverThreshold;
public event Action<double>? Recovered;

// In Submit, the over-threshold branch gains `wasOverThreshold = true;`
// and the plain `if` grows an else:
else if (wasOverThreshold)
{
    wasOverThreshold = false;     // clear FIRST, so a second cool reading is quiet
    Recovered?.Invoke(reading);
}
```

WHY: the monitor gained one private `bool` and still knows nothing about who cares — the whole point of the design. "Fires on the *transition*, not on the state" is the difference between a useful alert and a pager that buzzes every thirty seconds while things are fine. Notice the flag is `private`: outsiders can subscribe to the conclusion but cannot forge the premise.

### 2. Listen exactly once

```csharp
public Action SubscribeOnce(Action<T> handler)
{
    Action off = () => { };                    // placeholder so the closure can capture it
    off = Subscribe(message =>
    {
        off();                                 // leave BEFORE running the handler
        handler(message);
    });
    return off;
}
```

WHY: the wrapper needs the unsubscribe action that `Subscribe` only returns *after* the wrapper exists — the two-step declare-then-assign is how a closure ties that knot, since the lambda captures the variable rather than its value. Unsubscribing before invoking matters: a handler that publishes cannot re-enter an already-detached once-handler. And this only works because `Publish` iterates `handlers.ToArray()`; on the live list, removing during delivery would throw.

### 3. The .NET house style

```csharp
// Monitor.cs
public class ReadingEventArgs : EventArgs
{
    public ReadingEventArgs(double celsius) { Celsius = celsius; At = DateTime.UtcNow; }
    public double Celsius { get; }
    public DateTime At { get; }
}

// inside TemperatureMonitor
public event EventHandler<ReadingEventArgs>? ReadingRecorded;
// ...and inside Submit:  ReadingRecorded?.Invoke(this, new ReadingEventArgs(reading));
```

WHY: `EventHandler<T>` is nothing but a predeclared `delegate void (object? sender, T e)` — the same machinery as `Action<double>`, wearing the convention every .NET API follows. It buys two things: `sender` lets one handler serve many publishers, and an `EventArgs` subclass can gain a *new property* later without changing the delegate's signature. For internal, single-publisher events `Action<T>` remains perfectly good C#.

### 4. Port from JS: named channels

```csharp
// EventHub.cs
public class NamedEventHub<T>
{
    private readonly Dictionary<string, EventHub<T>> channels = new(StringComparer.Ordinal);

    public Action On(string channel, Action<T> handler)
    {
        if (!channels.TryGetValue(channel, out var hub))
            channels[channel] = hub = new EventHub<T>();     // created on first subscribe
        return hub.Subscribe(handler);
    }
    // No channel -> nobody is listening -> nothing to do.
    public void Emit(string channel, T message)
        { if (channels.TryGetValue(channel, out var hub)) hub.Publish(message); }
    public int SubscriberCount(string channel)
        => channels.TryGetValue(channel, out var hub) ? hub.SubscriberCount : 0;
}
```

WHY: each channel *is* a hub, so `NamedEventHub` is a dictionary of the class you already wrote and tested — no handler list, no `ToArray` snapshot, no unsubscribe logic duplicated. Compared with the JS original you gain a typed payload and lose only the ability to typo `"sav"` and get silence, which is why real C# codebases prefer one `event` per thing that happens. String channels stay useful where the set is genuinely open — message brokers and WebSocket topics (project 27).

### 5. Unsubscribe by scope

```csharp
// EventHub.cs
public sealed class Subscription : IDisposable
{
    private readonly Action unsubscribe;
    private bool disposed;
    public Subscription(Action unsubscribe) => this.unsubscribe = unsubscribe;
    public void Dispose()
    {
        if (disposed) return;      // Dispose must be safe to call twice
        disposed = true;
        unsubscribe();
    }
}
// ...and one line inside EventHub<T> itself:
public IDisposable SubscribeScoped(Action<T> handler) => new Subscription(Subscribe(handler));
```

WHY: an `Action` you must remember to call is a hope; an `IDisposable` inside `using` is a `try/finally` the compiler writes for you, which runs even when the block throws. That difference is why long-lived events are the standard managed memory leak — the publisher holds a reference to the subscriber's handler, and through it the whole object graph, until someone unsubscribes. `Dispose` being idempotent is not politeness but the documented contract for `IDisposable`.

### 6. Catch-up for latecomers

```csharp
// EventHub.cs — composition: it HOLDS an EventHub, it does not inherit one.
public class ReplayEventHub<T>
{
    private readonly EventHub<T> inner = new();
    private readonly Queue<T> recent = new();
    private readonly int replayCount;
    public ReplayEventHub(int replayCount) => this.replayCount = replayCount >= 0 ? replayCount
        : throw new ArgumentOutOfRangeException(nameof(replayCount), "cannot replay a negative count");
    public int SubscriberCount => inner.SubscriberCount;
    public Action Subscribe(Action<T> handler)
    {
        foreach (var past in recent) handler(past);     // catch up, oldest first...
        return inner.Subscribe(handler);                // ...then join the live feed
    }
    public void Publish(T message)
    {
        recent.Enqueue(message);
        while (recent.Count > replayCount) recent.Dequeue();   // bounded buffer
        inner.Publish(message);
    }
}
```

WHY: `Queue<T>` is the right container because the trimming rule is "drop the oldest", which is `Dequeue` — a `List` would need an O(n) `RemoveAt(0)` and an index you could get wrong. Delivering history *before* subscribing keeps ordering honest: a message published by one of the replayed handlers still lands after everything it followed. This is RxJS's `ReplaySubject` in miniature, and it shows how a delivery *policy* can be added by wrapping a hub instead of editing one — the same composition move as exercise 4.
