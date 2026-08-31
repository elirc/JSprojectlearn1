# 🏋️ Practice: Collections Choice

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Total letters (warm-up)

Add `TotalLetters(string text)` to `CharCounter` — the total number of counted characters (so spaces excluded): `TotalLetters("a b a")` is `3`. Build it on `Count` instead of walking the string again — the table already knows.

Practices: iterating a Dictionary's `.Values`, reusing your own pure methods.

Hint: `foreach (int n in counts.Values)` walks just the numbers.

Check it offline: add this Check test to `Tests.cs` — it should pass:
`Check.Equal(3, CharCounter.TotalLetters("a b a"), "three letters, spaces skipped");`
`Check.Equal(0, CharCounter.TotalLetters(""), "empty string has no letters");`

### ⭐⭐ 2. Duplicates, in first-seen order (core)

Add `Duplicates(string text)` returning a `List<char>` of every character that appears **more than once**, ordered by first appearance. `Duplicates("hello world")` is `['l', 'o']`.

Practices: combining two existing pure methods instead of writing a new loop from scratch.

Hint: `UniqueInOrder` already gives you first-seen order; `Count` gives you the numbers. Filter one by the other.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal("l,o", string.Join(",", CharCounter.Duplicates("hello world")), "l and o repeat");`
`Check.Equal(0, CharCounter.Duplicates("abc").Count, "no repeats, empty list");`

### ⭐⭐ 3. Characters two strings share (core)

Add `CommonChars(string a, string b)` returning the distinct characters that appear in **both** strings, in `a`'s first-seen order. `CommonChars("hello", "world")` is `['l', 'o']`. Use a `HashSet<char>` for the membership question — that's the whole lesson of this project.

Practices: `HashSet<T>` as "is it in there?", building a set straight from a string.

Hint: `new HashSet<char>(b)` ingests every character of `b` in one line (a string is a sequence of chars). Then walk `UniqueInOrder(a)` and keep what the set `.Contains`.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal("l,o", string.Join(",", CharCounter.CommonChars("hello", "world")), "shared: l and o");`
`Check.Equal(0, CharCounter.CommonChars("abc", "xyz").Count, "nothing shared");`

### ⭐⭐ 4. First non-repeating character (core)

Add `FirstNonRepeating(string text)`: the first character (skipping spaces) whose count is exactly 1 — `FirstNonRepeating("swiss")` is `'w'`. If every character repeats, throw an `ArgumentException`, matching the style of `MostCommon`.

Practices: two-pass algorithms (count first, then scan in order), throwing on no-answer in the project's style.

Hint: the Dictionary can't tell you what came first — the *string* can. Count once, then `foreach` over the original text and return the first char whose count is 1.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal('w', CharCounter.FirstNonRepeating("swiss"), "w is the lonely one");`
`Check.Throws<ArgumentException>(() => CharCounter.FirstNonRepeating("aabb"), "all repeats throws");`

### ⭐⭐⭐ 5. Anagram detector (challenge)

