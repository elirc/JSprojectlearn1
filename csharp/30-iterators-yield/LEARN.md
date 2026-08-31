# 📘 Learning Guide: Iterators and `yield return`

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them. cs#29 showed you that LINQ queries are lazy. This one shows you how to *write* something lazy, which turns out to be one keyword.

## 1. What are we building?

A pipeline: take the numbers from 1 to 5,000,000, keep the multiples of 7, stop at the first one over 1000, and print the first five. Five numbers come out. The question is how many go in.

The original answers "all of them, three times over" — 5.7 million list entries and 39MB. The refactor answers "35", using the same three stages in the same order. The only difference is that each stage `yield return`s its items instead of collecting them into a `List`.

Along the way you get something the original could not express at all: a sequence with no end.

## 2. Concepts you need first

### `return` vs `yield return`

A normal method has one moment to answer, and it must have finished all its work by then:

```csharp
List<int> BuildRange(int start, int count)
{
    var list = new List<int>();
    for (int i = 0; i < count; i++) list.Add(start + i);
    return list;                       // ⬅ the ONE answer, complete
}
```

An **iterator** answers many times:

```csharp
IEnumerable<int> Range(int start, int count)
{
    for (int i = 0; i < count; i++)
        yield return start + i;        // ⬅ here is one. Call me again for the next.
}
```

`yield return` hands one item to the consumer and **freezes the method exactly where it stands** — locals, loop counter, position in the loop, all preserved. When the consumer asks for the next item, execution resumes on the line after the `yield`. Nothing is stored, so "how big is it?" is a question the method never has to answer.

If you know JavaScript generators, this is exactly `function*` and `yield`:

```js
function* range(start, count) {
    for (let i = 0; i < count; i++) yield start + i;
}
```

Same idea, same laziness, same "the caller pulls" model. C# had it first (2005), and LINQ is built out of it.

### What the compiler actually does

A method containing `yield` is not compiled as a method. The compiler generates a hidden class — a **state machine** — with a field per local variable and an integer saying which `yield` it is parked on. `foreach` then calls `MoveNext()` on it repeatedly. You never see the class, but it explains everything: why locals survive between items, why the sequence can be endless, and why the method body does not run until the first `MoveNext()`.

### The body does not run when you call it

This is the trap, and it is worth meeting on purpose:

```csharp
var q = Range(1, -5);      // no exception. No code from the body has run.
foreach (var x in q) { }   // NOW the body runs — and now it throws.
```

An iterator's arguments are checked whenever somebody eventually enumerates it, which may be in another method, another file, or never. The fix is the **two-method shape**: a normal method that validates and *returns* the iterator, plus a private iterator that does the work.

```csharp
public static IEnumerable<int> Range(int start, int count)
{
    if (count < 0) throw new ArgumentOutOfRangeException(nameof(count));
    return Iterate(start, count);        // normal method: this runs immediately

    static IEnumerable<int> Iterate(int start, int count)
    {
        for (int i = 0; i < count; i++) yield return start + i;
    }
}
```

Every LINQ operator in .NET is written this way.

### `yield break`

`yield break` ends the sequence: the consumer's `foreach` finishes and the source is never asked again. It is how `TakeWhile` stops a pipeline dead, including the parts of it upstream:

```csharp
foreach (var item in source)
{
    if (!keepGoing(item)) yield break;   // the source stops here too
    yield return item;
}
```

### Pull, not push

A lazy pipeline runs **backwards from the consumer**. `foreach` asks `FirstFew` for an item; `FirstFew` asks `Until`; `Until` asks `Filtered`; `Filtered` asks the source. One number travels all the way up the chain, then the whole thing freezes until the next request. Nothing is "processed in stages" — every stage handles one item at a time, in turn.

That is why five chained operators still make exactly one pass, and why `FirstFew(5)` stops the source at 35 rather than at 5,000,000: the consumer is in charge of how much work the producer does.

### Infinite sequences are ordinary values

```csharp
public static IEnumerable<int> Naturals()
{
    int n = 1;
    while (true) { yield return n; n++; }
}
```

