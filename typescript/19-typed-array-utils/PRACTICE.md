# 🏋️ Practice: Typed Array Utilities

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}`) and run `npm run typecheck` from the `typescript/` folder. The last exercise reuses the shipped helper via `import { groupBy } from './refactored/array-utils.js';`; the rest are self-contained.

Every exercise uses this catalogue:

```ts
interface Book { title: string; author: string; year: number; genre: string }

const books: Book[] = [
  { title: 'Frankenstein', author: 'Shelley', year: 1818, genre: 'gothic' },
  { title: 'The Left Hand of Darkness', author: 'Le Guin', year: 1969, genre: 'sci-fi' },
  { title: 'Dracula', author: 'Stoker', year: 1897, genre: 'gothic' },
];
```

## Exercises

### ⭐ 1. `last` — one type parameter, one honest return (warm-up)

Write `last<T>(items: readonly T[]): T | undefined`, returning the final element or `undefined` for an empty array. Note the return type is doing real work: this project doesn't enable `noUncheckedIndexedAccess`, so `items[items.length - 1]` is typed `T` even when the array is empty. It's *your* signature that tells the truth.

**Practices:** the basic generic shape — `<T>` in, `T` out — plus `readonly` on an input you don't mutate.
**Hint:** guard on `items.length === 0` first, then index; the union in the return type is a promise you keep by hand.
**Check:** `last(books)` must be `Book | undefined`; `const title: string = last(['a', 'b'])` must error with roughly `Type 'string | undefined' is not assignable to type 'string'`.

### ⭐⭐ 2. `partition` — one pass, two arrays (core)

Write `partition<T>(items: readonly T[], predicate: (item: T) => boolean): [T[], T[]]`, splitting the input into the items that pass and the items that don't. Return a two-element tuple so callers can destructure it. Verify that the predicate's parameter needs no annotation at the call site.

**Practices:** a generic taking a callback, with contextual typing supplying the callback's parameter type.
**Hint:** `[T[], T[]]` is a tuple type — a fixed-length array whose slots have their own types — not the same as `T[][]`.
**Check:** `const [modern, classic] = partition(books, (b) => b.year >= 1900)` must give two `Book[]`s; add a `@ts-expect-error` test catching the typo `(b) => b.yaer >= 1900`.

### ⭐⭐ 3. `indexBy` — one item per key (core)

`groupBy` returns `Map<K, T[]>` because several items can share a key. Write the sibling for unique keys: `indexBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T>`, where a later item with the same key simply replaces the earlier one. Note that `K` is deliberately unconstrained here — unlike `sortBy`, the body never compares keys, it only stores them.

**Practices:** the key type flowing from the callback into the `Map`'s key slot, and constraining only what the body actually requires.
**Hint:** the body is three lines; the entire exercise is the signature.
**Check:** `indexBy(books, (b) => b.year)` must be `Map<number, Book>`; add a `@ts-expect-error` test catching `.get('1897')` — a string lookup on a number-keyed map.

### ⭐⭐ 4. `sortByKey` — sort by a property *name* (core)

Sometimes you have a key name rather than a key function. Write `sortByKey<T, K extends keyof T>(items, key, compare)`, where `key` is a property name and `compare` is a comparator whose two parameters are typed by what lives at that key. Watch what happens to the comparator's parameter types as you change the key you pass.

**Practices:** joining exercise 18's `keyof`/`T[K]` correlation to a callback signature, so the comparator is typed by the key you chose.
**Hint:** `compare: (a: T[K], b: T[K]) => number` is the whole idea; inside, sort a copy and call `compare(a[key], b[key])`.
**Check:** `sortByKey(books, 'year', (a, b) => a - b)` and `sortByKey(books, 'title', (a, b) => a.localeCompare(b))` must compile; add `@ts-expect-error` tests catching `sortByKey(books, 'title', (a, b) => a - b)` and the key `'published'`.

### ⭐⭐⭐ 5. `zip` — two independent type parameters (challenge)

Write `zip<A, B>(as: readonly A[], bs: readonly B[]): [A, B][]`, pairing elements up to the shorter array's length. Two unrelated placeholders is the new part: nothing links `A` to `B`, and the result type has to keep both straight, slot by slot.

**Practices:** more than one type parameter in flight at once, landing in a tuple element type.
**Hint:** build the result into a `const pairs: [A, B][] = []` so `push` is checked against the tuple shape; loop while `i` is below both lengths — no `!` needed.
**Check:** `zip(titles, years)` must be `[string, number][]`, and destructuring it in a later `.map(([t, y]) => ...)` must give `t: string` and `y: number`; add a `@ts-expect-error` test catching `.map(([, y]) => y.toUpperCase())`.

### ⭐⭐⭐ 6. `mapValues` — utilities that compose (challenge)

Write `mapValues<K, V, W>(source: ReadonlyMap<K, V>, transform: (value: V, key: K) => W): Map<K, W>`, which rebuilds a map with transformed values and untouched keys. Then compose it with the shipped `groupBy` to turn a `Map<string, Book[]>` into a `Map<string, number>` of counts, without annotating anything at the call site.

**Practices:** three type parameters where one is *produced* by the callback, and watching types survive a two-utility pipeline.
**Hint:** `ReadonlyMap<K, V>` is the read-only view of `Map`; take it as input so callers know you won't mutate their map, and return a fresh `Map<K, W>`.
**Check:** `mapValues(groupBy(books, (b) => b.genre), (group) => group.length)` must be `Map<string, number>`; add a `@ts-expect-error` test catching `.get('gothic')?.length` on that result.

## Solutions

### Solution 1

```ts
function last<T>(items: readonly T[]): T | undefined {
  return items.length === 0 ? undefined : items[items.length - 1];
}

