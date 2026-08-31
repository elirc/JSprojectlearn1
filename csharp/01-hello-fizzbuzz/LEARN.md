# 📘 Learning Guide: Hello FizzBuzz (your first C#)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The same FizzBuzz you built on day one of the JS track: count 1 to 100, print `Fizz` for multiples of 3, `Buzz` for multiples of 5, `FizzBuzz` for both, the number otherwise. You already know the *lesson* (separate computing from printing). What's new is the *language* — so this guide is really your C# landing pad. Every C# project after this one assumes the concepts in section 2.

## 2. Concepts you need first

### What "compiled" means (the biggest difference from JS)
JavaScript is *interpreted*: Node reads your text and runs it directly, discovering mistakes only when it hits them. C# is **compiled**: a program called the **compiler** first translates ALL your code into a runnable form, checking every line as it goes. If anything doesn't make sense — a typo, a number where text belongs — you get a **compile error** and *nothing runs at all*.

This feels strict at first. It's actually the deal of a lifetime: whole categories of bugs that JS throws at you at 2am *while running* get caught in C# before the program starts.

### The .NET SDK and `dotnet run`
**.NET** is the platform C# runs on (like Node is for JS), and the **SDK** (software development kit) is the toolbox you installed. The `dotnet` command is your `node`:

```
dotnet run original.cs          <- compile + run a single file (like: node original.js)
dotnet run --project refactored <- compile + run a whole project folder
```

The first run takes a few seconds — that's the compiler doing its checking. Runs after that are much faster because the result is cached.

### Static typing: every value has a declared type
In JS a variable holds anything: `let x = 5; x = "five";` — fine. In C#, a variable has a **type**, fixed forever:

```csharp
int count = 5;          // int = whole number
string name = "Sam";    // string = text
bool ready = true;      // bool = true/false
count = "five";         // COMPILE ERROR: can't put a string in an int box
```

Common types you'll meet constantly: `int` (whole numbers), `string` (text), `bool` (true/false), `double` and `decimal` (numbers with decimal points), `char` (a single character, in 'single quotes').

### `var` — type inference (NOT the JS `var`!)
Writing types everywhere gets repetitive, so C# lets the compiler figure it out:

```csharp
var count = 5;        // compiler sees 5, makes count an int — still 100% an int forever
var name = "Sam";     // a string
```

Careful with the false friend: **JS `var` is the leaky old keyword to avoid; C# `var` is modern and safe.** It just means "compiler, you write the type for me." The variable is exactly as strictly typed as if you'd spelled it out.

### `Console.WriteLine` — your `console.log`
```csharp
Console.WriteLine("hello");   // prints hello and a newline
Console.WriteLine(42);        // prints 42
```
One difference from `console.log`: it takes ONE thing, not a comma-list. To mix text and values, use interpolation ↓

### String interpolation: `$"..."`
JS template literals use backticks: `` `n is ${n}` ``. C# uses a `$` before ordinary quotes:

```csharp
int n = 7;
Console.WriteLine($"n is {n}, doubled is {n * 2}");  // n is 7, doubled is 14
```

Same idea, different costume: `$"...{expression}..."`.

### Statements end with `;` and blocks use `{ }`
Semicolons are optional-ish in JS; in C# they're mandatory — every statement ends with `;`, and the compiler will tell you if you forget. `if`, `for`, and friends look almost identical to JS:

```csharp
for (int i = 1; i <= 3; i++)
{
    if (i % 2 == 0) { Console.WriteLine("even"); }
    else { Console.WriteLine("odd"); }
}
```

Note `==` here is safe: C# `==` never does type coercion (there is no `===` because it isn't needed — `"3" == 3` is a *compile error*, not `true`).

### Top-level statements (why original.cs has no boilerplate)
Classic C# demands ceremony before "hello world": a class, a `Main` method. Modern C# lets ONE file in a program skip it and just start with statements — these are called **top-level statements**:

```csharp
Console.WriteLine("look ma, no boilerplate");
```

That's a complete C# program. Behind the scenes the compiler wraps it in the traditional `Main` for you. Our `original.cs` and every `Program.cs` in this track use this style.

### Methods (functions that live in classes)
C# has no free-floating `function` keyword. Reusable code lives in **methods** inside **classes**. Compare:

```js
// JS
function double(n) { return n * 2; }
```

```csharp
// C#
public static class MathStuff
{
    public static int Double(int n)
    {
        return n * 2;
    }
}
// called as: MathStuff.Double(4)
```

Reading `public static int Double(int n)` left to right: `public` = anyone may call it; `static` = it belongs to the class itself, no object needed (like a plain JS function — proper objects arrive in project 02); `int` = **the return type** (a method must declare what type it returns); `Double` = the name; `(int n)` = one parameter, an int named n.

