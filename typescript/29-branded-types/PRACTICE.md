# 🏋️ Practice: Branded Types

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch `.ts` file inside the `typescript/` folder (end it with `export {}` so it's a module) or in a COPY of `refactored/money.ts`, then run `npm run typecheck`.

## Exercises

### ⭐ 1. Kilometers vs. miles (warm-up)

NASA's orbiter bug, on your desk: brand two distance units, `Kilometers` and `Miles`, each with its own door function. Then write `milesToKilometers(distance: Miles): Kilometers` — the only place the `* 1.609344` is allowed to live.

**Practices:** the full brand recipe — phantom marker, door, explicit conversion.
**Hint:** copy the shape of `Cents`/`cents()`/`dollarsToCents` and change the names; no validation needed in these doors.
**Check:** `const k: Kilometers = miles(26.2);` must error with roughly "'Miles' is not assignable to 'Kilometers'", and `const m: Miles = 26.2;` must error too. Add both as `@ts-expect-error` type tests.

### ⭐⭐ 2. A range-validated Percent (core)

Brand a `Percent` whose door throws a `RangeError` unless the value is between 0 and 100. Then write `applyDiscount(price: Cents, off: Percent): Cents` — the arithmetic strips the brands, so the result has to leave through the `cents()` door (round it first: cents are integers).

**Practices:** doors that enforce *validity* while brands enforce *identity*.
**Hint:** inside, `(price as number) * (1 - (off as number) / 100)` — then `cents(Math.round(...))`.
**Check:** `applyDiscount(cents(1000), 25)` must error (bare number is not a `Percent`); `applyDiscount(percent(25), cents(1000))` (swapped) must error too. Both make good `@ts-expect-error` tests.

### ⭐⭐ 3. Raw strings vs. safe HTML (core)

Brands work on strings too. Create `RawInput` and `SafeHtml`, a `rawInput()` door, a `sanitize(value: RawInput): SafeHtml` that escapes `<` and `>`, and `render(html: SafeHtml): string`. Unsanitized input must be unable to reach `render`.

**Practices:** branding `string` — the sanitized-vs-raw pattern the README calls a classic.
**Hint:** `sanitize` is itself a door: its `.replace(...).replace(...)` result is a plain string, so it ends with one `as SafeHtml`.
**Check:** `render(someRawInput)` and `render('<b>hi</b>')` must both error with roughly "not assignable to parameter of type 'SafeHtml'"; `render(sanitize(someRawInput))` must compile.

### ⭐⭐ 4. A generic `Brand<T, Name>` helper (core)

You've now written `number & { readonly __brand: ... }` four times. Write it once: `type Brand<T, Name extends string> = ...`, then use it to define `Email = Brand<string, 'email'>` (door validates it contains `'@'`) and `SessionId = Brand<string, 'sessionId'>`.

**Practices:** generics over the branding pattern itself.
**Hint:** the helper's body is exactly the intersection you've been writing, with `T` and `Name` substituted in.
**Check:** `const e: Email = 'ada@engine.dev';` must error (no door), and assigning an `Email` to a `SessionId` must error — same primitive, different name. Two more `@ts-expect-error` tests.

### ⭐⭐⭐ 5. Timestamps vs. durations (challenge)

Model time so the classic bug — adding two timestamps — won't compile. Brand `Timestamp` (a point in time, ms since epoch) and `DurationMs` (a length of time; door rejects negatives). Provide exactly two arithmetic doors: `addDuration(at: Timestamp, wait: DurationMs): Timestamp` and `elapsed(later: Timestamp, earlier: Timestamp): DurationMs`. There is deliberately NO function that adds two timestamps.

**Practices:** designing an *API surface* with brands — what you don't export is part of the design.
**Hint:** each function unwraps with `as number`, does the math, and returns through the right door.
**Check:** `addDuration(durationMs(5000), now)` (swapped) must error, and `addDuration(now, someOtherTimestamp)` must error — a `Timestamp` is not a `DurationMs`. `elapsed(soon, now)` must compile and give a `DurationMs`.

### ⭐⭐⭐ 6. `BrandOf` — reading the label back (challenge)

Write a conditional type `BrandOf<B>` that extracts a brand's label: `BrandOf<Cents>` is `'cents'`, `BrandOf<Email>` is `'email'`, and `BrandOf<number>` (no brand) is `never`.

**Practices:** conditional types + `infer` applied to the phantom marker.
**Hint:** ask whether `B extends { readonly __brand: infer N }` — the phantom property is a real part of the *type*, so `infer` can grab it.
**Check:** `const l: BrandOf<Cents> = 'cents';` must compile; `const l: BrandOf<Cents> = 'dollars';` must error with roughly "'dollars' is not assignable to type 'cents'".

## Solutions

### 1. Kilometers vs. miles

```ts
type Kilometers = number & { readonly __brand: 'kilometers' };
type Miles = number & { readonly __brand: 'miles' };
function kilometers(value: number): Kilometers { return value as Kilometers; }
function miles(value: number): Miles { return value as Miles; }
function milesToKilometers(distance: Miles): Kilometers {
  return kilometers((distance as number) * 1.609344);
}
const marathon = miles(26.2);
// @ts-expect-error — miles can't walk into a kilometers slot
const wrongUnit: Kilometers = marathon;
// @ts-expect-error — naked numbers must go through the door
const naked: Miles = 26.2;
```

**WHY:** the two literal strings `'kilometers'` and `'miles'` are what make the types mutually incompatible — structural typing sees two different phantom shapes. The conversion function keeps the multiplier in one audited place, and returning through `kilometers()` re-brands the plain `number` the arithmetic produced.

### 2. A range-validated Percent

```ts
type Percent = number & { readonly __brand: 'percent' };
function percent(value: number): Percent {
  if (value < 0 || value > 100) {
    throw new RangeError(`percent must be between 0 and 100, got ${value}`);
  }
  return value as Percent;
}
function applyDiscount(price: Cents, off: Percent): Cents {
  return cents(Math.round((price as number) * (1 - (off as number) / 100)));
}
// @ts-expect-error — a bare 25 is not a Percent; go through the door
applyDiscount(cents(1000), 25);
// @ts-expect-error — swapped arguments caught
applyDiscount(percent(25), cents(1000));
```

**WHY:** division of labor, exactly as the README says — the *brand* stops bare numbers and swapped arguments at compile time; the *door's* range check stops `percent(250)` at runtime. The multiplication result is a plain `number` (arithmetic strips brands), so it must exit through `cents()`, which also re-enforces the integers-only rule after `Math.round`.

### 3. Raw strings vs. safe HTML

```ts
type RawInput = string & { readonly __brand: 'rawInput' };
type SafeHtml = string & { readonly __brand: 'safeHtml' };
function rawInput(value: string): RawInput { return value as RawInput; }
function sanitize(value: RawInput): SafeHtml {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;') as SafeHtml;
}
function render(html: SafeHtml): string {
  return `<div class="comment">${html}</div>`;
}
const comment = rawInput('<script>alert(1)</script>');
const shown = render(sanitize(comment));
// @ts-expect-error — raw input can't reach render without passing sanitize
render(comment);
// @ts-expect-error — plain strings can't sneak in either
render('<b>hi</b>');
```

**WHY:** the type system now enforces an *ordering*: every path to `render` must pass through `sanitize` first, because `sanitize` is the only producer of `SafeHtml`. This turns a security review question ("did every render site escape its input?") into a compile check. `sanitize` doubles as the door, so its single `as SafeHtml` sits right next to the escaping that justifies it.

### 4. A generic `Brand<T, Name>` helper

```ts
type Brand<T, Name extends string> = T & { readonly __brand: Name };
type Email = Brand<string, 'email'>;
type SessionId = Brand<string, 'sessionId'>;
function email(value: string): Email {
  if (!value.includes('@')) throw new RangeError(`not an email address: ${value}`);
  return value as Email;
}
const to = email('ada@engine.dev');
// @ts-expect-error — a plain string is not an Email
const unchecked: Email = 'ada@engine.dev';
// @ts-expect-error — same primitive, different name: species stay apart
const sid: SessionId = to;
```

**WHY:** the helper is nothing but the intersection you already knew, parameterized. `Email` and `SessionId` expand to two structurally different types because their `Name` arguments differ — the same mechanism as before, now one line per new brand. Real codebases define `Brand` once in a shared types file and grow their vocabulary cheaply.

### 5. Timestamps vs. durations

```ts
type Timestamp = Brand<number, 'timestamp'>;
type DurationMs = Brand<number, 'durationMs'>;
function timestamp(value: number): Timestamp { return value as Timestamp; }
function durationMs(value: number): DurationMs {
  if (value < 0) throw new RangeError(`durations can't be negative, got ${value}`);
  return value as DurationMs;
}
function addDuration(at: Timestamp, wait: DurationMs): Timestamp {
  return timestamp((at as number) + (wait as number));
}
function elapsed(later: Timestamp, earlier: Timestamp): DurationMs {
  return durationMs((later as number) - (earlier as number));
}
const now = timestamp(1_755_800_000_000);
const soon = addDuration(now, durationMs(5_000));
// @ts-expect-error — swapped: a duration is not a point in time
addDuration(durationMs(5_000), now);
// @ts-expect-error — adding two timestamps is meaningless; no door offers it
addDuration(now, soon);
```

**WHY:** this is brands used for *algebra*: timestamp + duration = timestamp, timestamp − timestamp = duration, and timestamp + timestamp doesn't exist — the API's shape encodes what operations are physically meaningful. The absence of a two-timestamp adder is as much a design decision as the functions you did write; the compiler enforces it because nothing produces the needed signature.

### 6. `BrandOf` — reading the label back

```ts
type BrandOf<B> = B extends { readonly __brand: infer N } ? N : never;
const label1: BrandOf<Cents> = 'cents';       // ✅
const label2: BrandOf<Email> = 'email';       // ✅
// @ts-expect-error — Cents is branded 'cents', not 'dollars'
const label3: BrandOf<Cents> = 'dollars';
type NoBrand = BrandOf<number>;               // never
```

**WHY:** the phantom property may never exist at runtime, but at the *type* level it's perfectly real — so `B extends { readonly __brand: infer N }` matches any branded type and captures its label. Unbranded primitives fail the `extends` test and fall to `never`, the honest "there is no label" answer. This is the same `infer` tool from exercise 28, pointed at your own convention.
