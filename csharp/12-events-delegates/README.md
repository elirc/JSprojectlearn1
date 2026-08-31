# CS 12 — events-delegates

**Lesson: decouple "something happened" from "who cares" — C# delegates hold
functions in variables (like JS callbacks), and the `event` keyword hands
outsiders exactly two verbs: `+=` and `-=`.**

Mirror of js#38 (event-emitter): same pub/sub pattern, but where JS hand-rolls
the whole mechanism, C# bakes half of it into the language.

## Run it

```
dotnet run csharp/12-events-delegates/original.cs
dotnet run --project csharp/12-events-delegates/refactored
dotnet run --project csharp/12-events-delegates/refactored -- test
```

## What's wrong with the original?

The temperature monitor *creates and calls every interested party itself* —
`logger.Log(...)`, `display.Show(...)`, `alarm.Trigger(...)`, hard-coded by
name inside `Submit`:

1. **Every new listener reopens the monitor.** The changelog comments in
   `Submit` are the scar tissue: v2 added the display, v3 added the alarm,
   v4 will add SMS... A class that must be edited whenever *someone else*
   gains an interest in it can never be finished.
2. **The coupling is total.** You cannot compile, test, or reuse
   `TemperatureMonitor` without dragging `ConsoleLogger`, `DashboardDisplay`,
   and `Alarm` along. Testing "did the alarm fire?" means reading console
   output with your eyes — project 01's original sin, back again.
3. **No unsubscribe, no configuration.** The logger is welded in place. A
   headless deployment that wants no display? Edit the class. Again.

## What changed in the refactor

- **The monitor announces; it no longer phones anyone.** Two members do all
  the work: `public event Action<double>? ReadingReceived;` and
  `ThresholdExceeded`. `Submit` raises them with `ReadingReceived?.Invoke(t)` —
  the `?.` (project 05) makes zero-subscribers a safe no-op.
- **Listeners attach themselves**: `monitor.ThresholdExceeded += t => ...`.
  Multicast delegates mean `+=` *adds* — it can never overwrite another
  module's listener (js#38's `onComplete = fn` bug is unrepresentable), and
  `-=` detaches cleanly.
- **`event` is encapsulation for delegates** (project 09's lesson applied):
  outside code can only `+=`/`-=`. Assigning (`= null` wiping everyone) or
  raising the event from outside *does not compile*.
- **A hand-rolled generic `EventHub<T>`** shows there's no magic: a
  `List<Action<T>>`, `Publish` iterating a snapshot copy, and `Subscribe`
  returning an unsubscribe closure — the exact API shape of js#38's emitter.
- **Tests prove the contract**, not console output: multiple subscribers each
  delivered, `-=` and the returned unsubscribe action both detach, double
  unsubscribe is harmless, and a handler leaving mid-publish can't make its
  neighbour miss a message.

## Key takeaway

When module A must react to module B without B knowing A exists, that's
pub/sub. In C# the pattern is built in: a delegate is a variable holding
functions, `+=` stacks as many listeners as you like, and `event` keeps
outsiders from raising or wiping it. If you can add the next listener without
touching the announcing class, you've done it right.