### PascalCase and other C# naming conventions
JS convention is `camelCase` for nearly everything. C# convention:

- **PascalCase** (first letter capital) for classes, methods, and properties: `FizzBuzz`, `WriteLine`, `Count`
- **camelCase** for local variables and parameters: `parts`, `bestCount`

That's why it's `Console.WriteLine` and not `console.writeLine` — you'll adjust in a day.

### `List<T>` — the everyday array
C# arrays (`int[]`) are fixed-size. The everyday "growable array" is `List<T>`, where **`<T>`** means "of some type T" (this is called a **generic**):

```csharp
var parts = new List<string>();     // like: const parts = []  (but only strings allowed!)
parts.Add("Fizz");                  // like: parts.push("Fizz")
parts.Count;                        // like: parts.length
parts[0];                           // same indexing as JS
string.Concat(parts);               // like: parts.join("")
```

`new` creates an object — JS has `new` too, C# just uses it for everything.

### The ternary operator — identical to JS
```csharp
string label = age >= 18 ? "adult" : "minor";
```

### `n.ToString()`
Converts a value to text, like `String(n)` in JS: `7.ToString()` gives `"7"`. `FizzBuzz.For` returns a string either way, so plain numbers get converted — one consistent return type (in C# that's not just tidy, it's *required*: the method promised `string`).

### A project vs a single file
`original.cs` runs alone — .NET 10 can run a single `.cs` file directly, great for scripts. Real apps are **projects**: a folder with a `.csproj` file (a small XML file describing the app — think `package.json`) plus any number of `.cs` files that are all compiled together. That's what `refactored/` is. Files in one project see each other automatically — **no `import`/`export` needed at all** (C# has `using` for namespaces, but the implicit defaults cover us for now).

## 3. Walking through the original code

The whole of `original.cs` is one loop in top-level-statement style:

```csharp
for (int i = 1; i <= 100; i++)
{
    if (i % 3 == 0 && i % 5 == 0)
    {
        Console.WriteLine("FizzBuzz");
    }
```

Identical logic to the JS original — `%` is the remainder operator here too, `&&` is "and", and the combined case must come first or 15 would print `Fizz`. Note `int i` where JS had `var i`: we declare the type, and C# scopes it to the loop automatically (no leak — the language fixed that footgun).

```csharp
    else if (i % 3 == 0)
    {
        Console.WriteLine("Fizz");
    }
    else if (i % 5 == 0)
    {
        Console.WriteLine("Buzz");
    }
    else
    {
        Console.WriteLine(i);
    }
}
```

Single rules checked one at a time; the number prints if nothing matched. Correct output, 100 lines.

## 4. What's wrong with it (in beginner terms)

**1. You can't test it.** Same disease as the JS original: every branch *decides* and *prints* in the same breath. There is no method returning a value you could check. If a teammate breaks the 15-case next month, no alarm rings — eyeballs were the only test.

**2. The combined branch is duplication.** `i % 3 == 0 && i % 5 == 0` restates the other two rules. Add "Bazz for 7" and you need branches for every combination: 8 branches for 3 rules, 16 for 4. The combination explosion is language-independent — C# didn't save us from a *design* mistake.

**3. The answers never exist as data.** They go straight from the CPU to the console. The moment you need them anywhere else — a test, a file, a web response (spoiler: project 15) — you have nothing to call.

Worth savoring: two bugs from the JS original *can't happen here*. `var` leaking? C# loop variables are block-scoped, period. `"3" == 3` coercion? Compile error. The compiler is your first test suite — but only for *type* mistakes. Design mistakes are still all yours.

## 5. Try it yourself first!

Before reading the solution, try to fix `original.cs` yourself (edit it directly and re-run — it's a scratch copy). Hints, vaguest first:

1. 🌱 Could some part of this *return* its answer instead of printing it?
2. 🌿 Write a class with a method `static string For(int n)` that returns the right string for ONE number. What's left over — a loop and a `Console.WriteLine` — stays outside.
3. 🌳 Can you handle "FizzBuzz" *without* the `&&` branch? Build the answer from pieces: start with an empty `List<string>`, `Add("Fizz")` if divisible by 3, `Add("Buzz")` if divisible by 5 — two separate `if`s, no `else`.
4. 🍎 Full recipe: if the list has anything in it, return `string.Concat(parts)`; otherwise return `n.ToString()`. The ternary from section 2 does it in one line.

## 6. Understanding the refactored solution

Four files, one job each.

**`FizzBuzz.cs` — the rules.** Never prints:

```csharp
public static string For(int n)
{
    var parts = new List<string>();
    if (n % 3 == 0) parts.Add("Fizz");
    if (n % 5 == 0) parts.Add("Buzz");
    return parts.Count > 0 ? string.Concat(parts) : n.ToString();
}
```

The exact "build up parts" pattern from the JS refactor, in C# clothes: `List<string>` for the array, `Add` for `push`, `string.Concat` for `join('')`, `Count` for `length`. For 15, both `if`s fire and the combined case falls out for free. `Range(start, end)` is the loop, still not printing — it returns a `List<string>` of answers.

**`Program.cs` — the printing:**

```csharp
if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

foreach (var line in FizzBuzz.Range(1, 100))
{
    Console.WriteLine(line);
}
```

`args` is the array of command-line words after the program name (like `process.argv` in Node). If you ran with `-- test`, we run the tests and exit with their result code (`0` = all good — the same convention as every CLI tool). Otherwise `foreach` — C#'s `for...of` — prints each line. Notice `FizzBuzz.cs` needed no export and `Program.cs` no import: same project, they just see each other.

**`Check.cs` — a mini test framework.** Real C# projects use xUnit, which comes from NuGet (C#'s npm) — but this repo runs offline, so we hand-roll 25 lines (the same move as js#45). `Check.Equal(expected, actual, name)` compares and prints `ok` or `FAIL` with both values; `Summary()` prints the tally and returns the exit code.

**`Tests.cs` — the proof:**

```csharp
Check.Equal("Fizz", FizzBuzz.For(3), "3 is Fizz");
Check.Equal("FizzBuzz", FizzBuzz.For(15), "15 is FizzBuzz");
```

Call the pure method, check the return value — possible only because `For` *has* a return value. The teammate who breaks the 15-case now gets an immediate `FAIL` with expected-vs-actual printed.

## 7. Words you learned (glossary)

- **Compiler / compile** — the program that translates and *checks* all your code before anything runs; failing its checks is a compile error.
- **Static typing** — every variable and method has a fixed, declared type.
- **`int`, `string`, `bool`, `char`, `decimal`** — whole number, text, true/false, single character, precise decimal number.
- **`var` (C#)** — "compiler, infer the type" — unrelated to JS's leaky `var`.
- **String interpolation** — `$"text {expression}"`, C#'s template literal.
- **Top-level statements** — a file that starts with plain statements, no class/Main ceremony.
- **Method** — a function that lives in a class.
- **`static`** — belongs to the class itself; call it without creating an object.
- **Return type** — the declared type of what a method hands back (`void` = nothing).
- **PascalCase** — `NamesLikeThis`, C#'s convention for classes and methods.
- **Generic (`List<T>`)** — a type with a type parameter: `List<string>` is a list *of strings*.
- **`.csproj` / project** — the folder-plus-manifest that makes a real C# app (its `package.json`).
- **`args`** — the command-line arguments array, C#'s `process.argv`.
- **Exit code** — the number a program ends with; 0 means success.

## 8. Experiments to try on the plane (no internet needed)

`dotnet run` compiles locally and needs no network — everything below works at 35,000 feet.

1. **Add a rule.** In `FizzBuzz.cs`, add `if (n % 7 == 0) parts.Add("Bazz");`. Run the tests. Expected: everything still passes (no existing rule broke), and `dotnet run --project csharp/01-hello-fizzbuzz/refactored` now shows `Bazz` at 7, `FizzBazz` at 21. Then add a test: `Check.Equal("FizzBazz", FizzBuzz.For(21), "21 is FizzBazz");`.
2. **Break it on purpose.** Change `n % 3` to `n % 4` and run the tests. Expected: a cascade of `FAIL` lines with expected-vs-actual, and exit summary like `13 passed, 7 failed`. Undo it; watch green return. That's the safety net the original never had.
3. **Cause your first compile error (on purpose).** In `FizzBuzz.cs`, change `return parts.Count > 0 ? ... : n.ToString();` to `... : n;` (return the raw int). Expected: the program *refuses to build* — the method promised `string` and you offered `int`. In JS this kind of inconsistency just flows silently downstream. Read the error message top to bottom; C# error messages tell you the file, line, and exact complaint.
4. **Feel static typing.** In `Program.cs` try `int x = "hello";`. Expected: compile error CS0029 about converting string to int. Delete it and try `var x = "hello"; x = 5;` — also an error, proving `var` variables are just as strictly typed.
5. **Change the demo without touching the rules.** In `Program.cs`, change `Range(1, 100)` to `Range(1, 15)`. Expected: 15 lines ending in `FizzBuzz`, and *zero* test changes needed — printing and rules live in different files, which was the whole point.
