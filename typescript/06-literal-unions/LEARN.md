# 📘 Learning Guide: Literal Unions

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code sorts a product list by price (ascending or descending) and shows a stock badge for each product ("✅ in stock", "⚠️ low stock", "❌ sold out").

The type-level problem: both functions take a `string` parameter to pick the mode — but `string` means "any text at all," while the functions only understand two or three specific words. Call `sortProducts(products, 'ascending')` and nothing errors; the products just silently sort the *wrong way*. The lesson: when a parameter has a known, short list of meaningful values, write those exact values into the type.

## 2. Concepts you need first

### Literal types (a type of exactly one value)

Most types describe *many* values: `string` covers every possible piece of text. A **literal type** describes exactly ONE value:

```ts
let dir: 'asc' = 'asc';   // the type is the string 'asc' itself
dir = 'asc';              // ✅ OK — the only value allowed
dir = 'desc';             // ❌ Error: Type '"desc"' is not assignable to type '"asc"'
```

That looks useless alone — a variable that can hold one thing. The power comes from combining them.

### Union types (`|`) of literals

A **union** (the `|` symbol, meaning "or") of several literal types gives you "exactly one of these values":

```ts
type SortDirection = 'asc' | 'desc';
let dir: SortDirection = 'asc';    // ✅ OK
dir = 'desc';                      // ✅ OK
dir = 'ascending';                 // ❌ Error: not assignable to 'asc' | 'desc'
dir = 'ASC';                       // ❌ Error — case matters, 'ASC' ≠ 'asc'
```

This is a **literal union**. It's the type-level version of a dropdown menu instead of a free-text box.

### `type` aliases (naming any type)

The `type` keyword gives a name to any type — here, to a union:

```ts
type StockStatus = 'in-stock' | 'low' | 'sold-out';
```

Now every function can refer to `StockStatus` instead of repeating the list (the exercise-03 lesson: name your shared types).

### How literal arguments check against unions

When you call a function whose parameter is a literal union, the compiler checks your argument *at compile time*:

```ts
function sort(dir: 'asc' | 'desc') {}
sort('asc');    // ✅ OK
sort('down');   // ❌ Error: Argument of type '"down"' is not assignable...
```

Every typo becomes a red squiggle instead of a silent wrong answer. And in an editor, pressing quote inside the call offers autocomplete of exactly the legal values.

### `Record<K, V>` (a typed lookup table)

`Record` is a built-in helper type: `Record<Keys, ValueType>` describes an object whose keys are exactly `Keys` and whose values are `ValueType`:

```ts
type Fruit = 'apple' | 'banana';
const emoji: Record<Fruit, string> = {
  apple: '🍎',
  banana: '🍌',
};                                   // ✅ OK
const bad: Record<Fruit, string> = {
  apple: '🍎',
};                                   // ❌ Error: Property 'banana' is missing
```

The killer feature: the compiler requires the table to be COMPLETE. Add `'cherry'` to the `Fruit` union and every `Record<Fruit, ...>` table refuses to compile until it has a cherry row. Tables and unions can never drift apart.

### Narrowing literal unions (a taste)

Inside a function, comparing a union against one literal shrinks the type:

```ts
function go(dir: 'asc' | 'desc') {
  if (dir === 'asc') { /* dir is 'asc' here */ }
  else { /* dir is 'desc' here — PROVEN, by elimination */ }
}
```

The `else` branch isn't "everything that isn't asc" (infinite possibilities) — it's exactly `'desc'`. The logic gets simpler because the input space got smaller.

## 3. Walking through the original code

Open `original.ts`. The sorter:

```ts
export function sortProducts(products: Product[], direction: string): Product[] {
  return [...products].sort((a, b) =>
    direction === 'asc' ? a.price - b.price : b.price - a.price,
  );
}
```

The parameter is `string` — any text. The implementation checks for exactly `'asc'`; *everything else* falls into the else and sorts descending. So `'ASC'`, `'ascending'`, `'up'`, and any typo all silently mean descending. (Side note: `[...products]` copies the array before sorting — good manners covered in exercise 08.)

The badge function:

```ts
export function badge(status: string): string {
  if (status === 'in-stock') return '✅ in stock';
  if (status === 'low') return '⚠️ low stock';
  if (status === 'sold-out') return '❌ sold out';
  return '❓'; // the "shouldn't happen" bucket — where typos retire
}
```

Same disease with a visible symptom: that final `return '❓'`. It exists *because* the type allows values the function doesn't understand. A "shouldn't happen" bucket in your code is usually a sign the type let "shouldn't happen" happen.

Then the damning demo:

```ts
export const a = sortProducts(products, 'asc');        // ok
export const b = sortProducts(products, 'ascending');  // silently DESC
export const c = sortProducts(products, 'ASC');        // silently DESC
export const d = badge('instock');                     // '❓' forever
```

Four calls compile; three are wrong; zero errors anywhere, ever.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — silent wrong answers.** Runtime story: a teammate wires up a "Price: low to high" button and writes `sortProducts(items, 'ascending')` — a perfectly reasonable guess at the magic word. The list sorts high-to-low. QA files a bug: "sort button is backwards." Someone spends an hour in the sort logic, which is *correct*. The bug is the string, and nothing ever pointed at it. Typos in mode strings don't crash — they misbehave, which is worse, because there's no stack trace pointing anywhere.

