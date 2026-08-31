# 🏋️ Practice: The `any` Epidemic

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`) — `npm run typecheck` from the `typescript/` folder picks it up automatically. Don't edit `original.ts` or the refactored file; copy anything you need.

## Exercises

### ⭐ 1. Name the shape (warm-up)

A library app passes around book objects like `{ title: 'On Computable Numbers', author: 'Turing', pages: 36 }`. Write an `interface Book` for that shape, then a function `describeBook(book: Book): string` that returns `"<title> by <author>, <pages> pages"`.

**Practices:** turning an object you can see into a named interface.
**Hint:** three properties, two `string`, one `number`.
**Check:** `describeBook({ title: 'X', author: 'Y', pagse: 12 })` must error with roughly `'pagse' does not exist in type 'Book'` — the typo class is dead.

### ⭐⭐ 2. A second boundary (core)

The refactored file guards orders at the JSON boundary. Do the same for payments: write `interface Payment` (`amount: number`, `currency: string`), a type guard `isPayment(value: unknown): value is Payment`, and `parsePayment(json: string): Payment` that parses, checks, and throws on bad data — mirroring `parseOrder`'s shape but built by you, from scratch.

**Practices:** the `unknown` → guard → narrow pattern at a data boundary.
**Hint:** inside the guard, cast to `Record<string, unknown>` and `typeof`-check each field.
**Check:** temporarily delete the `if (!isPayment(data))` block — `return data` must error with roughly `Type 'unknown' is not assignable to type 'Payment'`. Restore it and everything compiles.

### ⭐⭐ 3. Use `unknown` without a custom guard (core)

Write `safeLength(value: unknown): number`: if `value` is a string, return its length; if it's an array, return its length; otherwise return 0. No `any`, no `as`, no interface needed — just built-in checks.

**Practices:** narrowing `unknown` with `typeof` and `Array.isArray`.
**Hint:** `typeof value === 'string'` and `Array.isArray(value)` both narrow.
**Check:** this must compile with zero casts; writing `return value.length` before any check must error with roughly `'value' is of type 'unknown'`.

### ⭐⭐ 4. Design a small output type (core)

Import `Order` from `./refactored/orders.js` (yes, `.js` — that's how this repo's TS imports name TS files; or just copy the interfaces). Design `interface OrderSummary` with `itemCount` (total units across all items), `total` (money), and `label` (the shipping label text), then write `summarize(order: Order): OrderSummary`.

**Practices:** typing a function's *output* shape, not just its input.
**Hint:** two `reduce` calls — and notice neither callback needs annotations.
**Check:** must compile cleanly; returning an object missing `label` must error with roughly `Property 'label' is missing`.

### ⭐⭐⭐ 5. The guard that lies a little (challenge)

The shipped `isOrder` only checks that `items` is an array and `customer` is an object — so the JSON `'{"items":[{"price":"10","quantity":3}],"customer":{"name":"Ada","address":"12 Row"}}'` (price is a **string**!) sails through and NaN is back. Write `isOrderItem`, `isCustomer`, and a stricter `isOrder` that validates every item and both customer fields, so that JSON is rejected at runtime.

**Practices:** deep runtime validation behind a type guard — the guard must *earn* its `value is Order`.
**Hint:** `Array.isArray(c.items) && c.items.every(isOrderItem) && isCustomer(c.customer)`.
**Check:** everything must compile; as a runtime check, `node --experimental-strip-types` a snippet calling your `parseOrder` with the sneaky JSON — it must throw instead of returning.

## Solutions

### Solution 1

```ts
interface Book {
  title: string;
  author: string;
  pages: number;
}

function describeBook(book: Book): string {
  return `${book.title} by ${book.author}, ${book.pages} pages`;
}

// @ts-expect-error — 'pagse' does not exist on Book
describeBook({ title: 'X', author: 'Y', pagse: 12 });
```

WHY: the interface is the single spelling authority. With `book: any` the typo call would compile and print `undefined pages`; with `Book`, the object literal is checked property-by-property at the call site, before anything runs.

### Solution 2

```ts
interface Payment {
  amount: number;
  currency: string;
}

function isPayment(value: unknown): value is Payment {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.amount === 'number' &&
    typeof candidate.currency === 'string'
  );
}

function parsePayment(json: string): Payment {
  const data: unknown = JSON.parse(json);
  if (!isPayment(data)) {
    throw new Error('Not a valid payment');
  }
  return data; // narrowed to Payment by the guard
}
```

WHY: `unknown` makes the unchecked `return data` a compile error, so the guard isn't optional politeness — the compiler *requires* proof before the value leaves the boundary. The one `as Record<string, unknown>` inside the guard is safe because we just proved `value` is a non-null object, and `unknown`-valued properties still force `typeof` checks.

### Solution 3

```ts
function safeLength(value: unknown): number {
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) return value.length;
  return 0;
}
```

WHY: each check narrows `unknown` to a type that genuinely has `.length` — `string` first, then `unknown[]`. No interface or cast is needed because the built-in checks are themselves type guards the compiler understands. With `value: any` this function would "work" too, but so would `value.lenght`, silently returning `undefined`.

### Solution 4

```ts
import type { Order } from './refactored/orders.js';

interface OrderSummary {
  itemCount: number;
  total: number;
  label: string;
}

function summarize(order: Order): OrderSummary {
  return {
    itemCount: order.items.reduce((n, item) => n + item.quantity, 0),
    total: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    label: `${order.customer.name} — ${order.customer.address}`,
  };
}
```

WHY: the return annotation `OrderSummary` makes the object literal fully checked — omit `label` or misspell `itemCount` and the error lands at this function, not at some distant consumer. Note `n`, `sum`, and `item` need no annotations: they flow from `Order`, exercise 02's lesson in action.

### Solution 5

```ts
import type { Order, OrderItem, Customer } from './refactored/orders.js';

function isOrderItem(value: unknown): value is OrderItem {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return typeof c.price === 'number' && typeof c.quantity === 'number';
}

function isCustomer(value: unknown): value is Customer {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return typeof c.name === 'string' && typeof c.address === 'string';
}

function isOrder(value: unknown): value is Order {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    Array.isArray(c.items) &&
    c.items.every(isOrderItem) &&
    isCustomer(c.customer)
  );
}
```

WHY: a type guard is a *promise* — `value is Order` tells the compiler to trust whatever the body decided, so a shallow body is a small lie with `any`-like consequences (a string `price` reaching `orderTotal` is the NaN bug again, past the guard). Composing one guard per interface keeps each check honest and reusable, and `every(isOrderItem)` narrows the whole array element-by-element. Exercise 13 turns this pattern into a full validator.
