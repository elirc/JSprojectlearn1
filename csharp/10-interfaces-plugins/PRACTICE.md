# 🏋️ Practice: Interfaces as Plug-ins (Cipher Toolbox)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. The loud lookup (warm-up)

`Find` returns `null` for an unknown name, which is right when a miss is *expected*. Add its sibling `CipherRegistry.FindOrThrow(string name)` returning a non-nullable `ICipher`, for the many call sites where a miss is a bug: it throws `KeyNotFoundException` whose message lists the algorithms that *do* exist. Then notice how `Tests.cs`'s `CipherRegistry.Find("rot13")!` lines could drop their `!`.

Practices: the null-returning / throwing pair (project 08's who-fixes-it split), `??` with a `throw` expression, building a helpful message from the registry.

Hint: one expression — `Find(name) ?? throw new KeyNotFoundException(...)`. `throw` is allowed on the right of `??` in modern C#. Reuse `Names` for the list.

Check it offline: add these Check tests to `Tests.cs` — both should pass:
```csharp
Check.True(CipherRegistry.FindOrThrow("ROT13") is Rot13Cipher, "FindOrThrow returns a non-null cipher");
Check.Throws<KeyNotFoundException>(() => CipherRegistry.FindOrThrow("vigenere"), "an unknown name is a loud failure");
```

### ⭐⭐ 2. A cipher made of ciphers (core)

Write `CompositeCipher : ICipher` whose constructor takes *two other `ICipher`s*. `Encode` runs the first then the second; `Decode` must undo them **in reverse order** — get that backwards and the round-trip breaks. Register `new CompositeCipher(new Rot13Cipher(), new ReverseCipher())` and watch the existing suite grow four passing tests with no edits to `Tests.cs`.

Practices: composition — a class that both *implements* an interface and *depends on* it (the decorator pattern), which is how ASP.NET Core middleware is built (project 19).

Hint: `Encode(text) => second.Encode(first.Encode(text));` and `Decode(text) => first.Decode(second.Decode(text));` — like taking off shoes and socks. Make `Name` derive from the parts: `$"{first.Name}+{second.Name}"`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var combo = new CompositeCipher(new Rot13Cipher(), new ReverseCipher());
Check.Equal("rot13+reverse", combo.Name, "a composite names its parts");
Check.Equal("pon", combo.Encode("abc"), "abc -> nop (rot13) -> pon (reverse)");
Check.Equal("Attack At Dawn!", combo.Decode(combo.Encode("Attack At Dawn!")), "undo in reverse order");
```
Then swap `Decode`'s body to `second.Decode(first.Decode(text))` and re-run: the round-trip test for punctuation-free text may still pass by luck, which is why the suite tries four samples.

### ⭐⭐ 3. A law with a default body (core)

`ICipher`'s comment states a law — `Decode(Encode(text)) == text` — but the law is only prose. Move it into the interface as a **default interface method**: `bool RoundTrips(string sample) => Decode(Encode(sample)) == sample;`. Every existing cipher gets it for free, with no class edited. Then rewrite the round-trip loop in `Tests.cs` to call `cipher.RoundTrips(sample)`.

Practices: default interface implementations (C# 8) — shared behaviour on an interface, and the surprising rule about how you may call it.

Hint: default members are *not* inherited into the class's own surface. `new Rot13Cipher().RoundTrips("x")` does **not** compile; `((ICipher)new Rot13Cipher()).RoundTrips("x")` does. Looping over `CipherRegistry.All` works unchanged, because those elements are already typed `ICipher`.

Check it offline: add to `Tests.cs` — it should pass:
```csharp
foreach (var cipher in CipherRegistry.All)
    Check.True(cipher.RoundTrips("Attack At Dawn!"), $"{cipher.Name}: obeys the interface's law");
```
And confirm the rule by typing `new Rot13Cipher().RoundTrips("x");` in `Program.cs`. Expected: `error CS1061: 'Rot13Cipher' does not contain a definition for 'RoundTrips'`. Delete it.

### ⭐⭐ 4. Port from JS: ciphers without classes (core)

js#13's registry was an object literal of function pairs:

```js
const ciphers = {
  upsidedown: { encode: s => [...s].reverse().join(""), decode: s => [...s].reverse().join("") },
};
```

Port that *style* to C# with `DelegateCipher : ICipher` — a class taking `(string name, Func<string,string> encode, Func<string,string> decode)` in its constructor and forwarding to them. Now a throwaway cipher is one expression, no new file. Register `new DelegateCipher("upsidedown", ...)` and watch the tests cover it too.

Practices: `Func<T, TResult>` (C#'s type for "a function value"), adapters that let closures satisfy an interface, `{ get; }` auto-properties set from a constructor.

Hint: store the two `Func`s in `private readonly` fields; `Encode(string text) => encode(text);`. `Name` can be a get-only property assigned in the constructor.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var flip = new DelegateCipher("upsidedown",
    s => new string(s.Reverse().ToArray()),
    s => new string(s.Reverse().ToArray()));
Check.Equal("upsidedown", flip.Name, "a delegate-backed cipher still has a name");
Check.Equal("cba", flip.Encode("abc"), "the closure does the work");
Check.Equal("Hello!", flip.Decode(flip.Encode("Hello!")), "and it obeys the same law");
```

### ⭐⭐⭐ 5. A registry that finds its own plug-ins (challenge)

Right now adding a cipher costs one class *and one registry line*. Delete the line. Build `All` by **reflection**: ask the assembly for every non-abstract class that implements `ICipher` and has a parameterless constructor, and instantiate each one. Order by `Name` so the output is stable. Add a new cipher class after this and it appears in the demo, the help text and the tests having edited exactly one file.

Practices: reflection (`Assembly.GetTypes`, `IsAssignableTo`, `Activator.CreateInstance`), and the trade-off real plug-in hosts make.

Hint: `typeof(ICipher).Assembly.GetTypes()` then `.Where(t => t.IsClass && !t.IsAbstract && t.IsAssignableTo(typeof(ICipher)))`. Filter on `t.GetConstructor(Type.EmptyTypes) is not null` — `CompositeCipher` and `DelegateCipher` need arguments, so they are correctly skipped.

Check it offline: `dotnet run --project csharp/10-interfaces-plugins/refactored` prints `Available algorithms: atbash, caesar5, reverse, rot13` (alphabetical now), and add to `Tests.cs`:
```csharp
Check.Equal(4, CipherRegistry.All.Count, "all four ciphers were discovered, not listed");
Check.True(CipherRegistry.All.Select(c => c.Name).SequenceEqual(CipherRegistry.All.Select(c => c.Name).Distinct()),
    "no two ciphers claim the same name");
```

### ⭐⭐⭐ 6. Pipelines from a string (challenge — builds on 2)

Let the *user* compose ciphers at runtime: `CipherRegistry.Pipeline("rot13+reverse+atbash")` returns a single `ICipher` that applies all three in order and undoes them correctly. An unknown name in the spec throws the `KeyNotFoundException` from exercise 1; an empty spec throws `ArgumentException`. The returned thing is just an `ICipher`, so it drops into the demo loop and any test that takes one.

Practices: folding a list into one object, parsing with `Split` options, and seeing why "returns the interface" makes a feature composable.

Hint: split on `'+'` with `StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries`, start with the first cipher, then loop: `combined = new CompositeCipher(combined, FindOrThrow(part));`. `Aggregate` does the same in one line if you prefer.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var pipe = CipherRegistry.Pipeline("rot13 + reverse + atbash");
Check.Equal("rot13+reverse+atbash", pipe.Name, "the pipeline names its stages in order");
Check.Equal("Attack At Dawn!", pipe.Decode(pipe.Encode("Attack At Dawn!")), "a three-stage pipeline round-trips");
Check.Equal(new AtbashCipher().Encode(new ReverseCipher().Encode(new Rot13Cipher().Encode("hello"))),
    pipe.Encode("hello"), "the pipeline equals applying the three by hand");
Check.Throws<KeyNotFoundException>(() => CipherRegistry.Pipeline("rot13+vigenere"), "a bad stage is loud");
Check.Throws<ArgumentException>(() => CipherRegistry.Pipeline("  "), "an empty spec is rejected");
```

## Solutions

### 1. The loud lookup

```csharp
// CipherRegistry.cs
public static ICipher FindOrThrow(string name) =>
    Find(name) ?? throw new KeyNotFoundException(
        $"unknown cipher '{name.Trim()}'. Available: {string.Join(", ", Names)}");
```

WHY: `Find` and `FindOrThrow` are the same lookup with two different contracts, and the *return type* is the documentation — `ICipher?` forces you to handle a miss, `ICipher` promises there isn't one. Building the message from `Names` means the error text can never list a cipher that no longer exists, the same derive-don't-repeat rule the registry itself follows. `Dictionary` and `File` in the BCL ship this exact pair (`TryGetValue` / the indexer), so you are copying a convention, not inventing one.

### 2. A cipher made of ciphers

```csharp
// Ciphers.cs
public class CompositeCipher : ICipher
{
    private readonly ICipher first;
    private readonly ICipher second;

    public CompositeCipher(ICipher first, ICipher second)
    {
        this.first = first;
        this.second = second;
    }

    public string Name => $"{first.Name}+{second.Name}";
    public string Encode(string text) => second.Encode(first.Encode(text));
    public string Decode(string text) => first.Decode(second.Decode(text));   // reverse order!
}
```

WHY: `CompositeCipher` is an `ICipher` *and* holds `ICipher`s, so it can wrap anything — including another composite, which is what makes exercise 6 possible. Nothing else in the program can tell the difference between a "real" cipher and a composed one, and that indistinguishability is the whole value of programming to an interface. The reverse-order `Decode` is the one place the abstraction demands thought: undoing a sequence means undoing it backwards.

### 3. A law with a default body

```csharp
// ICipher.cs
public interface ICipher
{
    string Name { get; }
    string Encode(string text);
    string Decode(string text);

    /// The contract's law, now executable. Implementers inherit this body
    /// and may override it; nobody has to write it again.
    bool RoundTrips(string sample) => Decode(Encode(sample)) == sample;
}

// Tests.cs — the loop shrinks
foreach (var cipher in CipherRegistry.All)
    foreach (var sample in new[] { "hello world", "Attack At Dawn!", "", "1234 %&*" })
        Check.True(cipher.RoundTrips(sample), $"{cipher.Name}: round-trips \"{sample}\"");
```

WHY: default interface members (C# 8) let an interface ship behaviour, so a contract can grow a new member without breaking every existing implementer — the reason the feature was added, and how .NET evolves interfaces in shipped libraries. The catch you met at the compiler is deliberate: the method belongs to the *interface*, not the class, so you must be holding an `ICipher` to call it. That is also why it does not collide with a class that later defines its own `RoundTrips`.

### 4. Port from JS: ciphers without classes

```csharp
// Ciphers.cs
public class DelegateCipher : ICipher
{
    private readonly Func<string, string> encode;
    private readonly Func<string, string> decode;

    public DelegateCipher(string name, Func<string, string> encode, Func<string, string> decode)
    {
        Name = name;
        this.encode = encode;
        this.decode = decode;
    }

    public string Name { get; }
    public string Encode(string text) => encode(text);
    public string Decode(string text) => decode(text);
}

// CipherRegistry.cs — a cipher with no class of its own
new DelegateCipher("upsidedown",
    s => new string(s.Reverse().ToArray()),
    s => new string(s.Reverse().ToArray())),
```

WHY: `Func<string, string>` is C#'s way of saying "a value that is a function" — JS's default, C#'s opt-in — and `DelegateCipher` is the adapter that lets those values satisfy an interface. That is a genuinely useful pattern (tests fake dependencies with it constantly), but note the cost: the JS object literal had no `Name`, no type checking that both functions exist, and no compiler to notice if you forgot `decode`. The C# version keeps the terseness *and* the contract.

### 5. A registry that finds its own plug-ins

```csharp
// CipherRegistry.cs
public static readonly IReadOnlyList<ICipher> All =
    typeof(ICipher).Assembly.GetTypes()
        .Where(t => t.IsClass && !t.IsAbstract && t.IsAssignableTo(typeof(ICipher)))
        .Where(t => t.GetConstructor(Type.EmptyTypes) is not null)   // skips CompositeCipher etc.
        .Select(t => (ICipher)Activator.CreateInstance(t)!)
        .OrderBy(cipher => cipher.Name, StringComparer.Ordinal)
        .ToList();
```

WHY: reflection is the program reading its own type system at runtime, and this is the real plug-in story — it is roughly what ASP.NET Core does to discover controllers and what test runners do to find your tests. It is also a fair trade to *think about*: you gained "add a class, change nothing", and you lost compile-time knowledge of what exists, deleted-class warnings, startup speed, and trim/AOT friendliness (the compiler will warn about `GetTypes` in a trimmed build). The hand-written list in the original refactor is the better default for four ciphers; reflection earns its keep when the plug-ins live in assemblies you did not compile.

### 6. Pipelines from a string

```csharp
// CipherRegistry.cs
public static ICipher Pipeline(string spec)
{
    var parts = spec.Split('+', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    if (parts.Length == 0)
        throw new ArgumentException("a pipeline needs at least one cipher", nameof(spec));

    ICipher combined = FindOrThrow(parts[0]);
    for (int i = 1; i < parts.Length; i++)
        combined = new CompositeCipher(combined, FindOrThrow(parts[i]));
    return combined;
}

// The same fold, LINQ-style:
// => parts.Skip(1).Aggregate(FindOrThrow(parts[0]),
//        (acc, name) => new CompositeCipher(acc, FindOrThrow(name)));
```

WHY: every stage is an `ICipher` and the composite *is* an `ICipher`, so folding a list of them into one is just repeated wrapping — the accumulator never changes type. `Name` comes out as `"rot13+reverse+atbash"` for free because each composite asks its parts, which means the string that built the pipeline can be reconstructed from the object. That is the compounding return on the project's design: `Find`, `CompositeCipher` and `Pipeline` were each small, and together they turned a fixed menu into a language.
