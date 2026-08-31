# 🏋️ Practice: Branded Units

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a COPY of `refactored/layout.ts` (it already has `Brand`, `Px`, `Em`, `Ms`, `Unit`, the doors and the helpers), or in a scratch `.ts` file inside the `typescript/` folder ending with `export {}`. Run `npm run typecheck` after each step.

## Exercises

### ⭐ 1. Add a fourth unit (warm-up)

CSS has `rem` as well as `em`. Add `Rem` with its own door, add it to the `Unit` union, and write `remToPx(size: Rem, root: Px): Px` as the only path between them.

**Practices:** the full recipe — marker, door, conversion — plus the maintenance cost of the `Unit` union, felt once so it isn't a surprise later.
**Hint:** copy the shape of `Em`/`em()`/`emToPx` and change the names. Then try `scale(rem(2), 2)` *before* adding `Rem` to `Unit`, and read the error — that's the one line the pattern asks you to remember.
**Check:** `remToPx(rem(1.5), px(16))` compiles and yields a `Px`; `const wrong: Px = rem(1.5);` errors; `const alsoWrong: Rem = em(1.5);` errors too — every marker string is its own species, even when the units are cousins.

### ⭐⭐ 2. Bytes and kilobytes (core)

The 1024 bug, typed away. Brand `Bytes` (door validates: a non-negative integer) and `Kilobytes`, write `kbToBytes`, and a `formatBytes(size: Bytes): string` that only real bytes can reach.

**Practices:** a door that enforces a *runtime* invariant while the brand enforces identity — the division of labour, in one small pair of types.
**Hint:** `Number.isInteger(value) && value >= 0` in the `bytes()` door; `Math.round((size as number) * 1024)` in the conversion, so the multiplier lives in exactly one audited place.
**Check:** `formatBytes(kbToBytes(kilobytes(4)))` compiles; `formatBytes(kilobytes(4))` must error (kilobytes need converting, not relabelling); `formatBytes(4096)` must error too.

### ⭐⭐ 3. Degrees and radians (core)

`Math.sin` takes radians. Half the world writes degrees. Brand both, write `degToRad`, and a `sinOf(angle: Radians): number` wrapper that degrees cannot reach.

**Practices:** using brands to protect a *third-party* API whose own signature says `number`.
**Hint:** `radians(((angle as number) * Math.PI) / 180)`. Note that `sinOf` returns a plain `number` on purpose — a sine is dimensionless, and pretending otherwise would be its own lie.
**Check:** `sinOf(degToRad(degrees(30)))` compiles; `sinOf(degrees(30))` must error — the bug that silently returns `-0.988` instead of `0.5`; and `degToRad(radians(Math.PI))` must error, because the conversion only runs one way.

### ⭐⭐ 4. A brand-preserving `clamp` (core)

Write `clamp<T extends Unit>(value: T, min: T, max: T): T`. All three arguments must share one unit, and the result must keep it.

**Practices:** a generic over the brand union where the type parameter appears *three times* — so the compiler enforces agreement between arguments, not just with the return type.
**Hint:** unwrap with `as number` for the comparisons, but `return min` / `return max` / `return value` directly — they are already `T`, so no re-branding cast is needed on the way out.
**Check:** `clamp(px(1200), px(320), px(960))` compiles and gives a `Px`; `clamp(px(1200), em(1), px(960))` must error (mismatched bounds); and `const notMs: Ms = clamp(px(1200), px(320), px(960));` must error, proving the brand survived.

### ⭐⭐⭐ 5. Division removes the unit (challenge)

Dividing two lengths gives a *dimensionless* number — an aspect ratio, not a length. Brand `Ratio`, write `ratio<T extends Unit>(numerator: T, denominator: T): Ratio`, and `scaleBy<T extends Unit>(value: T, factor: Ratio): T`.

**Practices:** modelling what an operation does to units, not just to numbers — the step beyond "same unit in, same unit out".
**Hint:** the signature is the lesson: `T` for both inputs (you can only divide like by like), `Ratio` for the output (the unit cancelled). `scaleBy` is then the inverse: a `Ratio` re-applied to any unit gives that unit back.
**Check:** `scaleBy(px(1200), ratio(px(320), px(960)))` compiles and yields a `Px`; `ratio(px(320), ms(960))` must error; `const notPx: Px = aspect;` must error; and `scaleBy(px(1200), 0.5)` must error, because a bare number is not a `Ratio`.

