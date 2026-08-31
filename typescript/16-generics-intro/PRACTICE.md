# 🏋️ Practice: Generics Intro

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) — `npm run typecheck` from the `typescript/` folder picks it up. Exercises 4 and 6 want a `first`-style helper; `import { first } from './refactored/utils.js';` or re-declare your own.

## Exercises

### ⭐ 1. One utility, every element type (warm-up)

Write `repeat<T>(value: T, times: number): T[]` — an array holding `value` that many times. Then call it with a number and with a string, assigning each result to an explicitly typed `const` so you can see what came back. Do not write a type argument at either call site.

**Practices:** declaring `<T>`, using it in a parameter and a return, and watching inference fill it in.
**Hint:** the body needs a `const out: T[] = []` — `T` is usable anywhere a type is usable, including in local annotations.
**Check:** `const threes: number[] = repeat(3, 3)` and `const hellos: string[] = repeat('hello', 2)` must both compile; add a `@ts-expect-error` test that catches `const wrong: string[] = repeat(7, 3)`, roughly `Type 'number[]' is not assignable to type 'string[]'`.

### ⭐⭐ 2. Two type parameters, one tuple (core)

Write `zip<A, B>(as: readonly A[], bs: readonly B[]): [A, B][]` — pair up elements by position, stopping at the shorter array. Call it with a `string[]` and a `number[]`, then pull `[0][0]` and `[0][1]` out into typed constants and confirm each position kept its own type.

**Practices:** two independent type parameters, and a tuple type carrying *different* types per slot.
**Hint:** `Math.min(as.length, bs.length)` for the loop bound; inside, `out.push([as[i]!, bs[i]!])`.
**Check:** `const who: string = rows[0]![0]` and `const score: number = rows[0]![1]` must compile; add a `@ts-expect-error` test that catches `const swapped: string = rows[0]![1]`.

### ⭐⭐ 3. A generic that hands back a function (core)

Write `constant<T>(value: T): () => T` — it returns a zero-argument function that always produces `value`. This is exercise 15's function types meeting exercise 16's type parameters: `T` appears inside a *function type* in the return position.

**Practices:** a type parameter travelling through a returned callable, so the value's type survives the round trip.
**Hint:** the whole body is `return () => value;` — no annotation needed on the returned arrow.
**Check:** `const n: number = constant(5)()` must compile; add a `@ts-expect-error` test proving `constant('hi')()` is a string and cannot be assigned to a `number`.

### ⭐⭐ 4. Give the `| null` somewhere to go (core)

Exercise 05 taught that `T | null` forces a check; here is the generic escape hatch. Write `defaultTo<T>(value: T | null, fallback: T): T`, then use it to collapse a `first(scores)` result into a plain number. Predict what `T` becomes in `defaultTo(null, 'unknown')` before you compile it.

**Practices:** inference gathering `T` from *several* arguments, and a generic that removes `null` without an assertion.
**Hint:** in `defaultTo(null, 'unknown')`, the first argument tells the compiler nothing about `T` — the fallback settles it.
**Check:** `const topScore: number = defaultTo(first(scores), 0)` and `const named: string = defaultTo(null, 'unknown')` must both compile; add a `@ts-expect-error` test that catches `const oops: string = defaultTo(first(scores), 0)`.

### ⭐⭐⭐ 5. Three parameters, chained (challenge)

Write `through<A, B, C>(value: A, f: (a: A) => B, g: (b: B) => C): C` — apply `f`, then feed the result to `g`. The interesting part is the call site: write `through('hello', (s) => s.length, (x) => x > 3)` with no annotations anywhere and work out, before compiling, why `s` is a `string` and `x` is a `number`.

**Practices:** a chain of type parameters where each one's value comes from the previous step's *return*, all inferred.
**Hint:** `A` comes from the value, `B` from what `f` returns, `C` from what `g` returns — and contextual typing (exercise 15) types both arrows' parameters from those.
**Check:** the chain above must compile as a `boolean`, and `through(3.7, (x) => Math.round(x), (x) => x.toFixed(0))` as a `string`; add a `@ts-expect-error` test on the single line `through('hello', (s) => s.length, (t: string) => t.length)`.

### ⭐⭐⭐ 6. Return two things, honestly (challenge)

Write `findWithIndex<T>(items: readonly T[], match: (item: T) => boolean): [T, number] | null` — the first matching element together with where it was found, or `null` when nothing matches. Then consume it properly: narrow away the `null`, destructure the tuple, and use both halves.

**Practices:** combining a tuple return, a `| null` return, and a callback parameter in one signature — then narrowing the union before touching it.
**Hint:** `if (found === null) { ... } else { const [name, index] = found; ... }` — after the check, `found` is the tuple and destructuring types both bindings.
**Check:** the narrowed branch must compile with `name.toUpperCase()`; add a `@ts-expect-error` test catching `findWithIndex(names, (name) => name === 'ada')[0]`, roughly `Object is possibly 'null'`.

## Solutions

### Solution 1