**Flaw 2 — the gap between the type and the truth.** `string` admits infinitely many values; the function means exactly two. Every value in that gap — the infinite typo space — is a compiled-and-wrong call waiting to happen.

**Flaw 3 — the `'❓'` bucket.** `badge('instock')` (missing hyphen) returns `'❓'` forever. A user sees a question-mark badge on a product in production. Nobody wrote a bug — someone wrote a *string*, and the type system, which exists to check exactly this, was told `string` and shrugged.

**Flaw 4 — no tooling help.** With `string`, your editor can't autocomplete the legal values, and "find all references" can't show you every place a sort direction is chosen. Literal unions give you both for free.

## 5. Try it yourself first!

1. **Vague hint:** Both functions have a parameter whose type is much bigger than what the function actually understands. How would you shrink the type to fit?
2. **Warmer:** List the exact strings each function truly accepts. Two for sorting; three for badges. Those lists ARE the types you need.
3. **Warmer still:** The syntax for "exactly one of these strings" is `'a' | 'b' | 'c'`. Give each list a name with `type Name = ...`.
4. **Specific:** Change `direction: string` to your new sort type and `status: string` to your status type. The three bad demo calls at the bottom should immediately turn into compile errors — that's success, not failure. Fix them (or delete them).
5. **Stretch:** Rewrite `badge` as a lookup table typed `Record<StockStatus, string>` instead of an if-chain. Then delete the `'❓'` line — and notice the compiler is fine with that, because no unknown status can arrive anymore.

## 6. Understanding the refactored solution

Open `refactored/products.ts`.

**The unions:**

```ts
export type SortDirection = 'asc' | 'desc';
export type StockStatus = 'in-stock' | 'low' | 'sold-out';
```

Two named types stating each contract exactly. `sortProducts` now takes `direction: SortDirection` — the four bad call styles (`'ascending'`, `'ASC'`, `'instock'`, and any future typo) are compile errors, pinned forever by the type tests at the bottom.

**Inside the function, the else is proven:** with only `'asc' | 'desc'` able to arrive, the ternary's else branch is *provably* `'desc'`. No third case exists to worry about.

**The badge table:**

```ts
const BADGES: Record<StockStatus, string> = {
  'in-stock': '✅ in stock',
  low: '⚠️ low stock',
  'sold-out': '❌ sold out',
};
export function badge(status: StockStatus): string {
  return BADGES[status];
}
```

The if-chain became data — a table the compiler audits. `Record<StockStatus, string>` means: every status MUST have a badge, or the file doesn't compile. Add `'preorder'` to the union and the compiler walks you to this table. And the `'❓'` bucket is deleted — an input that can't exist needs no handler.

**The boundary honesty note:** what if the direction comes from a URL like `?sort=asc` at runtime? A URL gives you `string`, and you can't pass `string` where `SortDirection` is expected. That's correct behavior — you *validate* at the boundary (check the string, convert it, reject bad ones), which is exercise 13's topic. Literal unions type the inside; validation converts the outside.

## 7. Words you learned (glossary)

- **Literal type** — a type containing exactly one value, like `'asc'`.
- **Union type (`|`)** — "one of these types."
- **Literal union** — a union of literal types: `'asc' | 'desc'`; a type-level allowlist.
- **`type` alias** — naming a type: `type SortDirection = 'asc' | 'desc'`.
- **`Record<K, V>`** — an object type with exactly the keys `K`, each holding a `V`; a complete, compiler-audited table.
- **Narrowing by elimination** — after ruling out other union members, the compiler knows which one remains.
- **"Shouldn't happen" bucket** — a fallback branch handling values the type wrongly permits; a code smell.
- **Boundary validation** — checking runtime strings (user input, URLs) before treating them as a narrow type.
- **Ternary (`cond ? a : b`)** — inline if/else expression.
- **`@ts-expect-error`** — a comment asserting the next line must fail to compile.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/products.ts`**, add `'preorder'` to the `StockStatus` union. Expected: ❌ error at the `BADGES` table — "Property 'preorder' is missing in type..." The table demands a row for every status. Add `preorder: '🕐 preorder',` and it's ✅ clean again. (Also check: did the `incomplete` type test at the bottom stay happy? It should — it's still missing fields.)
2. **In `refactored/products.ts`**, add at the bottom: `sortProducts(products, 'desc');`. Expected: ✅ no error — legal values just work.
3. **In `refactored/products.ts`**, add: `const s: string = 'maybe-asc'; sortProducts(products, s);`. Expected: ❌ error — "Argument of type 'string' is not assignable to parameter of type 'SortDirection'." Even a string that MIGHT be valid is rejected — the compiler can't prove it. This is the boundary problem exercise 13 solves.
4. **In `refactored/products.ts`**, change `badge`'s body to `return BADGES[status] ?? '❓';`. Expected: ✅ compiles — but now ask yourself: can that `'❓'` ever be returned? (No — every `StockStatus` has a table row, guaranteed.) Dead code the type system made unnecessary. Remove it again.
5. **In `refactored/products.ts`**, in the `BADGES` table, misspell a key: change `low:` to `lo:`. Expected: ❌ TWO errors — `'lo'` isn't a valid key, AND `low` is now missing. The table is checked in both directions.
