# 📘 Learning Guide: as const

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

You write `const config = { env: 'production', port: 443 }`. You *wrote* the exact values — but hover over `config.env` and TypeScript says its type is `string`, not `'production'`. The compiler deliberately forgot the exact value and kept only its general kind. That forgetting is called **widening**.

The problem: functions that accept only specific values (`env: 'production' | 'staging'`) then *reject* your config — even though the value is literally correct — and authors "fix" it with casts that re-assert what the compiler knew all along. Tuples decay into shapeless arrays. "Constant" lists remain mutable.

The fix is two magic words: **`as const`** — "keep this value exactly as written." Literal types, readonly, real tuples, all preserved.

## 2. Concepts you need first

### Literal types
A literal type is a type with exactly one value in it. `'production'` (the type) contains only `'production'` (the string). `443` (the type) contains only the number 443:

```ts
let a: 'production' = 'production'; // ✅ OK
a = 'staging';                      // ❌ Error: 'staging' not assignable to 'production'
```

Unions of literals make small closed vocabularies: `'production' | 'staging'`. (Exercise 06's LEARN.md covers these.)

### Widening — the compiler's deliberate forgetting
When you initialize a variable, TypeScript usually stores a *widened* type:

```ts
let mode = 'dark';   // type: string  (widened — you might reassign)
const env = 'prod';  // type: 'prod'  (const can't be reassigned, keeps the literal)
```

But here's the catch this exercise turns on — **object properties widen even under `const`**:

```ts
const config = { env: 'prod' }; // config.env: string, NOT 'prod'
```

Why? The binding `config` is const, but the *property* `config.env` is still assignable (`config.env = 'other'` is legal). Mutable slot ⇒ widened type. Widening is *correct* for things that can change — `let mode = 'dark'` should accept `'light'` later. It's wrong only for values you meant as fixed facts.

### Tuples vs. arrays
An array type (`number[]`) is "any number of numbers." A **tuple** type (`[number, number]`) is "exactly two numbers, in order." Literals widen to arrays, not tuples:

```ts
const origin = [0, 0];        // type: number[] — length forgotten
const pair: [number, number] = [0, 0]; // ✅ a real tuple, via annotation
```

### Type assertions (`as`) — and the one honest one
`x as T` normally *overrules* the compiler and can lie (exercise 14's LEARN.md). `as const` is special: it doesn't claim a different type — it asks the compiler to keep the *most precise* type of what's literally there. It can only narrow to the truth, never assert a falsehood. That's why it's called the one `as` that can't lie.

```ts
const c = { env: 'prod' } as const;
// c: { readonly env: 'prod' } — literal kept, property readonly
```

### `readonly`
A `readonly` property or array can't be assigned/mutated through that type (exercise 08's LEARN.md). `as const` applies it everywhere, deeply.

### `typeof` (the type-level one) and indexing arrays by `[number]`
`typeof someValue` in type position gives the value's type. Indexing an array type with `[number]` gives its element type:

```ts
const LOCALES = ['en', 'de'] as const; // readonly ['en', 'de']
type L = (typeof LOCALES)[number];     // 'en' | 'de'
```

Read it as: "the type of LOCALES, indexed at any number" — i.e., the union of its elements. This derives a union *from the data*, so the list and the type can never drift apart. (Exercise 07's LEARN.md introduces this idiom.)

### `satisfies` (mentioned for the map)
`satisfies` checks a value against a shape *without* changing its inferred type. `as const` keeps precision without checking a shape. They compose: `{...} as const satisfies Config` — checked AND precise. (Exercise 14's LEARN.md.)

## 3. Walking through the original code

```ts
export const config = {
  env: 'production',   // typed string, not 'production'
  port: 443,           // typed number, not 443
  retries: 3,
};
```

Widening in action. The author wrote exact facts; the type keeps only their kinds.

```ts
export function connect(env: 'production' | 'staging', port: number): string {
  return `${env}:${port}`;
}
export const conn = connect(config.env as 'production', config.port);
```

`connect(config.env, ...)` without the cast would fail: "`string` is not assignable to `'production' | 'staging'`". The value IS `'production'` — the compiler just discarded that fact two lines earlier. So the author casts it *back*. A cast to re-assert what the compiler already knew is the signature smell of widening.

```ts
export const origin = [0, 0]; // number[] — length forgotten, order forgotten
export const drawn = drawAt(origin as [number, number]); // cast #2
```

Same story for tuples: `[0, 0]` widened to `number[]`, so a function wanting `[number, number]` rejects it, so — cast #2.

```ts
export const SUPPORTED_LOCALES = ['en', 'de', 'fr']; // string[]
SUPPORTED_LOCALES.push('klingon'); // sure, why not — it's mutable
```

The "constant" list is a plain mutable `string[]`. Pushing `'klingon'` compiles, and its type (`string[]`) tells you nothing about which locales are actually supported.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: correct values get rejected, so casts appear.** The cast `config.env as 'production'` works today. **Runtime bug story:** six months later someone edits the config to `env: 'staging'`. The cast still says `as 'production'` — casts don't check, they overrule. Now the types claim production while the app connects to staging. Every log, every dashboard filter keyed on that type-level lie is wrong, and the compiler said nothing, because a cast told it not to look.

**Flaw 2: tuple amnesia.** `origin` as `number[]` could be `[]` or `[1,2,3,4]` per the type. `drawAt(origin as [number, number])` compiles even if someone changes origin to `[0, 0, 0]` — the cast again papers over whatever's really there. `point[1]` on a one-element array is `undefined`, and `(0, undefined)` gets drawn somewhere off-screen.

**Flaw 3: mutable constants.** Any file can `push('klingon')` onto SUPPORTED_LOCALES at any time. A "constant" that isn't readonly is a global variable with good PR. And because its type is `string[]`, you can't derive the `'en' | 'de' | 'fr'` union from it — you'd have to maintain a second, parallel list of literals that WILL drift out of sync with the array.

The umbrella pattern: *write exact values → get vague types → cast your way back to what you started with*. Two casts and a mutable constant, all curing symptoms of one disease.

## 5. Try it yourself first!

1. **Vague hint:** All three problems have the same one-suffix cure. The exercise title is a spoiler.
2. **Less vague:** Add two words after the config object's closing brace, before the semicolon. Hover `config.env` (or reason it out): what's its type now? Then delete the `as 'production'` cast and see if `connect` accepts it.
3. **Tuple:** same suffix on `[0, 0]`. One wrinkle: the result is a *readonly* tuple, so `drawAt` must accept `readonly [number, number]`. Adjust the parameter.
4. **Locales:** same suffix on the list. Then derive the union type from the value: `type Locale = (typeof SUPPORTED_LOCALES)[number]`. Check that `push('klingon')` now fails to compile.
5. **Verify the payoff:** zero `as SomeType` casts should remain (only `as const`), and the derived `Locale` should reject `'klingon'` as a value.

## 6. Understanding the refactored solution

```ts
export const config = {
  env: 'production',
  port: 443,
  retries: 3,
} as const;
// { readonly env: 'production'; readonly port: 443; readonly retries: 3 }
```

Every property keeps its literal type and becomes readonly. So:

```ts
export const conn = connect(config.env, config.port);
```

No cast. `config.env` IS the type `'production'`, which fits `'production' | 'staging'` on its own merits. If someone edits the config to `'dev'`, `connect` *errors* — the type follows the data, instead of a stale cast hiding the change. That's the whole point: precision maintained by the compiler, not asserted by a human.

```ts
export const origin = [0, 0] as const; // readonly [0, 0]
export function drawAt(point: readonly [number, number]): string {
```

The tuple survives with length, order, even the exact zeros. Note `drawAt` takes `readonly [number, number]` — a readonly tuple can't be passed where a mutable one is demanded (the function might push!), so honest functions declare readonly inputs. This is exercise 08's habit paying off.

```ts
export const SUPPORTED_LOCALES = ['en', 'de', 'fr'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number]; // 'en' | 'de' | 'fr'
```

One source of truth. The value is genuinely constant (readonly came free), and the union type is *derived* from it — add `'it'` to the array and `Locale` grows automatically; no second list to forget. `greet` then uses `Locale` to make a lookup table safe: `greetings[locale]` can't miss.

The file closes with the fairness note — widening exists because for *mutable bindings* it's what you want (`let mode = 'dark'` should accept `'light'` later) — and four type tests: no `push('klingon')`, no `config.port = 80`, no `Locale = 'klingon'`, and plain `string` still doesn't sneak into literal slots.

Rule of thumb: **widening is right for variables; `as const` is right for values-as-facts** — configs, constant lists, coordinate tuples, lookup tables. The skill is noticing which one you're writing.

## 7. Words you learned (glossary)

- **Literal type**: a type containing exactly one value (`'production'`, `443`).
- **Widening**: the compiler replacing a literal with its general kind (`'production'` → `string`).
- **`as const`**: "keep this value exactly as written" — literals kept, everything readonly, tuples preserved.
- **Type assertion (`as T`)**: overruling the compiler — can lie; `as const` is the exception that can't.
- **Tuple**: fixed-length, ordered array type (`[number, number]`).
- **`readonly`**: unassignable/unmutable through this type.
- **`typeof` (type-level)**: gets the type of a value for use in type position.
- **`(typeof ARR)[number]`**: the union of an array's element types — derive unions from data.
- **Values-as-facts**: literal data meant as fixed truth (configs, constant lists), not as a variable.
- **`satisfies`**: checks a value against a shape while keeping its precise inferred type.
- **Single source of truth**: one place data lives; everything else derives from it.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change; undo afterward.

1. In `refactored/config.ts`, change the config's env to `'dev'`. Expect: ❌ error at `connect(config.env, ...)` — `'dev'` isn't in the union. Compare with the original: there the stale `as 'production'` cast would have *silenced* this exact mistake.
2. Add `'it'` to `SUPPORTED_LOCALES`. Expect: ❌ error in `greet` — the `greetings` table is missing an `it` entry. One edit to the data, and the compiler walks you to every place that must catch up. Add `it: 'ciao'` to fix.
3. Remove `as const` from `origin`. Expect: ❌ `drawAt(origin)` errors — `number[]` is not `readonly [number, number]`. You just watched widening eat the tuple in real time.
4. Try `const l: Locale = SUPPORTED_LOCALES[0];` Expect: ✅ compiles, and `l` is type `'en'` — indexing a const tuple by a known position gives the exact literal.
5. Write `const settings = { theme: 'dark' } as const satisfies { theme: 'dark' | 'light' };` then try changing the value to `'blue'`. Expect: ❌ error from `satisfies` — you get shape-checking AND kept precision, the composition the README mentions.
