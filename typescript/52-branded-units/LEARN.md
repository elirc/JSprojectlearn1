# 📘 Learning Guide: Branded Units

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

A layout function takes a width, a padding, and a font size. A transition function takes a duration. Four quantities, four different *units* — pixels, pixels, ems, milliseconds — and one type: `number`.

So `card(FADE, TITLE_SIZE, GUTTER)` compiles. It also *runs*, and produces `width:250px;padding:1.5px;font-size:16em` — a card sized by a quarter-second fade, padding you can't see, and a title sixteen times the body text. Nothing throws. The page renders. The bug arrives as a screenshot in a bug tracker with the title "styling looks weird".

Exercise 29 solved this for money: brand the primitive so cents and dollars stop being interchangeable. This exercise applies that pattern to physical units and adds the part 29 left open — **arithmetic**. Because `a + b` on two branded numbers gives a plain `number`, a brand that doesn't survive a calculation protects only the first line of it. The answer is a small set of helpers (`addPx`, `scale`, `sum`) that return branded results, plus conversion functions as the only doors between units.

## 2. Concepts you need first

### 2.1 Structural typing means aliases don't protect you (ts#29 refresher)

```ts
type Px = number;
type Ms = number;
let width: Px = 16;
const fade: Ms = 250;
width = fade; // ✅ compiles — both are just `number`
```

TypeScript compares *shapes*, not names. A plain alias is a comment with syntax highlighting. To make two numbers incompatible you must make their structures differ.

### 2.2 The brand: intersect with a phantom marker

```ts
type Brand<T, Name extends string> = T & { readonly __unit: Name };
type Px = Brand<number, 'px'>;
type Ms = Brand<number, 'ms'>;

let width: Px = 16;   // ❌ 16 has no __unit property
declare const fade: Ms;
const w: Px = fade;   // ❌ brand 'ms' ≠ brand 'px'
```

No runtime value ever has `__unit` — it's a **phantom**, existing only in the type. Because the marker strings differ, `Px` and `Ms` are mutually incompatible *and* both incompatible with bare `number`. And because `Px` is still `number & ...`, arithmetic and `.toFixed()` work exactly as before; the brand costs nothing at runtime because types erase.

### 2.3 Doors: one cast each, sealed with validation

If `16` isn't a `Px`, how do you make one?

```ts
export function px(value: number): Px {
  if (!Number.isFinite(value)) throw new RangeError(`px must be finite, got ${value}`);
  return value as Px; // the ONE honest cast for this brand
}
export function ms(value: number): Ms {
  if (value < 0) throw new RangeError(`durations can't be negative, got ${value}`);
  return value as Ms;
}
```

Division of labour, worth memorizing: the **brand** handles *identity* at compile time ("this number means pixels"); the **door** handles *validity* at runtime ("durations aren't negative"). You need both, and neither substitutes for the other.

### 2.4 Arithmetic strips brands — the part ts#29 left open

```ts
declare const a: Px, b: Px;
const sum = a + b;        // sum: number  ← the brand is GONE
const wrong: Px = a + b;  // ❌ Error: number is not assignable to Px
```

TypeScript's `+` operator is defined on `number` and returns `number`; it has no idea your operands carried a marker. That's not a flaw, it's a nudge — it pushes you to write *named* operations:

```ts
export function addPx(a: Px, b: Px): Px {
  return px((a as number) + (b as number)); // unwrap, compute, re-enter through the door
}
```

Now `addPx(gutter, fade)` is a compile error, and the result of a legal addition is still a `Px`, so it survives into the next expression.

### 2.5 Generic helpers that preserve the brand

Writing `addPx`, `addEm`, `addMs`, `scalePx`, `scaleEm`… gets old. Constrain a type parameter to the union of your brands instead:

```ts
export type Unit = Px | Em | Ms;

