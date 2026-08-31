# 🏋️ Practice: Declaring Modules

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch folder inside this exercise (e.g. `practice/`) with a `practice.ts` plus the `.d.ts` files each exercise asks for — `npm run typecheck` from the `typescript/` folder picks up `.d.ts` files too, so your declarations count as part of the build. Keep the untyped `.js` files you're describing next to their declarations, exactly like `refactored/vendor/`.

## Exercises

### ⭐ 1. Pair a declaration with a vendored file (warm-up)

Vendor this untyped helper as `practice/vendor/money-format.js`: a default export `format(cents, options)` that reads `options.currency` (default `'USD'`) and `options.showSign`, plus a named `parse(text)` returning cents as a number. Now write the `.d.ts` beside it so `import format, { parse } from './vendor/money-format.js'` typechecks with no `@ts-ignore`.

**Practices:** filename pairing, an optional options bag, and declaring only the two exports you actually import.
**Hint:** the file must be `money-format.d.ts` — same basename, `.d.ts` extension, same folder. Signatures end in `;` with no body.
**Check:** `const price: string = format(1250)` and `format(1250, { currency: 'EUR', showSign: true })` must compile; add `@ts-expect-error` tests catching `format('1250')` and `format(1250, { currancy: 'EUR' })` — the misspelled option that used to be ignored in silence.

### ⭐⭐ 2. Declare a guard, get narrowing for free (core)

The same library exports `isCurrencyCode(value)`, which returns true only for `'USD'`, `'EUR'`, or `'GBP'`. Add a `CurrencyCode` type and a guard signature to your `.d.ts`, then write `labelFor(value: unknown): string` that narrows an `unknown` down to `CurrencyCode` before using it. The guard's *claim* lives in your declaration; the *check* lives in the vendored JS.

**Practices:** declaring a `value is T` signature, and narrowing `unknown` to a literal union across the vendor boundary.
**Hint:** `export function isCurrencyCode(value: unknown): value is CurrencyCode;` — and export the type from the `.d.ts` too, so consumers can name it.
**Check:** inside `labelFor`, `const code: CurrencyCode = value` must compile *after* the `if`; a `@ts-expect-error` before the guard must catch `value.toUpperCase()` with roughly `'value' is of type 'unknown'`.

### ⭐⭐ 3. An ambient module for a package you never vendored (core)

Your app imports `tiny-emitter-legacy` from npm and it ships no types. You use exactly three things: `on(event, listener)`, `emit(event, payload)`, and `off(event)`, and the module's default export is a `createEmitter()` factory. Write `practice/types/legacy-packages.d.ts` containing a `declare module 'tiny-emitter-legacy' { ... }` block, then import and use it.

**Practices:** `declare module 'pkg'` — the same skill as a paired `.d.ts`, at a different address.
**Hint:** the file must have no top-level `import` or `export` of its own, or the block becomes a *module augmentation* of an existing package instead of a fresh ambient declaration. Type the payload as `unknown`, not `any` — you don't know what events carry.
**Check:** `createEmitter().on('tick', (payload) => console.log(payload))` must compile; add `@ts-expect-error` tests catching `bus.on('tick')` (no listener) and `bus.once('tick', () => {})` — a method you deliberately never declared.

### ⭐⭐ 4. A default export that's an object, not a function (core)

`legacy-base32` exports one object with `encode`, `decode`, and a `VERSION` string that must never be reassigned. Add a second `declare module` block for it in the same `.d.ts`. This shape trips people up: you cannot write `export default interface`, so you need an interface *and* a declared constant.

**Practices:** declaring an object-shaped default export, and using `readonly` to encode a constraint the JS only documents.
**Hint:** declare `interface Base32 { ... }`, then `const base32: Base32;` followed by `export default base32;` inside the block.
**Check:** `const encoded: string = base32.encode('hello')` must compile; `@ts-expect-error` tests must catch `base32.encode(42)` and `base32.VERSION = '2.0.0'` (roughly `Cannot assign to 'VERSION' because it is a read-only property`).

### ⭐⭐⭐ 5. Declare a signature the JavaScript never had (challenge)

Vendor `practice/vendor/list-utils.js` with one function: `export function pluck(list, key) { return list.map((item) => item[key]); }`. The JS accepts any key at all. Your declaration doesn't have to: write a generic signature that ties `key` to the keys of the list's element type and returns an array of exactly that property's type.

