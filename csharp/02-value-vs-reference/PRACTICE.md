# 🏋️ Practice: Value vs Reference

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Translate a Point (warm-up)

Add a `Translate(int dx, int dy)` method to the `Point` record in `Models.cs` that returns a **new** point shifted by that amount. `new Point(1, 2).Translate(3, 4)` gives `Point(4, 6)` — and the original point must be unchanged (it couldn't change anyway; that's the point).

Practices: adding a method to a record, building copies with `with`.

Hint: inside a record, `this with { X = ... }` copies yourself with changes. You can change two properties in one `with`.

Check it offline: add this Check test to `Tests.cs` — it should pass:
`Check.Equal(new Point(4, 6), new Point(1, 2).Translate(3, 4), "translate shifts both axes");`

### ⭐⭐ 2. Bump the quantity (core)

Add `WithExtra(int more)` to the `Order` record: it returns a copy with `more` added to the quantity. In the style of `WithDiscount`, it must be pure — the original order keeps its old quantity.

Practices: the "return a modified copy" pattern, expression-bodied methods (`=>`).

Hint: mirror `WithDiscount`'s one-liner shape, but target `Quantity` instead of `UnitPrice`.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal(24.00m, new Order("Mug", 2, 8.00m).WithExtra(1).Total, "2+1 mugs cost 24");`
`var keep = new Order("Mug", 2, 8.00m); keep.WithExtra(5); Check.Equal(16.00m, keep.Total, "original untouched");`

### ⭐⭐ 3. Discount the whole cart (core)

Add `DiscountAll(decimal percent)` to `Cart`. It must apply the discount to *every* line — but remember: orders are immutable, so you can't loop with `foreach` and mutate. You have to **replace each slot** with a discounted copy, like `DiscountLine` does for one slot.

Practices: index-based `for` over a private list, replace-don't-mutate.

Hint: `foreach (var line in _lines) line = ...` won't compile — use `for (int i = 0; ...)` and assign `_lines[i]`.

Check it offline: add to `Tests.cs` — it should pass (16 + 15 = 31, halved = 15.50):
```csharp
var sale = new Cart();
sale.Add(new Order("Mug", 2, 8.00m));
sale.Add(new Order("T-shirt", 1, 15.00m));
sale.DiscountAll(50);
Check.Equal(15.50m, sale.Total(), "everything half price");
```

### ⭐⭐ 4. A snapshot you can trash (core)

`Cart.Lines` is a read-only *view* — callers can't change it, but it always shows the live list. Add `Snapshot()` returning a `List<Order>` that is a genuinely separate list: the caller may `Clear()` it, sort it, whatever, and the cart must not notice.

Practices: defensive copying **out** (the mirror image of the defensive copy the README talks about).

Hint: `List<T>` has a constructor that takes an existing collection and copies its items into a new list.

Check it offline: add to `Tests.cs` — it should pass:
```csharp
var c = new Cart();
c.Add(new Order("Mug", 1, 8.00m));
var snap = c.Snapshot();
snap.Clear();
Check.Equal(1, c.Lines.Count, "trashing the snapshot leaves the cart alone");
```

### ⭐⭐⭐ 5. Extend the record and follow the errors (challenge)

Add a fourth positional parameter `string Sku` to the `Order` record — first **without** a default value. Run the build and *count* the compile errors: every `new Order(...)` in `Cart.cs`... wait, there are none — but `Tests.cs`, `Program.cs` and this file's suggested tests all break. Read two of the error messages fully. Then change it to `string Sku = "SKU-0"` (a default value) and watch every error vanish. Confirm `with` and equality now include the new field.

Practices: how the compiler finds every call site for you, default parameter values, record equality over all fields.

Hint: positional record parameters accept defaults exactly like method parameters: `(..., string Sku = "SKU-0")`.

Check it offline: first version = a screenful of CS7036 errors ("there is no argument given that corresponds to..."); after adding the default, tests are green and this passes in `Tests.cs`:
`Check.True(new Order("Mug", 1, 8m) != new Order("Mug", 1, 8m) with { Sku = "SKU-7" }, "Sku participates in equality");`