This is not a hang. It produces exactly as many numbers as somebody asks for and costs one `int` of memory. `while (true)` is only an infinite loop if the consumer never stops — and `Take`, `First`, `Any` and `TakeWhile` all stop. What you must not do is call `ToList()`, `Count()`, `Max()` or `OrderBy()` on it: those ask for everything, and everything is not a finite amount.

### Iterators are lazy but not free

Two costs worth knowing: each `MoveNext()` is a method call (so a tight numeric loop over an array is faster than an iterator chain — laziness pays when the *source* is expensive, not when it is an in-memory array), and re-enumerating re-runs everything (cs#29's lesson from the other side).

## 3. Walking through the original code

Three methods, one shape:

```csharp
List<int> KeepMultiplesOf(List<int> source, int factor)
{
    var list = new List<int>();
    foreach (int n in source) if (n % factor == 0) list.Add(n);
    Console.WriteLine($"   KeepMultiplesOf({factor}) finished: {list.Count:N0} items");
    return list;
}
```

Chained, they produce three complete lists — 5,000,000 then 714,285 then 142 — before line one of the output appears. The console proves the order: every stage announces that it *finished* before the next one starts. That is what "eager" means.

`TakeWhileBelow` is the saddest one:

```csharp
if (n >= limit) break;      // we stop adding... after the previous stage
list.Add(n);                // already built every item we are ignoring
```

Its `break` is honest and useless: the waste happened upstream, before it was called.

And the last flaw is a smell rather than a bug — `BuildRange` prints progress. Generation and presentation are welded together, so the method cannot be reused anywhere that wants different output, or no output.

## 4. What's wrong with it (in beginner terms)

**1. The work is proportional to the input, not to the answer.** You wanted five numbers; you paid for five million. Nothing in the code says "five million" — it emerges from three innocent-looking function calls.

**2. Memory is the real limit.** 39MB for a toy. Point the same three methods at a 10-million-row table and you have a memory problem that no amount of "optimizing the loop" fixes, because the *shape* is wrong: all of it must exist at once.

**3. Some programs cannot be written at all.** Endless sequences, "read a 40GB log file line by line", "the first user matching X in a stream of events" — all of these need a producer that can pause. A `List`-returning method cannot pause.

**4. The stages cannot be reused.** They take `List<int>` and give back `List<int>`, print their own progress, and hard-code their thresholds. Nothing about them composes.

## 5. Try it yourself first!

Before reading on, try converting the original yourself. Hints, vaguest first:

1. 🌱 Change `List<int> BuildRange(...)` to `IEnumerable<int> BuildRange(...)`, delete the list, and `yield return` inside the loop. Run it. The output order changes — why?
2. 🌿 Do the same to the other two stages (the third one ends with `yield break` instead of `break`). What happens to the memory and time numbers?
3. 🌳 Delete the `Console.WriteLine`s from the generators. Where does the progress reporting belong instead? (Wrap the source in something that counts.)
4. 🍎 Now write `Naturals()` — an endless `while (true)` iterator — and get the first five multiples of 7 out of it without hanging. Then prove it: wrap it in a counter and assert how many numbers were produced.

## 6. Understanding the refactored solution

**`LazyOps.cs`** — the original's three stages, as iterators, which is to say: as LINQ. `Filtered` is `Where`, `Mapped` is `Select`, `Until` is `TakeWhile`, `FirstFew` is `Take`. Each is a `foreach` with a `yield return` in it, and the file contains no `new List<...>()` at all. Once you have written `Where` yourself, LINQ stops being a library you trust and becomes six lines you remember.

`Batched` is the exception that proves the rule: it *does* allocate a list, because a batch is a real thing the caller receives. But it holds one batch at a time and hands each one over as soon as it fills, so memory stays flat over a 5,000,000-item source. Note the fresh `new List<T>(size)` after each yield — reusing the list would hand every caller the same mutating object, a classic iterator bug.

**`Sequences.cs`** — `Naturals` and `Fibonacci` are the payoff: endless sequences that cost one or two locals. `Range` demonstrates the two-method shape, and `RangeTheLateWay` is deliberately kept as its evil twin so the tests can show the difference between "throws when you call it" and "throws when somebody else enumerates it".

**`Program.cs`** — four sections. A: the original's pipeline, lazily (35 numbers and a few KB, against 5.7M entries and 39MB). B: infinite sequences with `FirstFew`. C: a 5,000,000-item streaming aggregation in constant memory. D: the two-method shape catching a bad argument at the call while its twin explodes inside somebody's `foreach`.

**`Tests.cs`** — three kinds of assertion: what the operators *produce*, what they *don't* produce (`Check.Equal(0, counted.Produced, "building the query produced not one number")`), and *when they throw*. The laziness assertions are the ones that would catch a future "optimization" that quietly adds a `ToList()` in the middle of a pipeline.

## 7. Words you learned (glossary)

- **Iterator method** — a method containing `yield return`; the compiler rewrites it into a state machine.
- **`yield return`** — produce one item and freeze here until the next request.
- **`yield break`** — end the sequence now.
- **State machine** — the hidden class the compiler generates to remember where an iterator was parked.
- **Eager** — does all the work before returning (a `List`-returning method).
- **Lazy** — does work only as items are requested.
- **Pull model** — the consumer drives; each `MoveNext()` pulls one item through the whole chain.
- **Composition** — chaining operators so they still make one pass (`a.Filtered(...).Mapped(...)`).
- **Deferred argument validation** — the trap where an iterator's `throw` waits for enumeration.
- **Two-method shape** — a normal validating method that returns a private iterator.
- **Infinite sequence** — `while (true)` + `yield return`; safe because the consumer stops.
- **Short-circuiting operator** — `Take`, `First`, `Any`, `TakeWhile`: they stop the source early.
- **Streaming** — processing a large source in constant memory, one item (or batch) at a time.
- **`IEnumerable<T>` / `IEnumerator<T>`** — the sequence, and the cursor over it (`MoveNext`, `Current`).

## 8. Experiments to try on the plane (no internet needed)

Run tests after each change: `dotnet run --project csharp/30-iterators-yield/refactored -- test`

1. **Watch the pipeline interleave.** In `LazyOps.Filtered`, add `Console.WriteLine($"    filtering {item}");` at the top of the loop, then run the demo's section A. Expected: the filter's lines and the printed squares *alternate* — 7 is printed before 8 is ever filtered. Eager code cannot produce that interleaving; it is the clearest possible proof that only one item is in flight at a time. Remove the line afterwards.
2. **Break the laziness and let the test catch it.** In `Sequences.Range`, change the `Iterate` local function to build and return a `List<int>` instead of yielding. Expected: `and cost 35 numbers out of a million` fails with `expected: 35, actual: 1000000`, while every *result* test still passes. Performance regressions with correct answers are exactly what these assertions exist for.
3. **Meet the hang, deliberately.** In `Program.cs` section B, add `Console.WriteLine(Sequences.Naturals().Count());` and run. Expected: it never finishes (Ctrl+C). `Count()` asks for everything, and there is no everything. Delete the line — and note that `Naturals().FirstFew(5).Count()` right beside it is instant.
4. **The exception that arrives late.** In `Sequences.Range`, delete the two-method shape: move the `if (count < 0) throw ...` into the iterator itself. Expected: the test `Range validates at the CALL` fails, because nothing throws until enumeration. Restore it and re-read `RangeTheLateWay`'s comment.
5. **Add `Chunked` sums.** Using `Batched`, print the sum of each of the first three batches of `Naturals()` in batches of 10 — expected `55, 155, 255` — and confirm it returns instantly from an endless source. Then try `Batched` with size 0 and check the exception arrives at the call, not at the `foreach`.
6. **Write `Repeat<T>`.** Add `public static IEnumerable<T> Forever<T>(T value) { while (true) yield return value; }` and test `Forever("ping").FirstFew(3)` gives `ping,ping,ping`. Three lines, an infinite sequence, and no allocation per item — this is the shape `Enumerable.Repeat` has in the framework.
