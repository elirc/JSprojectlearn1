# 📘 Learning Guide: Branded Types

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code handles money. To avoid decimal rounding bugs, amounts are stored as whole **cents** (1035 means $10.35) — a discipline this repo's JS track taught. The problem: cents, dollars, and user IDs are all typed `number`, so the compiler can't tell them apart. A dollars value walks into a cents slot ($10.35 becomes $0.10 on the price tag), and a function call with **swapped arguments** — `refund(amount, userId)` instead of `refund(userId, amount)` — compiles without a whisper.

The fix is a **branded type**: a compile-time label glued onto a primitive. `Cents` *is* a number at runtime (math works, nothing slows down), but the compiler treats it as its own species — so dollars, IDs, and naked numbers can't impersonate it.

Fun fact from the README: NASA lost a Mars orbiter to exactly this bug class — one team used metric units, another used imperial, and nothing checked.

## 2. Concepts you need first

### 2.1 Structural typing — TypeScript compares shapes, not names

TypeScript considers two types the same if they have the same *structure*. Names don't matter:

```ts
type Cents = number;
type Dollars = number;
let c: Cents = 100;
let d: Dollars = 1;
c = d; // ✅ OK (!) — both are just `number`; the alias names are decoration
```

This is usually convenient — but it means a plain type alias gives *zero* protection. To make two numbers incompatible, we must make their *structures* differ.

### 2.2 Intersection types — `A & B` means "both at once"

An intersection combines types: a value of type `A & B` must satisfy both:

```ts
type Named = { name: string };
type Aged = { age: number };
const p: Named & Aged = { name: 'Ada', age: 36 }; // ✅ needs both
const q: Named & Aged = { name: 'Ada' };          // ❌ Error: age missing
```

### 2.3 The brand trick — intersect a primitive with a phantom marker

Here's the move: intersect `number` with an object type containing a made-up property:

```ts
type Cents = number & { readonly __brand: 'cents' };
type Dollars = number & { readonly __brand: 'dollars' };

let c: Cents = 100;            // ❌ Error: 100 has no __brand property
declare const d: Dollars;
const c2: Cents = d;           // ❌ Error: brand 'dollars' ≠ brand 'cents'
```

No runtime value will ever actually have `__brand` — it's a **phantom**: it exists only in the type. Its job is purely to make `Cents` and `Dollars` structurally different from each other and from plain `number`. Because the brands are different string literals (`'cents'` vs `'dollars'`), the two types are mutually incompatible.

But wait — if `100` doesn't satisfy `Cents`, how do you ever *make* one? That's next.

### 2.4 Type assertions as doors — `as`, used deliberately