### ⭐⭐⭐ 6. Money: a readonly record struct with `+` (challenge)

In `Models.cs`, write `Money` — a `readonly record struct` with `decimal Amount` and `string Currency` — and give it a `+` **operator** that adds two amounts, but throws `InvalidOperationException` when the currencies differ. So `new Money(5m, "USD") + new Money(3m, "USD")` equals `new Money(8m, "USD")`, and adding USD to EUR blows up loudly instead of producing nonsense.

Practices: writing a value type in the project's style, operator overloading, guarding invariants.

Hint: the signature is `public static Money operator +(Money a, Money b)` inside the record struct, and `a with { Amount = ... }` works on record structs too.

Check it offline: add to `Tests.cs` — all three should pass:
```csharp
Check.Equal(new Money(8m, "USD"), new Money(5m, "USD") + new Money(3m, "USD"), "same currency adds");
Check.True(new Money(2m, "USD") == new Money(2m, "USD"), "value equality for free");
Check.Throws<InvalidOperationException>(() => { var _ = new Money(1m, "USD") + new Money(1m, "EUR"); }, "mixed currencies refuse");
```

## Solutions

### 1. Translate a Point

```csharp
public record Point(int X, int Y)
{
    public Point Translate(int dx, int dy) => this with { X = X + dx, Y = Y + dy };
}
```

WHY: records may have bodies with methods, just like classes. `this with { ... }` is the record-native way to say "a copy of me, changed" — no field-by-field constructor call, and impossible to forget a field, because unlisted ones are copied automatically.

### 2. Bump the quantity

```csharp
public Order WithExtra(int more) => this with { Quantity = Quantity + more };
```

WHY: same shape as `WithDiscount` — a pure method that *returns* the change instead of performing it. Callers decide what to do with the copy; nobody who holds the original can be surprised. This With-prefix naming is a common C# convention for exactly this pattern.

### 3. Discount the whole cart

```csharp
public void DiscountAll(decimal percent)
{
    for (int i = 0; i < _lines.Count; i++)
    {
        _lines[i] = _lines[i].WithDiscount(percent);
    }
}
```

WHY: `foreach` hands you a *copy of the reference* — assigning to it wouldn't touch the list (the compiler forbids it outright). Replacing by index is the honest operation: slot `i` now points at a new, discounted record. The old records are unchanged; anyone still holding one sees exactly what they always saw.

### 4. A snapshot you can trash

```csharp
public List<Order> Snapshot() => new List<Order>(_lines);
```

WHY: `new List<Order>(_lines)` builds a fresh list object holding the same order references — and since `Order` is immutable, sharing the *items* is perfectly safe; only the *list* needed copying. This is the cheap kind of defensive copy immutability buys you: one level deep is enough.

### 5. Extend the record and follow the errors

```csharp
public record Order(string Product, int Quantity, decimal UnitPrice, string Sku = "SKU-0")
```

WHY: without the default, every 3-argument `new Order(...)` fails with CS7036 — the compiler hands you a complete TODO list of call sites, which is the safe way to extend a type (JS would have silently passed `undefined`). With `= "SKU-0"`, old calls keep compiling and mean "no SKU yet". Since positional parameters become properties, `Sku` automatically joins `with` and value-equality.

### 6. Money: a readonly record struct with `+`

```csharp
public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money operator +(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException($"can't add {b.Currency} to {a.Currency}");
        return a with { Amount = a.Amount + b.Amount };
    }
}
```

WHY: `readonly record struct` combines everything this project taught: struct = value type (assignment copies, no aliasing possible), record = value equality and `with`, readonly = the compiler rejects any mutation. Operator overloading lets `+` read like arithmetic while still enforcing the currency rule — a wrong-currency add becomes a loud exception instead of a silent `5 + 3 = 8` across currencies, which is precisely the "money gone, no exception thrown" bug from the original, prevented by design.
