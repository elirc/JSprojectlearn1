# CS 06 — Enums and switch expressions

**Lesson: a status is one of four things, so give it a type that can only BE
one of four things — then make every switch over it provably complete.**

## Run it

```
dotnet run csharp/06-enums-and-switch/original.cs
dotnet run --project csharp/06-enums-and-switch/refactored
dotnet run --project csharp/06-enums-and-switch/refactored -- test
```

## What's wrong with the original?

Run it. Two orders get quietly mishandled, with zero errors:

1. **`"Paid"` ≠ `"paid"`.** Order A-1002 was typed with a capital P, so it falls
   through every `if` into the `??? unknown status` bucket. No shipping label,
   no exception, no log — the branch was just *skipped*.
2. **The final `else` is a guess.** `CanCancel` says "shipped and delivered
   can't cancel, everything else can" — so the SHOUTING import `"SHIPPED"`
   (which matches neither) is told it *can* cancel. An already-shipped order.
3. **The statuses live nowhere.** "What statuses exist?" has no answer except
   *read every if/else chain in the file*. Adding `"refunded"` means hunting
   them all down by hand; miss one and you get bug #1 or #2 again.

This is the C# edition of ts#06/ts#12: `string` means "any of infinitely many
values"; the workflow means "exactly one of four."

## What changed in the refactor

- **`enum OrderStatus { Pending, Paid, Shipped, Delivered }`** — the whole
  vocabulary in one place. `OrderStatus.Payed` is now a *compile error*, and
  there is no such thing as a lowercase/uppercase variant.
- **Switch expressions return values**: `status switch { Pending => "...", ... }`
  is an expression, not a statement — each rule is one line, and the compiler
  *warns (CS8509) if a case is missing*. Delete a case and rebuild: the compiler
  hands you a todo list. That's ts#12's `assertNever`, built into the language.
- **The `_ => throw` discard** covers the one hole enums leave open: a cast like
  `(OrderStatus)42` produces an unnamed value at runtime. We fail loudly with
  `ArgumentOutOfRangeException` instead of guessing — there's a test proving it.
- **`Advance` makes transitions explicit**: Pending → Paid → Shipped →
  Delivered, one case each, and advancing a delivered order *throws* instead of
  doing something vague. Every transition has its own test.
- **`TryParseStatus` is the border checkpoint**: `Enum.TryParse(text, ignoreCase:
  true, ...)` converts messy outside strings (`"Paid"`, `"SHIPPED"`) into clean
  enum values exactly once, and rejects `"PAYED"`, `"banana"` — and `"42"`,
  which bare `Enum.TryParse` would happily accept (hence the extra
  `Enum.IsDefined` check). Strings exist only at the edges; the enum travels
  everywhere inside.

## Key takeaway

Whenever a `string` has a known, finite set of meaningful values — statuses,
modes, sizes, directions — make it an enum, switch over it with switch
*expressions*, and parse outside input at the boundary. Typos become compile
errors, missing cases become compiler warnings, and "add a status" becomes a
compiler-guided checklist instead of a codebase-wide hunt.
