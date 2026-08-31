# CS 30 — iterators-yield

**Lesson: a method that returns `List<T>` must finish before it can answer.
`yield return` turns it into a sequence that produces one item at a time, on
demand — so a pipeline only ever does the work its consumer actually asks
for, and "all the natural numbers" becomes a value you can hold.**

The other half of cs#29: that project was about *when* a query runs, this one
is about *how* a lazy sequence is built in the first place. Together they are
LINQ's engine.

## Run it

```
dotnet run csharp/30-iterators-yield/original.cs
dotnet run --project csharp/30-iterators-yield/refactored
dotnet run --project csharp/30-iterators-yield/refactored -- test
```

Both versions print the same five numbers. Compare the two lines underneath.

## What's wrong with the original?

1. **5,714,427 list entries built to print five numbers.** Three helper
   methods — range, filter, take-while — each fill a `List<int>` completely
   and return it. Chained, that is three full materializations and about
   39MB of lists, of which 35 numbers mattered.
2. **A `List`-returning method cannot pause.** It has exactly one moment to
   answer, so it must have finished all the work by then. `TakeWhileBelow`
   stops *copying* after 142 items, but the 5,000,000 it is copying from were
   built before it was ever called.
3. **Endless sequences are unrepresentable.** "The natural numbers" is a
   perfectly ordinary thing to want the first five of. As a `List` it is 8GB
   and a crash, so the shape simply cannot be written.
4. **Generation is tangled with printing.** `BuildRange` decides what appears
   on the console, so it can never be used by a test, a web request or a
   report that wants to stay quiet — and its progress lines are hard-coded to
   millions.

## What changed in the refactor

- **`yield return` everywhere a `List` used to be.** A method containing
  `yield` is compiled into a state machine that produces one item, freezes
  exactly where it stands, and resumes there on the next request. Same three
  stages, same order: 35 numbers produced, ~20ms, ~8KB.
- **The stages are the LINQ operators, hand-written**: `Filtered` = `Where`,
  `Mapped` = `Select`, `Until` = `TakeWhile`, `FirstFew` = `Take`. Writing
  them once removes the magic — they are six-line `foreach` loops.
- **Infinite sequences, safely**: `Sequences.Naturals()` and `Fibonacci()`
  are `while (true)` loops that cost one variable each, because the consumer
  decides when to stop pulling.
- **`Batched`** streams a huge job in constant memory — one batch alive at a
  time, the shape of every "process 10 million rows, 1000 at a time" job.
- **The deferred-exception trap, closed.** `Range` validates its arguments in
  a normal method that *returns* the iterator, so a bad argument throws at the
  call. `RangeTheLateWay` (kept for contrast, and tested) throws whenever
  somebody eventually enumerates it — in a different file, in a `foreach`
  nobody suspects.
- **A `Counted<T>` wrapper** makes laziness an assertion: after
  `Naturals().Filtered(...).FirstFew(5)`, the test checks the source produced
  35 items, not two billion.

## Key takeaway

`return` says "here is everything"; `yield return` says "here is the next
one". That single change moves the decision about how much work to do from
the producer to the consumer — which is why laziness composes: five operators
chained together still make exactly one pass, do no work until asked, and
stop the moment the answer is known.
