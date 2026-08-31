# 📘 Learning Guide: Events & Delegates

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A greenhouse temperature monitor. Sensors submit readings; several parties care:

- a **logger** records every reading,
- a **dashboard** shows the latest value,
- an **alarm** goes off when a reading crosses a threshold.

The interesting question is not the thermometer — it's the *wiring*. How does the monitor tell everyone who cares, **without knowing who they are**? You solved this in JavaScript in js#38 by hand-building an event emitter. C# has the pattern built into the language: **delegates** (variables that hold functions) and the **`event`** keyword (controlled access to those variables). This project is the Rosetta Stone between the two.

## 2. Concepts you need first

### Functions in variables: what JS does naturally, C# does with delegates

In JavaScript, functions are just values:

```js
const greet = name => console.log(`hi ${name}`);
greet("Ada");                 // functions travel in variables for free
```

C# can do the same, but a variable needs a *type* — and the type of "a method with this signature" is called a **delegate type**. You almost never declare your own; the built-in generic ones cover it:

```csharp
Action<string> greet = name => Console.WriteLine($"hi {name}");
greet("Ada");        // invoking the delegate calls the stored method
```

- `Action` — holds a method taking nothing, returning nothing.
- `Action<T>` — takes one `T`, returns nothing. (`Action<T1,T2>` for two, etc.)
- `Func<T, TResult>` — takes a `T`, *returns* a `TResult`. You've been passing these to LINQ since project 04: `Where(n => n > 2)` takes a `Func<int, bool>`.

The `t => ...` syntax is a **lambda expression** — an unnamed function written inline, exactly like JS arrow functions. You can also store an existing method by name (a **method group**):

```csharp
var log = new List<double>();
Action<double> save = log.Add;   // no lambda needed — Add already fits Action<double>
save(3.5);                       // log now contains 3.5
```

### Multicast: one delegate variable, many functions

Here's the twist JS doesn't have: a C# delegate variable can hold a *list* of functions. `+=` appends, `-=` removes, and invoking calls them all, in subscription order:

```csharp
Action<string> notify = s => Console.WriteLine($"log: {s}");
notify += s => Console.WriteLine($"display: {s}");
notify("hello");    // prints BOTH lines
```

Remember js#38's original bug — `onComplete = fn` silently *overwriting* the previous listener, and the shameful `onComplete2` slot added to work around it? Multicast is the language-level fix: `+=` adds, never replaces.

One more wrinkle: a delegate variable with *no* subscribers is `null`, not an empty list. Which brings in project 05's toolkit:

```csharp
notify?.Invoke("hello");   // if null (nobody listening), do nothing — no crash
```

### The `event` keyword: encapsulation for delegates

A `public Action<double>? OnReading;` *field* would work... and would repeat js#38's disasters, because outsiders could do anything to it:

```csharp
monitor.OnReading = mine;      // = instead of +=  → wipes everyone else
monitor.OnReading = null;      // unsubscribe THE WORLD
monitor.OnReading?.Invoke(99); // fake a reading from outside!
```

Marking it `event` keeps the same delegate underneath but restricts *outside* code to exactly two verbs — `+=` and `-=`. Assigning, invoking, or nulling it from outside is a **compile error**. Only the declaring class can raise it. That's project 09's encapsulation lesson (public fields vs controlled doors), applied to callbacks:

```csharp
public event Action<double>? ReadingReceived;   // outsiders: += and -= only
```

Naming: "raising" or "firing" an event = invoking the delegate. The convention for event names is past tense (`ReadingReceived`, `ThresholdExceeded`) — announcements of things that happened.

### Closures: how an unsubscribe function works

