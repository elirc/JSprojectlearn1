# 🏋️ Practice: Type Inference

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`) — `npm run typecheck` from the `typescript/` folder picks it up automatically.

## Exercises

### ⭐ 1. Predict the inferred type (warm-up)

For each declaration below, write down (on paper!) the type you think the compiler infers, then prove each prediction by assigning the variable to a new one annotated with your guess.

```ts
const n = Math.max(3, 7);
const parts = 'a,b,c'.split(',');
const isBig = 10 > 5;
const mix = [1, 'two', 3];
const user = { id: 1, tags: ['a', 'b'] };
```

**Practices:** reading inference the way the compiler does — from the value.
**Hint:** for `mix`, the array must hold *both* kinds of element; unions are written with `|`.
**Check:** all five proof lines (like `const check1: number = n;`) must compile cleanly. A wrong guess errors with roughly `Type 'X' is not assignable to type 'Y'`.

### ⭐⭐ 2. De-noise and re-arm (core)

Type this untyped-and-overtyped snippet properly: delete every annotation inference already covers, and give the one load-bearing spot a real type.

```ts
const minutesPerHour: number = 60;
const label: string = 'duration';
function formatDuration(totalSeconds) {
  const minutes: number = Math.floor(totalSeconds / 60);
  const seconds: number = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}
```

**Practices:** the boundary rule — annotate parameters, infer locals.
**Hint:** ask each annotation: "is there a value on the right of the `=`?"
**Check:** `formatDuration(90)` must compile; `formatDuration('90')` must error with roughly `Argument of type 'string' is not assignable to parameter of type 'number'`.

### ⭐⭐ 3. Empty containers beyond arrays (core)

LEARN.md showed the empty-array trap. `Map` and `Set` have the same problem: `new Map()` infers `Map<any, any>` — an `any` factory. Create a `priceBySku` map (SKU string → price number) and a `seenIds` set (numbers) so that wrong-typed insertions are compile errors.

**Practices:** supplying intent where inference has nothing to read — via type arguments.
**Hint:** the syntax is `new Map<string, number>()`, called a *type argument* (a preview of generics, exercise 16).
**Check:** `priceBySku.set('KB-01', 89)` compiles; `priceBySku.set(42, 89)` and `priceBySku.set('MS-01', 'cheap')` must each error; `seenIds.add('7')` must error.

### ⭐⭐ 4. The leaking union (core)

Write `statusLabel(code: number)` returning `'ok'` for 200, `'not found'` for 404 — and pretend you forgot the fallback, ending with `return undefined;`. First, *without* a return annotation, hover the function (or assign its result to `const s: string`) and see what leaked. Then pin the return type to `string` and watch the error move to the real culprit.

**Practices:** why exported functions deserve return annotations — errors surface at the definition.
**Hint:** the inferred return type is a union that includes every `return` statement.
**Check:** without the annotation, `const s: string = statusLabel(500);` errors at the *call*; with `: string`, the `return undefined;` line itself errors with roughly `Type 'undefined' is not assignable to type 'string'`.

### ⭐⭐⭐ 5. Literal types lost in transit (challenge)

You have `function setTheme(theme: 'light' | 'dark')`. A helper `loadSavedTheme(): string` reads the saved theme (simulate it: `return 'dark';`). `setTheme(loadSavedTheme())` won't compile — even though the returned value really is `'dark'`! Explain why, then fix `loadSavedTheme` so the call compiles *without* `as` and without changing `setTheme`.

**Practices:** inference widens through `string`-typed boundaries; signatures are where you keep literals alive.
**Hint:** declare the return type as the union, and make the body honest with a check like `raw === 'light' ? 'light' : 'dark'`.
**Check:** the `string`-returning version must error with roughly `Argument of type 'string' is not assignable to parameter of type '"light" | "dark"'`; your fixed version must compile with no casts.

## Solutions

### Solution 1

```ts
const n = Math.max(3, 7);            // number
const parts = 'a,b,c'.split(',');    // string[]
const isBig = 10 > 5;                // boolean
const mix = [1, 'two', 3];           // (string | number)[]
const user = { id: 1, tags: ['a', 'b'] }; // { id: number; tags: string[] }

const check1: number = n;
const check2: string[] = parts;
const check3: boolean = isBig;
const check4: (string | number)[] = mix;
const check5: { id: number; tags: string[] } = user;
```

WHY: every type here flows from a value — `Math.max` returns `number`, `split` returns `string[]`, a mixed literal array infers the union of its elements, and object literals infer property-by-property. The proof lines work because assignment checks the inferred type against your annotation; a wrong guess fails loudly.

### Solution 2

```ts
const minutesPerHour = 60;
const label = 'duration';

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

// @ts-expect-error — the parameter is a number now; '90' is a string
formatDuration('90');
```

WHY: the locals all have right-hand sides, so their annotations were pure noise. `totalSeconds` has no value to infer from — it's the boundary, and it's exactly where the original snippet had an implicit-`any` hole. The `: string` return annotation is optional but pins the contract at the definition.

### Solution 3

```ts
const priceBySku = new Map<string, number>();
priceBySku.set('KB-01', 89);

const seenIds = new Set<number>();
seenIds.add(7);

// @ts-expect-error — key must be a string
priceBySku.set(42, 89);
// @ts-expect-error — value must be a number
priceBySku.set('MS-01', 'cheap');
// @ts-expect-error — only numbers go in
seenIds.add('7');
```

WHY: an empty container gives inference nothing, and for `Map`/`Set` the fallback is `any` — worse than the array's `never[]`, because `any` accepts everything silently instead of rejecting everything loudly. The type arguments `<string, number>` state your intent once, and every later `.set`/`.add`/`.get` is checked against it.

### Solution 4

```ts
function statusLabel(code: number): string {
  if (code === 200) return 'ok';
  if (code === 404) return 'not found';
  return 'error'; // the honest fallback the annotation demanded
}
```

WHY: without the annotation, the inferred return type was `string | undefined` — the forgotten branch silently *widened the contract*, and every caller inherited the problem (each one would need an undefined-check). With `: string`, the buggy `return undefined;` errors right where the bug lives. The rule: inferred returns are fine for internal helpers, but exported functions should pin their contract.

### Solution 5

```ts
function setTheme(theme: 'light' | 'dark'): string {
  return `theme: ${theme}`;
}

function loadSavedTheme(): 'light' | 'dark' {
  const raw: string = 'dark'; // imagine: read from a settings file
  return raw === 'light' ? 'light' : 'dark';
}

setTheme(loadSavedTheme()); // compiles — no casts
```

WHY: the broken version declared `(): string`, and a declared type replaces whatever the value's literal type was — the `'dark'` inside is widened to `string` the moment it passes the signature, and `string` doesn't fit `'light' | 'dark'`. The fix declares the *narrow* return type and makes the body prove it with a comparison — the ternary's branches are `'light'` and `'dark'` literals, so the union is satisfied honestly. Exercise 06 builds whole APIs on this idea.