**Practices:** using a `.d.ts` to *add* safety — a generic constraint that exists only in your declaration.
**Hint:** `export function pluck<T, K extends keyof T>(list: readonly T[], key: K): T[K][];` — `readonly T[]` accepts both mutable and readonly arrays.
**Check:** with `interface Person { id: number; name: string }`, `const names: string[] = pluck(people, 'name')` and `const ids: number[] = pluck(people, 'id')` must both compile; `@ts-expect-error` tests must catch `pluck(people, 'nmae')` and `const wrong: number[] = pluck(people, 'name')`.

### ⭐⭐⭐ 6. Audit a declaration full of lies (challenge)

A teammate declared `mini-cache.js` from memory. The real JS is `createCache(limit)` returning `{ get(key) { return map.has(key) ? map.get(key) : undefined }, set(key, value) { /* stores; returns nothing */ }, size() { return map.size } }`. Their declaration says `get(key: string): string`, `set(key: string, value: string): boolean`, and `size: number`. Find all three lies, rewrite the `.d.ts` honestly, and write the tests that would have caught them.

**Practices:** the honesty contract — a `.d.ts` is trusted, not verified, so a wrong claim is enforced against your own correct code.
**Hint:** one lie hides a missing value, one invents a return value, and one confuses a method with a property. Read the JS, not the declaration.
**Check:** after the rewrite, `const hit: string | undefined = cache.get('a')` and `const used: number = cache.size()` must compile, and `@ts-expect-error` tests must catch `const forced: string = cache.get('a')`, `if (cache.set('b', '2'))` (roughly `An expression of type 'void' cannot be tested for truthiness`), and `const wrongSize: number = cache.size`.

## Solutions

### Solution 1

```ts
// practice/vendor/money-format.d.ts
export interface MoneyOptions {
  /** ISO currency code (default 'USD') */
  currency?: string;
  /** print a leading + on positive amounts (default false) */
  showSign?: boolean;
}

/** Format an integer number of cents. Cents only — the lib does no parsing. */
export default function format(cents: number, options?: MoneyOptions): string;

/** Parse a formatted amount back into cents. */
export function parse(text: string): number;
```

```ts
// practice/practice.ts
import format, { parse } from './vendor/money-format.js';

const price: string = format(1250);
const euros: string = format(1250, { currency: 'EUR', showSign: true });
const cents: number = parse('12.50 USD');
// @ts-expect-error — cents is a number; the lib does no parsing of its input
format('1250');
// @ts-expect-error — the option is 'currency'; 'currancy' used to be ignored in silence
format(1250, { currancy: 'EUR' });
```

WHY: nothing registered the declaration anywhere — TypeScript pairs `money-format.d.ts` with `money-format.js` purely by filename, and the import of the `.js` silently picks up the types. `currency?: string` is what turns the misspelling into a compile error, because an object literal may only carry properties the target type knows about. The JSDoc comments aren't decoration either: they're what your editor shows on hover, so the declaration doubles as the documentation the library never shipped.

### Solution 2

```ts
// added to practice/vendor/money-format.d.ts
export type CurrencyCode = 'USD' | 'EUR' | 'GBP';

/** Runtime check that a value is one of the three supported codes. */
export function isCurrencyCode(value: unknown): value is CurrencyCode;
```

```ts
import { isCurrencyCode, type CurrencyCode } from './vendor/money-format.js';

function labelFor(value: unknown): string {
  // @ts-expect-error — 'value' is of type 'unknown' until the guard runs
  value.toUpperCase();
  if (isCurrencyCode(value)) {
    const code: CurrencyCode = value;
    return `${code} amounts`;
  }
  return 'unsupported currency';
}
```

WHY: a `.d.ts` can export types as well as values, so the union you invented to describe the library becomes part of its public vocabulary. The guard signature is the interesting half: `value is CurrencyCode` makes the compiler narrow `unknown` all the way down to a three-member literal union on the strength of your claim alone. That is the same trust you extend to any hand-written guard body — the compiler checks how you *use* the result, never whether the JS regex behind it agrees.

### Solution 3

```ts
// practice/types/legacy-packages.d.ts — no top-level import/export in this file
declare module 'tiny-emitter-legacy' {
  export interface Emitter {
    on(event: string, listener: (payload: unknown) => void): void;
    emit(event: string, payload: unknown): void;
    off(event: string): void;
  }

  export default function createEmitter(): Emitter;
}
```

