# 🏋️ Practice: Iterators and `yield return`

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. Every exercise adds an operator to `LazyOps.cs` or a sequence to `Sequences.cs`, and every one must work on an **infinite** source: that is the test that tells you whether you wrote an iterator or a list in disguise.

## Exercises

### ⭐ 1. Skip the first few (warm-up)

Add `Skipped<T>(this IEnumerable<T> source, int count)` — LINQ's `Skip`. It must not build anything, and it must work on `Naturals()`.

Practices: your first from-scratch iterator, and the fact that "state between items" is just a local variable.

Hint: a counter local, `continue` while it is below `count`, `yield return` after. The local survives between items because the compiler puts it in the state machine.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
Check.Equal("3,4,5", string.Join(",", Sequences.Range(1, 5).Skipped(2)), "skips the first two");
Check.Equal("1,2,3", string.Join(",", Sequences.Range(1, 3).Skipped(0)), "skipping none changes nothing");
Check.Equal("", string.Join(",", Sequences.Range(1, 3).Skipped(99)), "skipping past the end is empty, not an error");
var counted = new Counted<int>(Sequences.Naturals());
Check.Equal("4,5", string.Join(",", counted.Skipped(3).FirstFew(2)), "it works on an endless source");
Check.Equal(5, counted.Produced, "and pulls only what it needs");
```

### ⭐⭐ 2. Number the items (core)

Add `Numbered<T>(this IEnumerable<T> source)` returning `IEnumerable<(int Index, T Item)>` — JavaScript's `array.entries()`, and the thing you reach for whenever a `foreach` needs a counter.

Practices: an iterator whose output type differs from its input type, and tuples as lightweight pairs.

Hint: `yield return (i++, item);`. The tuple element names in the return type are what let callers write `foreach (var (index, item) in ...)`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var labelled = new[] { "a", "b", "c" }.Numbered().Mapped(x => $"{x.Index}:{x.Item}");
Check.Equal("0:a,1:b,2:c", string.Join(",", labelled), "each item arrives with its position");
Check.Equal("", string.Join(",", Array.Empty<string>().Numbered()), "an empty source numbers nothing");
var pairs = Sequences.Naturals().Numbered().FirstFew(3).ToList();
Check.Equal(0, pairs[0].Index, "indexes start at 0 even when the values start at 1");
Check.Equal(3, pairs[2].Item, "...and the value is the third natural number");
```

### ⭐⭐ 3. Dedupe a stream (core)

Add `Unique<T>(this IEnumerable<T> source)` — LINQ's `Distinct` — keeping the first occurrence of each value and dropping later repeats, lazily.

Practices: an iterator holding a *collection* as its state, and the memory trade-off that comes with it.