A **closure** is a function that remembers variables from where it was created — same word, same meaning as in JS (js#27's memoize leaned on it):

```csharp
Action MakeCounter()
{
    int count = 0;
    return () => Console.WriteLine(++count);   // remembers ITS OWN count
}
```

js#38's emitter used a closure for its best API trick: `on()` returns an `off()` function that already knows which listener to remove. Our `EventHub<T>` does exactly the same — `Subscribe` returns an `Action` that captured the handler it should remove.

### The pub/sub pattern in one sentence

**Publishers announce events; subscribers register interest; neither knows the other's name.** DOM `addEventListener`, Node's `EventEmitter`, and C# events are all this one idea. The payoff is always the same: the announcing class stops changing when the audience changes.

## 3. Walking through the original code

The monitor owns its audience — as private fields it constructs itself:

```csharp
private readonly ConsoleLogger logger = new();
private readonly DashboardDisplay display = new();
private readonly Alarm alarm = new();
```

And `Submit` phones each one by name:

```csharp
public void Submit(double reading)
{
    logger.Log(reading);          // hard-coded call #1
    display.Show(reading);        // hard-coded call #2
    if (reading > threshold)
    {
        alarm.Trigger(reading);   // hard-coded call #3
    }
    // v2: added the display        (this file was edited)
    // v3: added the alarm          (this file was edited)
    // v4: SMS? metrics? email?     (this file gets edited... again)
```

Those changelog comments are the fossil record: every version bump happened *inside this one method*. The demo run works perfectly — five readings, two alarms — which is exactly the trap. Nothing is broken today; the cost is every tomorrow.

## 4. What's wrong with it (in beginner terms)

**1. The monitor can never be finished.** Each new interested party — SMS, metrics, email — reopens `TemperatureMonitor`. The risk isn't typing three lines; it's that *editing working code* is when working code breaks. A class other people's features force you to keep editing is a standing invitation for regressions. (The design-jargon name for the goal here: the open/closed principle — open to extension, closed to modification.)

**2. Compile-time coupling, total.** `TemperatureMonitor` cannot compile without `ConsoleLogger`, `DashboardDisplay`, and `Alarm`. Want to reuse the monitor in another app, or run it headless without a display? You can't — its dependencies are welded on with `new` (the same disease project 10 cured with interfaces; events are the cure when the dependency is "notify me").

**3. Untestable except by eyeball.** How do you *test* that the alarm fires above 30? The alarm's only observable behaviour is a `Console.WriteLine`. You're back to project 01's original: run it and read the screen. With events, a test subscribes a plain `List<double>.Add` and asserts on the list.

**4. Nothing can leave.** There is no unsubscribe. In this toy that's invisible; in a real app (screens opening and closing, plugins loading and unloading) permanently-welded listeners are memory leaks and ghost notifications — js#38's lesson #2.

## 5. Try it yourself first!

Try to refactor the original before reading on. Hints, vaguest first:

1. 🌱 Could `Submit` announce "a reading arrived" without naming a single listener? What would hold the listeners?
2. 🌿 Give the monitor a `public event Action<double>? ReadingReceived;` and raise it inside `Submit` with `?.Invoke(reading)`. Move the logger/display/alarm to the *call site*, attaching with `+=`.
3. 🌳 Add a second event, `ThresholdExceeded`, raised only when `reading > Threshold`. The alarm subscribes to *that one* — notice the if-statement stayed in the monitor (it owns the rule) but the *reaction* moved out.
4. 🍎 Now build the JS-style version as a standalone class: `EventHub<T>` with a `List<Action<T>>`, `Publish(T)` looping over a snapshot copy, and `Subscribe` returning an `Action` that removes the handler. Then write tests: two subscribers both hear; unsubscribe silences one; publishing to nobody doesn't throw.

## 6. Understanding the refactored solution

**`Monitor.cs`** — the whole class fits on a screen because it now does only *its* job:

```csharp
public event Action<double>? ReadingReceived;
public event Action<double>? ThresholdExceeded;

public void Submit(double reading)
{
    ReadingReceived?.Invoke(reading);
    if (reading > Threshold)
        ThresholdExceeded?.Invoke(reading);
}
```

Two announcements, one rule. The `?.Invoke` handles the zero-subscriber case — there's a test that submits to a listener-less monitor and simply doesn't crash.

**The call site (Program.cs)** — the audience assembles itself:

```csharp
monitor.ReadingReceived   += t => Console.WriteLine($"  [log]     reading: {t} C");
monitor.ReadingReceived   += t => Console.WriteLine($"  [display] gauge now at {t} C");
monitor.ThresholdExceeded += t => Console.WriteLine($"  [ALARM]   {t} C is over the limit!");
```

Tomorrow's SMS notifier is one more `+=` line *here* — the monitor's file is untouched. That's the whole lesson in one diff.

**`EventHub.cs`** — the js#38 emitter, transplanted:

```csharp
public Action Subscribe(Action<T> handler)
{
    handlers.Add(handler);
    return () => handlers.Remove(handler);   // closure: knows exactly whom to remove
}

public void Publish(T message)
{
    foreach (var handler in handlers.ToArray())   // iterate a COPY
        handler(message);
}
```

Two subtleties both carried over from js#38 and both pinned by tests:

- **Publish iterates a snapshot** (`ToArray()`), so a handler that unsubscribes *during* delivery can't derail the loop or make a neighbour miss the message. The test subscribes a self-removing handler plus a second one and asserts both fired — then that the self-remover is really gone next publish.
- **Unsubscribe is idempotent**: `List.Remove` of something already gone returns `false` and does nothing, so calling `off()` twice is harmless. Tested too.

**How the tests observe events without a console:** subscribe collectors —

```csharp
var heardByLogger = new List<double>();
monitor.ReadingReceived += heardByLogger.Add;    // a method group as the listener
monitor.Submit(25);
Check.Equal(1, heardByLogger.Count, "...");
```

A plain `List.Add` *is* a valid subscriber. Once "who reacts" is decoupled from "what happened", tests just plug in their own audience.

**When do you use which?** `event` when a class announces things about itself (the C# idiom — use it by default). An `EventHub`-style object when you need a *broker* passed around between modules, or dynamic topic names — and to understand what `event` is doing for you underneath.

## 7. Words you learned (glossary)

- **Delegate** — a type (and variable) that holds references to methods; C#'s "function in a variable."
- **`Action` / `Action<T>`** — built-in delegate types for methods returning nothing.
- **`Func<T, TResult>`** — built-in delegate type for methods that return a value.
- **Lambda expression** — an inline unnamed function, `t => ...`; C#'s arrow function.
- **Method group** — using a method's bare name (`list.Add`) where a delegate is expected.
- **Multicast delegate** — one delegate holding many methods; `+=` adds, `-=` removes, invoking calls all in order.
- **Event (`event` keyword)** — a delegate member outsiders can only `+=`/`-=`; only the declaring class may raise it.
- **Raise / fire** — invoke an event's delegate, notifying all subscribers.
- **Subscribe / unsubscribe** — attach or detach a listener.
- **`?.Invoke`** — null-conditional call: skip invoking when no one is subscribed (project 05).
- **Closure** — a function that captures variables from its creation site (how `Subscribe` returns a working `off()`).
- **Pub/sub (observer pattern)** — publishers announce, subscribers listen, neither knows the other.
- **Idempotent** — safe to do twice; the second time changes nothing.
- **Open/closed principle** — good designs are extended (new subscriber) without being modified (no monitor edits).

## 8. Experiments to try on the plane (no internet needed)

Run tests after each change: `dotnet run --project csharp/12-events-delegates/refactored -- test`

1. **Add the SMS notifier both ways.** Refactored: one line in `Program.cs` — `monitor.ThresholdExceeded += t => Console.WriteLine($"  [sms] ALERT {t} C");`. Original: now do the same there (new class, new field, new call in `Submit`). Expected: the refactored diff touches only the call site; the original's diff is scattered through the monitor. Count changed lines in each.
2. **Prove what `event` blocks.** In `Program.cs` (refactored), try `monitor.ReadingReceived = null;` and then `monitor.ReadingReceived?.Invoke(99);`. Expected: neither compiles — "the event ... can only appear on the left hand side of += or -=". Then delete the `event` keyword in `Monitor.cs` and watch both lines compile fine: you've just recreated js#38's overwrite-and-fake-events bugs. Put `event` back.
3. **Recreate the overwrite disaster on the hub.** Give `EventHub<T>` a `public Action<T>? Handler;` field and a `PublishToField` method that calls `Handler?.Invoke(...)`. Subscribe two "modules" with `hub.Handler = ...;` each. Expected: only the second ever fires — silently. That silence is why js#38 grew an `onComplete2` slot, and why `+=`/`event` exist.
4. **A throwing subscriber kills its neighbours.** Subscribe to `ReadingReceived`: first a handler that throws (`t => throw new Exception("logger disk full")`), then a collector. Submit a reading inside try/catch. Expected: the collector saw nothing — delivery died mid-loop. Fix it js#38-style in `EventHub.Publish`: wrap each `handler(message)` in try/catch, collect failures, and throw an `AggregateException` at the end (you'll meet that type again in project 14). Write a test proving the second handler now always runs.
5. **Break the snapshot on purpose.** In `EventHub.Publish`, change `handlers.ToArray()` to `handlers`. Expected: the "leaving mid-publish" test fails — .NET throws `InvalidOperationException: Collection was modified` the moment a handler unsubscribes during delivery. That one `ToArray()` is load-bearing, and now you know why.
