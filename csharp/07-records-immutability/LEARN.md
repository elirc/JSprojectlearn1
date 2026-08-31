# 📘 Learning Guide: Records and Immutability

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A shopping cart: a list of items (name, price, quantity), a function that totals it, and a coupon feature that shows a *preview* of the cart with 10% off.

The preview is the star of this project. A preview must, by definition, change nothing — you're just *looking* at what the discount would do. In the original, looking breaks the cart: after closing the preview, the real total has permanently changed. The refactor makes that bug *impossible to write*, using C# records.

Along the way you'll learn the single most important rule about money in code: money is `decimal`, never `double`.

## 2. Concepts you need first

### Reference types and aliasing (the 60-second recap)

Project 02's LEARN.md covers this in depth; here's the piece we need. When you put an *object* in a variable, the variable holds a **reference** — an arrow pointing at the object — not the object itself. Copying the variable copies the arrow:

```csharp
var a = new CartItem { Name = "Mug", Price = 8m, Qty = 1 };
var b = a;          // b is a second arrow to the SAME object
b.Price = 999m;
Console.WriteLine(a.Price);  // 999 — a changed too, because there IS only one object
```

Two variables, one object: that's **aliasing**. JS behaves identically with objects (`const b = a; b.price = 999` changes `a.price`), so this should feel familiar — and familiar means dangerous, because it hides well.

The original's key line is a subtler version of this:

```csharp
var preview = new List<CartItem>(cart);
```

This *does* make a new list — a real second list object. But a list holds references, so the new list holds arrows to the *same three items*. Copying a box of arrows gives you... more arrows to the same places. This is called a **shallow copy**: the container is new, the contents are shared.

### `decimal` vs `double` — the money rule

C# has several number types. Two matter here:

- `double` — binary floating point, fast, made for measurements (physics, graphics). This is what every JS `number` is.
- `decimal` — decimal floating point, made for money. Literals get an `m` suffix: `10.35m`.

Why not `double` for money? Because binary fractions can't represent most decimal fractions, the same way decimal can't write 1/3 exactly:

```csharp
Console.WriteLine(0.1 + 0.2);        // 0.30000000000000004  (double)
Console.WriteLine(0.1 + 0.2 == 0.3); // False!
Console.WriteLine(0.1m + 0.2m);      // 0.3  (decimal — exact)
Console.WriteLine(0.1m + 0.2m == 0.3m); // True
```

In JS you'd dodge this by storing integer *cents* (that's exactly what js#32 does — `1035`, not `10.35`). C# gives you a nicer tool: `decimal` stores decimal digits directly, so `10.35m` really is 10.35, and sums of many items don't accumulate binary dust. The tests in this project pin both facts down.

### Records — data with the mutations removed

A **record** is a C# type made for *data*. One line:

```csharp
public record CartItem(string Name, decimal Price, int Qty);
```

That line generates a constructor (`new CartItem("Mug", 8.00m, 1)`), three read-only properties, nice printing, and content-based equality. The crucial part: the properties are **immutable** — after construction, `item.Price = 9m` is a *compile error*. Not discouraged. Impossible.

In JS the closest you get is `Object.freeze(obj)` — a runtime speed bump that fails silently outside strict mode. A record is frozen *by the compiler*, before the program ever runs.

### `with` expressions — change as copying

If items can't change, how does a discount work? You make a **copy with a difference**:

```csharp
var mug = new CartItem("Mug", 8.00m, 1);
var twoMugs = mug with { Qty = 2 };   // new record: same Name, same Price, Qty = 2
Console.WriteLine(mug.Qty);           // 1 — the original is untouched
```

In JS you'd write `const twoMugs = { ...mug, qty: 2 }` — spread the old, override one field. `with` is that idea as language syntax, and it only works on records, which is a feature: the compiler guarantees the source *couldn't* have been edited instead.

### Value equality — records compare by content

Two JS objects are never `===` unless they're the same object. Class instances in C# behave the same way. Records don't — they compare **contents**:

```csharp
new CartItem("Mug", 8m, 1) == new CartItem("Mug", 8m, 1)   // True (records)
```

This is why record-based tests read like arithmetic: build the expected value, `Check.Equal`, done.

### Init-only properties

Records have a second style, useful when positional parameters get long:

```csharp
public record Coupon
{
    public string Code { get; init; } = "";
    public decimal Percent { get; init; }
}

var c = new Coupon { Code = "SAVE10", Percent = 10m };  // fine: still constructing
c.Percent = 50m;                                        // compile error: frozen
```