```ts
import createEmitter from 'tiny-emitter-legacy';

const bus = createEmitter();
bus.on('tick', (payload) => console.log(payload));
bus.emit('tick', { at: Date.now() });
bus.off('tick');
// @ts-expect-error — on() needs a listener as well as an event name
bus.on('tick');
// @ts-expect-error — 'once' was never declared, so it is not part of the surface we use
bus.once('tick', () => {});
```

WHY: there is no file to pair with here, so the module name itself is the anchor — `declare module 'tiny-emitter-legacy'` tells the compiler "an import of this specifier has these types," and resolution stops asking questions. The no-top-level-`export` rule matters: add one and the file becomes a module, at which point the block would try to *augment* a package that has no types to augment. `unknown` payloads are the honest choice; they push callers to narrow rather than handing back the `any` you were trying to escape. And `bus.once` failing is the point of declaring only what you use — a small claim you can actually audit.

### Solution 4

```ts
// added to practice/types/legacy-packages.d.ts
declare module 'legacy-base32' {
  export interface Base32 {
    encode(input: string): string;
    decode(input: string): string;
    readonly VERSION: string;
  }

  const base32: Base32;
  export default base32;
}
```

```ts
import base32 from 'legacy-base32';

const encoded: string = base32.encode('hello');
const version: string = base32.VERSION;
// @ts-expect-error — encode takes a string
base32.encode(42);
// @ts-expect-error — VERSION is read-only
base32.VERSION = '2.0.0';
```

WHY: `export default` needs a *value*, and an interface is only a type, so the two-step (declare the shape, declare a constant of that shape, default-export the constant) is the standard spelling for object-style modules. `readonly` is the part worth stealing: the JS cannot stop anyone reassigning `VERSION`, but your declaration can, and that constraint costs one keyword. This is exercise 08's lesson arriving through the vendor door — the declaration is allowed to be stricter than the runtime, as long as it isn't *wrong*.

### Solution 5

```ts
// practice/vendor/list-utils.d.ts
/** Collect one property from every item in a list. */
export function pluck<T, K extends keyof T>(list: readonly T[], key: K): T[K][];
```

```ts
import { pluck } from './vendor/list-utils.js';

interface Person { id: number; name: string }
const people: Person[] = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];

const names: string[] = pluck(people, 'name');
const ids: number[] = pluck(people, 'id');
// @ts-expect-error — 'nmae' is not a key of Person
pluck(people, 'nmae');
// @ts-expect-error — plucking 'name' yields strings, not numbers
const wrongNames: number[] = pluck(people, 'name');
```

WHY: the JavaScript would return `[undefined, undefined]` for a misspelled key without complaint, and no amount of testing catches that in the branch nobody ran. Your declaration adds a rule the implementation never had — `K extends keyof T` — and because `K` infers as the literal `'name'`, the return type `T[K][]` resolves to `string[]` rather than a vague union. This is not a lie: every call the declaration accepts is one the JS handles correctly. Narrowing a declaration below what the runtime tolerates is the safe direction; widening it above is how you get a cast wearing a lab coat.

### Solution 6

```ts
// practice/vendor/mini-cache.d.ts — honest version
export interface MiniCache {
  get(key: string): string | undefined; // lie 1: a miss returns undefined
  set(key: string, value: string): void; // lie 2: it returns nothing
  size(): number;                        // lie 3: size is a method, not a property
}

export function createCache(limit: number): MiniCache;
```

```ts
import { createCache } from './vendor/mini-cache.js';

const cache = createCache(2);
cache.set('a', '1');
const hit: string | undefined = cache.get('a');
const used: number = cache.size();
// @ts-expect-error — get() can miss, so the result is string | undefined
const forced: string = cache.get('a');
// @ts-expect-error — set() returns nothing; there is no boolean to test
if (cache.set('b', '2')) console.log('stored');
// @ts-expect-error — size is a method, not a property
const wrongSize: number = cache.size;
```

WHY: every one of the three lies fails in the direction that hurts most — it makes *your* correct code look wrong or your wrong code look correct. The missing `| undefined` is the worst: consumers write `cache.get(k).length` and ship a crash, because the compiler was told the miss could never happen. The invented `boolean` return invites `if (cache.set(...))`, a branch that is always falsy. And `size: number` versus `size(): number` fails loudly rather than silently, which is the only mercy in the set. The discipline the refactor states is the whole defence: declare what you use, source every claim from the JS in front of you, and keep the file small enough that re-reading it is cheap when the library changes.
