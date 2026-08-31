# 📘 Learning Guide: Value vs Reference

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A toy order system: a `Point` (warm-up), and `Order`s with a product, quantity, price, and tags, collected in a cart. The original tries three completely ordinary things — back up a value, give two orders the same default tags, duplicate an order line — and all three go quietly wrong, because the author believed `=` makes a copy. It doesn't. This project is about *what assignment actually does*, and about C#'s three kinds of types: **class**, **struct**, and **record**.

## 2. Concepts you need first

(Everything from project 01 — types, methods, `List<T>`, string interpolation — is assumed from here on.)

### Classes and objects
A **class** is a blueprint; an **object** (or *instance*) is one thing built from it:

```csharp
class Point
{
    public int X;   // a field — a variable living inside each object
    public int Y;
}

var p = new Point();      // build one
p.X = 5;                  // set its field
```

Like a JS class, minus the `constructor` boilerplate for now. `public` means "code outside the class may touch this."

### Object initializer syntax
A JS-object-literal-flavored way to create and fill an object in one go:

```csharp
var p = new Point { X = 1, Y = 2 };
// like JS: const p = { x: 1, y: 2 };  (but the shape must match the class!)
```

### Reference types: what `=` really does
Here is the whole lesson in four lines:

```csharp
var a = new Point { X = 1 };
var b = a;        // copies the ARROW, not the object
b.X = 99;
Console.WriteLine(a.X);   // 99 — a and b are two names for ONE object
```

A class variable doesn't contain the object; it contains a **reference** — an arrow to where the object lives. `=` duplicates the arrow. Two arrows, one object: change it through either name and "both" change, because there's no both. This is called **aliasing**. JS objects behave *exactly* the same way (`const b = a; b.x = 99;`) — this bug is an old friend in a new language.

### Value types: `struct`
C# has a second kind of type. A **struct** is a **value type**: the variable *contains the data itself*, so `=` copies the whole thing:

```csharp
struct Pixel { public int X; public int Y; }

var p1 = new Pixel { X = 1 };
var p2 = p1;      // full copy, automatically
p2.X = 99;
Console.WriteLine(p1.X);   // 1 — p1 was never touched
```

Surprise: you've used structs all along. `int`, `bool`, `char`, `double`, `decimal`, `DateTime` — all structs. That's why `int b = a; b = 99;` never spooked you: numbers copy. JS has this split too (numbers/strings copy, objects share) — C# just lets you *define* your own value types.

### `decimal` — money's type
`double` (like every JS number) is binary floating point: `0.1 + 0.2 != 0.3`. **`decimal`** stores decimal digits exactly, so money math comes out even. Literals take an `m` suffix: `8.00m`. Rule of thumb: money → `decimal`, science/graphics → `double`.

### Records: value semantics for data
A **record** is a class with the sharp edges filed off, declared in one line:

```csharp
public record Point(int X, int Y);

var a = new Point(1, 2);
Console.WriteLine(a.X);                        // 1
Console.WriteLine(a == new Point(1, 2));       // True  — equal by VALUE!
Console.WriteLine(a);                          // Point { X = 1, Y = 2 } — free printing
```

That one line generates: a constructor, read-only properties `X` and `Y`, value-based equality, and a readable `ToString`. Two things make records the default choice for data:

1. **Value equality.** `==` compares *contents*, not arrows. (In JS, `{x:1} === {x:1}` is `false` — you always wished it wasn't. Here it's `True`.)
2. **Immutability.** `a.X = 99` is a *compile error*. Once built, a record can't change — so aliasing one is completely harmless. Sharing an object nobody can write to is indistinguishable from having your own copy.

### `with` expressions — the copy machine
If records can't change, how do you "change" one? You build a modified copy:

```csharp
var a = new Point(1, 2);
var b = a with { X = 99 };   // new Point(99, 2); a untouched
var c = a with { };          // exact clone (new object, same values)
```

This is C#'s `{ ...a, x: 99 }` spread-copy, but built into the language and type-checked.

