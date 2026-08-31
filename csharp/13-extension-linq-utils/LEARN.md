# 📘 Learning Guide: Extension Methods & LINQ Utilities

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The js#26 utility quartet, ported to C#:

- **Compact** — drop the nulls from a list.
- **Unique** — remove duplicates, first occurrence wins.
- **Chunk** — split a list into rows of N (last row may be shorter).
- **CountBy** — tally items by a key you choose: `words.CountBy(w => w.Length)`.

Small tools, big lesson. The original packs them into a `static class Utils`, and every combined use reads *inside-out*:

```csharp
Utils.Chunk(Utils.Unique(Utils.Compact(words)), 3)
```

The refactor turns them into **extension methods** so the same pipeline reads in the order it happens:

```csharp
words.Compact().Unique().Chunk(3)
```

Along the way you'll learn what `IEnumerable<T>` really is, how `yield return` builds lazy sequences, and why a LINQ query is a *recipe*, not a result — the mechanism behind every `Where` and `Select` you've written since project 04.

## 2. Concepts you need first

### Static classes and methods (the grab-bag shape)

A `static` method belongs to no object — you call it through the class name: `Math.Max(3, 5)`, `Utils.Compact(words)`. A `static class` can *only* contain static members. It's the natural home for helpers... and the reason helper calls nest inside-out: the data goes *into the parentheses* instead of standing in front of the method.

### Extension methods: the `this` parameter

An extension method is an ordinary static method with one keyword added — `this` on the first parameter:

```csharp
public static class StringExtensions
{
    public static string Shout(this string s) => s.ToUpper() + "!";
}

// Both of these compile to the SAME call:
StringExtensions.Shout("hi");   // plain static syntax
"hi".Shout();                   // extension syntax — reads like an instance method
```

The compiler sees `"hi".Shout()`, finds no `Shout` on `string` itself, then hunts through in-scope static classes for a `Shout` whose `this` parameter fits a string. It's pure syntax sugar — no class is modified, nothing happens at runtime — but it changes how *pipelines* read, because each result stands to the left of the next step.

In JS you'd get chaining by putting methods on a prototype or wrapping in a class; C# gives it to you without touching the type. (This is how LINQ can add 50 methods to *every* collection in the language: they're all extensions on `IEnumerable<T>` in a static class called `Enumerable`.)

### `IEnumerable<T>`: "anything you can foreach"

`IEnumerable<T>` is the tiniest collection interface (interfaces: project 10): it promises exactly one ability — *hand me your items, one at a time*. `List<T>`, arrays, `HashSet<T>`, dictionary views, LINQ query results — all are `IEnumerable<T>`. Writing our helpers against it (instead of `List<string>`) means they accept **any** sequence and can chain into each other.

### `yield return`: functions that produce sequences lazily

A method whose body contains `yield return` becomes an **iterator**. It doesn't build a list and return it — it returns a paused machine that produces one item each time a `foreach` asks:

```csharp
static IEnumerable<int> CountTo(int n)
{
    Console.WriteLine("starting!");
    for (int i = 1; i <= n; i++)
        yield return i;               // pause here, hand out i, resume on demand
}

var seq = CountTo(3);                 // NOTHING prints — nothing has run
foreach (var x in seq)                // NOW "starting!" prints, then 1, 2, 3
    Console.WriteLine(x);
```

If you know JS generators (`function*` / `yield`), this is the same idea with a type signature. If not: think "a recipe card, not a cooked meal."

### Deferred execution: the recipe rule

Because iterators (and all LINQ operators) run lazily, building a query does no work:

```csharp
var query = numbers.Where(n => n > 2);   // recipe written. Nothing ran.
numbers.Add(99);
foreach (var n in query) ...             // recipe COOKED now — 99 is included!
```

Two consequences you must internalize:

1. **Late items count.** The query sees the source *as it is when enumerated*, not when built. (The demo proves it live.)
2. **Each enumeration re-runs the recipe.** Loop twice, work twice. When you want a fixed snapshot, say so: `.ToList()`.

### The eager-validation trap (this project's sharpest edge)

Put argument checking *inside* an iterator and the check is deferred along with everything else:

```csharp
static IEnumerable<int> Broken(int size)
{
    if (size < 1) throw new ArgumentOutOfRangeException(nameof(size));  // TOO LATE
    yield return size;
}

var q = Broken(0);      // no throw here?!
foreach (var x in q) {} // BOOM — the throw fires here, far from the bad call
```

The fix is a two-method split: a normal method validates immediately, then delegates to a private iterator. You'll see it in `Chunk`.

### Tools you've already met