```ts
function repeat<T>(value: T, times: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < times; i += 1) out.push(value);
  return out;
}

const threes: number[] = repeat(3, 3);
const hellos: string[] = repeat('hello', 2);

// @ts-expect-error — T was inferred as number, so this is number[]
const wrong: string[] = repeat(7, 3);
```

WHY: `T` links the parameter to the return, which is exactly what `any` could not do — a `repeat(value: any, ...): any[]` would let `wrong` through and hand you numbers where you expected strings. Each call gets its own instantiation, so one body serves every element type while the *caller's* type is checked. Note `T` is a perfectly ordinary type inside the body: `const out: T[] = []` compiles because the compiler is checking the body once, for an unknown-but-fixed `T`.

### Solution 2

```ts
function zip<A, B>(as: readonly A[], bs: readonly B[]): [A, B][] {
  const out: [A, B][] = [];
  const count = Math.min(as.length, bs.length);
  for (let i = 0; i < count; i += 1) out.push([as[i]!, bs[i]!]);
  return out;
}

const rows = zip(['ada', 'grace'], [97, 94]);
const who: string = rows[0]![0];
const score: number = rows[0]![1];

// @ts-expect-error — position 1 holds the number, not the string
const swapped: string = rows[0]![1];
```

WHY: two type parameters are inferred independently — `A` from the first array, `B` from the second — and the tuple type `[A, B]` keeps them in separate slots rather than blurring them into `(string | number)[]`. That per-position memory is the whole reason to write a tuple: `rows[0][1]` is a `number`, not "one of the two things in there," so `.toFixed()` is available and `swapped` is caught. `readonly` on both parameters is the courtesy from exercise 08 — `zip` has no business mutating its inputs, and now the signature says so.

### Solution 3

```ts
function constant<T>(value: T): () => T {
  return () => value;
}

const five = constant(5);
const n: number = five();

const greeting = constant('hi');
// @ts-expect-error — T is string here, so the call returns a string
const m: number = greeting();
```

WHY: `T` can appear anywhere in the return type, including *inside* a function type, so the value's type survives being closed over and produced later. The two constants show the point: `five` is a `() => number` and `greeting` is a `() => string`, from one implementation the compiler checked exactly once. Written with `any` the returned function would produce `any` and both assignments would compile, which is the connection-severing failure from the original's `firstAny`.

### Solution 4

```ts
import { first } from './refactored/utils.js';

function defaultTo<T>(value: T | null, fallback: T): T {
  return value === null ? fallback : value;
}

const scores = [97, 94];
const topScore: number = defaultTo(first(scores), 0);
const named: string = defaultTo(null, 'unknown');

// @ts-expect-error — T is number here, so the result is not a string
const oops: string = defaultTo(first(scores), 0);
```

WHY: inference collects candidates from every argument and reconciles them. In `defaultTo(first(scores), 0)` the array-shaped argument is `number | null`, which matches `T | null` with `T = number`, and the fallback agrees. In `defaultTo(null, 'unknown')` the first argument contributes nothing — `null` only matches the `null` half — so the fallback alone decides `T = string`. The return type is bare `T`, so the `null` really is gone from the caller's point of view, achieved with a check instead of exercise 14's `as`.

### Solution 5

```ts
function through<A, B, C>(value: A, f: (a: A) => B, g: (b: B) => C): C {
  return g(f(value));
}

const isLong: boolean = through('hello', (s) => s.length, (x) => x > 3);
const rounded: string = through(3.7, (x) => Math.round(x), (x) => x.toFixed(0));

// @ts-expect-error — f produced a number, so g cannot demand a string
through('hello', (s) => s.length, (t: string) => t.length);
```

WHY: this is the README's "types flow *through*" taken one step further — `B` is not supplied by any argument directly, it is *discovered* from `f`'s return and then handed onward as `g`'s parameter type. That is why `s` is a `string` and `x` is a `number` with nothing annotated: `A` is fixed by the value, contextual typing gives `s` its type, `B` falls out of `s.length`, and `x` inherits it. The failing line is the chain refusing to bend: once `f` says the middle of the pipeline is a number, a `g` that insists on a string has no consistent `B` to be built from.

### Solution 6

```ts
function findWithIndex<T>(
  items: readonly T[],
  match: (item: T) => boolean,
): [T, number] | null {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    if (match(item)) return [item, i];
  }
  return null;
}

const names = ['ada', 'grace', 'alan'];
const found = findWithIndex(names, (name) => name.startsWith('g'));

if (found === null) {
  console.log('no match');
} else {
  const [name, index] = found;
  console.log(`${name.toUpperCase()} at ${index}`);
}

// @ts-expect-error — the result may be null; narrow before indexing
const careless = findWithIndex(names, (name) => name === 'ada')[0];
```

WHY: every idea in this exercise appears once in this signature — `T` from the array, a callback whose parameter is contextually typed (so `name.startsWith` is checked), a tuple pairing two different types, and the `| null` that keeps the "nothing matched" case honest. Generality did not cost any of that: `name` is a `string` in the callback, `name` is a `string` after destructuring, and the careless line is rejected exactly as it would be in a non-generic version. That is the whole claim of the README — one implementation, per-caller checking, honesty intact — and it is why exercise 19 can build a whole utility belt this way.