### Properties and `=>` (expression-bodied members)
A **property** looks like a field but can compute its value. `=>` gives a one-line body (like a JS arrow function's implicit return):

```csharp
public record Order(string Product, int Quantity, decimal UnitPrice)
{
    public decimal Total => Quantity * UnitPrice;   // computed on every read
}
```

`order.Total` — no parentheses, it reads like data. (JS analog: a `get total()` accessor.)

### `IReadOnlyList<T>` — look, don't touch
Handing out your private `List<T>` lets callers `Add`/`Remove` behind your back. Exposing it as `IReadOnlyList<T>` gives them indexing and `Count` but no mutation:

```csharp
private readonly List<Order> _lines = new();
public IReadOnlyList<Order> Lines => _lines;    // callers can read, not rewrite
```

`readonly` on the field means the *field* can't be re-pointed at a different list. (The `I` prefix marks an *interface* — a contract naming what operations exist. Interfaces get their own project later; for now: it's the read-only view of a list.)

### `ReferenceEquals`
Asks the raw question "same object in memory?" — ignoring any friendly value-equality. `ReferenceEquals(a, clone)` is `false` for a `with { }` clone even though `a == clone` is `true`. The tests use it to prove a copy is genuinely separate.

## 3. Walking through the original code

Surprise 1 — the backup that wasn't:

```csharp
var home = new Point { X = 1, Y = 2 };
var backup = home;          // "save a copy before I experiment"... except it isn't a copy
backup.X = 99;              // "only changing the backup"
```

`Point` is a class → `backup` gets the arrow, not the point. `home.X` prints 99.

Surprise 2 — the shared default:

```csharp
var defaultTags = new List<string> { "new" };
var mug = new Order { ..., Tags = defaultTags };
var tee = new Order { ..., Tags = defaultTags };
mug.Tags.Add("gift-wrap");
```

Both orders' `Tags` fields hold arrows to the *same list*. Gift-wrapping the mug gift-wraps the t-shirt. (The JS twin: two objects sharing one default array.)

Surprise 3 — the aliased "duplicate":

```csharp
orders.Add(mug);
orders.Add(tee);
orders.Add(mug);            // "ordered the mug line twice" — same object, twice!
...
orders[0].UnitPrice = orders[0].UnitPrice / 2;
```

The list holds three arrows, but two point at one object. Halving "line 1's" price halves "line 3's" too: total 31.00 instead of the expected 39.00. **No exception. Wrong money.** These are the worst bugs — the program is perfectly happy.

## 4. What's wrong with it (in beginner terms)

**1. The code lies about copies.** Nothing distinguishes "I want my own Point" from "I want to share that Point" — both are `=`. The author *meant* copy three times and got sharing three times.

**2. Mutable + shared = action at a distance.** Any line that writes `something.Field = ...` might be changing data that five other variables are watching through their own arrows. In a 60-line file you can spot it; in a 6,000-line app, this is the bug you chase for a day.

**3. The "default" object is a landmine.** Sharing one mutable list as a default works right up until the first mutation. (This exact pattern — a shared default you were supposed to copy — is a classic bug in every reference-semantics language.)

**4. Nothing states intent.** Should an `Order` ever change after creation? The class can't say. `public` mutable fields mean "anyone, anywhere, any time" — the widest possible contract, chosen by accident.

## 5. Try it yourself first!

Fix `original.cs` so all three surprises print the *expected* numbers. Hints, vaguest first:

1. 🌱 The bug is never the line that prints the wrong value — it's an earlier line that *shared* when it meant *copy*. Find all three sharing points.
2. 🌿 Brute-force fix first: everywhere a copy was intended, build a `new Point`/`new Order` and copy fields across by hand. (Also: `new List<string>(defaultTags)` copies a list.) Works — feel how manual and easy-to-forget it is.
3. 🌳 Language fix: turn `Point` and `Order` into `record`s with positional parameters. The compiler now *refuses* every mutating line — each red squiggle is a spot where the design was leaning on mutation.
4. 🍎 Replace each refused mutation with a `with` copy: `backup = home with { X = 99 }`, discount = `orders[0] = orders[0] with { UnitPrice = ... }`. For the tags, give each order its own list. Watch all three surprises evaporate.

## 6. Understanding the refactored solution

**`Models.cs`** — the data, now honest:

```csharp
public record Point(int X, int Y);

public record Order(string Product, int Quantity, decimal UnitPrice)
{
    public decimal Total => Quantity * UnitPrice;

    public Order WithDiscount(decimal percent) =>
        this with { UnitPrice = UnitPrice * (1 - percent / 100m) };
}
```

