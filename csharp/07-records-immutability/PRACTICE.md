# 🏋️ Practice: Records and Immutability

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. The biggest line (warm-up)

Add `BiggestLine(IEnumerable<CartItem> items)` to `CartMath`: the largest line total in the cart (for the sample cart, the coffee's 31.05). Pure read, one expression.

Practices: LINQ `Max` with a selector, leaning on the record's computed `LineTotal`.

Hint: `items.Max(...)` — the lambda picks which number to compare. (On an empty cart it throws `InvalidOperationException`; that's `Max`'s honest answer to "biggest of nothing".)

Check it offline: add this Check test to `Tests.cs` — it should pass:
`Check.Equal(31.05m, CartMath.BiggestLine(SampleCart()), "coffee is the big line");`

### ⭐⭐ 2. Pure add and remove (core)

Add two functions to `CartMath`: `Add(items, item)` returns a new list with the item appended, and `Remove(items, name)` returns a new list without any item of that name. Neither may touch the list passed in — same contract as `ApplyDiscount`.

Practices: pure collection operations — building new lists instead of calling `List.Add`/`List.Remove` on the argument.

Hint: LINQ's `Append(item)` and `Where(...)`, each followed by `.ToList()`, never mutate their source.

Check it offline: add to `Tests.cs` — all three should pass:
```csharp
var before = SampleCart();
Check.Equal(4, CartMath.Add(before, new CartItem("Tea", 4.00m, 1)).Count, "new list has 4");
Check.Equal(3, before.Count, "original still has 3");
Check.Equal(35.45m, CartMath.Total(CartMath.Remove(before, "Mug")), "43.45 minus the 8.00 mug");
```

### ⭐⭐ 3. Coupons with a minimum spend (core)

Give `Coupon` a third init-only property, `decimal MinTotal { get; init; }` — its default `0m` keeps every existing coupon valid. Then add `ApplyCouponIfEligible(items, coupon)`: if the cart total reaches `MinTotal`, return the discounted cart; otherwise return the cart unchanged (either way, pure).

Practices: growing an init-only record without breaking callers, conditional logic that stays pure.

Hint: "unchanged" can mean returning `items.ToList()` — a fresh list, same items — so callers always get a list they own.

Check it offline: add to `Tests.cs` — both should pass:
```csharp
var picky = new Coupon { Code = "BIG50", Percent = 10m, MinTotal = 50m };
Check.Equal(43.45m, CartMath.Total(CartMath.ApplyCouponIfEligible(SampleCart(), picky)), "43.45 < 50: no discount");
var easy = new Coupon { Code = "SAVE10", Percent = 10m, MinTotal = 40m };
Check.Equal(39.12m, CartMath.Total(CartMath.ApplyCouponIfEligible(SampleCart(), easy)), "over the minimum: 10% off");
```

### ⭐⭐ 4. Sort without wrecking the order (core)

Add `CheapestFirst(items)` returning a new list ordered by line total, smallest first. The catch to appreciate: JS's `array.sort()` mutates in place (a classic bug source); LINQ's `OrderBy` never does — prove it with a test on the original's order.

Practices: `OrderBy` as non-mutating sort, tests that assert what *didn't* change.

Hint: one chain: `OrderBy(...)` then `.ToList()`.

Check it offline: add to `Tests.cs` — all three should pass:
```csharp
var cart2 = SampleCart();
var sorted = CartMath.CheapestFirst(cart2);
Check.Equal("Chocolate bar", sorted[0].Name, "4.40 line first");
Check.Equal("Coffee beans", sorted[2].Name, "31.05 line last");
Check.Equal("Coffee beans", cart2[0].Name, "original order untouched");
```

### ⭐⭐⭐ 5. Nested records, nested `with` (challenge)

Add two records to `CartItem.cs`: `record Delivery(string City, decimal Fee);` and `record Checkout(Coupon? Coupon, Delivery Delivery);`. Now write `MoveTo(Checkout checkout, string city)` in `CartMath`: a copy of the checkout whose delivery city changed but whose fee — and coupon — survive. The trick: `with` only copies one level, so changing a nested value means a `with` **inside** a `with` (the same shape as nested `...spread` in JS, but checked).

Practices: records containing records, the nested-`with` idiom, `Coupon?` as an optional field.

Hint: `checkout with { Delivery = checkout.Delivery with { City = city } }`.

Check it offline: add to `Tests.cs` — all three should pass:
```csharp
var co = new Checkout(new Coupon { Code = "SAVE10", Percent = 10m }, new Delivery("Bergen", 5.90m));
var moved = CartMath.MoveTo(co, "Oslo");
Check.Equal("Oslo", moved.Delivery.City, "city changed on the copy");
Check.Equal(5.90m, moved.Delivery.Fee, "fee survived the move");
Check.Equal("Bergen", co.Delivery.City, "original checkout untouched");
```

### ⭐⭐⭐ 6. The missing penny (challenge)

`ApplyDiscount` rounds **each line**, then sums: 39.12 for the sample cart at 10%. Write the other policy — `TotalDiscountedAtOnce(items, percent)`: discount the *total* and round **once** — and watch it produce 39.11. One cent of difference, purely from where the rounding lives. Reject out-of-range percents like `ApplyDiscount` does.

Practices: decimal arithmetic staying exact until *you* choose to round, rounding placement as a business decision, guard clauses.

Hint: `RoundMoney(Total(items) * (1m - percent / 100m))`. Work the sample by hand: 43.45 × 0.9 = 39.105, and `AwayFromZero` sends the half-cent up to 39.11 — while per-line rounding collects three separately-rounded prices that sum to 39.12.

Check it offline: add to `Tests.cs` — both should pass, one penny apart:
`Check.Equal(39.11m, CartMath.TotalDiscountedAtOnce(SampleCart(), 10m), "round once at the end");`
`Check.Equal(39.12m, CartMath.Total(CartMath.ApplyDiscount(SampleCart(), 10m)), "round per line — a penny more");`

## Solutions

### 1. The biggest line

```csharp
public static decimal BiggestLine(IEnumerable<CartItem> items) =>
    items.Max(item => item.LineTotal);
```

WHY: `LineTotal` is a computed property on the record — derived data lives *with* the data, so this function never re-multiplies price by quantity. `Max` with a selector is the whole loop-with-a-best-so-far pattern from earlier projects, compressed to one call.

### 2. Pure add and remove

```csharp
public static List<CartItem> Add(IEnumerable<CartItem> items, CartItem item) =>
    items.Append(item).ToList();

public static List<CartItem> Remove(IEnumerable<CartItem> items, string name) =>
    items.Where(item => item.Name != name).ToList();
```

WHY: `Append` and `Where` describe a *new* sequence; `ToList()` materializes it — the input list is never touched, so callers keep their cart exactly as it was. Note the items themselves are shared between old and new lists, and that's fine: immutable records make sharing safe, so a shallow copy is a correct copy.

### 3. Coupons with a minimum spend

```csharp
public decimal MinTotal { get; init; }   // added to Coupon — defaults to 0m
```

```csharp
public static List<CartItem> ApplyCouponIfEligible(IEnumerable<CartItem> items, Coupon coupon)
{
    var list = items.ToList();
    return CartMath.Total(list) >= coupon.MinTotal ? ApplyDiscount(list, coupon.Percent) : list;
}
```

WHY: an init-only property with a natural zero default extends the record without breaking a single `new Coupon { ... }` in the codebase — old coupons simply have no minimum. The function reads the total once into a local list (an `IEnumerable` might be lazily re-evaluated), then either delegates to the already-tested `ApplyDiscount` or returns the cart as-is. Both branches are pure, so callers can't tell *how* eligibility was decided — only what came back.

### 4. Sort without wrecking the order

```csharp
public static List<CartItem> CheapestFirst(IEnumerable<CartItem> items) =>
    items.OrderBy(item => item.LineTotal).ToList();
```

WHY: `OrderBy` produces a new ordered sequence and leaves the source alone — the non-mutating sort JS only got with `toSorted()` in 2023. The third Check line is the important one: asserting the *original's* order still holds is how tests state "this function is read-only" as a fact rather than a comment.

### 5. Nested records, nested `with`

```csharp
public record Delivery(string City, decimal Fee);
public record Checkout(Coupon? Coupon, Delivery Delivery);
```

```csharp
public static Checkout MoveTo(Checkout checkout, string city) =>
    checkout with { Delivery = checkout.Delivery with { City = city } };
```

WHY: `with` copies one level — writing only `checkout with { ... }` couldn't reach the city, because `Delivery` is a whole value of its own. So you build the new inner value first (`Delivery with { City = city }`, fee carried over automatically) and slot it into a new outer value. Same mental model as `{ ...checkout, delivery: { ...checkout.delivery, city } }` in JS — except forgetting a level here is a compile error, not a silently shared object.

### 6. The missing penny

```csharp
public static decimal TotalDiscountedAtOnce(IEnumerable<CartItem> items, decimal percent)
{
    if (percent < 0 || percent > 100)
        throw new ArgumentOutOfRangeException(nameof(percent), percent, "A discount is between 0 and 100 percent.");
    return RoundMoney(Total(items) * (1m - percent / 100m));
}
```

WHY: `decimal` keeps every intermediate value exact — 43.45 × 0.9 is *precisely* 39.105 — so the only place pennies appear or vanish is where **you** call `RoundMoney`. Round per line and three half-cents each get their own verdict (→ 39.12); round once and a single half-cent decides (→ 39.11). Neither is "correct" — it's a business rule — which is exactly why the project gives rounding a name and a test instead of letting display formatting decide.
