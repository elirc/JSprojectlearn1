# CS 02 — value-vs-reference

**Lesson: classes are references — `=` shares, it doesn't copy. Records (and structs) give you copies and value-equality on purpose.**

No direct JS-track mirror, but the bug will feel familiar: JS objects are
references too. The C# twist is that the language ships real tools for it —
`record`, `with`, `struct` — instead of `...spread` and hope. (Immutability
gets its own project later: cs#07, mirroring js#32.)

## Run it

From the repo root:

```
dotnet run csharp/02-value-vs-reference/original.cs
dotnet run --project csharp/02-value-vs-reference/refactored
dotnet run --project csharp/02-value-vs-reference/refactored -- test
```

## What's wrong with the original?

It runs without a single error — and prints three surprises:

1. **A "backup" that isn't.** `var backup = home; backup.X = 99;` also changes
   `home.X`, because both variables point at the *same object*. `=` copied the
   *reference* (the arrow), not the object.
2. **A shared default that leaks.** Two orders built from one `defaultTags`
   list: gift-wrap the mug, and the t-shirt is gift-wrapped too — there was
   only ever ONE list.
3. **A "duplicate" order line that aliases.** Adding the same `Order` object to
   a list twice means a 50% discount on "line 1" silently discounts "line 3" —
   the total drops to 31.00 instead of 39.00. Money gone, no exception thrown.

The deep problem: `class` objects are **mutable and shared by default**, and
nothing in the code *says* which variables share. Every mutation is a
potential action-at-a-distance.

## What changed in the refactor

1. **`Point` and `Order` became `record`s** — one-liners that compare by
   *value* (`new Point(1,2) == new Point(1,2)` is `true`) and can't be mutated
   after creation. Aliasing something immutable is harmless: nobody can write
   through the alias.
2. **`with` expressions make real copies**: `home with { X = 99 }` builds a
   changed copy and leaves the original alone — exactly what `backup.X = 99`
   pretended to do. "Changing" an order means *replacing* it with a modified
   copy (`WithDiscount` returns a new `Order`).
3. **`Cart` owns its list** and exposes only `IReadOnlyList` — outside code
   can look but can't mutate the internals. Duplicating a line stores a
   genuine copy (`with { }`).
4. **A `struct` (`Pixel`) shows the third kind of type**: value types copy
   themselves on every assignment automatically — `int`, `bool`, `decimal`
   already work this way.
5. **Tests prove the semantics**: copies don't propagate changes, duplicates
   survive discounts, value-equality holds.

## Key takeaway

In both JS and C#, `=` never copies an object — it copies the arrow pointing
at it. C#'s fix is to make most data **immutable records**: when nothing can
mutate, sharing is safe, copying is `with { }`, and equality means "same
data" instead of "same arrow." Reach for `class` only when something must
have identity and changing state (like `Cart` itself).
