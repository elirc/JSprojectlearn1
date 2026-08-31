# 📘 Learning Guide: Interfaces as Plug-ins

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A cipher toolbox: three classic letter-scrambling algorithms (rot13, reverse, atbash), each of which can encode text and decode it back. The rule every cipher must obey: **decoding what you encoded gives back the original**.

(These are puzzle ciphers for learning. For anything that actually needs to be secret, use the real cryptography library `System.Security.Cryptography` — never hand-rolled ciphers.)

The original is one file with a `switch (algorithm)` inside `Encode`... and a *second* switch inside `Decode`... and a hand-typed list of algorithm names at the top. Three copies of the same knowledge — and they've already drifted: atbash exists in `Encode` but was forgotten in `Decode`, so decoding atbash silently returns garbage. The refactor makes each cipher a small class behind an **interface**, gathered in a **registry** — after which adding a cipher touches exactly one class and one line.

## 2. Concepts you need first

### What an interface is

An **interface** is a contract: a list of members that a type promises to have, with no code of its own.

```csharp
public interface ICipher
{
    string Name { get; }
    string Encode(string text);
    string Decode(string text);
}
```

Read it as: "to count as a cipher, you must have a name, an Encode, and a Decode." By convention C# interface names start with `I`.

A class signs the contract with a colon, and the compiler holds it to every clause:

```csharp
public class ReverseCipher : ICipher
{
    public string Name => "reverse";
    public string Encode(string text) { /* ... */ }
    public string Decode(string text) => Encode(text);
}
```

Delete `Decode` and the class *stops compiling* — error CS0535, "does not implement interface member." Hold that thought: forgetting Decode is precisely the bug the original shipped.

In JS there are no interfaces — js#13 used the same design with plain objects `{ name, encrypt, decrypt }` and enforced the shape by discipline and tests. TypeScript adds `interface` as a compile-time check. C# interfaces are that, native and always on.

### Programming against the interface

Here's why contracts matter. Once a variable's type is the *interface*, code can use any implementation without knowing which one it has:

```csharp
ICipher cipher = PickAnyCipher();          // could be any of the four
Console.WriteLine(cipher.Encode("hi"));    // works regardless
```

This is called **polymorphism** (many shapes, one contract) — the same call, dispatched to whichever class is actually behind the variable. The demo's whole loop is this idea:

```csharp
foreach (var cipher in CipherRegistry.All)   // each element is "some ICipher"
    Console.WriteLine(cipher.Encode(text));  // never asks which one
```

Notice what's *absent*: no `switch`, no `if (name == "rot13")`. The decision "which code runs" moved from a hand-maintained branch into the type system.

### The registry pattern

An interface gives pieces the same shape; a **registry** gives them one home:

```csharp
public static readonly IReadOnlyList<ICipher> All = new ICipher[]
{
    new Rot13Cipher(),
    new ReverseCipher(),
    new AtbashCipher(),
};
```

Everything else *derives* from this list. The name→cipher lookup is built from it with LINQ's `ToDictionary` (project 04 met `Select`/`Where`; this is the same family):

```csharp
private static readonly Dictionary<string, ICipher> ByName =
    All.ToDictionary(cipher => cipher.Name, StringComparer.OrdinalIgnoreCase);
```

`ToDictionary(c => c.Name)` means "make a dictionary keyed by each cipher's own name." Because the keys come *from* the ciphers, the list and the lookup physically cannot disagree — unlike the original's three hand-synced copies. The `StringComparer.OrdinalIgnoreCase` argument makes lookups forgive `"ROT13"` (project 06's casing lesson, applied at a dictionary).

In JS, js#13's `CIPHERS` object was this registry; the upgrade here is that every entry is compiler-checked against the contract.

### Nullable references for "not found"

What should `Find("vigenere")` do when no such cipher exists? The original returned the input text unchanged — silent and wrong. The refactor returns `null`, *declared in the type*:

```csharp
public static ICipher? Find(string name) => ...
```