Add `IsAnagram(string a, string b)`: true when both strings contain exactly the same characters with the same counts — ignoring case and spaces, so `IsAnagram("Dormitory", "dirty room")` is `true`. The subtle part: two `Dictionary` objects are never `==` even with identical contents (they're references!) — you must compare the *tables* yourself.

Practices: comparing two dictionaries key by key, `TryGetValue` with an early `return false`.

Hint: `Count(a, ignoreCase: true)` handles case and spaces for free. If the two tables have different `.Count`, fail fast; otherwise check every key/value of one against the other.

Check it offline: add to `Tests.cs` — all three should pass:
`Check.True(CharCounter.IsAnagram("listen", "silent"), "classic anagram");`
`Check.True(CharCounter.IsAnagram("Dormitory", "dirty room"), "case and spaces ignored");`
`Check.True(!CharCounter.IsAnagram("aab", "abb"), "same letters, different counts");`

### ⭐⭐⭐ 6. Invert the table: group by count (challenge)

Add `GroupByCount(string text)` returning `Dictionary<int, List<char>>` — the count table turned inside out: key `2` maps to the list of all characters appearing twice. For `"hello"`: `1 → [h, e, o]`, `2 → [l]`. The new pattern here is a dictionary whose values are *collections*: before appending, you must make sure the list for that key exists.

Practices: `Dictionary<K, List<V>>` (the get-or-create pattern), deconstructing pairs with `foreach (var (c, n) in ...)`.

Hint: `if (!groups.TryGetValue(n, out var chars)) { chars = new List<char>(); groups[n] = chars; }` — then `chars.Add(c)` either way.

Check it offline: add to `Tests.cs` — both should pass:
```csharp
var groups = CharCounter.GroupByCount("hello");
Check.Equal(1, groups[2].Count, "exactly one char appears twice...");
Check.Equal('l', groups[2][0], "...and it's l");
```

## Solutions

### 1. Total letters

```csharp
public static int TotalLetters(string text)
{
    int total = 0;
    foreach (int n in Count(text).Values) total += n;
    return total;
}
```

WHY: `Count` already made every decision (skip spaces, one entry per char), so this method only sums `.Values` — reuse over re-loop. If the skipping rules ever change, this method is automatically right, because there's one source of truth.

### 2. Duplicates, in first-seen order

```csharp
public static List<char> Duplicates(string text)
{
    var counts = Count(text);
    var result = new List<char>();
    foreach (char c in UniqueInOrder(text))
    {
        if (counts[c] > 1) result.Add(c);
    }
    return result;
}
```

WHY: each collection answers the question it's built for — `UniqueInOrder` supplies *order*, the Dictionary supplies *counts*. Indexing `counts[c]` without `TryGetValue` is safe here because every char from `UniqueInOrder` is guaranteed to be in the table (both skip spaces, both came from the same text).

### 3. Characters two strings share

```csharp
public static List<char> CommonChars(string a, string b)
{
    var inB = new HashSet<char>(b);
    var result = new List<char>();
    foreach (char c in UniqueInOrder(a))
    {
        if (inB.Contains(c)) result.Add(c);
    }
    return result;
}
```

WHY: this is set intersection, and `HashSet` makes the membership half instant — `inB.Contains(c)` is one hash lookup, not a scan of `b`. The constructor `new HashSet<char>(b)` works because a `string` is enumerable as chars. Without the set you'd be back in the original's nested-loop O(n²) world.

### 4. First non-repeating character

```csharp
public static char FirstNonRepeating(string text)
{
    var counts = Count(text);
    foreach (char c in text)
    {
        if (c == ' ') continue;
        if (counts[c] == 1) return c;
    }
    throw new ArgumentException("every character repeats", nameof(text));
}
```

WHY: a classic two-pass shape — pass one builds the table, pass two walks the *original string* because only the string remembers order. Returning from inside the loop exits at the first hit. Throwing (not returning `'\0'` or similar) matches `MostCommon`: when there is no sensible answer, say so loudly.

### 5. Anagram detector

```csharp
public static bool IsAnagram(string a, string b)
{
    var ca = Count(a, ignoreCase: true);
    var cb = Count(b, ignoreCase: true);
    if (ca.Count != cb.Count) return false;
    foreach (var (c, n) in ca)
    {
        if (!cb.TryGetValue(c, out int other) || other != n) return false;
    }
    return true;
}
```

WHY: dictionaries are reference types, so `ca == cb` would compare *arrows*, never contents — content comparison is a loop you own. The size check first means the single foreach is sufficient: if every key of `ca` matches in `cb` and the table sizes agree, `cb` can't be hiding an extra key. `TryGetValue` handles "missing key" and "different count" in one condition.

### 6. Invert the table: group by count

```csharp
public static Dictionary<int, List<char>> GroupByCount(string text)
{
    var groups = new Dictionary<int, List<char>>();
    foreach (var (c, n) in Count(text))
    {
        if (!groups.TryGetValue(n, out var chars))
        {
            chars = new List<char>();
            groups[n] = chars;
        }
        chars.Add(c);
    }
    return groups;
}
```

WHY: `Dictionary<int, List<char>>` is the workhorse "grouping" shape (LINQ's `GroupBy` in project 04 automates exactly this). The get-or-create dance is the one new move: first char with a given count creates the list, later ones append to it. Note `out var chars` — after the `if`, `chars` is the right list in *both* branches, so `Add` happens once, unconditionally.