`value as Cents` tells the compiler "trust me, this is Cents." Normally assertions are dangerous (exercise 14's lesson: `as` overrides instead of checks). The branded-type pattern uses exactly **one** assertion per brand, sealed inside a **constructor function** — the only door into the type:

```ts
function cents(value: number): Cents {
  if (!Number.isInteger(value)) throw new RangeError('cents must be integers');
  return value as Cents; // the ONE honest cast, guarded by validation
}
const price = cents(1035); // ✅ the only way in
```

Division of labor: the *brand* handles identity at compile time ("this number means cents"); the *door* handles validity at runtime ("cents are whole numbers"). Everywhere else in the codebase, no casts — just `Cents` flowing around, checked.

### 2.5 Why arithmetic still works

`Cents` is `number & {...}`, and TypeScript lets you do number things with it — `amount / 100`, `.toFixed(2)` — because it *is* a number. The brand costs nothing at runtime: types erase when the code runs (type erasure, see exercise 28's LEARN.md), so the running JavaScript sees a plain `1035`.

One nuance: the *result* of arithmetic is plain `number`, not `Cents` — math strips the brand. If you need the result branded again, pass it back through the door: `cents(a + b)`.

### 2.6 `readonly` on the marker

`readonly __brand: 'cents'` — the `readonly` is belt-and-suspenders: even in weird edge cases nobody can assign to the phantom property. It never exists at runtime anyway.

## 3. Walking through the original code

The API, all `number`:

```ts
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
```

Divide by 100, show two decimals: `formatCents(1035)` → `"$10.35"`. Fine — *if* what you pass really is cents.

The first bug:

```ts
const priceDollarsFromForm = 10.35;
export const label = formatCents(priceDollarsFromForm);
// "$0.10" — a $10.35 item priced at ten cents
```

A form gives dollars; the function expects cents. Both are `number`, so the compiler waves it through, and `10.35 / 100 = 0.1035` → `"$0.10"`. A ten-dollar item now displays as ten cents.

The second bug:

```ts
export function refund(userId: number, amountCents: number): string { ... }

const userId = 7;
const amountCents = 1035;
export const receipt = refund(amountCents, userId);
//                             ^ ARGUMENTS SWAPPED
```

Refunding $0.07 to user 1035. Two parameters of the same type mean the compiler *cannot* notice a swap — `number, number` in, `number, number` expected, done.

The file's closing comment names the gap: integer-cents discipline solved the *arithmetic* problem (no float rounding). The *identity* problem — which number means what — needs the type system... if only `number` could carry a label.

## 4. What's wrong with it (in beginner terms)

**Bug story 1 — the ten-cent flagship product.** The checkout page reads the price from a form (dollars: `10.35`) and passes it to `formatCents`. The product page shows `$0.10`. Legal wants to know if you must honor the displayed price. All because two numbers with different *meanings* shared one type.

**Bug story 2 — the swapped refund.** `refund(amountCents, userId)` — arguments in the wrong order. User number 1035 receives a 7-cent refund. Support tickets ensue. The compiler had all the information *conceptually* ("this is an ID, that is an amount") but the types threw that information away by both being `number`.

**Why discipline isn't enough:** the JS track prevented these bugs with careful naming and code review. But discipline is a human process; it fails on tired Fridays. The whole point of a type system is to replace discipline with checking.

## 5. Try it yourself first!

1. **Vague hint:** the problem is that `Cents`, `Dollars`, and `UserId` (if you even define them) are all just `number` in disguise. How can you make the compiler treat them as *different* types? (Section 2.1 explains why a plain alias fails.)
2. **Warmer:** you need each type to have a structure the others lack. What type operator combines `number` with an extra marker property? (Section 2.3.)
3. **Warmer still:** once `Cents` demands a `__brand` no real value has, plain numbers can't be assigned. Write one constructor function per brand containing the single `as` — and put js#32's "integers only" rule inside `cents()` as a runtime check.
4. **Finishing touch:** dollars → cents conversion should exist in exactly one function (`dollarsToCents`), so the `* 100` never gets scattered or forgotten. Then re-type `formatCents` and `refund` to demand the branded types.

## 6. Understanding the refactored solution

The brands:

```ts
export type Cents = number & { readonly __brand: 'cents' };
export type Dollars = number & { readonly __brand: 'dollars' };
export type UserId = number & { readonly __brand: 'userId' };
```

Three species of number. Each is incompatible with the others and with bare `number`, because each carries a different phantom marker.

The doors:

```ts
export function cents(value: number): Cents {
  if (!Number.isInteger(value)) {
    throw new RangeError(`cents must be integers, got ${value}`);
  }
  return value as Cents;
}
```

The file's one honest cast for `Cents`, sealed with validation. `cents(10.35)` *throws* — fractional cents die at runtime, at the door, before they can circulate. This is the boundary pattern from exercise 13, applied to a single number: validate on entry, trust thereafter.

Explicit conversion:

```ts
export function dollarsToCents(amount: Dollars): Cents {
  return cents(Math.round((amount as number) * 100));
}
```

The *only* path from dollars to cents. The `* 100` lives in exactly one audited place. (The `amount as number` just unwraps the brand for the arithmetic — harmless, since Dollars is a number.)

The API now states meanings:

```ts
export function formatCents(amount: Cents): string { ... }
export function refund(user: UserId, amount: Cents): string { ... }
```

And the type tests replay both original bugs as compile errors: dollars into a cents slot — rejected; a naked `1035` — rejected (go through the door); `refund(price, ada)` with swapped arguments — rejected, because an amount is not a `UserId`. The swap that once refunded 7 cents to user 1035 is now a red squiggle.

Where brands earn their keep (from the README): any primitive with *meaning* — money and units, IDs (`UserId` vs `PostId`), sanitized vs raw strings, validated emails. Cheap to add; kills the whole mixed-up-argument bug family in that domain.

## 7. Words you learned (glossary)

- **Branded type (nominal-ish type)** — a primitive intersected with a phantom marker so the compiler treats it as its own distinct type.
- **Structural typing** — TypeScript's rule that types with identical shapes are interchangeable, whatever their names.
- **Intersection type (`A & B`)** — a type that must satisfy both `A` and `B`.
- **Phantom property** — a property that exists only in the type, never on any runtime value.
- **Constructor function (door)** — the single function allowed to create a branded value, containing the one cast plus validation.
- **Type assertion (`as`)** — overriding the compiler's opinion; safe only when contained and guarded.
- **Type erasure** — types disappear at runtime; a `Cents` is a plain number when the code runs.
- **Integer-cents discipline** — storing money as whole cents to avoid floating-point rounding errors.
- **`Number.isInteger(x)`** — runtime check that `x` is a whole number.
- **`RangeError`** — the built-in error class for "value out of allowed range."
- **Boundary pattern** — validate data once where it enters; rely on types inside (exercise 13).
- **Unit bug** — a value in one unit consumed as another (dollars as cents; the Mars orbiter).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change, then undo it.

1. In `refactored/money.ts`, add `const total: Cents = cents(500) + cents(250);`. **Expected:** ❌ Error — arithmetic strips the brand, so the sum is plain `number`. Fix: `const total = cents(cents(500) + cents(250) as number + 0);` is clumsy — cleaner: `const total = cents((cents(500) as number) + (cents(250) as number));` or simplest: write an `addCents(a: Cents, b: Cents): Cents` helper using the door. Notice how the design nudges you toward audited helpers.
2. Add a fourth brand: `type PostId = number & { readonly __brand: 'postId' };` with a `postId()` door, then try `refund(postId(3), price)`. **Expected:** ❌ Error — a `PostId` is not a `UserId`, even though both are numbers. IDs stop being interchangeable.
3. Delete the `Number.isInteger` check inside `cents()`. **Expected:** still typechecks — this guard is *runtime* protection, invisible to the compiler. Lesson: brands handle identity; doors handle validity; you need both.
4. Change `Dollars`'s brand string to `'cents'` (so both markers read `'cents'`). **Expected:** the `formatCents(formPrice)` type test errors with "Unused '@ts-expect-error'" — identical brands make the types interchangeable again. The label string is what keeps species apart.
5. Try to sneak in without the door: `const fake: Cents = 1035 as Cents;`. **Expected:** ✅ compiles — `as` can always force it. Nothing *technically* stops a determined caster; the pattern works by convention plus code review keeping `as Brand` inside constructor files only. Search-your-codebase-for-`as Cents` is the audit.