Hint: a `HashSet<T>` (cs#03) declared before the loop. `HashSet.Add` returns `false` when the value was already there, so the whole body is `if (seen.Add(item)) yield return item;`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
Check.Equal("1,2,3", string.Join(",", new[] { 1, 2, 2, 3, 1, 3 }.Unique()), "later repeats are dropped");
Check.Equal("a,b", string.Join(",", new[] { "a", "a", "b" }.Unique()), "it is generic, not int-only");
var counted = new Counted<int>(new[] { 5, 5, 5, 6, 7 });
Check.Equal("5,6", string.Join(",", counted.Unique().FirstFew(2)), "still lazy: two distinct values...");
Check.Equal(4, counted.Produced, "...cost four items, because three of them were 5s");
```

### ⭐⭐ 4. Walk two sequences at once (core)

Add `Zipped<TA, TB, TResult>(this IEnumerable<TA> first, IEnumerable<TB> second, Func<TA, TB, TResult> combine)` — LINQ's `Zip`. It ends as soon as *either* source ends, so zipping a 3-item list with `Naturals()` gives three results.

Practices: driving `IEnumerator<T>` by hand (`MoveNext`/`Current`), and `using` to dispose both cursors — the level `foreach` normally hides from you.

Hint: `foreach` can only walk one sequence, so get both enumerators yourself: `using var a = first.GetEnumerator();` and the same for `b`, then `while (a.MoveNext() && b.MoveNext()) yield return combine(a.Current, b.Current);`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
Check.Equal("1:1,2:1,3:2,4:3",
    string.Join(",", Sequences.Naturals().Zipped(Sequences.Fibonacci(), (n, f) => $"{n}:{f}").FirstFew(4)),
    "two endless sequences, walked in step");
var counted = new Counted<int>(Sequences.Naturals());
Check.Equal("11,22", string.Join(",", new[] { 10, 20 }.Zipped(counted, (a, b) => a + b)),
    "it stops when the SHORTER source ends");
Check.Equal(2, counted.Produced, "and does not pull a third item it cannot use");
```

### ⭐⭐⭐ 5. A sliding window (challenge)

Add `Windowed<T>(this IEnumerable<T> source, int size)` returning `IEnumerable<IReadOnlyList<T>>`: every run of `size` consecutive items — `1,2,3,4` with size 3 gives `[1,2,3]` then `[2,3,4]`. Nothing is yielded until the first full window exists, and memory holds `size` items, not the whole source. Validate `size` at the call, with the two-method shape.

Practices: an iterator whose state is a small rolling buffer, plus a reminder that each yielded window must be its own object.

Hint: a `Queue<T>` — `Enqueue` each item, `Dequeue` when it grows past `size`, and `yield return window.ToArray()` once it is exactly `size`. The `ToArray()` is load-bearing: yielding the queue itself would hand every caller the same object, which then changes behind their back.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var w = Sequences.Range(1, 5).Windowed(3).ToList();
Check.Equal(3, w.Count, "5 items give 3 windows of 3");
Check.Equal("1,2,3", string.Join(",", w[0]), "the first window");
Check.Equal("3,4,5", string.Join(",", w[2]), "the last one");
Check.Equal(0, Sequences.Range(1, 2).Windowed(3).Count(), "a source shorter than the window yields nothing");
var counted = new Counted<int>(Sequences.Naturals());
Check.Equal("1,2|2,3", string.Join("|", counted.Windowed(2).FirstFew(2).Mapped(x => string.Join(",", x))),
    "windows over an endless source");
Check.Equal(3, counted.Produced, "three items produced two windows of two");
Check.Throws<ArgumentOutOfRangeException>(() => Sequences.Range(1, 5).Windowed(0), "size is validated at the call");
```

### ⭐⭐⭐ 6. All the primes (challenge)

Add `Sequences.Primes()` — an endless sequence of prime numbers, built by composing what you already have. Keep the primes you have found so far in a list and test each candidate by dividing only by those, stopping when the divisor's square passes the candidate.

Practices: an iterator that reads its own past output, the fact that `Naturals().Skipped(1)` is a perfectly good source, and the payoff of the whole project — an unbounded, expensive computation that costs exactly what the consumer asks for.

Hint: `foreach (int n in Naturals().Skipped(1))` starts at 2. For each `n`, loop over the found primes: `if ((long)p * p > n) break;` (no divisor above the square root can be the first one) and `if (n % p == 0)` means composite. Add each prime to the list *and* `yield return` it.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
Check.Equal("2,3,5,7,11,13,17,19,23,29", string.Join(",", Sequences.Primes().FirstFew(10)), "the first ten primes");
Check.Equal("2,3,5,7,11,13,17,19", string.Join(",", Sequences.Primes().Until(p => p < 20)), "Until composes with it");
Check.Equal(7919, Sequences.Primes().FirstFew(1000).Last(), "the 1000th prime, from a sequence with no end");
Check.Equal(2, Sequences.Primes().First(), "and asking for one prime computes one prime");
```

## Solutions

### 1. Skip the first few

```csharp
/// LINQ's Skip. The counter is an ordinary local — the compiler lifts it into
/// the state machine, so it survives between items.
public static IEnumerable<T> Skipped<T>(this IEnumerable<T> source, int count)
{
    int seen = 0;
    foreach (var item in source)
    {
        if (seen++ < count) continue;
        yield return item;
    }
}
```

WHY: the shape is the same six lines as `Filtered` — decide, maybe yield — which is the point: every one of these operators is that shape, so once you can write one you can write any of them. Note what `Skipped(99)` does on a 3-item source: it yields nothing and does not complain, because "there was less than you asked to skip" is not an error, it is an empty sequence. Guessing wrong about that is how `Skip`/`Take` code grows defensive `if (list.Count > n)` checks it does not need.

### 2. Number the items

```csharp
/// JavaScript's array.entries(). The output type differs from the input type,
/// which is what the second type position in IEnumerable<(int, T)> buys you.
public static IEnumerable<(int Index, T Item)> Numbered<T>(this IEnumerable<T> source)
{
    int i = 0;
    foreach (var item in source)
        yield return (i++, item);
}
```

WHY: this replaces the `int i = 0; ... i++;` that otherwise infects every `foreach` that needs a position — and unlike that pattern it composes, because the index travels with the item through the rest of the pipeline. Naming the tuple elements (`Index`, `Item`) is not decoration: it is what lets callers destructure with `foreach (var (index, item) in ...)` and what makes `x.Index` readable three operators later. LINQ's own answer is the two-argument `Select((item, index) => ...)`, which is the same idea welded onto one operator instead of standing alone.

### 3. Dedupe a stream

```csharp
/// LINQ's Distinct: first occurrence wins, later repeats are dropped. Memory
/// holds every DISTINCT value seen so far — the price of dedupe, and the
/// reason this one operator is not safe on an unbounded source of unique items.
public static IEnumerable<T> Unique<T>(this IEnumerable<T> source)
{
    var seen = new HashSet<T>();
    foreach (var item in source)
        if (seen.Add(item))
            yield return item;
}
```

WHY: `HashSet.Add` returning `bool` collapses "have I seen this?" and "remember it" into one O(1) call — the same trick cs#03 used for membership. The honest caveat belongs in the comment: this is a lazy operator with *unbounded state*. On `Naturals().Unique()` the set grows forever, which is a memory leak wearing an iterator's clothes. Laziness solves the "produce too much" problem; it does not solve "remember too much", and telling the two apart is most of what senior code review on stream processing consists of.

### 4. Walk two sequences at once

```csharp
/// LINQ's Zip. foreach can only drive ONE sequence, so this drives two cursors
/// by hand — and `using` disposes both, which foreach would have done for us.
public static IEnumerable<TResult> Zipped<TA, TB, TResult>(
    this IEnumerable<TA> first, IEnumerable<TB> second, Func<TA, TB, TResult> combine)
{
    using var a = first.GetEnumerator();
    using var b = second.GetEnumerator();
    while (a.MoveNext() && b.MoveNext())
        yield return combine(a.Current, b.Current);
}
```

WHY: this is the exercise where `foreach`'s curtain comes down — `foreach` *is* `GetEnumerator()` + `while (MoveNext())` + `Current` + `Dispose()`, and when you need two cursors you write it out. The `&&` matters twice: it ends the sequence as soon as either side runs dry (so zipping against `Naturals()` is safe), and it short-circuits, so when `a` is exhausted `b` is never advanced — the test asserting `counted.Produced == 2` is checking exactly that. `using` matters because an iterator's `Dispose` is what runs a source's `finally` blocks (closing files, connections); dropping enumerators on the floor is how file handles leak.

### 5. A sliding window

```csharp
/// Every run of `size` consecutive items. Memory holds `size` items, not the
/// source — so this works on a 40GB log file and on an endless sequence.
public static IEnumerable<IReadOnlyList<T>> Windowed<T>(this IEnumerable<T> source, int size)
{
    if (size < 1) throw new ArgumentOutOfRangeException(nameof(size), "window size must be at least 1");
    return Iterate(source, size);

    static IEnumerable<IReadOnlyList<T>> Iterate(IEnumerable<T> source, int size)
    {
        var window = new Queue<T>(size);
        foreach (var item in source)
        {
            window.Enqueue(item);
            if (window.Count > size) window.Dequeue();     // roll forward
            if (window.Count == size) yield return window.ToArray();
        }
    }
}
```

WHY: three details carry it. The `Queue<T>` gives O(1) at both ends, which is what "rolling" needs. The `ToArray()` copy is the one allocation per window and it is mandatory: yielding `window` itself would hand every caller the same object, and their "windows" would all silently become the last one — a bug that looks like data corruption and is really aliasing (cs#02). And the two-method shape puts the `size` check at the call, where the mistake is. Sliding windows are how moving averages, rate limits and "three failures in a row" alerts are computed, all of them over streams too big to hold.

### 6. All the primes

```csharp
/// An endless prime sequence that costs exactly what you ask of it.
public static IEnumerable<int> Primes()
{
    var found = new List<int>();
    foreach (int n in Naturals().Skipped(1))          // 2, 3, 4, ...
    {
        bool isPrime = true;
        foreach (int p in found)
        {
            if ((long)p * p > n) break;               // no need to look past sqrt(n)
            if (n % p == 0) { isPrime = false; break; }
        }
        if (isPrime)
        {
            found.Add(n);                             // remember it for the next candidate
            yield return n;
        }
    }
}
```

WHY: this is the whole project in one method. It is unbounded (there is no "how many primes do you want?" parameter), it composes (`Primes().Until(p => p < 20)` works, and stops the search), it is expensive per item (so laziness is real money), and it consumes its own past output — the `found` list is state that only makes sense because the method can pause between items. `Primes().First()` does one division-free check and stops; `FirstFew(1000)` runs to 7919 and stops. Written eagerly, the method would need a `count` parameter, would have to be re-run from scratch for a different count, and could not be handed to `Until` at all. The `(long)p * p` cast is the one boring detail: at `int` scale that product overflows long before the sequence does.