export function scale<T extends Unit>(value: T, factor: number): T {
  return ((value as number) * factor) as T; // T in, T out
}
export function sum<T extends Unit>(values: readonly T[]): T {
  return values.reduce<number>((total, v) => total + (v as number), 0) as T;
}
```

`scale(fade, 2)` is an `Ms`; `scale(gutter, 2)` is a `Px`; and `const bad: Px = scale(fade, 2)` fails. One function, every unit, no leakage. Note `sum`'s signature also rejects a *mixed* array in a satisfying way: `sum([gutter, titleSize])` infers `T = Px | Em`, which is assignable to neither `Px` nor `Em`, so the assignment fails at the call site.

### 2.6 Conversion as the only door between units

```ts
export function emToPx(size: Em, root: Px): Px {
  return px((size as number) * (root as number));
}
```

The multiplication that relates ems to pixels lives in exactly one place, named, with both operands' units checked — so it can't be forgotten in one branch and applied twice in another. Note that even the *argument order* is now protected: `emToPx(root, titleSize)` doesn't compile.

### 2.7 One formatter, one suffix

```ts
export function card(width: Px, padding: Px, fontSize: Em): string {
  return [`width:${width}px`, `padding:${padding}px`, `font-size:${fontSize}em`].join(';');
}
```

The template literal's `px` suffix and the parameter's `Px` type are now guaranteed to agree, because nothing but a `Px` can reach that string. In the original, the suffix was chosen by whoever wrote the formatter and the value by whoever called it — two decisions, in two files, with nothing connecting them.

## 3. Walking through the original code

```ts
export function card(width: number, padding: number, fontSize: number): string {
  return [`width:${width}px`, `padding:${padding}px`, `font-size:${fontSize}em`].join(';');
}
export function fadeIn(duration: number): string {
  return `transition:opacity ${duration}ms`;
}
const GUTTER = 16;      // px
const TITLE_SIZE = 1.5; // em
const FADE = 250;       // ms
```

The units exist — in trailing comments. That's the whole problem: the knowledge is in the file, just not in a form anything can check.

```ts
export const style = card(FADE, TITLE_SIZE, GUTTER);
```

Three arguments, three wrong units, zero errors. The output renders and looks *plausibly* broken, which is the failure mode most likely to be misdiagnosed as a CSS problem.

```ts
export const combined = GUTTER + TITLE_SIZE; // 17.5
```

Seventeen and a half of what? The number has no answer.

```ts
export const scaled = scaleAll([GUTTER, TITLE_SIZE, FADE], 2); // [32, 3, 500]
```

One array, three units, doubled together, out comes `number[]` — spendable anywhere, meaning nothing.

```ts
export const animation = fadeIn(GUTTER); // "transition:opacity 16ms"
```

A 16-pixel gutter as a duration. The fade is imperceptible, so the report is "the animation isn't working" and the investigation starts in the CSS.

## 4. What's wrong with it (in beginner terms)

**Bug story — the pricing page that "looks weird".** A refactor reorders `card`'s parameters. Every call site is updated except one, where the arguments happen to be `FADE, TITLE_SIZE, GUTTER`. The build is green, the tests (which assert on the *string*, and were regenerated) are green, and the page ships. A designer notices the title is enormous. Three people look at stylesheets. Eventually someone reads the call site.

Compare with a crash: a crash has a stack trace pointing at a line. A layout that renders wrong has a screenshot pointing at a *pixel*. Wrong-but-plausible output is the most expensive kind of bug to trace, and untyped units produce it by default.

**Why comments don't help.** `const GUTTER = 16; // px` is checked by nobody. The moment the constant leaves this file, the comment stays behind. Types are the only annotations that travel with the value.

