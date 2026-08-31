# 🏋️ Practice: Null Safety

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`) — `npm run typecheck` from the `typescript/` folder picks it up.

## Exercises

### ⭐ 1. One guard, one narrow (warm-up)

Write `initial(name: string | null): string` — return `'?'` for `null`, otherwise the first character uppercased. Use a guard clause, no `!`, no `?.`.

**Practices:** the smallest possible narrowing: one check, one plain access.
**Hint:** after `if (name === null) return '?';` the type of `name` is just `string`.
**Check:** must compile; without the guard, `name.slice(0, 1)` must error with roughly `'name' is possibly 'null'`.

### ⭐⭐ 2. `Map.get` is a search too (core)

`Array.find` isn't the only honest API: `Map.get` returns `V | undefined`. Build `const PRICES = new Map<string, number>(...)` with a couple of SKUs and write `priceLabel(sku: string): string` — `"unknown sku: <sku>"` when absent, `"$<price with 2 decimals>"` when found.

**Practices:** guard-clause narrowing on a `Map` lookup.
**Hint:** store `PRICES.get(sku)` in a `const` first — narrowing tracks the local.
**Check:** must compile with no `!`; calling `.toFixed(2)` before the guard must error with roughly `'price' is possibly 'undefined'`.

### ⭐⭐ 3. Two nothings, three messages (core)

New domain, same distinction as accounts: `interface Subscription { plan: string; canceledAt: Date | null }` stored in a `Map<string, Subscription>`. Write `subscriptionStatus(username: string): string` with three different outputs: no subscription at all (map miss), active (`canceledAt` is `null` — deliberate emptiness means *not canceled*), and canceled (print the date). Note the twist: here `null` is the *happy* case!

**Practices:** keeping `undefined` (not found) and `null` (deliberately empty) semantically apart.
**Hint:** guard the map miss first; you can't ask about `canceledAt` until the subscription is proven to exist.
**Check:** must compile assertion-free; swapping the two guards must error with roughly `'sub' is possibly 'undefined'`.

### ⭐⭐ 4. The DOM's double null (core)

The DOM lib is honest too: `document.querySelector('h1')` returns an element **or null**, and even a found element's `.textContent` is `string | null`. Write `headerText(): string` that returns the heading's text or `'(no heading)'` — in one line, using the compact toolkit.

**Practices:** chaining `?.` and `??` through two independent nulls.
**Hint:** one `?.` handles the missing element; one `??` handles both remaining nulls at once.
**Check:** must compile; `h1.textContent` without `?.` must error with roughly `'h1' is possibly 'null'`.

### ⭐⭐⭐ 5. The helper that doesn't narrow (challenge)

Copy `Account` from the refactored file. Write a helper `hasLoginBoolean(account: Account): boolean` returning `account.lastLogin !== null`, then try to use it: `if (hasLoginBoolean(account)) { return account.lastLogin.toISOString(); }` — the compiler still complains! Explain why, then fix it by changing the helper's return type to a *type predicate*: `account is Account & { lastLogin: Date }`. Finish by using your fixed helper with `ACCOUNTS.filter(...)` to get an array you can map over assertion-free.

**Practices:** why narrowing doesn't cross function boundaries — and the type-guard escape hatch (exercise 11's opening move).
**Hint:** to the compiler, a `boolean` is just a `boolean`; the predicate return type is what carries the proof to the call site.
**Check:** the boolean version must error inside the `if` with roughly `'account.lastLogin' is possibly 'null'`; the predicate version must compile, and `filter(hasLogin)` must produce elements whose `.lastLogin.toISOString()` needs no check.

## Solutions

### Solution 1

```ts
function initial(name: string | null): string {
  if (name === null) return '?';
  return name.slice(0, 1).toUpperCase();
}
```

WHY: the guard clause makes the `null` case *exit*, so on every line after it the compiler has eliminated `null` from `name`'s type. The check and the type-safety are the same two lines of code — no assertion needed, and the `'?'` fallback is a real answer to a real case.

### Solution 2

```ts
const PRICES = new Map<string, number>([
  ['KB-01', 89],
  ['MS-01', 25],
]);

function priceLabel(sku: string): string {
  const price = PRICES.get(sku);
  if (price === undefined) {
    return `unknown sku: ${sku}`;
  }
  return `$${price.toFixed(2)}`;
}
```

WHY: `Map.get` is a search, and searches fail — the `V | undefined` return type is the same honesty as `Array.find`'s. Binding the result to a `const` lets control-flow narrowing track it: after the guard, `price` is plain `number`. A `!` here would compile too, and crash on the first unknown SKU.

### Solution 3

```ts
interface Subscription {
  plan: string;
  canceledAt: Date | null;
}

const SUBSCRIPTIONS = new Map<string, Subscription>([
  ['ada', { plan: 'pro', canceledAt: null }],
  ['grace', { plan: 'free', canceledAt: new Date('2026-01-05') }],
]);

function subscriptionStatus(username: string): string {
  const sub = SUBSCRIPTIONS.get(username);
  if (sub === undefined) {
    return `${username} has no subscription`;
  }
  if (sub.canceledAt === null) {
    return `${username} is active on ${sub.plan}`;
  }
  return `${username} canceled on ${sub.canceledAt.toISOString().slice(0, 10)}`;
}
```

WHY: the two nothings carry opposite meanings here — `undefined` is "never subscribed" while `null` is the *good* news ("not canceled") — proof that collapsing them with one `!` or one generic fallback loses real product information. Guard order matters: the map-miss must be eliminated before `canceledAt` is even askable, which the compiler enforces if you try it backwards.

### Solution 4

```ts
function headerText(): string {
  const h1 = document.querySelector('h1'); // element or null
  return h1?.textContent ?? '(no heading)';
}
```

WHY: there are two independent nulls — the element may not exist, and an existing element's `textContent` may still be `null` — and the one-liner handles both: `?.` short-circuits the missing element to `undefined`, then `??` catches *both* that `undefined` and a real element's `null` text in a single fallback. This is the compact style's sweet spot: every missing case maps to the same answer.

### Solution 5

```ts
import type { Account } from './refactored/accounts.js';

const ACCOUNTS: Account[] = [
  { username: 'ada', lastLogin: new Date('2026-07-01') },
  { username: 'grace', lastLogin: null },
];

// Doesn't narrow — the call site only learns "some boolean came back":
function hasLoginBoolean(account: Account): boolean {
  return account.lastLogin !== null;
}

// Narrows — the predicate return type carries the proof:
function hasLogin(account: Account): account is Account & { lastLogin: Date } {
  return account.lastLogin !== null;
}

function report(account: Account): string {
  if (hasLogin(account)) {
    return account.lastLogin.toISOString(); // narrowed: Date
  }
  return 'never';
}

const loggedIn = ACCOUNTS.filter(hasLogin);
const stamps: string[] = loggedIn.map((account) => account.lastLogin.toISOString());
```

WHY: narrowing is *control-flow* analysis — it follows checks the compiler can see in the current function, and a call to some function that merely returns `boolean` tells it nothing about *what* was checked. The predicate type `account is Account & { lastLogin: Date }` is the contract that transports the knowledge across the function boundary: when it returns true, the compiler upgrades the argument at the call site. `filter` has a special overload for predicates, which is why `loggedIn`'s element type has `lastLogin: Date` and the final `map` needs no checks at all. Exercise 11 is entirely about writing these responsibly.
