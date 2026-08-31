# CS 07 — Records and immutability

**Lesson: data that can't change can't be corrupted — records, `with`, and
`decimal` make a cart safe to preview, share, and total.**

## Run it

```
dotnet run csharp/07-records-immutability/original.cs
dotnet run --project csharp/07-records-immutability/refactored
dotnet run --project csharp/07-records-immutability/refactored -- test
```

## What's wrong with the original?

Run it. A "10% off preview" — a feature that *by design* changes nothing —
permanently corrupts the cart:

1. **`new List<CartItem>(cart)` copies the list, not the items.** Both lists
   point at the same three `CartItem` objects (project 02's aliasing bug,
   now with money on the line). Mutating "the preview's" prices mutates the
   real cart. The customer closes the preview and their total stays discounted
   — and a second preview would discount it *again*.
2. **Nothing forbids the mutation.** `public decimal Price;` means every
   function that ever sees an item may rewrite it. "This function only reads
   the cart" is a hope, not a property of the code.
3. **A hidden pricing policy.** The preview sets prices like `9.315` —
   fractions of a cent — and only the *display* rounds them. Whether the
   customer pays 39.11 or 39.12 depends on formatting accidents, because
   nobody wrote down a rounding rule.

This is js#32's money-cart lesson in C#. One upgrade over JS is already in
place: prices use `decimal`, so there's no binary float dust (LEARN.md shows
the `0.1 + 0.2` problem `double` would have).

## What changed in the refactor

- **`record CartItem(string Name, decimal Price, int Qty)`** — immutable by
  default. There is no way to write `item.Price = ...`; it doesn't compile.
  The class of bug the original demos is *unrepresentable*.
- **`with` expressions**: `item with { Price = ... }` builds a *copy* with one
  change, leaving the source untouched. "Change" becomes "make a new value" —
  the same move as spreading `{ ...item, price }` in JS, but enforced.
- **Pure functions**: `ApplyDiscount` returns a NEW list of NEW items; `Total`
  just reads. The tests prove the no-mutation claim: apply a discount, then
  assert the original cart still totals 43.45.
- **`decimal` for money, with a named rounding policy.** `RoundMoney` (2
  decimals, halves away from zero) is applied per line item — a *decision*,
  written once, tested (`1.005m → 1.01m`). Tests also pin the `double` trap:
  `0.1 + 0.2 != 0.3` for doubles, but exactly `0.3m` for decimals.
- **Init-only properties** (`Coupon { get; init; }`) — the other record style:
  settable only during construction, frozen after.
- **Value equality for free**: two `CartItem`s with the same content are `==`,
  which makes tests read like arithmetic.

## Key takeaway

Model data as immutable records and put every change behind a pure function
that returns a new value. Then "preview," "undo," and "share" are all free —
no defensive copying, no corruption at a distance. And money is `decimal`,
always, with rounding as an explicit, named, tested policy.
