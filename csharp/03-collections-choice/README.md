# CS 03 — collections-choice

**Lesson: pick the collection that matches the question. Parallel arrays + manual scans become `Dictionary`, `List`, and `HashSet`.**

This mirrors `02-count-characters` from the JS track — where the fix was "use
a Map, not index gymnastics." Same fix here, with C#'s collection family.

## Run it

From the repo root:

```
dotnet run csharp/03-collections-choice/original.cs
dotnet run --project csharp/03-collections-choice/refactored
dotnet run --project csharp/03-collections-choice/refactored -- test
```

## What's wrong with the original?

The counts it prints are correct. The *data structure* is the bug factory:

- **Two parallel arrays pretend to be one table.** `letters[j]` only means
  anything if `counts[j]` is its partner. Nothing enforces that — one
  misplaced index and the data is silently garbage.
- **A hand-run bookkeeping variable (`used`)** tracks how much of the arrays
  is real data. Forget to bump it (or bump it twice) and you read junk slots.
- **"Have I seen this letter?" is a manual scan** — a nested loop, O(n²) for
  a question a Dictionary answers in one step.
- **Fixed-size arrays sized by guesswork** (`new char[text.Length]`) — works
  here, but it's a habit that breaks the day the guess is wrong.
- And the repo classic: all of it welded to `Console.WriteLine`, so none of
  it is testable.

## What changed in the refactor

1. **`Dictionary<char,int>` replaces both arrays.** Key → value IS the
   letter → count relationship, as one real table. The existence scan becomes
   the **TryGetValue pattern**: one lookup answers "is it there?" and hands
   back the value.
2. **`foreach` replaces every index loop** — no `i`, no `j`, no off-by-one
   anywhere. (`foreach (char c in text)` walks a string directly.)
3. **`HashSet<char>` handles "have I seen this?"** in `UniqueInOrder` —
   `seen.Add(c)` returns `false` for repeats, which is the entire scan logic
   in one call. A `List<char>` (growable, no `used` counter) keeps the order.
4. **Everything is a pure method on `CharCounter`** — `Count`, `MostCommon`,
   `UniqueInOrder` — string in, data out, printing left to `Program.cs`.
5. **Tests cover the edges**: empty string, spaces-only, case-sensitivity vs
   `ignoreCase: true`, punctuation, and `MostCommon` throwing when there's
   nothing to count.

## Key takeaway

The collections are a vocabulary for *intent*: `List<T>` = "an ordered bunch,"
`Dictionary<K,V>` = "look things up by key," `HashSet<T>` = "membership, no
duplicates," array = "fixed size, and I mean it." The original spent thirty
lines simulating a Dictionary with arrays; naming the right structure deleted
all thirty. If you're writing a scan-for-existence loop, the language already
has your data structure.
