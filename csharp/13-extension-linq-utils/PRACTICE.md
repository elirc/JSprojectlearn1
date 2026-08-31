# 🏋️ Practice: Extension Methods & LINQ Utilities

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. End the pipeline in style (warm-up)

Notice how every demo line and every test wraps the result in `string.Join(", ", ...)` — an inside-out call at the *end* of a left-to-right pipeline. Add `JoinWith<T>(this IEnumerable<T> source, string separator)` so pipelines finish the way they read: `words.Compact().Unique().JoinWith(", ")`. It works for any element type, because `string.Join` calls `ToString()` on each item.

Practices: writing your first extension method from scratch — `this` on the first parameter, a `static` method in a `static` class.

Hint: the body is one expression: `string.Join(separator, source)`. Note that the argument order flips: the sequence goes second in `string.Join`, first in your method.

Check it offline: add these Check tests to `Tests.cs` — both should pass:
```csharp
Check.Equal("a, b, c", new List<string> { "a", "b", "c" }.JoinWith(", "), "joins strings");
Check.Equal("1-2-3", new List<int?> { 1, null, 2, 3 }.Compact().JoinWith("-"), "chains onto a pipeline, any type");
```

### ⭐⭐ 2. Look at your neighbour (core)

Add `Pairwise<T>(this IEnumerable<T> source)` returning `IEnumerable<(T Previous, T Current)>` — for `1,2,3,4` it yields `(1,2)`, `(2,3)`, `(3,4)`. A sequence of 0 or 1 items yields nothing. Make it a `yield return` iterator so it stays lazy and works on an infinite sequence. It is the tool for "differences between consecutive readings" — `temps.Pairwise().Select(p => p.Current - p.Previous)`.

Practices: `yield return` with state carried across iterations, value tuples with named elements as a return type.

Hint: keep `T previous = default!;` and a `bool hasPrevious` flag — you cannot compare `previous` to `null` because `T` might be `int`. Yield *before* updating `previous`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var steps = new List<int> { 1, 2, 4, 8 };
Check.Equal("1-2,2-4,4-8", steps.Pairwise().Select(p => $"{p.Previous}-{p.Current}").JoinWith(","), "consecutive pairs");
Check.Equal("1,2,4", steps.Pairwise().Select(p => p.Current - p.Previous).JoinWith(","), "differences between neighbours");
Check.Equal(0, new List<int> { 9 }.Pairwise().Count(), "one item has no neighbour; empty in, empty out");
```

### ⭐⭐ 3. Unique by something (core)

`Unique()` de-duplicates on the whole item. Add `UniqueBy<T, TKey>(this IEnumerable<T> source, Func<T, TKey> keyOf)` — first-seen-wins de-duplication on a *derived* key, so `people.UniqueBy(p => p[0])` keeps one word per starting letter. It is the same `keyOf` trick `CountBy` already uses: the caller decides what "the same" means.

Practices: a second type parameter inferred from a lambda, `HashSet<TKey>`, and generalising a method by parameterising the thing it hard-codes.

Hint: `Unique`'s body, with `seen.Add(item)` becoming `seen.Add(keyOf(item))`. Keep it a `yield return` iterator.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var animals = new List<string> { "ant", "bee", "ape", "cow", "bat" };
Check.Equal("ant,bee,cow", animals.UniqueBy(a => a[0]).JoinWith(","), "one word per starting letter, first wins");
Check.Equal(5, animals.UniqueBy(a => a).Count(), "keying on the item itself == Unique()");
var sizes = new List<string> { "hi", "to", "cat", "dog", "a" };
Check.Equal("hi,cat,a", sizes.UniqueBy(w => w.Length).JoinWith(","), "any key works — one word per length");
```

### ⭐⭐ 4. Port from JS: split a list in two (core)

Port this js#26-style helper:

```js
function partition(arr, predicate) {
  const yes = [], no = [];
  for (const x of arr) (predicate(x) ? yes : no).push(x);
  return [yes, no];
}
```

as `Partition<T>(this IEnumerable<T> source, Func<T, bool> predicate)` returning a named tuple `(List<T> Matching, List<T> Others)`, so callers write `var (evens, odds) = numbers.Partition(n => n % 2 == 0);`. Unlike `Unique` and `Chunk`, this one must **not** be lazy — think about why before you read the WHY.

Practices: returning a tuple instead of JS's array destructuring, `Func<T, bool>` as a predicate, and recognising which utilities *cannot* be iterators.