**Why this bug class is everywhere.** Anywhere a number has a unit: CSS lengths and durations, bytes vs kilobytes, seconds vs milliseconds (a perennial source of 1000× bugs), degrees vs radians, latitude vs longitude, cents vs dollars (ts#29). NASA lost the Mars Climate Orbiter to pound-seconds vs newton-seconds. The fix is always the same three lines of type.

## 5. Try it yourself first!

1. **Vague hint:** the units are already written down — in comments. What would it take to move them into the types, so `GUTTER` and `FADE` stop being assignable to each other? (ts#29 has the mechanism.)
2. **Warmer:** write `type Brand<T, Name extends string> = T & { readonly __unit: Name }` once, then `Px`, `Em`, `Ms` from it. Add a door function per brand — and put a real runtime check in the two where one makes sense (durations can't be negative; pixels must be finite).
3. **Warmer still:** re-type `card` and `fadeIn` to demand the right units, then watch the four original call sites fail. Read each error; they're unusually satisfying.
4. **The arithmetic problem:** try `const wide: Px = GUTTER + px(8);`. It fails — `+` returns plain `number`. Write `addPx(a: Px, b: Px): Px` that unwraps, adds, and re-enters through the door.
5. **Generalize:** rather than one helper per unit, write `type Unit = Px | Em | Ms` and `scale<T extends Unit>(value: T, factor: number): T` plus `sum<T extends Unit>(values: readonly T[]): T`. Check that `scale(FADE, 2)` is an `Ms` and that `sum` refuses to give a single answer for a mixed array.
6. **Conversion:** write `emToPx(size: Em, root: Px): Px` and make it the only path between the two. Then confirm `emToPx(root, titleSize)` — arguments swapped — doesn't compile.

## 6. Understanding the refactored solution

The brands and the union:

```ts
export type Brand<T, Name extends string> = T & { readonly __unit: Name };
export type Px = Brand<number, 'px'>;
export type Em = Brand<number, 'em'>;
export type Ms = Brand<number, 'ms'>;
export type Unit = Px | Em | Ms;
```

`Unit` is the piece ts#29 didn't need. It's the constraint that lets one generic helper serve every brand while keeping each one distinct — `T extends Unit` says "any of my units", and returning `T` says "the same one you gave me".

The doors, with their two different jobs:

```ts
export function ms(value: number): Ms {
  if (value < 0) throw new RangeError(`durations can't be negative, got ${value}`);
  return value as Ms;
}
export function em(value: number): Em { return value as Em; }
```

`ms` validates because negative durations are meaningless; `em` doesn't, because any finite multiplier is legitimate. Doors aren't a ritual — put a check in when there's a real invariant, and leave it out when there isn't.

The arithmetic:

```ts
export function scale<T extends Unit>(value: T, factor: number): T {
  return ((value as number) * factor) as T;
}
export function sum<T extends Unit>(values: readonly T[]): T {
  return values.reduce<number>((total, value) => total + (value as number), 0) as T;
}
```

Both contain a cast, and both are the *reason* the rest of the file needs none: unwrapping happens here, once per operation, instead of at every call site. `readonly T[]` (ts#08) is a small extra courtesy — `sum` has no business mutating its input.

The formatters:

```ts
export function card(width: Px, padding: Px, fontSize: Em): string
export function fadeIn(duration: Ms): string
```

This is where the original's four bugs die. `card(FADE, ...)` fails on argument one; `fadeIn(GUTTER)` fails outright; and because each formatter owns exactly one suffix and admits exactly one unit, `${value}px` can never describe something that isn't pixels.

The type tests are worth reading as a list, because together they describe the whole guarantee: swapped arguments, wrong unit, cross-unit addition, bare numbers, `scale` preserving `Ms`, `sum` preserving `Px`, mixed arrays, an unconverted `Em`, and `emToPx` backwards. Nine ways to be wrong, all of them now caught before the page renders.

## 7. Words you learned (glossary)

- **Branded type** — a primitive intersected with a phantom marker so the compiler treats it as its own species (ts#29).
- **`Brand<T, Name>` helper** — the branding pattern written once and reused per unit.
- **Phantom property** — a property that exists only in the type, never on any runtime value.
- **Door / constructor function** — the single function allowed to create a branded value; holds the one cast plus any validation.
- **Type erasure** — types vanish at runtime; a `Px` is a plain number when the code runs.
- **Quantity** — a magnitude *plus* a unit; the thing a bare `number` fails to model.
- **Brand-preserving helper** — an operation returning the branded type rather than plain `number`, so a unit survives a calculation.
- **Generic constraint over a union (`T extends Unit`)** — lets one function serve every brand while keeping them distinct (ts#17).
- **Conversion function** — the only sanctioned path between two units; keeps the conversion factor in one audited place.
- **Unit bug** — a value in one unit consumed as another; the Mars Climate Orbiter's cause of death.
- **Wrong-but-plausible output** — a failure that renders instead of crashing, and so gets misdiagnosed.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the repo root after each change, then undo it.

1. In `refactored/layout.ts`, add `export const total: Px = GUTTER + px(8);`. **Expected:** ❌ "Type 'number' is not assignable to type 'Px'" — arithmetic strips the brand. Fix it with `addPx(GUTTER, px(8))` and notice how the design pushes you toward named operations.
2. Change `Em`'s marker string to `'px'` (so `Px` and `Em` share a brand). **Expected:** several "Unused '@ts-expect-error'" errors — the cross-unit tests stop failing. The literal marker string is the *entire* mechanism keeping species apart.
3. Add a fourth unit: `type Rem = Brand<number, 'rem'>` with a `rem()` door, but **don't** add it to `Unit`. Then try `scale(rem(2), 2)`. **Expected:** ❌ — `Rem` doesn't satisfy `T extends Unit`. Add it to the union and it works. That's the maintenance cost of the pattern, stated honestly.
4. Delete the `value < 0` check inside `ms()`. **Expected:** ✅ still typechecks — that guard is *runtime* protection, invisible to the compiler. Brands handle identity; doors handle validity; you need both.
5. Try `const sneaky: Px = 16 as Px;`. **Expected:** ✅ compiles — `as` can always force it. The pattern works by convention plus review: keep `as Px` inside the door functions, and "search the codebase for `as Px`" becomes a complete audit.
6. Write `export function addAny<T extends Unit>(a: T, b: T): T` and try `addAny(GUTTER, TITLE_SIZE)`. **Expected:** ❌ — `T` can't be both `Px` and `Em`, which is exactly the guarantee `addPx` gives, generalized. Then consider why you might *still* want the specific `addPx`: its error message names the units.
