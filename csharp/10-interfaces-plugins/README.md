# CS 10 — Interfaces as plug-ins (cipher toolbox)

**Lesson: when every cipher has the same shape, the rest of the program stops
caring which ciphers exist — an interface + a registry make "add one" a
one-class change.**

## Run it

```
dotnet run csharp/10-interfaces-plugins/original.cs
dotnet run --project csharp/10-interfaces-plugins/refactored
dotnet run --project csharp/10-interfaces-plugins/refactored -- test
```

## What's wrong with the original?

Run it — the atbash round-trip is BROKEN, and nothing threw:

1. **"What ciphers exist" lives in three places**: the `Encode` switch, the
   `Decode` switch, and the hand-typed "Available algorithms" line. Adding a
   cipher means editing all three; the compiler checks none of them.
2. **They've already drifted.** atbash was added to `Encode` and forgotten in
   `Decode` — encrypt works, decrypt silently doesn't. You find out after
   you've encrypted something you cared about.
3. **The `default` branch shrugs.** Unknown algorithm — or a typo, or a
   trailing space — returns the text *unchanged*, pretending it encoded.
   The worst failure mode: wrong and quiet (project 06's `else` bug, again).

This is js#13's cipher-suite lesson in C# — but where JS enforced the shape
by discipline, C# has a compiler for it.

## What changed in the refactor

- **`interface ICipher { Name; Encode; Decode; }`** — the contract as a type.
  A class that forgets `Decode` *does not compile* (the exact drift the
  original shipped becomes error CS0535). js#13 wished for this; C# has it.
- **Three small classes** (rot13, reverse, atbash) — each cipher's logic in
  one place, sharing one `ShiftLetters` helper.
- **A registry built FROM a list**: `Dictionary<string, ICipher>` created via
  `ToDictionary(c => c.Name)` — so lookup, help text, and demo all *derive*
  from one list and can't go stale. Lookup is case-insensitive and trimmed
  (project 06's messy-input lesson), and unknown names return `null`
  (`ICipher?`, project 05) — one loud, typed "not found" instead of a silent
  no-op.
- **`Caesar5Cipher` was added after the fact** to prove the claim: one new
  class + one registry line. The demo, help text, and tests picked it up
  with zero edits — and unlike the original three, its Encode/Decode
  genuinely differ, so drift would actually hurt.
- **One test loop covers every cipher, forever**: `Decode(Encode(x)) == x`
  runs against the whole registry (including punctuation, casing, and the
  empty string), plus known-answer tests so a do-nothing cipher can't fake a
  round-trip. The cipher you add next week gets tested automatically.

## Key takeaway

Switch-on-string scatters one piece of knowledge across every function that
needs it, and the copies drift. Flip the dependency: define the *shape*
(interface), make each variant a small class, and register them in one list
everything else derives from. Interface + registry + a contract test is a
mini plug-in architecture — the same design as ASP.NET Core middleware,
logging providers, and DI itself (project 18 will build on exactly this).