Hint: `(predicate(item) ? matching : others).Add(item);` is legal C# — the conditional yields a `List<T>` and you call `Add` on it. Careful: `Rest` is a reserved tuple element name (`error CS8126`); use `Others`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var (evens, odds) = new List<int> { 1, 2, 3, 4, 5, 6 }.Partition(n => n % 2 == 0);
Check.Equal("2,4,6", evens.JoinWith(","), "matching items, in order");
Check.Equal("1,3,5", odds.JoinWith(","), "and everything else, in order");
var (none, all) = new List<string> { "a", "b" }.Partition(s => false);
Check.Equal(0, none.Count, "a predicate nobody satisfies gives an empty first list");
Check.Equal(2, all.Count, "and puts everything in the second");
```

### ⭐⭐⭐ 5. Remember what you already produced (challenge)

Deferred execution has a sting: enumerating a lazy query twice runs the source twice. Prove it, then fix it with `Memoize<T>(this IEnumerable<T> source)` — a sequence that pulls each item from the source **at most once**, caches it, and replays the cache to every later enumeration. It must stay lazy: `Enumerable.Range(1, 1_000_000).Select(expensive).Memoize().Take(3)` may only touch three items.

Practices: writing a custom `IEnumerable<T>` class instead of a `yield` method, driving an `IEnumerator<T>` by hand, and the laziness-versus-repetition trade-off `ToList()` resolves the blunt way.

Hint: a private nested `sealed class MemoizedSequence<T> : IEnumerable<T>` holding `List<T> cache` and an `IEnumerator<T>? reader`. Its `GetEnumerator` loops on an index: serve `cache[i]` if it exists, otherwise `reader.MoveNext()`, cache `reader.Current`, and yield it; when the reader is exhausted, dispose it, set it to `null`, and `yield break`. You will need `using System.Collections;` for the non-generic `IEnumerable.GetEnumerator()`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
int reads = 0;
var twice = Enumerable.Range(1, 4).Select(n => { reads++; return n * n; });
_ = twice.Sum(); _ = twice.Sum();
Check.Equal(8, reads, "a plain query re-runs its source every time");

reads = 0;
var once = Enumerable.Range(1, 4).Select(n => { reads++; return n * n; }).Memoize();
Check.Equal(30, once.Sum(), "memoized results are correct");
Check.Equal(30, once.Sum(), "and the same the second time");
Check.Equal(4, reads, "but the source ran ONCE");

reads = 0;
var big = Enumerable.Range(1, 1000).Select(n => { reads++; return n; }).Memoize();
Check.Equal("1,2,3", big.Take(3).JoinWith(","), "still lazy");
Check.Equal(3, reads, "only three items were ever pulled");
```

### ⭐⭐⭐ 6. Generic math (challenge)

