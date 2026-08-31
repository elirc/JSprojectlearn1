# 🏋️ Practice: Expense Tracker with Charts

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

All exercises target the pure data layer: create a scratch file (e.g. `practice.test.js`) in `refactored/`, import from `./derive.js`, and run `node --test 63-expense-tracker/refactored/practice.test.js`.

## Exercises

### ⭐ 1. Pin down `parseAmount`'s edges (warm-up)
The test file covers the obvious cases. Predict, then test, these five: `'$0.99'`, `'007'`, `'1.2.3'`, `'.50'`, `'0.00'`. Expected: `99`, `700`, `null`, `null`, `null`. Two of the five are accepted — make sure you can say from the regex *why* each of the other three is rejected.
What it practices: reading a validation regex closely enough to predict its verdicts.
Hint: the pattern demands at least one digit *before* any decimal point, at most 2 digits after, and the final `cents > 0` check catches a well-formed zero.

### ⭐⭐ 2. `averageCents` (core)
Write a new derivation `averageCents(expenses)`: the mean expense, as an *integer* number of cents (`Math.round`), with `0` for an empty ledger (no dividing by zero). Expected: two expenses of 100 and 250 → `175`; three expenses of 100, 101, 101 → `101` (302 ÷ 3 rounds); `[]` → `0`.
What it practices: derived data — computed from the same rows as every other number, in integer cents.
Hint: reuse `deriveTotals` for the sum instead of looping again.

### ⭐⭐ 3. Thousands separators, strictly (core)
`parseAmount('1,250.75')` is `null` today. Write `parseAmountWithCommas(text)` that accepts *correctly grouped* commas and still rejects garbage — the trap: naively stripping commas would turn the typo `'12,50'` into 1250 dollars! Expected: `'1,250.75'` → `125075`, `'$12,000'` → `1200000`, plain `'12.50'` still → `1250`, but `'12,50'` → `null` and `'1,23,456'` → `null`.
What it practices: strict validation at the input boundary — reject, don't guess.
Hint: first *validate* the comma shape with `/^\$?\d{1,3}(,\d{3})+(\.\d{1,2})?$/`, and only then strip commas and delegate to `parseAmount`; anything else also goes to `parseAmount` untouched.

### ⭐⭐ 4. `overBudget` (core)
Write `overBudget(expenses, budgets)` where `budgets` is like `{ food: 5000, fun: 500 }` (cents). Return one row `{ category, budgetCents, cents, overCents }` per category that *exceeds* its budget, sorted by `overCents` descending; categories at or under budget, or with no spending, are omitted. Expected: with food=6000/transport=1000/fun=900 spent against budgets food=5000, transport=2000, fun=500 → two rows: food over by 1000, then fun over by 400. `overBudget([], {food: 1})` → `[]`.
What it practices: building new features as derivations over `deriveTotals` — one source of numbers, so reports can't disagree.
Hint: `Object.entries(budgets)` then filter/map/sort; `byCategory[cat] ?? 0` handles never-spent categories.

### ⭐⭐⭐ 5. Migrate version-0 data (challenge)
Before `SCHEMA_VERSION` existed, the original stored a *bare array* of records shaped `{ description, amount: 12.5, category }` — floats! Write `loadStateAny(rawText)` that detects that shape (`Array.isArray` after parsing) and migrates it: valid records become `{ description, cents, category }` with `cents = Math.round(amount * 100)`; invalid ones are dropped; everything else (null, corrupt JSON, v1 objects) behaves exactly like `loadState`. Expected: a v0 array containing amounts `12.5`, `0.30000000000000004`, and the string `'NaN?'` loads as two records with `1250` and `30` cents — the float rot is *healed* by the migration.
What it practices: "stored data is input" taken seriously — your past self's schema is a foreign format you must translate, not trust.
Hint: validate each v0 record with the same strictness `loadState` applies to v1 records (`typeof` checks, finite, `> 0`); `Math.round` is what turns `30.000000000000004` back into `30`.

### ⭐⭐⭐ 6. `chartDataTop` — an "other" bucket (challenge)
Real charts can't show 40 slivers. Write `chartDataTop(expenses, n)`: the top `n` rows from `chartData`, plus one final `{ category: 'other', cents, fraction }` row aggregating everything else. Invariants to assert: with categories rent=500/food=300/fun=150/misc=50 and `n = 2` you get exactly `['rent', 'food', 'other']`, other has `cents === 200` and `fraction === 0.2`, and the rows' cents still sum to 1000 (nothing lost). With `n` larger than the category count, the result equals plain `chartData(expenses)` — no empty "other" row.
What it practices: keeping chart code pure geometry by doing ALL the thinking in the data layer.
Hint: `chartData` already sorts largest-first — `slice(0, n)` and `slice(n)`; sum the tail's cents and compute its fraction from `deriveTotals`' total.