That `?` (project 05) forces callers to handle the miss — the compiler warns if you use the result without checking. One honest `null` beats a quiet lie. (In the tests you'll see `Find("rot13")!` — the null-forgiveness operator — used where the test *just proved* the lookup succeeds.)

### `is` type checks

The tests use pattern matching to ask "what's actually behind this interface?":

```csharp
CipherRegistry.Find("rot13") is Rot13Cipher   // true: right class came back
CipherRegistry.Find("nope") is null           // true: honest not-found
```

`x is SomeType` checks the runtime type; `x is null` checks for null. You met `is` patterns in project 06's switch arms — same machinery.

### Round-trip tests — testing the contract, not the implementation

`Decode(Encode(x)) == x` is a **property**: a law that must hold for *every* cipher and *every* input. That makes it loopable:

```csharp
foreach (var cipher in CipherRegistry.All)
    Check.Equal(sample, cipher.Decode(cipher.Encode(sample)), $"{cipher.Name} round-trips");
```

Any cipher added to the registry gets this test automatically, forever. One subtlety: a broken "cipher" that returns its input unchanged also passes round-trip tests! So the suite adds **known-answer tests** (`rot13("hello") == "uryyb"`) to pin each cipher to its real behavior. Property test + known answers = a contract with teeth.

## 3. Walking through the original code

Place #1 — the encode switch:

```csharp
static string Encode(string algorithm, string text)
{
    switch (algorithm)
    {
        case "rot13": return Rot13(text);
        case "reverse": return Reverse(text);
        case "atbash": return Atbash(text);
        default: return text;  // unknown algorithm? just... hand the text back
    }
}
```

Place #2 — the decode switch, where the drift lives:

```csharp
static string Decode(string algorithm, string text)
{
    switch (algorithm)  // a SECOND copy of "what ciphers exist"
    {
        case "rot13": return Rot13(text);      // rot13 undoes itself
        case "reverse": return Reverse(text);  // so does reverse
        // "atbash" was forgotten when it was added last sprint...
        default: return text;                  // ...and this shrug hides that
    }
}
```

Place #3 — the hand-typed banner: `Console.WriteLine("Available algorithms: rot13, reverse, atbash");`.

Run it and read the output carefully:

```
atbash   "hello world" -> "svool dliow" -> "svool dliow"   ROUND-TRIP BROKEN
```

`Decode("atbash", ...)` fell into `default`, returned the *ciphertext unchanged*, and reported no error. The demo also shows `Encode("rot13 ", ...)` — one trailing space — silently "encoding" text as itself. Every failure mode here is quiet.

The cipher math itself (`Rot13`, `Reverse`, `Atbash`) is fine and survives into the refactor nearly untouched. The disease isn't the algorithms — it's the *dispatch*: how the program decides which algorithm runs.

## 4. What's wrong with it (in beginner terms)

**1. One fact, three homes.** "What ciphers exist" is written in the Encode switch, the Decode switch, and the banner string. Any fact stored in multiple places will eventually disagree with itself — that's not pessimism, it's what *already happened* in this file (atbash), and no tool complained.

**2. The failure is deferred and silent.** Encrypt with atbash today: works. Decrypt next month: returns garbage — *quietly*. The `default: return text` branch converts every mistake (missing case, typo, stray space) into fake success. A crash would have been kinder: you'd have found it in development, not after encrypting something you cared about.

**3. Adding a cipher is a scavenger hunt.** New algorithm = write the functions, edit Encode's switch, edit Decode's switch, update the banner. Nothing reminds you of step 3 or 4. The cost isn't the typing — it's that *the compiler can't tell you when you're done*.

**4. Nothing states the contract.** Encode and Decode must be inverses — the entire point of a cipher — yet no code, type, or test says so. In the refactor that law gets three enforcers: an interface (the shape), a comment on it (the law), and a registry-wide test (the proof).

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 The three cipher functions already exist and work. The problem is the two switches deciding which to call. Could each cipher *carry its own* encode and decode, so nothing has to decide by name?
2. 🌿 Declare `interface ICipher { string Name { get; } string Encode(string text); string Decode(string text); }` and write three small classes implementing it. For rot13, reverse, and atbash, `Decode` can simply call `Encode` — say why in a comment.
3. 🌳 Build the registry: a list of `ICipher` instances, plus a `Dictionary<string, ICipher>` created from it with `ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase)`. `Find(name)` returns `ICipher?` — null for unknown names, never the input text. Rewrite the demo as one `foreach` over the registry.
4. 🍎 Write the tests: a loop asserting `cipher.Decode(cipher.Encode(sample)) == sample` for every registered cipher and several samples, known-answer checks (`rot13("hello") == "uryyb"`), and `Find("nope") is null`. Then prove the design: add a fourth cipher (caesar shift 5 — decode shifts by 21) and count your edits. One class, one registry line, zero test edits?

## 6. Understanding the refactored solution

**`ICipher.cs`** — the contract, ten lines, with the law written on it: `Decode(Encode(text)) == text`.

**`Ciphers.cs`** — four small classes. The shared letter-shifting moved into one helper:

```csharp
public class Rot13Cipher : ICipher
{
    public string Name => "rot13";
    public string Encode(string text) => CipherMath.ShiftLetters(text, 13);
    public string Decode(string text) => CipherMath.ShiftLetters(text, 13);  // 13 + 13 = 26 = full circle
}
```

Each class is the *whole truth* about its cipher: name, encode, decode, side by side. Forgetting `Decode` — the original's shipped bug — is now impossible: the class wouldn't compile. `Caesar5Cipher` is the one to study; it was added *after* the design existed, and it's the only cipher whose Encode and Decode differ (shift 5 forward, 21 forward — same as 5 back), which is exactly the kind of cipher the original's drift would have mangled.

**`CipherRegistry.cs`** — one list, everything derived:

```csharp
public static readonly IReadOnlyList<ICipher> All = new ICipher[]
{
    new Rot13Cipher(),
    new ReverseCipher(),
    new AtbashCipher(),
    new Caesar5Cipher(),  // added later: one class + this line. Nothing else changed.
};
```

`Find` trims and ignores case (messy input handled once, at the boundary — project 06's move), and returns `ICipher?` so "not found" is a typed, checkable value (project 05's move). `Names` is computed from `All` — the banner can never lie again.

**`Program.cs`** — read it and notice it *names no cipher anywhere*. Help text: derived. Demo loop: iterates the registry. Unknown-name handling: one `is null` check. This file will never change again, no matter how many ciphers get added. That's the definition of a plug-in architecture — and it's the same design you'll meet at industrial scale in ASP.NET Core (middleware pipelines, logging providers, DI registrations — project 18).

**`Tests.cs`** — three layers, each catching what the previous can't:

1. The **round-trip loop** — the contract, enforced for all four ciphers times four samples (including `""` and punctuation), and for every future cipher automatically.
2. **Known answers** — so a cipher that "encodes" by doing nothing can't sneak through the round-trip test.
3. **Registry behavior** — right implementation returned, case-insensitive, trimmed, `null` for unknown and empty names.

## 7. Words you learned (glossary)

- **Interface** — a compiler-enforced contract listing members a type must provide; no code of its own.
- **Implement** — to sign the contract: `class Rot13Cipher : ICipher`, providing every member.
- **CS0535** — the compile error for a missing interface member; the original's drift bug, caught at build time.
- **Polymorphism** — one call site, many implementations: code holds an `ICipher` and never asks which.
- **Program against the interface** — declare variables/parameters as the contract type, not a concrete class.
- **Registry** — the single list/dictionary where all implementations are enrolled; everything else derives from it.
- **`ToDictionary`** — LINQ: build a dictionary from a sequence (`All.ToDictionary(c => c.Name)`).
- **`StringComparer.OrdinalIgnoreCase`** — dictionary key comparison that ignores casing.
- **Dispatch** — deciding which code runs; the refactor moves it from switches to the type system.
- **Round-trip / property test** — asserting a law (`Decode(Encode(x)) == x`) over every implementation and input.
- **Known-answer test** — pinning exact outputs so a do-nothing implementation can't pass the property.
- **`ICipher?` (nullable reference)** — "might be null," declared in the type; the honest not-found (project 05).
- **`is` pattern** — runtime type/null check: `cipher is Rot13Cipher`, `cipher is null`.
- **Plug-in architecture** — interface + registry + contract tests; new behavior plugs in without editing existing code.

## 8. Experiments to try on the plane (no internet needed)

Rebuild after each change with `dotnet run --project csharp/10-interfaces-plugins/refactored -- test`.

1. **Add a Vigenère-lite cipher.** Create `Caesar1Cipher` ("caesar1", shift 1 / shift 25) — or be ambitious and do a two-letter-key Vigenère. Register it. Expected: the demo lists it, and the test count *grows* (four new round-trip tests appear) without you touching `Tests.cs`. Count your edited files: two.
2. **Recreate the original's bug — and watch it refuse to compile.** In `Caesar5Cipher`, delete the `Decode` method. Expected: error CS0535, naming the missing member. The exact mistake that shipped silently in the original can't even build here.
3. **Write a lying cipher.** Add `class NothingCipher : ICipher` whose Encode and Decode both return the input, register it, and run the tests. Expected: all its *round-trip* tests pass (doing nothing round-trips perfectly!) — which is exactly why known-answer tests exist. Add one — `Check.Equal("???", ...)` — to see it fail honestly, then remove the impostor.
4. **Break the registry's forgiveness.** Remove `StringComparer.OrdinalIgnoreCase` from `ToDictionary` and run the tests. Expected: `lookup is case-insensitive` fails — `Find("ROT13")` now misses. Restore it. One argument was carrying a whole usability feature; the test knew.
5. **Sabotage `ShiftLetters`.** Change `% 26` to `% 25` and run the tests. Expected: a cascade — rot13 and caesar5 round-trips *and* known answers fail, while reverse and atbash stay green (they never shift). Notice how test names alone triangulate the broken helper before you've read a line of code. Restore `% 26`.