Add `Median<T>(this IEnumerable<T> source) where T : INumber<T>` (you will need `using System.Numerics;`). It sorts, then returns the middle item, or the average of the two middle items for an even count; an empty sequence throws `InvalidOperationException` (the same choice LINQ's `Average` makes). One method now serves `int`, `double`, `decimal`, `long` — because the constraint says "T has `+`, `/` and an ordering", not "T is `double`".

Practices: **generic math** (.NET 7+) — static abstract interface members, `T.CreateChecked`, and constraints that describe *capabilities* rather than types.

Hint: `source.Order().ToList()` sorts with the default comparer. For the even case you need the literal 2 *as a `T`*: `T.CreateChecked(2)` — calling a static method through a type parameter, which C# only gained recently.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
Check.Equal(3, new List<int> { 5, 1, 3 }.Median(), "odd count -> the middle item");
Check.Equal(2.5, new List<double> { 4.0, 1.0, 2.0, 3.0 }.Median(), "even count -> the average of the middle two");
Check.Equal(20m, new List<decimal> { 30m, 10m, 20m }.Median(), "decimals work too — one method, every number type");
Check.Equal(2, new List<int> { 1, 2, 3, 4 }.Median(), "int math truncates: (2+3)/2 == 2, not 2.5");
Check.Throws<InvalidOperationException>(() => new List<int>().Median(), "the median of nothing is undefined");
```

## Solutions

### 1. End the pipeline in style

```csharp
/// The pipeline's full stop: turns any sequence into one string.
public static string JoinWith<T>(this IEnumerable<T> source, string separator)
    => string.Join(separator, source);
```

WHY: two lines of ceremony (`static class`, `this`) buy you a call that reads in execution order, which is the entire thesis of the project — and this one also shows that an extension may *end* a chain by returning something that is not a sequence, exactly as LINQ's `Count()`, `First()` and `ToList()` do. `string.Join` handles the `ToString()` and the separator placement, so there is no loop to get wrong at the edges.

### 2. Look at your neighbour

```csharp
/// Yields consecutive pairs: 1,2,3 -> (1,2), (2,3). Lazy.
public static IEnumerable<(T Previous, T Current)> Pairwise<T>(this IEnumerable<T> source)
{
    bool hasPrevious = false;
    T previous = default!;

    foreach (var item in source)
    {
        if (hasPrevious) yield return (previous, item);
        previous = item;
        hasPrevious = true;
    }
}
```

WHY: the `hasPrevious` flag exists because `T` is unconstrained — `previous == null` would not compile for `int`, and would be wrong for a sequence that legitimately contains nulls. `default!` gives the variable a starting value while telling the nullable analyzer "I know, and I promise never to read it before assigning" — which the flag guarantees. Because it is an iterator, `Pairwise` never materialises the sequence, so it works on a stream or an infinite range.

### 3. Unique by something

```csharp
/// First-seen-wins de-duplication on a derived key.
/// (LINQ ships this as DistinctBy() since .NET 6 — ours shadows it.)
public static IEnumerable<T> UniqueBy<T, TKey>(this IEnumerable<T> source, Func<T, TKey> keyOf)
{
    var seen = new HashSet<TKey>();
    foreach (var item in source)
    {
        if (seen.Add(keyOf(item)))
            yield return item;
    }
}
```

WHY: `Unique` is now the special case where `keyOf` is identity, which is the usual sign a method was generalised correctly. `TKey` is inferred from the lambda's return type, so callers never write it — the reason `GroupBy`, `OrderBy` and `ToDictionary` all feel effortless despite having two or three type parameters. `HashSet<TKey>.Add` returning `false` for a repeat is the same one-call test-and-insert `Unique` uses, and it keeps this O(n) instead of the original's nested scan.

### 4. Port from JS: split a list in two

```csharp
/// One pass, two buckets. Eager on purpose — see the WHY.
public static (List<T> Matching, List<T> Others) Partition<T>(
    this IEnumerable<T> source, Func<T, bool> predicate)
{
    var matching = new List<T>();
    var others = new List<T>();

    foreach (var item in source)
        (predicate(item) ? matching : others).Add(item);

    return (matching, others);
}
```

WHY: it cannot be an iterator because it returns **two** sequences at once — a lazy version would have to buffer everything the caller has not asked for yet, so it would either enumerate the source twice (running the predicate twice per item) or secretly build the same two lists. Being honest about that is better than pretending. The named tuple is C#'s answer to JS's `return [yes, no]`, and it is strictly better: `var (evens, odds) = ...` destructures the same way, but the names survive in IntelliSense and the compiler stops you swapping them.

### 5. Remember what you already produced

```csharp
// at the top of EnumerableExtensions.cs
using System.Collections;

/// Pulls each source item at most once, caches it, and replays the cache to
/// every later enumeration — laziness kept, repetition removed.
public static IEnumerable<T> Memoize<T>(this IEnumerable<T> source) => new MemoizedSequence<T>(source);

private sealed class MemoizedSequence<T> : IEnumerable<T>
{
    private readonly List<T> cache = new();
    private IEnumerator<T>? reader;          // null once the source is exhausted

    public MemoizedSequence(IEnumerable<T> source) => reader = source.GetEnumerator();

    public IEnumerator<T> GetEnumerator()
    {
        for (int i = 0; ; i++)
        {
            if (i < cache.Count) { yield return cache[i]; continue; }   // already known
            if (reader is null) yield break;                            // source is finished
            if (!reader.MoveNext()) { reader.Dispose(); reader = null; yield break; }
            cache.Add(reader.Current);
            yield return reader.Current;                                // brand new item
        }
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
```

WHY: a plain `yield` method could not do this, because each call to it starts a *fresh* state machine with a fresh source — the cache has to live in an object that outlives any single enumeration, which is why `Memoize` returns a class. Driving the enumerator by hand (`MoveNext`/`Current`/`Dispose`) is what `foreach` compiles into, so this is a look under the hood of project 01's `yield return`. Compare it to `ToList()`: that also stops re-running the source, but it forces *everything* immediately — `Memoize` is the version that still lets `.Take(3)` mean three. (It is not thread-safe, and two simultaneous enumerations would fight over `reader`; real implementations such as `System.Interactive`'s `Memoize` add a lock.)

### 6. Generic math

```csharp
// at the top of EnumerableExtensions.cs
using System.Numerics;

/// The median of any numeric sequence: int, double, decimal, long...
public static T Median<T>(this IEnumerable<T> source) where T : INumber<T>
{
    var sorted = source.Order().ToList();
    if (sorted.Count == 0)
        throw new InvalidOperationException("the median of an empty sequence is undefined");

    int mid = sorted.Count / 2;
    return sorted.Count % 2 == 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / T.CreateChecked(2);
}
```

WHY: before .NET 7 this method had to be copy-pasted per numeric type, because there was no way to say "T supports `+`". `INumber<T>` fixed that with **static abstract interface members**: the interface declares the operators and factories, so `T.CreateChecked(2)` calls a static method *through a type parameter* — you are constraining on capability, which is what generics wanted to express all along. The `int` case truncating to `2` is not a bug in the method but the arithmetic of the type the caller chose; a version returning `double` would silently misrepresent `decimal` money, so returning `T` is the honest signature. `Order()` (.NET 7) is `OrderBy(x => x)` with less noise, and it sorts with `Comparer<T>.Default`, which every numeric type provides.