### ⭐⭐⭐ 6. `UnitOf` — reading the marker back (challenge)

Write `type UnitOf<T> = T extends { readonly __unit: infer N } ? N : never;` and use it to close the original's last hole: `css<T extends Unit>(value: T, suffix: UnitOf<T>): string`, where the suffix is *checked against the value's brand*.

**Practices:** conditional types + `infer` (ts#27, ts#28) pointed at your own convention.
**Hint:** the phantom property never exists at runtime, but at the *type* level it is perfectly real, so `infer N` can grab it. Remember why you can't dispatch on the brand at runtime instead: brands erase, so the suffix has to be supplied — the type system's job is making sure the supplied one is right.
**Check:** `css(px(320), 'px')` and `css(ms(250), 'ms')` compile; `css(px(320), 'ms')` must error; `css(em(1.5), 'pt')` must error; and `const n: UnitOf<Px> = 'em';` must error with roughly "'em' is not assignable to type 'px'".

## Solutions

### 1. Add a fourth unit

```ts
type Rem = Brand<number, 'rem'>;
type Unit = Px | Em | Ms | Rem; // ← the one line the pattern asks you to remember

function rem(value: number): Rem { return value as Rem; }
function remToPx(size: Rem, root: Px): Px {
  return px((size as number) * (root as number));
}
const spacing: Px = remToPx(rem(1.5), px(16));
// @ts-expect-error — a Rem is not a Px without going through the door
const wrongRem: Px = rem(1.5);
// @ts-expect-error — nor is an Em a Rem: every marker string is its own species
const wrongEm: Rem = em(1.5);
```

**WHY:** `Em` and `Rem` are near-identical concepts — both multiply a font size — and the type system keeps them apart anyway, because they multiply *different* font sizes (the nearest element's vs. the document root's). That's the pattern doing exactly what you want: the distinction that matters at 2 a.m. is encoded, not remembered. The `Unit` union is the honest cost of the generic helpers: every new brand must be added there, or `scale`/`sum`/`clamp` won't accept it. One line, and the compiler tells you when you've forgotten it.

### 2. Bytes and kilobytes

```ts
type Bytes = Brand<number, 'bytes'>;
type Kilobytes = Brand<number, 'kilobytes'>;

function bytes(value: number): Bytes {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`bytes must be a non-negative integer, got ${value}`);
  }
  return value as Bytes;
}
function kilobytes(value: number): Kilobytes { return value as Kilobytes; }
function kbToBytes(size: Kilobytes): Bytes { return bytes(Math.round((size as number) * 1024)); }
function formatBytes(size: Bytes): string { return `${size} B`; }

const label = formatBytes(kbToBytes(kilobytes(4))); // '4096 B'
// @ts-expect-error — kilobytes must be converted, not relabelled
formatBytes(kilobytes(4));
// @ts-expect-error — and bare numbers stay out
formatBytes(4096);
```

**WHY:** the two guarantees are visible side by side. The **brand** stops `formatBytes(kilobytes(4))` at compile time — a mistake that would have printed "4 B" for a 4 KB file. The **door's** check stops `bytes(3.5)` at runtime, where no type could reach. Putting the `* 1024` inside `kbToBytes` matters more than it looks: the classic version of this bug isn't using the wrong unit, it's applying the conversion *twice* because two different files each thought they owned it.

### 3. Degrees and radians

```ts
type Degrees = Brand<number, 'degrees'>;
type Radians = Brand<number, 'radians'>;
function degrees(value: number): Degrees { return value as Degrees; }
function radians(value: number): Radians { return value as Radians; }
function degToRad(angle: Degrees): Radians { return radians(((angle as number) * Math.PI) / 180); }
function sinOf(angle: Radians): number { return Math.sin(angle as number); }

const half = sinOf(degToRad(degrees(30))); // 0.5
// @ts-expect-error — Math.sin wants radians; degrees give silently wrong answers
sinOf(degrees(30));
// @ts-expect-error — the conversion only runs one way
degToRad(radians(Math.PI));
```

**WHY:** `Math.sin` is typed `(x: number) => number` and always will be — you don't control the standard library. What you *do* control is the last function before it. Wrapping it in `sinOf(angle: Radians)` puts a checked boundary in front of an unchecked API, which is the general recipe for protecting yourself from any third-party signature that says `number` when it means something narrower. And note the failure this prevents: `Math.sin(30)` returns `-0.988`, a perfectly plausible number that will propagate through a whole rendering pipeline before anyone notices the shape is wrong.

### 4. A brand-preserving `clamp`

```ts
function clamp<T extends Unit>(value: T, min: T, max: T): T {
  const n = value as number;
  if (n < (min as number)) return min;
  if (n > (max as number)) return max;
  return value;
}
const width: Px = clamp(px(1200), px(320), px(960));
const fade: Ms = clamp(ms(250), ms(0), ms(1000));
// @ts-expect-error — the bounds must share the value's unit
clamp(px(1200), em(1), px(960));
// @ts-expect-error — clamp preserves the brand: Px in, Px out
const notMs: Ms = clamp(px(1200), px(320), px(960));
```

**WHY:** `T` appearing in three parameter positions is what forces agreement *between the arguments* — the compiler must find a single `T` satisfying all three, and there is no type that is both `Px` and `Em`. That's a strictly stronger guarantee than three separately-branded parameters would give, and it comes free with the generic. Note also that no re-branding cast is needed on the returns: `min`, `max` and `value` are already `T`, so unlike `scale` and `sum` (where arithmetic produced a plain `number`), `clamp` only unwraps for the *comparisons* and never for the result.

### 5. Division removes the unit

```ts
type Ratio = Brand<number, 'ratio'>;

function ratio<T extends Unit>(numerator: T, denominator: T): Ratio {
  return ((numerator as number) / (denominator as number)) as Ratio;
}
function scaleBy<T extends Unit>(value: T, factor: Ratio): T {
  return ((value as number) * (factor as number)) as T;
}

const aspect = ratio(px(320), px(960));
const shrunk: Px = scaleBy(px(1200), aspect);
// @ts-expect-error — you can only divide like by like
ratio(px(320), ms(960));
// @ts-expect-error — a Ratio is not a length
const notPx: Px = aspect;
// @ts-expect-error — and a bare number is not a Ratio
scaleBy(px(1200), 0.5);
```

**WHY:** this is dimensional analysis, expressed as function signatures. `T / T → Ratio` says the unit cancels; `T * Ratio → T` says a dimensionless factor re-applies to whatever it multiplies. Together they let a scaling factor computed from one pair of pixels be applied to milliseconds — which is *correct*, and which a naive `scale(value, factor: number)` would allow for the wrong reasons (it allows everything). The general lesson: don't only ask "what unit comes out?", ask "what does this operation *do* to units?" Addition preserves, division cancels, multiplication by a dimensionless factor preserves, and multiplication of two lengths would give an area — a brand you'd have to introduce if you ever needed it.

### 6. `UnitOf` — reading the marker back

```ts
type UnitOf<T> = T extends { readonly __unit: infer N } ? N : never;

function css<T extends Unit>(value: T, suffix: UnitOf<T>): string {
  return `${value as number}${String(suffix)}`;
}
const w = css(px(320), 'px'); // '320px'
const f = css(ms(250), 'ms'); // '250ms'
// @ts-expect-error — the suffix must match the brand
css(px(320), 'ms');
// @ts-expect-error — and it must be one of the known unit names
css(em(1.5), 'pt');
const name: UnitOf<Px> = 'px';
// @ts-expect-error — UnitOf reads the marker back exactly
const wrongName: UnitOf<Px> = 'em';
```

**WHY:** the phantom property never exists on a value, but in the *type* it is entirely real — so `infer N` can pull the marker string out, and `UnitOf<Px>` evaluates to the literal `'px'`. That closes the original file's last hole: there, the suffix in `` `${width}px` `` was chosen by whoever wrote the formatter and the value by whoever called it, two decisions with nothing connecting them; here the compiler connects them. It's also worth understanding why `css` needs the suffix *argument* at all rather than deriving it from the value: brands erase, so at runtime a `Px` is indistinguishable from an `Ms`. The type system can verify a claim it cannot make on your behalf — which is a fair summary of this entire track.