## Solutions

### 1. Edge tests
```js
test('parseAmount edges', () => {
  assert.equal(parseAmount('$0.99'), 99);   // $ optional, 0 dollars fine
  assert.equal(parseAmount('007'), 700);    // leading zeros are still digits
  assert.equal(parseAmount('1.2.3'), null); // second "." can't match
  assert.equal(parseAmount('.50'), null);   // \d+ requires a leading digit
  assert.equal(parseAmount('0.00'), null);  // parses to 0, then cents > 0 rejects
});
```
WHY: A validator's real spec is its edge behavior. `^\$?(\d+)(?:\.(\d{1,2}))?$` anchors both ends, demands digits before the point, and allows at most two after — and the final `cents > 0` is a *semantic* rule stacked on the *syntactic* one. Tests like these make the boundary contract explicit instead of folklore.

### 2. `averageCents`
```js
export function averageCents(expenses) {
  if (expenses.length === 0) return 0;
  return Math.round(deriveTotals(expenses).totalCents / expenses.length);
}
```
WHY: It reuses `deriveTotals` so the average is computed from the exact same sum as the displayed total — they cannot disagree, the project's core discipline. `Math.round` keeps the money-is-integer-cents rule even when division produces a fraction, and the empty-ledger guard mirrors `chartData`'s division-by-zero care.

### 3. `parseAmountWithCommas`
```js
export function parseAmountWithCommas(text) {
  const t = String(text).trim();
  if (/^\$?\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(t)) {
    return parseAmount(t.replace(/,/g, ''));
  }
  return parseAmount(t); // no valid comma-shape: the strict parser decides
}
```
WHY: Validate-then-normalize, in that order. `'12,50'` fails the grouping regex (`,\d{3}` needs three digits), falls through to strict `parseAmount`, and is rejected — whereas strip-first would have invented `$1,250.00` out of a typo. Layering a lenient reader *on top of* the strict one keeps a single source of truth for what a valid amount is.

### 4. `overBudget`
```js
export function overBudget(expenses, budgets) {
  const { byCategory } = deriveTotals(expenses);
  return Object.entries(budgets)
    .filter(([category, budgetCents]) => (byCategory[category] ?? 0) > budgetCents)
    .map(([category, budgetCents]) => ({
      category,
      budgetCents,
      cents: byCategory[category],
      overCents: byCategory[category] - budgetCents,
    }))
    .sort((a, b) => b.overCents - a.overCents);
}
```
WHY: Like `chartData`, this feature is a pure derivation sitting on `deriveTotals` — the alert and the on-screen totals draw from one loop over one dataset, so they can never disagree (the original's category-vs-total bug, kept impossible). Integer-cent subtraction means `overCents` is exact, never `399.99999…`.

### 5. `loadStateAny`
```js
export function loadStateAny(rawText) {
  if (!rawText) return { version: SCHEMA_VERSION, expenses: [] };
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { version: SCHEMA_VERSION, expenses: [] };
  }
  if (Array.isArray(parsed)) { // version-0: a bare array of float `amount`s
    const migrated = parsed
      .filter((e) =>
        typeof e?.description === 'string' &&
        typeof e?.amount === 'number' && Number.isFinite(e.amount) && e.amount > 0 &&
        typeof e?.category === 'string')
      .map((e) => ({
        description: e.description,
        cents: Math.round(e.amount * 100),
        category: e.category,
      }));
    return { version: SCHEMA_VERSION, expenses: migrated };
  }
  return loadState(rawText); // v1+ goes through the existing validator
}
```
WHY: The old format is recognized by *shape* (a bare array — exactly what the original persisted), validated with the same per-record strictness as v1, and translated into today's schema; unknown or corrupt input still degrades to fresh state instead of crashing. The satisfying detail: `Math.round(0.30000000000000004 * 100)` → `30` — migration is where years of float rot get healed for good. (Verified by running it under Node.)

### 6. `chartDataTop`
```js
export function chartDataTop(expenses, n) {
  const rows = chartData(expenses);
  if (rows.length <= n) return rows;
  const top = rows.slice(0, n);
  const restCents = rows.slice(n).reduce((sum, r) => sum + r.cents, 0);
  const { totalCents } = deriveTotals(expenses);
  return [
    ...top,
    { category: 'other', cents: restCents, fraction: totalCents === 0 ? 0 : restCents / totalCents },
  ];
}
```
WHY: The "other" row is *data*, not a drawing trick — `drawChart` stays pure geometry and needs zero changes to render it, which is the decide/do split reaching the pixels. Summing the tail in integer cents keeps the nothing-lost invariant exact (`500+300+200 = 1000`), and the `rows.length <= n` guard prevents a nonsense empty bucket. (Verified by running it under Node, including `fraction === 0.2` exactly.)
