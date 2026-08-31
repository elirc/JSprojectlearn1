# 📘 Learning Guide: Collections Choice

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A character counter: feed it `"hello world, hello c#"` and it reports how many times each character appears (spaces don't count), which character is most common, and the distinct characters in first-seen order. You built this exact program in the JS track (`02-count-characters`) — there the lesson was "use a `Map`, not index gymnastics." This is the C# edition, and it introduces the three collections you'll use every day: `List<T>`, `Dictionary<TKey,TValue>`, and `HashSet<T>`.

## 2. Concepts you need first

(Projects 01–02 are assumed: types, methods, `List<T>` basics, records vs classes.)

### Arrays: the fixed-size original
An **array** is the rawest collection: a numbered row of boxes whose length is fixed at creation, forever:

```csharp
char[] letters = new char[5];   // 5 char boxes, all '\0' to start
letters[0] = 'h';
Console.WriteLine(letters.Length);   // 5 — ALWAYS 5, even though only 1 slot is "real"
```

JS arrays grow when you `push`; C# arrays don't grow, period. There is no `Add`. If you might need 6, you must allocate 6 up front — which is why the original guesses "text.Length slots should be enough" and then tracks by hand how many slots are real. Arrays are great when the size truly is fixed; they're the wrong tool for "collect an unknown number of things."

### Strings are readable like arrays
`text[3]` gives the fourth character (a `char`), and `text.Length` its length — same as JS. A `char` is its own type (single quotes): `'a'`, `' '`, `'#'`.

### `foreach` — the loop without an index
You met `foreach` briefly in project 01. It's C#'s `for...of`, and it works on strings too:

```csharp
foreach (char c in "abc")
{
    Console.WriteLine(c);   // a, then b, then c
}
```

No `i`, no `Length`, no off-by-one possible. Use `for (int i = ...)` only when you genuinely need the index.

### `Dictionary<TKey, TValue>` — the lookup table
The star of this project. A **Dictionary** stores key → value pairs and finds any key in one step — it's C#'s `Map` (and its everyday `{}`-as-lookup-object):

```csharp
var ages = new Dictionary<string, int>();
ages["Ada"] = 36;               // add or overwrite  (JS: ages.set("Ada", 36))
Console.WriteLine(ages["Ada"]); // 36                (JS: ages.get("Ada"))
ages.ContainsKey("Bo");         // false             (JS: ages.has("Bo"))
ages.Count;                     // 1                 (JS: ages.size)
```

One sharp edge: reading a key that isn't there (`ages["Bo"]`) *throws an exception* — JS's `get` quietly returns `undefined` instead. C# makes you say what should happen, which leads to →

### The TryGetValue pattern
The idiomatic "check and fetch in one move":

```csharp
if (ages.TryGetValue("Ada", out int age))
{
    Console.WriteLine($"found: {age}");   // runs — age is 36
}
else
{
    Console.WriteLine("not there");
}
```

`TryGetValue` returns a `bool` ("was it there?") and, through the **`out` parameter**, hands you the value itself. An `out` parameter is a second return value: the method fills in a variable you declare right inside the call (`out int age`). One dictionary lookup, both answers. You'll meet this `bool Try...(input, out result)` shape all over .NET — `int.TryParse`, and in project 05 you'll write your own.

### Iterating a dictionary (and deconstruction)
`foreach` over a dictionary yields key/value pairs, which you can **deconstruct** into two named variables:

```csharp
foreach (var (letter, count) in counts)
{
    Console.WriteLine($"{letter}: {count}");
}
```

Like JS's `for (const [letter, count] of map)`.

### `HashSet<T>` — membership, no duplicates
A **HashSet** stores each value at most once and answers "is this in there?" instantly — C#'s `Set`:

```csharp
var seen = new HashSet<char>();
seen.Add('a');    // true  — newly added
seen.Add('a');    // false — was already there!
seen.Contains('a');  // true
```

The gem: `Add` *tells you* whether the item was new. "Have I seen this before?" — a whole scanning loop in the original — becomes a single call whose return value is the answer.

### Optional parameters
A parameter can declare a default, making it optional at the call site — like JS default parameters:

```csharp
public static Dictionary<char, int> Count(string text, bool ignoreCase = false) { ... }

CharCounter.Count("Aa");                    // ignoreCase is false
CharCounter.Count("Aa", ignoreCase: true);  // named argument: readable at the call site
```

### Throwing exceptions (a first taste)
What should `MostCommon("")` return? There's no honest `char` answer, so the method refuses:

```csharp
if (counts.Count == 0)
    throw new ArgumentException("no countable characters", nameof(text));
```

**`throw`** stops the method and hands the caller an exception object (like JS `throw new Error(...)`). `ArgumentException` is the standard "you passed me a bad input" type, and `nameof(text)` embeds the parameter's name so the message stays correct if it's renamed. Exceptions get a full project later (cs#08); for now, know that a pure method with no sensible answer should say so loudly — and tests can *prove* it does (`Check.Throws`).

### `continue`
Inside a loop, `continue` skips straight to the next iteration — same as JS. The counters use it to skip spaces.

## 3. Walking through the original code

The setup confesses the problem in a comment:

```csharp
char[] letters = new char[text.Length];
int[] counts = new int[text.Length];
int used = 0;   // how many slots of the arrays are real data (the rest is junk)
```

Two **parallel arrays**: `letters[j]`'s partner is `counts[j]`, and only the first `used` slots mean anything. Nothing enforces either fact — the programmer just has to never slip.

The main loop, for every character:

```csharp
bool found = false;
for (int j = 0; j < used; j++)
{
    if (letters[j] == c)
    {
        counts[j] = counts[j] + 1;
        found = true;
        break;
    }
}
```

A manual scan through everything seen so far, with a `found` flag — this is a hand-simulated dictionary lookup. For each of n characters we potentially scan all previous ones: the O(n²) shape (n characters × n-long scans). At 21 characters, invisible; at a million, minutes.

```csharp
if (!found)
{
    letters[used] = c;
    counts[used] = 1;
    used = used + 1;
}
```

New character: write into BOTH arrays at slot `used`, then bump `used`. Three lines that must stay perfectly synchronized forever.

Then the printing loop (welded in, as usual), and a second scan with `best`/`bestCount` flag variables to find the most common character.

## 4. What's wrong with it (in beginner terms)

**1. The data structure is imaginary.** The "table of letter counts" exists only in the programmer's head — the code has two unrelated arrays plus a promise. Swap two lines, forget `used++`, or scan with `<=` instead of `<`, and you don't get an error — you get *garbage that prints confidently*.

**2. Existence checks by scanning don't scale.** Every "have I seen this?" walks everything seen so far. The right structure answers in one step, and — more important than speed at this size — in one *readable line*.

**3. Sizes are guesses.** `new char[text.Length]` happens to be safe here. The habit is the bug: the next guess ("100 users is plenty") ships, then overflows.

**4. Untestable, again.** Counting, ranking, and printing are one blob. You can't ask it "what's the count for 'l'?" — you can only run it and read the console.

## 5. Try it yourself first!

Rewrite `original.cs` (it's your scratch copy) so the bookkeeping disappears. Hints, vaguest first:

1. 🌱 The letters and counts want to be ONE thing, not two arrays. What type stores "this maps to that"?
2. 🌿 `var counts = new Dictionary<char, int>();` — loop `foreach (char c in text)`. For each character: if the key exists, add 1; if not, set it to 1. (`ContainsKey` works; `TryGetValue` is the pro move.)
3. 🌳 Now delete `used`. And `found`. And both `for (int j...)` loops. Nothing replaces them — that's the point. Print with `foreach (var (letter, count) in counts)`.
4. 🍎 Pull it into `static Dictionary<char, int> Count(string text)` in a class, keep printing outside, and add `MostCommon` as its own method (loop over the dictionary with best/bestCount — flag variables are fine *inside* a small pure function; the sin was mixing them into everything else).

## 6. Understanding the refactored solution

**`CharCounter.cs`** — three pure methods. The heart:

```csharp
var counts = new Dictionary<char, int>();
foreach (char raw in text)
{
    if (raw == ' ') continue;
    char c = ignoreCase ? char.ToLowerInvariant(raw) : raw;

    if (counts.TryGetValue(c, out int soFar))
        counts[c] = soFar + 1;
    else
        counts[c] = 1;
}
return counts;
```

Everything the original did in ~30 lines, in 10. The dictionary IS the letter→count table; `TryGetValue` IS the "seen before?" scan; growing is automatic; `used` doesn't exist. (`char.ToLowerInvariant` lowercases one character "the same way regardless of the computer's language settings" — that's the "invariant.")

`MostCommon` is the original's best/bestCount scan, but *contained* in a pure method over the dictionary, throwing `ArgumentException` when there's nothing to count.

`UniqueInOrder` shows the third collection:

```csharp
var seen = new HashSet<char>();
var result = new List<char>();
foreach (char c in text)
{
    if (c == ' ') continue;
    if (seen.Add(c)) result.Add(c);
}
```

`seen.Add(c)` returns `false` for repeats — the whole "does it exist" question in one call. The `List<char>` remembers first-seen order (sets don't promise order; lists do). Two collections, each doing the one thing it's for.

**`Program.cs`** — prints the counts, the most common character, and the unique-in-order list. Zero decisions.

**`Tests.cs`** — the payoff of pure methods returning *data*: `Check.Equal(2, hello['l'], ...)` asks the dictionary directly. Edge cases get lines of their own: empty string → empty table, spaces-only → empty table, `'A'` vs `'a'` under both case modes, and `Check.Throws<ArgumentException>(() => CharCounter.MostCommon(""), ...)` proving the refusal. (`() => ...` is a **lambda** — an inline function, JS's `() => ...` exactly — handed to `Check.Throws` so *it* can run the code inside a try/catch and report whether the right exception came out.)

## 7. Words you learned (glossary)

- **Array (`char[]`)** — fixed-size numbered boxes; `Length` never changes.
- **Parallel arrays** — two arrays related only by index discipline; an anti-pattern.
- **O(n²)** — work that grows with the square of input size (loops inside loops over the same data).
- **`Dictionary<TKey,TValue>`** — key→value lookup table; C#'s `Map`.
- **`ContainsKey` / indexer `[key]`** — membership test / direct access (missing key throws!).
- **TryGetValue pattern** — one call answering "present?" and "what is it?" together.
- **`out` parameter** — a variable the method fills in; a second return value.
- **Deconstruction** — `var (a, b) = pair;` splitting a pair into named variables.
- **`HashSet<T>`** — each value at most once; `Add` returns false for repeats; C#'s `Set`.
- **Optional / named parameter** — `bool ignoreCase = false` … called as `ignoreCase: true`.
- **`throw` / `ArgumentException`** — refusing a bad input loudly instead of guessing.
- **`nameof`** — the name of a symbol as a string, rename-safe.
- **Lambda (`() => ...`)** — an inline function value, like a JS arrow function.
- **`char.ToLowerInvariant`** — culture-independent lowercasing of one character.

## 8. Experiments to try on the plane (no internet needed)

1. **Feel the missing-key exception.** In `Program.cs`, add `Console.WriteLine(CharCounter.Count("abc")['z']);`. Expected: the demo crashes with `KeyNotFoundException` — C#'s louder answer to JS's silent `undefined`. Now fix your line with `TryGetValue` (print a fallback when absent) and watch it run clean. Remove the experiment.
2. **Count words instead of characters.** Add to `CharCounter`: `static Dictionary<string, int> CountWords(string text)` using `text.Split(' ')` and the same TryGetValue pattern (`Dictionary<string,int>` this time). Test: `Check.Equal(2, CharCounter.CountWords("the cat the dog")["the"], "the appears twice");`. Expected: green — you just re-typed the same *shape* with different types, which is what generics are for.
3. **Break the tie rules.** `CharCounter.MostCommon("abab")` — a and b both appear twice. Which wins? Look at the loop: only a *strictly greater* count replaces `best`, so the first key seen keeps the crown. Change `>` to `>=` and predict the new winner, then verify with a quick test.
4. **Prove HashSet ignores duplicates.** Write a test: add `'x'` to a `HashSet<char>` twice; `Check.True` the first `Add` returns true, the second false, and `Count` is 1. Expected: green — and now you know why `UniqueInOrder` needs no "already added?" check.
5. **Race the original (conceptually).** In the original, count how many times the inner `for (int j...)` loop *could* run for a 1,000-character string of unique characters (hint: 0+1+2+...+999 ≈ 500,000 comparisons). The dictionary version: 1,000 lookups. Nothing to run — just feel why "right structure" beats "faster loops."
