# 🏋️ Practice: Literal Unions

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`) — `npm run typecheck` from the `typescript/` folder picks it up.

## Exercises

### ⭐ 1. Your first union + table (warm-up)

A UI has three sizes. Write `type Size = 'sm' | 'md' | 'lg'`, a table `PADDING: Record<Size, number>` (4, 8, 16), and `padding(size: Size): number` that reads from the table.

**Practices:** the union + `Record` duo on a minimal example.
**Hint:** the function body is one line — the table does the work.
**Check:** `padding('md')` compiles; `padding('xl')` must error with roughly `Argument of type '"xl"' is not assignable to parameter of type 'Size'`.

### ⭐⭐ 2. Design a new feature's types (core)

Add shipping speeds to the shop: `'standard'` (5 days), `'express'` (2), `'overnight'` (1). Write the `ShippingSpeed` union, a `DELIVERY_DAYS` table the compiler audits for completeness, and `deliveryEstimate(speed): string` returning `"arrives tomorrow"` for 1 day and `"arrives in N days"` otherwise.

**Practices:** union + complete table + logic reading the table — the full pattern, from scratch.
**Hint:** type the table `Record<ShippingSpeed, number>` *before* filling it in and let the errors guide you.
**Check:** `deliveryEstimate('two-day')` must error (not a `ShippingSpeed`); deleting the `overnight` row must error with roughly `Property 'overnight' is missing`.

### ⭐⭐ 3. Prove the elimination (core)

Import `StockStatus` from `./refactored/products.js` (or copy it). Write `nextStatus(status: StockStatus): StockStatus` describing a product's decline: `'in-stock' → 'low' → 'sold-out' → 'sold-out'`. Use two `if`s + a final return, and *prove* the compiler narrowed by elimination: before the last return, write `const proven: 'sold-out' = status;` — no cast.

**Practices:** narrowing a union by ruling members out.
**Hint:** each `if (status === ...) return ...;` removes one member from `status`'s type below it.
**Check:** the `proven` line must compile as-is; if you delete the second `if`, it must error with roughly `Type '"low" | "sold-out"' is not assignable to type '"sold-out"'`.

### ⭐⭐ 4. The boundary parser (core)

Runtime strings (URLs, inputs) arrive as `string`, and the compiler rightly refuses to pass them where `SortDirection` is expected. Write the converter: `parseDirection(raw: string): SortDirection | null` — returns the value when `raw` is exactly `'asc'` or `'desc'`, `null` otherwise. No `as` casts allowed. Then show a call site that handles the `null` before sorting.

**Practices:** converting the infinite outside (`string`) into the finite inside (union) with a checked funnel.
**Hint:** after `raw === 'asc' || raw === 'desc'`, the compiler has narrowed `raw` to the union all by itself.
**Check:** the body must compile with zero casts; passing `parseDirection(...)`'s result straight into `sortProducts` must error with roughly `'SortDirection | null' is not assignable`.

### ⭐⭐⭐ 5. Derive the union from the table (challenge)

Exercise 2 wrote the union first and let `Record` audit the table. Flip the dependency: write a labels table for article statuses first — `draft`, `published`, `archived`, each with a label string — using `as const`, then *derive* the type from it: `type ArticleStatus = keyof typeof STATUS_LABELS`. Write `articleLabel(status: ArticleStatus): string`. Now adding a table row automatically grows the union.

**Practices:** single source of truth — value first, type derived (previews exercises 18 and 31).
**Hint:** `typeof STATUS_LABELS` is the table's type; `keyof` extracts its keys as a literal union.
**Check:** `articleLabel('deleted')` must error with roughly `not assignable to parameter of type '"draft" | "published" | "archived"'`; add a fourth row and the same call should list four options in its error.

## Solutions

### Solution 1

```ts
type Size = 'sm' | 'md' | 'lg';

const PADDING: Record<Size, number> = { sm: 4, md: 8, lg: 16 };

function padding(size: Size): number {
  return PADDING[size];
}
```

WHY: `Size` shrinks the parameter from infinite strings to exactly three, so `'xl'` (and every typo) dies at the call site. The `Record` guarantees the lookup can't miss — `PADDING[size]` is a plain `number`, never `undefined` — which is why the function needs no fallback.

### Solution 2

```ts
type ShippingSpeed = 'standard' | 'express' | 'overnight';

const DELIVERY_DAYS: Record<ShippingSpeed, number> = {
  standard: 5,
  express: 2,
  overnight: 1,
};

function deliveryEstimate(speed: ShippingSpeed): string {
  const days = DELIVERY_DAYS[speed];
  return days === 1 ? 'arrives tomorrow' : `arrives in ${days} days`;
}
```

WHY: the union is the contract, the `Record` is the compiler-audited data, and the function is thin logic over both. A future `'two-day'` speed is one union edit away, after which the compiler *demands* a `DELIVERY_DAYS` row before the file compiles — the table can never silently lag behind the feature.

### Solution 3

```ts
import type { StockStatus } from './refactored/products.js';

function nextStatus(status: StockStatus): StockStatus {
  if (status === 'in-stock') return 'low';
  if (status === 'low') return 'sold-out';
  const proven: 'sold-out' = status; // narrowed by elimination — no cast
  return proven;
}
```

WHY: after the first `if` returns, `status` can't be `'in-stock'` anymore; after the second, it can't be `'low'` — so what remains is exactly `'sold-out'`, and the `proven` assignment compiles with no cast because the compiler did the subtraction itself. This only works because the union is finite; with `status: string` the "everything else" case would be infinite and unprovable.

### Solution 4

```ts
import { sortProducts, type SortDirection, type Product } from './refactored/products.js';

function parseDirection(raw: string): SortDirection | null {
  return raw === 'asc' || raw === 'desc' ? raw : null;
}

declare const products: Product[];

const dir = parseDirection('desc'); // imagine: new URL(...).searchParams.get('sort')
if (dir !== null) {
  sortProducts(products, dir); // dir narrowed to SortDirection
}
```

WHY: the comparison `raw === 'asc' || raw === 'desc'` *is* the runtime validation, and the compiler mirrors it: in the true branch `raw`'s type is narrowed to `'asc' | 'desc'`, so returning it needs no cast — the check and the type conversion are the same expression. The `| null` return type then forces every caller to decide what an invalid string means, instead of letting one slip through as a fake `SortDirection`.

### Solution 5

```ts
const STATUS_LABELS = {
  draft: 'Draft (only you can see it)',
  published: 'Published (everyone can see it)',
  archived: 'Archived (hidden)',
} as const;

type ArticleStatus = keyof typeof STATUS_LABELS; // 'draft' | 'published' | 'archived'

function articleLabel(status: ArticleStatus): string {
  return STATUS_LABELS[status];
}
```

WHY: here the *value* is the single source of truth and the type is computed from it — `typeof` reads the table's type, `keyof` extracts its keys as a literal union, and `as const` keeps the keys/values as exact literals instead of widening. Adding a `scheduled: '...'` row updates `ArticleStatus` with zero further edits — the opposite drift-protection of exercise 2, and your choice of direction depends on which side (type or data) you consider primary. Exercises 18 and 31 push this technique much further.