- **LINQ `Where` / `Select` / `GroupBy`** — project 04. Today you learn what they *are*: extension methods returning lazy sequences.
- **`HashSet<T>`** — project 03. `Add` returns `false` if the item was already present, and does it in O(1) — the one-pass dedupe trick from js#26.
- **Generics and constraints** — project 11. Our helpers are generic methods; `Compact` uses constraints (`where T : class` vs `where T : struct`) because `string?` and `int?` are different machinery under the hood (project 05).
- **`Func<T, TKey>` parameters** — js#26's `keyOf` idea, seen again in project 12: the caller supplies *how to measure*, so one `CountBy` covers every grouping.

## 3. Walking through the original code

The helpers themselves are honest index loops. `Compact`:

```csharp
public static List<string> Compact(List<string?> items)
{
    var result = new List<string>();
    for (int i = 0; i < items.Count; i++)
    {
        if (!string.IsNullOrEmpty(items[i]))
        {
            result.Add(items[i]!);
        }
    }
    return result;
}
```

`Unique` is the O(n²) shape — for every item, rescan everything kept so far:

```csharp
for (int i = 0; i < items.Count; i++)
{
    bool seen = false;
    for (int j = 0; j < result.Count; j++)
    {
        if (result[j] == items[i]) { seen = true; break; }
    }
    if (!seen) result.Add(items[i]);
}
```

`Chunk` contains the file's worst line:

```csharp
var result = new List<List<string>>();
if (size <= 0) return result;              // <- the quiet lie
```

And usage is where the design fails hardest:

```csharp
var chunks = Utils.Chunk(Utils.Unique(Utils.Compact(words)), 3);
```

Read it right-to-left to follow the data: compact, then unique, then chunk. The `3` — Chunk's argument — sits at the far end of the line from the word `Chunk`.

## 4. What's wrong with it (in beginner terms)

**1. Inside-out reading doesn't scale.** Each additional step wraps another layer of parentheses around the whole pipeline. At two steps you squint; at five you give up and introduce five temporary variables just to see the order. Code you can't read in execution order is code you'll misread.

**2. `List<string>` only.** Tomorrow's `List<int>` needs the same four helpers — so you copy the class, change the types, and now every bug fix must be applied twice. Project 11 built the cure (generics); the original ignores it.

**3. Silent failure is data loss.** `Chunk(items, 0)` returns an empty list. Nothing warns. Seven words in, zero out, and the missing data is discovered three functions later where no stack trace points anywhere useful. A bad argument is a *bug in the caller* — the kindest thing a utility can do is throw immediately with the argument's name in the message.

**4. Reinventing the standard library, worse.** The nested `Unique` scan does n·n/2 comparisons where a `HashSet` does n O(1) lookups. `CountBy`'s manual dictionary dance is `GroupBy` + `ToDictionary` in one line. Every hand-rolled loop is more surface for bugs — and none of it chains.

## 5. Try it yourself first!

Convert the original before peeking. Hints, vaguest first:

1. 🌱 What one keyword turns `Utils.Compact(words)` into `words.Compact()`? Where does it go?
2. 🌿 Make each method generic — `Chunk<T>(this IEnumerable<T> source, int size)` — and the copy-paste-for-ints problem evaporates. `Compact` is the tricky one: what constraint does "drop the nulls" need?
3. 🌳 Rewrite `Unique` with a `HashSet<T>` and `yield return` — no result list at all. Then write this test: build the query, add an item to the source, enumerate, and see the late item appear. Surprised? That's deferred execution.
4. 🍎 Make `Chunk(source, 0)` throw `ArgumentOutOfRangeException` — then check *when* it throws. If the throw waits until the `foreach`, you've hit the eager-validation trap: split validation (normal method) from production (private iterator).

## 6. Understanding the refactored solution

Everything lives in one static class of extensions. `Compact` shows "LINQ where natural":

```csharp
public static IEnumerable<T> Compact<T>(this IEnumerable<T?> source) where T : class
    => source.Where(item => item is not null).Select(item => item!);
```

`Where` filters; `Select` re-types survivors from `T?` to `T`. The `!` (null-forgiving, project 05) is *earned* here — the `Where` clause just proved the item isn't null; we're telling the compiler what we know. A twin overload with `where T : struct` handles `int?`/`double?`, because for value types `T?` is `Nullable<T>` — an actual wrapper struct — and needs `.HasValue`/`.Value` instead.

`Unique` shows "iterator where instructive":

```csharp
var seen = new HashSet<T>();
foreach (var item in source)
{
    if (seen.Add(item))     // false if already present — O(1)
        yield return item;
}
```

This is roughly `Distinct()`'s real implementation — streaming, order-preserving, one pass.

`Chunk` is the validation split, the project's most transferable idiom:

```csharp
public static IEnumerable<List<T>> Chunk<T>(this IEnumerable<T> source, int size)
{
    if (size < 1)
        throw new ArgumentOutOfRangeException(nameof(size), "chunk size must be at least 1");
    return ChunkIterator(source, size);        // hand off to the lazy part
}
```

`Chunk` itself contains no `yield`, so its body runs *eagerly* — the throw fires at the call site, and there's a `Check.Throws` test pinning that down. `ChunkIterator` then batches lazily, `yield return`ing each full batch and any leftover.

`CountBy` is a one-liner on project 04's shoulders:

```csharp
=> source.GroupBy(keyOf).ToDictionary(group => group.Key, group => group.Count());
```

Note it's *eager* — it returns a filled `Dictionary`, not a lazy sequence — because a tally is a finished answer, not a stream. Choosing eager vs lazy per-method is part of the craft.

**The shadowing footnote** (from the top of `EnumerableExtensions.cs`): modern LINQ actually ships `Chunk` (.NET 6) and `CountBy` (.NET 9). Ours win at call sites because the compiler searches for extensions *outward* from the call — your own code's extensions are found before `using`-imported ones. We keep js#26's names for the mirror; in production you'd simply use the built-ins. The deeper point stands: these utilities are so universally needed that the standard library eventually absorbed them.

## 7. Words you learned (glossary)

- **Static method / static class** — code called on the class itself (`Math.Max`), not on an instance.
- **Extension method** — a static method with `this` on its first parameter, callable as if it were an instance method of that type.
- **Fluent / chaining style** — `a.F().G().H()` pipelines that read in execution order.
- **`IEnumerable<T>`** — the "can be foreach-ed" interface; the common currency all sequence helpers accept and return.
- **Iterator** — a method containing `yield return`; returns a lazy sequence instead of a built collection.
- **`yield return`** — emit one item and pause until the consumer asks for the next.
- **Lazy / eager** — doing work only when results are demanded, vs immediately.
- **Deferred execution** — LINQ/iterator laziness: building a query runs nothing; enumerating runs everything, every time.
- **Materialize (`.ToList()`)** — cook the recipe once and keep the results as a real list.
- **Eager-validation split** — public method checks arguments now, private iterator does the lazy work.
- **`ArgumentOutOfRangeException` / `nameof`** — the loud, named way to reject a bad argument at the call site.
- **Key extractor (`Func<T, TKey>`)** — a caller-supplied "how to measure" function; js#26's `keyOf`.
- **Shadowing** — your extension being chosen over an imported one with the same name.
- **O(n²) vs O(n)** — nested-rescan cost vs single-pass-with-a-set cost; invisible at 10 items, fatal at 100,000.

## 8. Experiments to try on the plane (no internet needed)

Run tests after each change: `dotnet run --project csharp/13-extension-linq-utils/refactored -- test`

1. **Trigger the eager-validation trap.** Move the `if (size < 1) throw ...` line from `Chunk` into the top of `ChunkIterator` (and delete `Chunk`'s wrapper role by making it call the iterator directly). Expected: the two `Check.Throws` tests FAIL with "(no exception thrown)" — the exception is now deferred, so calling `Chunk(0)` throws nothing until something enumerates. Put it back and watch them go green. This is the sharpest lesson in the project.
2. **Watch laziness with your own eyes.** Add `Console.WriteLine($"    unique saw {item}");` inside `Unique`'s foreach, then run the demo. Expected: the messages appear *interleaved with consumption* (during `string.Join`), not when the query is built — and if a pipeline enumerates twice, they print twice. Remove the line after (or keep it and watch tests still pass — printing isn't behaviour the tests pin).
3. **Write `TakeEvery`.** Add `public static IEnumerable<T> TakeEvery<T>(this IEnumerable<T> source, int step)` as a yield iterator (emit item 0, skip step-1, emit, ...). Include the validation split for `step < 1`. Tests: `new List<int>{1,2,3,4,5,6}.TakeEvery(2)` → `1,3,5`; chaining `words.Compact().TakeEvery(3)` works; `TakeEvery(0)` throws immediately.
4. **Mix with real LINQ.** In the demo, extend the pipeline: `words.Compact().Unique().Where(w => w.Length >= 4).Chunk(2)`. Expected: our extensions and LINQ's chain seamlessly — they're the same species, extension methods on `IEnumerable<T>`. That interop is the whole point of speaking the standard interface.
5. **Meet the built-ins ours shadow.** Change one call site to `System.Linq.Enumerable.Chunk(words.Compact(), 3)` (fully qualified, so no shadowing). Expected: same chunks, but typed as arrays (`T[]`) instead of `List<T>` — print `.GetType().Name` on a chunk from each to see the difference. Two implementations of one idea, coexisting.
