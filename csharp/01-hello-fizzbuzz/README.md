# CS 01 — hello-fizzbuzz

**Lesson: your first C# program — and the same first lesson as ever: separate *computing an answer* from *printing it*.**

This mirrors `01-fizzbuzz` from the JS track. Same program, same flaw, same fix —
recognizing the shape in a new language is the fastest way to learn both.

## Run it

From the repo root:

```
dotnet run csharp/01-hello-fizzbuzz/original.cs
dotnet run --project csharp/01-hello-fizzbuzz/refactored
dotnet run --project csharp/01-hello-fizzbuzz/refactored -- test
```

## What's wrong with the original?

Nothing is *broken* — it prints the correct 100 lines. But ask the repo's
favorite question: **how would you test it?** You can't. Every branch ends in
`Console.WriteLine`; there is no method to call and no return value to check.
The only test is your eyeballs reading 100 lines.

And the familiar design smell came along for the ride:

- `i % 3 == 0 && i % 5 == 0` **duplicates** the other two conditions. Add a
  "Bazz for 7" rule and the branch count doubles: 3 rules = 8 branches.
- The loop, the rules, and the printing are one inseparable lump. Want the
  answers as data (for a web page, a file, a test)? Too bad — they only ever
  existed as console output.

Note what's *not* on the list this time: no `var`-leak, no `==` coercion.
C# variables are block-scoped and `==` never converts `"3"` to `3` — the
compiler already fixed two of JS's footguns for you.

## What changed in the refactor

1. **`FizzBuzz.For(n)` is a pure method** — `int` in, `string` out, no printing.
   Same "build up parts" pattern as the JS refactor: each rule is one
   independent `if` that adds its word to a list; the combined "FizzBuzz" case
   falls out for free.
2. **`FizzBuzz.Range(start, end)` returns the lines as a `List<string>`** —
   the loop still doesn't print.
3. **`Program.cs` is the only file that touches the console**, and its demo is
   3 lines. The `refactored/` folder is also your first real C# *project*
   (a `.csproj` file instead of a single script).
4. **`Tests.cs` + `Check.cs`** — a hand-rolled mini test framework (like js#45),
   because real test frameworks (xUnit) come from NuGet and this repo runs
   offline. `dotnet run ... -- test` runs 20 checks in a blink.

## Key takeaway

"How would I test this?" works as a design tool in every language. If the
answer is "I can't," pull the decision into a pure method that returns a value.
In C# you get a bonus: the compiler checks every type before the program even
runs — your first test suite is built into the language.
