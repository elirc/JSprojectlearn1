# 🏋️ Practice: Conditional Types

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}`) — `npm run typecheck` from the `typescript/` folder picks it up. These exercises define their own types, so nothing needs importing; if you want `Unwrap` for comparison, `import type { Unwrap } from './refactored/unwrap.js';`.

## Exercises

### ⭐ 1. The element behind the array (warm-up)

A notification API accepts either one recipient or a list of them, and you want to name "whatever a single recipient is." Write `Recipients<T>` that yields the element type when `T` is an array, and passes `T` straight through when it isn't. Both halves matter — the else-branch is not decoration.

**Practices:** the `infer` capture inside an array pattern, plus the pass-through else-branch.
**Hint:** `T extends readonly (infer E)[] ? E : T` — `readonly` in the pattern makes it match `string[]` *and* `readonly string[]`.
**Check:** `const one: Recipients<string[]> = 'ada@example.com'` must compile; add `@ts-expect-error` tests catching `const bad: Recipients<string[]> = 42` and `const alsoBad: Recipients<number> = 'seven'` (the second proves the pass-through really passed a `number` through).

### ⭐⭐ 2. Filtering a union with `never` (core)

A draft record holds half-filled form values: `title: string | null`, `tags: string[] | undefined`, `views: number`. Write `Defined<T>` that removes `null` and `undefined` from a union, then `type FormValues = { [K in keyof Draft]: Defined<Draft[K]> }` for the submitted, fully-filled version. The magic is that a conditional applied to a naked type parameter runs once *per union member*.

**Practices:** distribution over a union, and `never` as the "delete this member" answer.
**Hint:** `T extends null | undefined ? never : T`. `string | never` collapses to `string` — that is why the filter works.
**Check:** `const values: FormValues = { title: 'Hello', tags: [], views: 0 }` must compile; add a `@ts-expect-error` test catching `title: null`.

### ⭐⭐ 3. Picking one branch out of a union (core)

Given `AppEvent = { kind: 'click'; x: number; y: number } | { kind: 'key'; code: string } | { kind: 'scroll'; top: number }`, write `ByKind<U, K>` that keeps only the members whose `kind` matches `K`. Then write a second version, `ByKindWrapped<U, K>`, with both sides of the `extends` wrapped in a one-element tuple — and see what you get.

**Practices:** the distributive conditional as a union filter, and the `[U] extends [...]` trick that *switches distribution off*.
**Hint:** the working version is `U extends { kind: K } ? U : never`. In the wrapped version the whole union is tested at once, and no single branch satisfies `{ kind: 'click' }`.
**Check:** `const click: ByKind<AppEvent, 'click'> = { kind: 'click', x: 1, y: 2 }` must compile; a `@ts-expect-error` must catch a `scroll` object assigned to it. `ByKindWrapped<AppEvent, 'click'>` is `never`, so assigning even a correct click object to it must error too.

### ⭐⭐ 4. A return type that depends on an argument (core)

Search helpers often come in twins: `findUser` and `findUsers`. Collapse them into one `declare function findUsers<Many extends boolean>(query: string, many: Many)` whose return type is `User[]` when `many` is `true` and `User | undefined` when it is `false`. No body needed — this exercise is entirely about the signature.

**Practices:** a conditional type in return position, driven by a literal type inferred from a call argument.
**Hint:** constrain the parameter with `Many extends boolean`, then return `Many extends true ? User[] : User | undefined`. Passing the literal `true` makes `Many` infer as `true`, not as `boolean`.
**Check:** `const list: User[] = findUsers('ada', true)` and `const single: User | undefined = findUsers('ada', false)` must both compile; add a `@ts-expect-error` test catching `const bad: User[] = findUsers('ada', false)`.

### ⭐⭐⭐ 5. Recursion through two different wrappers (challenge)

Your API wraps payloads twice: things arrive as promises, and inside them everything sits under a `data` key — sometimes nested more than once (`Promise<{ data: { data: Report } }>`). Write `Payload<T>` that strips every `Promise` layer *and* every `{ data: ... }` layer until neither pattern matches, then returns what's left. Order the branches carefully.

**Practices:** a recursive conditional with two patterns and a terminating else-branch.
**Hint:** chain the conditionals — `T extends Promise<infer I> ? Payload<I> : T extends { data: infer D } ? Payload<D> : T`. Each recursive call re-tests from the top, so the layers can interleave in any order.
**Check:** `const report: Payload<Promise<{ data: { data: Report } }>> = { id: 1, rows: 10 }` must compile; a `@ts-expect-error` must catch the same annotation assigned `{ data: { id: 1, rows: 10 } }` (there is no `data` wrapper left). `Payload<number>` must still be `number`.

### ⭐⭐⭐ 6. Which keys are methods? (challenge)

Combine exercise 25's mapped type with this exercise's conditional to build `MethodNames<T>`: the union of `T`'s keys whose values are functions. For `interface Widget { title: string; width: number; render(): string; resize(width: number): void }` the answer is `'render' | 'resize'`. The trick is what to do with the keys you *don't* want.

**Practices:** the "map keys to themselves or `never`, then index by `keyof T`" idiom — conditionals used to select keys rather than values.
**Hint:** `{ [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never }[keyof T]`. That trailing `[keyof T]` turns the object of key-names back into a union, and the `never` slots vanish from it.
**Check:** `const m: MethodNames<Widget> = 'render'` and `= 'resize'` must both compile; a `@ts-expect-error` must catch `= 'title'`.

## Solutions

### Solution 1

```ts
type Recipients<T> = T extends readonly (infer E)[] ? E : T;

const one: Recipients<string[]> = 'ada@example.com';
// @ts-expect-error — the element type is string, not number
const oneBad: Recipients<string[]> = 42;
const passthrough: Recipients<number> = 7;
// @ts-expect-error — a non-array T falls through unchanged: still number
const passthroughBad: Recipients<number> = 'seven';
```

WHY: `infer E` is a capture group — "if `T` has the shape *array of something*, name that something `E`." The `readonly` in the pattern costs nothing and buys `readonly string[]` support, because a mutable array is assignable to a readonly one. The else-branch is the half people forget: without `: T` you would have to write `Recipients<number>` as `never`, and every non-array caller would break. Compare with the refactor's `Unwrap`, which is the same two-part sentence pointed at `Promise` instead of arrays.

### Solution 2

```ts
type Defined<T> = T extends null | undefined ? never : T;

interface Draft {
  title: string | null;
  tags: string[] | undefined;
  views: number;
}
type FormValues = { [K in keyof Draft]: Defined<Draft[K]> };

const values: FormValues = { title: 'Hello', tags: [], views: 0 };
// @ts-expect-error — null was filtered out of title
const valuesBad: FormValues = { title: null, tags: [], views: 0 };
```

WHY: when a conditional's checked type is a naked type parameter, it *distributes*: `Defined<string | null>` runs the test on `string` and on `null` separately, giving `string | never`. And `never` is the empty type — it disappears from a union, so the result is just `string`. That is the whole mechanism behind the built-in `NonNullable<T>`, and pairing it with a mapped type turns "a draft" into "a submitted form" in one line instead of retyping every field.

### Solution 3

```ts
type AppEvent =
  | { kind: 'click'; x: number; y: number }
  | { kind: 'key'; code: string }
  | { kind: 'scroll'; top: number };

type ByKind<U, K> = U extends { kind: K } ? U : never;

const click: ByKind<AppEvent, 'click'> = { kind: 'click', x: 1, y: 2 };
// @ts-expect-error — the scroll branch is not the click branch
const clickBad: ByKind<AppEvent, 'click'> = { kind: 'scroll', top: 0 };

type ByKindWrapped<U, K> = [U] extends [{ kind: K }] ? U : never;
// @ts-expect-error — this is never: no distribution, so the whole union was tested at once
const collapsedBad: ByKindWrapped<AppEvent, 'click'> = { kind: 'click', x: 1, y: 2 };
```

WHY: `ByKind` is distribution used deliberately — each member is tested alone, the click branch survives, the other two become `never` and evaporate. You have just rebuilt the standard library's `Extract<T, U>`. The wrapped version shows the other side of the coin: `[U] extends [...]` hides the naked type parameter, so the union is compared as a single lump, and `AppEvent` as a whole is not assignable to `{ kind: 'click' }`. Knowing both spellings means distribution becomes a choice rather than a surprise.

### Solution 4

```ts
interface User { id: number; name: string }

declare function findUsers<Many extends boolean>(
  query: string,
  many: Many,
): Many extends true ? User[] : User | undefined;

const list: User[] = findUsers('ada', true);
const single: User | undefined = findUsers('ada', false);
// @ts-expect-error — many:false gives one optional user, not an array
const singleBad: User[] = findUsers('ada', false);
```

WHY: `Many extends boolean` does double duty — it restricts what callers may pass *and*, because `boolean` is really `true | false`, it makes the compiler keep the literal type of the argument instead of widening it to `boolean`. That literal is what the conditional then branches on, so one signature replaces the `findUser`/`findUsers` twins the same way `getCached` replaced the sync/async pair. Be aware of the trade: inside a real body the return type stays unresolved, so implementations of this shape usually need an internal cast — the payoff is entirely at the call sites.

### Solution 5

```ts
type Payload<T> =
  T extends Promise<infer Inner> ? Payload<Inner>
  : T extends { data: infer D } ? Payload<D>
  : T;

interface Report { id: number; rows: number }

const report: Payload<Promise<{ data: { data: Report } }>> = { id: 1, rows: 10 };
// @ts-expect-error — every wrapper is gone; there is no `data` left
const reportBad: Payload<Promise<{ data: { data: Report } }>> = { data: { id: 1, rows: 10 } };
const plain: Payload<number> = 5;
```

WHY: this is `DeepUnwrap` with a second pattern bolted on. Each recursive call starts the chain again from the top, so `Promise<{data: {data: X}}>` unwraps the promise, then the outer `data`, then the inner one, and stops at `Report` because it matches neither pattern. Order matters only for readability here — a `Promise` is not assignable to `{ data: unknown }` — but with overlapping patterns the first matching branch wins, so put the most specific test first. The final `: T` is the base case; drop it and every leaf becomes `never`.

### Solution 6

```ts
interface Widget {
  title: string;
  width: number;
  render(): string;
  resize(width: number): void;
}

type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never;
}[keyof T];

const m1: MethodNames<Widget> = 'render';
const m2: MethodNames<Widget> = 'resize';
// @ts-expect-error — 'title' holds data, so its slot mapped to never
const m3: MethodNames<Widget> = 'title';
```

WHY: the mapped type does not produce value types here — it produces *key names*, storing `K` in the slots you want to keep and `never` in the rest. Indexing the whole object with `[keyof T]` then asks for "the union of all its value types," which is `'render' | 'resize' | never | never`, and the `never`s vanish. `(...args: never[]) => unknown` is the safe "any function" pattern: `never` in a parameter position accepts any argument list because `never` is assignable to everything, and `unknown` in return position accepts any result. Loops, conditionals, and string operations together — exercise 28 spends this whole vocabulary at once on a route parser.
