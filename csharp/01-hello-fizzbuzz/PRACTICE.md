# 🏋️ Practice: Hello FizzBuzz

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Shout it (warm-up)

Add a method `Shout` to `FizzBuzz.cs` that returns the FizzBuzz answer in ALL CAPS with a `!` on the end: `Shout(3)` gives `"FIZZ!"`, `Shout(7)` gives `"7!"`. It must not repeat the divisibility rules — it should build on the method that already knows them.

Practices: calling your own methods, string methods, declaring a return type.

Hint: strings have a `.ToUpper()` method, and `+` glues strings together just like JS.

Check it offline: add this Check test to `Tests.cs` — it should pass:
`Check.Equal("FIZZ!", FizzBuzz.Shout(3), "3 shouts FIZZ!");`
`Check.Equal("7!", FizzBuzz.Shout(7), "7 shouts 7!");`

### ⭐⭐ 2. Count a word (core)

Add `CountOf(string word, int start, int end)` that returns how many lines in that range are exactly `word`. For example, `CountOf("Fizz", 1, 15)` is `4` (3, 6, 9, 12 — not 15, because 15 is `"FizzBuzz"`).

Practices: `foreach`, comparing strings with `==` (safe in C# — it compares contents, no coercion), returning an `int`.

Hint: you already have a method that produces all the lines in a range — loop over its result and count matches.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal(4, FizzBuzz.CountOf("Fizz", 1, 15), "four plain Fizzes up to 15");`
`Check.Equal(6, FizzBuzz.CountOf("FizzBuzz", 1, 100), "six FizzBuzzes in the real run");`

### ⭐⭐ 3. A stepping Range (core)

Write a second `Range` method that takes a third parameter: `Range(int start, int end, int step)` counts up by `step` instead of by 1. In C# two methods may share a name if their parameter lists differ — this is called **overloading**, and the compiler picks the right one from the arguments you pass.

Practices: method overloading, the third slot of a `for` loop.

Hint: the only change from the existing `Range` is `n += step` instead of `n++`. Don't touch the original — write a new method with the same name below it.

Check it offline: add to `Tests.cs` — it should pass (1, 4, 7, 10 → and 10 is a multiple of 5):
`Check.Equal("1,4,7,Buzz", string.Join(",", FizzBuzz.Range(1, 10, 3)), "stepping by 3");`

### ⭐⭐ 4. Port from JS: sum of multiples (core)

Port this JS function into `FizzBuzz.cs` as `SumOfMultiples`:

```js
function sumOfMultiples(limit) {
  let sum = 0;
  for (let n = 1; n <= limit; n++) {
    if (n % 3 === 0 || n % 5 === 0) sum += n;
  }
  return sum;
}
```

Practices: translating JS to C# line by line — declared types, `||`, `+=` all carry over.

Hint: `let sum = 0` becomes `int sum = 0`; the rest is nearly identical. The method signature declares it returns `int`.

Check it offline: add to `Tests.cs` — it should pass (3+5+6+9+10 = 33):
`Check.Equal(33, FizzBuzz.SumOfMultiples(10), "multiples of 3 or 5 up to 10 sum to 33");`

### ⭐⭐⭐ 5. A rules engine with tuples (challenge)

The README brags that adding a rule is one line — make it *zero* lines. Write an overload `For(int n, List<(int Divisor, string Word)> rules)` where the caller passes the rules as a list of **tuples** (lightweight pairs, written `(3, "Fizz")`). With rules `(2, "Even")` and `(7, "Lucky")`, `For(14, rules)` gives `"EvenLucky"` and `For(3, rules)` gives `"3"`.

Practices: value tuples, `foreach` over a list of tuples, overloading with a fancier parameter.

Hint: inside the loop each element is one tuple; read its parts as `rule.Divisor` and `rule.Word`. The body is the same build-up-parts pattern as `For(n)`.

Check it offline: add to `Tests.cs` — both should pass:
```csharp
var funky = new List<(int Divisor, string Word)> { (2, "Even"), (7, "Lucky") };
Check.Equal("EvenLucky", FizzBuzz.For(14, funky), "custom rules combine");
Check.Equal("3", FizzBuzz.For(3, funky), "no rule matched -> the number");
```

### ⭐⭐⭐ 6. Lazy lines with `yield return` (challenge)

`Range(1, 1000000)` builds a million-item list before you see line one. Write `Lazy(int start, int end)` that returns `IEnumerable<string>` and uses `yield return` to hand out one line at a time, only when the caller asks for it. `foreach` works on it exactly like a list.

Practices: iterators (`yield return`) — C#'s version of JS generator functions (`function*` / `yield`).

Hint: same loop as `Range`, but instead of `lines.Add(For(n))` you write `yield return For(n);` and there is no list at all. The return type is `IEnumerable<string>`.

Check it offline: add to `Tests.cs` — both should pass (`.Count()` and `.First()` come from LINQ, already available via implicit usings):
`Check.Equal(5, FizzBuzz.Lazy(1, 5).Count(), "lazy range still has 5 items");`
`Check.Equal("Fizz", FizzBuzz.Lazy(3, 3).First(), "lazy single item works");`

## Solutions

### 1. Shout it

```csharp
public static string Shout(int n)
{
    return For(n).ToUpper() + "!";
}
```

WHY: the whole point of the refactor was that `For` returns a value — so new features *decorate* that value instead of re-deciding the rules. If the rules ever change (Bazz for 7), `Shout` is automatically right. One expression, zero duplication.

### 2. Count a word

```csharp
public static int CountOf(string word, int start, int end)
{
    int count = 0;
    foreach (var line in Range(start, end))
    {
        if (line == word) count++;
    }
    return count;
}
```

WHY: `Range` already produces the data, so counting is just a loop over it. Note `line == word` — in C#, `==` on strings compares the actual text (no `===` needed, no coercion possible). The method declares `int` as its return type, and the compiler will refuse any path that forgets to return one.

### 3. A stepping Range

```csharp
public static List<string> Range(int start, int end, int step)
{
    var lines = new List<string>();
    for (int n = start; n <= end; n += step)
    {
        lines.Add(For(n));
    }
    return lines;
}
```

WHY: both methods are named `Range`; the compiler tells them apart by parameter count — that's overloading, something JS can't do (a second `function Range` would silently replace the first!). `Range(1, 10)` still calls the old one; `Range(1, 10, 3)` calls this one.

### 4. Port from JS: sum of multiples

```csharp
public static int SumOfMultiples(int limit)
{
    int sum = 0;
    for (int n = 1; n <= limit; n++)
    {
        if (n % 3 == 0 || n % 5 == 0) sum += n;
    }
    return sum;
}
```

WHY: an almost mechanical port — `let` becomes a declared `int`, `===` becomes the already-safe `==`, and the `function` keyword becomes a method signature that states its return type. This is the shape of most JS→C# translation: the logic survives untouched; the types become explicit.

### 5. A rules engine with tuples

```csharp
public static string For(int n, List<(int Divisor, string Word)> rules)
{
    var parts = new List<string>();
    foreach (var rule in rules)
    {
        if (n % rule.Divisor == 0) parts.Add(rule.Word);
    }
    return parts.Count > 0 ? string.Concat(parts) : n.ToString();
}
```

WHY: `(int Divisor, string Word)` is a value tuple type — a pair with named parts, no class ceremony needed. The hard-coded `if`s became a loop over data, so "add a rule" now means changing the *caller's list*, not this method. The original `For(n)` could even be rewritten as `For(n, classicRules)` — same pattern, one source of truth.

### 6. Lazy lines with `yield return`

```csharp
public static IEnumerable<string> Lazy(int start, int end)
{
    for (int n = start; n <= end; n++)
    {
        yield return For(n);
    }
}
```

WHY: `yield return` turns the method into an **iterator**: calling `Lazy(1, 1000000)` does no work at all — each line is computed only when `foreach` (or `.Count()`, `.First()`) pulls it. It's the exact idea of a JS generator (`function*`), and it's how LINQ (project 04) stays cheap on huge sequences.
