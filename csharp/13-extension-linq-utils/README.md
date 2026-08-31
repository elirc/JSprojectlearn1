# CS 13 — extension-linq-utils

**Lesson: extension methods turn inside-out helper calls into left-to-right
pipelines — the same mechanism all of LINQ is built on — and `yield return`
iterators make utilities lazy.**

Mirror of js#26 (array-utils): the same chunk / compact / unique / countBy
quartet, but where JS bolts helpers onto plain functions, C# lets them *chain*.

## Run it

```
dotnet run csharp/13-extension-linq-utils/original.cs
dotnet run --project csharp/13-extension-linq-utils/refactored
dotnet run --project csharp/13-extension-linq-utils/refactored -- test
```

## What's wrong with the original?

1. **Every pipeline reads inside-out.**
   `Utils.Chunk(Utils.Unique(Utils.Compact(words)), 3)` — to follow the data
   you read right-to-left, and the `3` sits a mile from the `Chunk` it belongs
   to. Two steps is annoying; five is unreadable.
2. **It only speaks `List<string>`.** Need the same helpers for a `List<int>`
   tomorrow? Copy-paste all four methods and re-test them. (Project 11 taught
   the cure: generics.)
3. **`Chunk(items, 0)` fails silently** — returns an empty list, and the
   caller's seven words simply vanish. No exception, no clue; the bug
   surfaces somewhere else, later, as mysteriously missing data.
4. **The index loops re-implement the standard library, badly.** `Unique` is
   an O(n²) nested scan (a `HashSet` is one pass — js#26 hit the identical
   trap), and `CountBy` hand-rolls what `GroupBy` (project 04) already does.

## What changed in the refactor

- **Extension methods**: each helper's first parameter is marked `this`, so
  calls chain fluently — `words.Compact().Unique().Chunk(3)` reads in
  execution order, left to right. This is not a trick *like* LINQ; it is
  literally the mechanism LINQ is made of.
- **Generic over element type** (`IEnumerable<T>`), so the same four methods
  serve strings, ints, or your own records — the demo runs the identical
  pipeline on both. `Compact` even gets two overloads: `where T : class` for
  `string?` and `where T : struct` for `int?` (project 05 explains why those
  differ).
- **`Unique` and `Chunk` are `yield return` iterators** — lazy sequences that
  produce items on demand. The demo and a test show **deferred execution**:
  a query is a recipe, not a result, so it sees items added after it was
  built. `Chunk` also shows the classic split: validate arguments in a normal
  method *before* handing off to the iterator, or the throw is deferred too.
- **Bad input now throws `ArgumentOutOfRangeException` at the call site**,
  and `CountBy`/`Compact` are one-liners built from `GroupBy`/`Where`.
- Fun fact, taught in LEARN.md: LINQ itself later absorbed two of these
  (`Chunk` in .NET 6, `CountBy` in .NET 9) — ours shadow the built-ins, which
  is its own little lesson in how extension resolution works.

## Key takeaway

When helpers keep wrapping each other inside-out, make them extension
methods: `this IEnumerable<T>` in, fluent left-to-right pipelines out. And
once a utility returns a *sequence*, reach for `yield return` — you get
laziness for free, as long as you remember that an iterator body doesn't run
until someone loops, so validation belongs outside it.