const lastBook = last(books);      // Book | undefined
const oldest = last([1818, 1897]); // number | undefined

// @ts-expect-error — last() may hand back undefined
const title: string = last(['a', 'b']);
```

WHY: `<T>` is a promise that whatever goes in comes back out, so one function serves books, numbers, and everything else without a cast. The `| undefined` is the interesting half: indexing an array is unchecked by default in this config, so `items[0]` on an empty array is typed `T` and valued `undefined` — a small lie the language ships with. Writing the union into the signature forces every caller to handle the empty case, which is exercise 05's null-safety habit applied to a generic.

### Solution 2

```ts
function partition<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): [T[], T[]] {
  const kept: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (predicate(item)) kept.push(item);
    else rest.push(item);
  }
  return [kept, rest];
}

const [modern, classic] = partition(books, (b) => b.year >= 1900);
const modernTitles = modern.map((b) => b.title); // string[]

// @ts-expect-error — 'yaer' is not a property of Book
partition(books, (b) => b.yaer >= 1900);
```

WHY: because `T` is fixed to `Book` by the first argument, the compiler already knows what `b` is by the time it reads the callback — contextual typing, so annotations would be noise. That inference is also what makes the typo a compile error rather than a silent `undefined >= 1900` (always false, everything lands in `rest`). The tuple return type is what lets destructuring name both halves; `T[][]` would compile too but would tell callers nothing about how many arrays come back.

### Solution 3

```ts
function indexBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T> {
  const index = new Map<K, T>();
  for (const item of items) index.set(keyOf(item), item);
  return index;
}

const byYear = indexBy(books, (b) => b.year); // Map<number, Book>
const from1897 = byYear.get(1897);            // Book | undefined

// @ts-expect-error — the keys are numbers; a string lookup could never hit
byYear.get('1897');
```

WHY: `K` is inferred from the callback's return type and lands in the `Map`'s key slot, so the map remembers that its keys are numbers — the honesty `Map<any, any>` threw away. Leaving `K` unconstrained is the deliberate choice: `sortBy` needs `K extends string | number` because its body uses `<`, but this body only calls `set`, which accepts any key type. Constrain what the body requires and nothing more, or you rule out legitimate callers for no reason.

### Solution 4

```ts
function sortByKey<T, K extends keyof T>(
  items: readonly T[],
  key: K,
  compare: (a: T[K], b: T[K]) => number,
): T[] {
  return [...items].sort((a, b) => compare(a[key], b[key]));
}

const byYearAsc = sortByKey(books, 'year', (a, b) => a - b);
const byTitleAz = sortByKey(books, 'title', (a, b) => a.localeCompare(b));

// @ts-expect-error — title values are strings; subtraction is not defined on them
sortByKey(books, 'title', (a, b) => a - b);
// @ts-expect-error — 'published' is not a key of Book
sortByKey(books, 'published', (a, b) => 0);
```

WHY: the string you pass as `key` decides the comparator's parameter types, which is the exercise-18 correlation reaching a *callback* rather than a return value. That's why the same comparator body is valid for `'year'` and rejected for `'title'` — `a - b` is checked against `number` in one call and `string` in the other. `[...items]` copies before sorting because `Array.prototype.sort` mutates, and the `readonly` input is a promise not to.

### Solution 5

```ts
function zip<A, B>(as: readonly A[], bs: readonly B[]): [A, B][] {
  const pairs: [A, B][] = [];
  for (let i = 0; i < as.length && i < bs.length; i++) {
    const a = as[i];
    const b = bs[i];
    pairs.push([a, b]);
  }
  return pairs;
}

const titles = books.map((b) => b.title); // string[]
const years = books.map((b) => b.year);   // number[]
const pairs = zip(titles, years);         // [string, number][]
const labels = pairs.map(([t, y]) => `${t} (${y})`);

// @ts-expect-error — the second slot holds a number, not a string
pairs.map(([, y]) => y.toUpperCase());
```

WHY: `A` and `B` are inferred independently from the two arguments and stay distinct all the way into the tuple, so destructuring in a later `.map` still knows which slot is which. Annotating `pairs` up front is what makes `push([a, b])` checked against the tuple shape instead of widening to `(A | B)[]`. Note the loop condition avoids indexing past either end, so no `!` assertion is needed — the shipped `groupBy` made the same trade, convincing the compiler rather than silencing it.

### Solution 6

```ts
import { groupBy } from './refactored/array-utils.js';

function mapValues<K, V, W>(
  source: ReadonlyMap<K, V>,
  transform: (value: V, key: K) => W,
): Map<K, W> {
  const result = new Map<K, W>();
  for (const [key, value] of source) {
    result.set(key, transform(value, key));
  }
  return result;
}

const byGenre = groupBy(books, (b) => b.genre);            // Map<string, Book[]>
const perGenre = mapValues(byGenre, (group) => group.length); // Map<string, number>
const gothicCount = perGenre.get('gothic');                // number | undefined

// @ts-expect-error — the values are counts now, not arrays of books
perGenre.get('gothic')?.length;
```

WHY: `K` and `V` arrive from the input map, `W` is discovered from whatever the callback returns, and the output type is assembled from all three — `group` is a `Book[]` with no annotation, and `.length` is what turns `W` into `number`. That pipeline is the payoff the README describes: two independently written utilities compose, and precise types survive the join instead of decaying to `any` at the seam. The failing test is the proof — the compiler tracked the value type *changing* through the transform, which is exactly what a `Map<any, any>` version could never notice.