`init` means "settable only during object creation." You get the readable `{ Name = value }` construction syntax *and* immutability afterwards. (`get; set;` — plain settable properties — is what mutable classes use; you'll meet it deliberately in project 09.)

### Pure functions over immutable data

A **pure function** (the repo's oldest friend — see 01-fizzbuzz) returns a result and touches nothing else. Immutable inputs make purity easy to *believe*: if `CartItem` has no setters, `Total(cart)` physically cannot modify your cart. The type system turns "I promise this only reads" into "this provably only reads."

## 3. Walking through the original code

The item type — three public, mutable fields:

```csharp
class CartItem
{
    public string Name = "";
    public decimal Price;  // public and mutable: anyone can change it, any time
    public int Qty;
}
```

The cart prints correctly, totals `43.45`. Then the preview:

```csharp
var preview = new List<CartItem>(cart);  // "a copy of the cart"... is it?
foreach (var item in preview)
{
    item.Price = item.Price * 0.90m;     // adjust prices "just for the preview"
}
```

Read it with the aliasing glasses on. Line 1 copies the *list* — the box of arrows. The `foreach` then walks those arrows and mutates the objects at the end of them — the same objects `cart`'s arrows point to. The preview prints its discounted total (looks right!), the customer closes it...

```csharp
Console.WriteLine($"Total: {Total(cart):0.00}   <- should still be 43.45. It isn't.");
```

...and the real cart totals `39.11`. No exception, no warning. The bug happened at a distance: the code that *broke* the cart and the code that *notices* are in different places, which is what makes shared mutation so expensive to debug.

One more detail worth noticing: the preview set prices like `9.315` — the *data* now holds fractions of a cent, and only the `:0.00` display format hides it. If the customer had hit "pay," which amount would they be charged? Nobody decided.

## 4. What's wrong with it (in beginner terms)

**1. A copy that isn't a copy.** `new List<CartItem>(cart)` looks exactly like a safe copy and isn't one. Shallow copies are the classic footgun of every reference-based language — JS's `[...cart]` and `arr.slice()` have precisely the same behavior. The compiler can't help, because sharing references is *legal and normal*; only your intent made it wrong.

**2. Mutable data means every function is a suspect.** Once `Price` is publicly writable, you can't tell readers from writers by their signatures. Did `PrintCart` change anything? Did `Total`? You have to read every body. In the refactor, the question can't even be asked — nothing can write.

**3. A preview that costs money.** The feature's whole contract was "changes nothing." With shared mutable objects, that contract lived in the developer's head. Note that a *deep* copy (copying each item too) would have patched this one bug — but every future feature would need to remember the same trick. Immutability fixes the whole category.

**4. Unwritten rounding policy.** `Price * 0.90m` produced `9.315`. Round per item? Per cart? Half up? Half down (er, half to even)? The original never says — so the answer is whatever the display format does, which is an accident, not a policy.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 The preview corrupted the cart because previewing *shared* objects mutated them. Could you make a preview that doesn't touch the originals at all?
2. 🌿 What if "applying a discount" didn't edit any item, but *built a brand-new list of brand-new items* with the discounted prices? Write `ApplyDiscount(cart, percent)` that returns a `List<CartItem>` it constructed itself.
3. 🌳 Now make the compiler enforce it: change `class CartItem` (mutable fields) into `record CartItem(string Name, decimal Price, int Qty)`. Fix the compile errors that appear — every one marks a line that was mutating an item. Use `item with { Price = ... }` inside your `ApplyDiscount`.
4. 🍎 Decide the money policy: write `RoundMoney(decimal)` using `Math.Round(value, 2, MidpointRounding.AwayFromZero)` and apply it to each discounted price. Then write tests: total is `43.45m`; after `ApplyDiscount(cart, 10m)` the *original* still totals `43.45m`; and `0.1m + 0.2m == 0.3m`.

## 6. Understanding the refactored solution

**`CartItem.cs`** — the whole data model:

```csharp
public record CartItem(string Name, decimal Price, int Qty)
{
    public decimal LineTotal => Price * Qty;
}
```

`LineTotal` is a computed property — derived from the record's own values, so it can never disagree with them. The `Coupon` record shows the init-only style for contrast.

**`CartMath.cs`** — every operation is a pure function. The one that matters:

```csharp
public static List<CartItem> ApplyDiscount(IEnumerable<CartItem> items, decimal percent)
{
    ...
    var factor = 1m - percent / 100m;
    return items
        .Select(item => item with { Price = RoundMoney(item.Price * factor) })
        .ToList();
}
```

`Select` (LINQ, from project 04) maps each item to a *new* item via `with`; `ToList` collects them into a *new* list. Nothing in the pipeline can touch the input — the types forbid it. Compare this shape to the original's `foreach { item.Price = ... }`: the same arithmetic, but "transform a copy" instead of "edit in place."

The rounding policy got a name and a home:

```csharp
public static decimal RoundMoney(decimal value) =>
    Math.Round(value, 2, MidpointRounding.AwayFromZero);
```

Why spell out `MidpointRounding.AwayFromZero`? Because `Math.Round`'s *default* is banker's rounding (halves go to the nearest even digit: `1.005 → 1.00`), which surprises most people. Making the choice explicit turns a surprise into a documented decision — and the demo's preview total (39.12) now differs from the original's accidental 39.11 *because someone chose per-line rounding*.

**`Program.cs`** — replays the exact preview scenario. The preview builds its own cart; closing it changes nothing; the total is still 43.45. The demo ends with records printing themselves (`CartItem { Name = Mug, ... }`) and value equality — two conveniences you get free.

**`Tests.cs`** — read the middle block as the project's thesis statement:

```csharp
var discounted = CartMath.ApplyDiscount(cart, 10m);
Check.Equal(39.12m, CartMath.Total(discounted), "10% off, rounded per line item");
Check.Equal(43.45m, CartMath.Total(cart), "ORIGINAL cart total unchanged after discount");
```

Apply the discount, then check the *original*. In the original codebase this test would fail — which means this test is the regression alarm for the exact bug the project is about.

## 7. Words you learned (glossary)

- **Reference** — an arrow to an object; copying a variable copies the arrow, not the object.
- **Aliasing** — two variables pointing at one object, so a change through one appears through the other.
- **Shallow copy** — a new container holding the same references (`new List<T>(other)`, JS `[...arr]`).
- **Deep copy** — a copy of the container *and* everything inside; rarely needed once data is immutable.
- **Record** — a C# type for data: constructor, read-only properties, printing, and value equality, generated from one line.
- **Immutable** — cannot be changed after creation; "changing" means constructing a new value.
- **`with` expression** — `x with { Prop = v }`: a copy of record `x` differing only in the listed properties.
- **Value equality** — equal when contents are equal (records); contrast **reference equality** (same object).
- **Init-only property** — `{ get; init; }`: settable only while the object is being constructed.
- **Computed property** — a property derived from others (`LineTotal => Price * Qty`).
- **`decimal`** — C#'s exact base-10 number type; the only correct choice for money. Literal suffix `m`.
- **`double`** — binary floating point (every JS `number`); fine for measurements, wrong for ledgers.
- **Banker's rounding** — `Math.Round`'s default: halves go to the nearest *even* digit (`1.005 → 1.00`).
- **Rounding policy** — the explicit, named decision about how money rounds; ours is 2 decimals, away from zero.
- **Pure function** — output depends only on input; touches nothing else (project 01's core idea).

## 8. Experiments to try on the plane (no internet needed)

Rebuild after each change with `dotnet run --project csharp/07-records-immutability/refactored -- test` (or run the demo without `-- test`).

1. **Try to write the bug.** In the refactored `Program.cs`, add `cart[0].Price = 1m;` and build. Expected: compile error `CS8852` — init-only property can only be assigned during construction. The original's entire bug class, refused before the program runs.
2. **Prove the double dust.** Add to the demo: `Console.WriteLine(0.1 + 0.2);` and `Console.WriteLine(0.1m + 0.2m);`. Expected: `0.30000000000000004` then `0.3`. Then sum `0.1` a thousand times in a `double` loop and in a `decimal` loop and compare with `100`. Expected: the double is slightly off; the decimal is exactly 100.
3. **Change the rounding policy.** In `RoundMoney`, delete the `MidpointRounding.AwayFromZero` argument (falling back to banker's rounding) and run the tests. Expected: the `1.005m → 1.01m` test fails with actual `1.00`. Policies have tests precisely so a "harmless" edit like this gets caught.
4. **Add a cart operation, purely.** Write `ChangeQty(IEnumerable<CartItem> items, string name, int qty)` that returns a new list where the matching item has the new quantity (`item.Name == name ? item with { Qty = qty } : item`). Add a test asserting the original cart's Qty is unchanged. Notice you never needed a copy step — immutability made it automatic.
5. **Feel the original's bug twice.** In `original.cs`, open the preview *twice* in a row (copy the preview block). Expected: the cart gets discounted **twice** — the total drops to about `35.19` — because each preview compounds the mutation. Corruption isn't just wrong; it's wrong *cumulatively*.