`WithDiscount` is pure: it returns a discounted *copy* (`this` = the current object). The original is untouched — the tests prove it. `Tags` is gone from `Order` entirely; keeping the record all-value keeps `==` meaningful (a list field would compare by arrow — a classic record gotcha worth remembering).

**`Cart.cs`** — the one legitimate class, because a cart genuinely *is* mutable state with identity:

```csharp
private readonly List<Order> _lines = new();
public IReadOnlyList<Order> Lines => _lines;

public void DuplicateLine(int index) => _lines.Add(_lines[index] with { });

public void DiscountLine(int index, decimal percent) =>
    _lines[index] = _lines[index].WithDiscount(percent);
```

Two defenses: the list is private (outsiders get the read-only view), and the *contents* are immutable records. `DiscountLine` doesn't mutate an order — it **replaces one slot** with a modified copy. Even if two slots somehow shared a record, replacing slot 0 can't touch slot 2. The aliasing bug is not "avoided" — it's *unrepresentable*.

**`Tests.cs`** — each test pins one semantic fact: `with`-copies don't propagate (`home.X` still 1), clones are equal-but-separate (`ReferenceEquals` false), the cart total after a line-1 discount is 39.00 — the exact number the original got wrong — and the struct `Pixel` copies on assignment. Note how *testable* value semantics are: no setup, no mocks, just "make data, copy, compare."

**How `Tests.cs` runs**: same as project 01 — `Program.cs` checks `args.Contains("test")` and hands the exit code from `Tests.Run()` (which tallies via `Check`) to `Environment.Exit`.

## 7. Words you learned (glossary)

- **Field** — a variable stored inside each object of a class.
- **Reference type** — variable holds an *arrow* to the object (`class`, `record` declared as reference, arrays, `List<T>`).
- **Value type** — variable holds the data itself; assignment copies (`struct`, `int`, `decimal`...).
- **Aliasing** — two variables holding arrows to the same object.
- **Object initializer** — `new Point { X = 1 }` create-and-fill syntax.
- **`record`** — a data type with value equality, immutability, and free `ToString`, in one line.
- **Value equality** — "equal" means same *contents*, not same object.
- **Immutable** — cannot be changed after creation.
- **`with` expression** — builds a modified copy of a record: `a with { X = 99 }`.
- **`decimal` / `m` suffix** — exact decimal arithmetic; the money type.
- **Property** — field-lookalike that can compute its value (`Total => ...`).
- **Expression-bodied member (`=>`)** — one-expression method/property body.
- **`readonly`** — field that can't be re-assigned after construction.
- **`IReadOnlyList<T>`** — a list view without mutation; interfaces star in cs#10.
- **`ReferenceEquals`** — "are these literally the same object?"
- **Defensive copy** — copying data at a boundary so callers can't share your internals.

## 8. Experiments to try on the plane (no internet needed)

1. **Try to reintroduce the bug.** In `Program.cs`, add `home.X = 99;`. Expected: compile error CS8852 — `X` is init-only. The original's Surprise 1 is now *impossible to type*. Delete the line.
2. **Prove sharing immutable things is safe.** In `Cart.DuplicateLine`, change `_lines[index] with { }` to just `_lines[index]` (share, don't copy!). Run the tests. Expected: still all green — because `DiscountLine` replaces slots instead of mutating orders, sharing can't hurt. Put `with { }` back and decide which you'd rather maintain.
3. **Records vs lists gotcha.** In `Models.cs` temporarily add a list: `public record Tagged(string Name, List<string> Tags);` then in `Tests.cs`: `Check.True(new Tagged("a", new List<string>{"x"}) == new Tagged("a", new List<string>{"x"}), "lists compare by value?");`. Expected: FAIL — the two lists are different objects, and record equality compares list *fields* by arrow. This is why `Order` keeps only value-type fields. Remove the experiment.
4. **Struct vs class, side by side.** In `Models.cs` change `struct Pixel` to `class Pixel`, run tests. Expected: "changing the struct copy leaves the original alone" FAILS — `p2` became an alias. One keyword flipped the semantics; switch it back.
5. **Add `Cart.RemoveLine(int index)`.** Write it (`_lines.RemoveAt(index)`), then write two tests: removing the middle line keeps the other totals, and the count drops. Expected: green — and notice how the read-only `Lines` property made asserting on cart contents trivial.
