# 📘 Learning Guide: The `any` Epidemic

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code reads an order (some items, a customer) out of a JSON string, adds up the total price, and builds a shipping label. Simple stuff.

The problem: the code uses a special TypeScript type called `any`, which tells the compiler "stop checking this." Because of that, two typos slip through — the total comes out as `NaN` (a broken number) and the label says `"Ada — undefined"` — and the compiler never says a word. This exercise teaches you why `any` is dangerous and what to use instead.

## 2. Concepts you need first

### What is TypeScript?

TypeScript is JavaScript plus **types**. You write almost-normal JavaScript, but you can describe what kind of value each variable holds. A separate program, the **compiler** (called `tsc`), reads your code *before it runs* and complains if the types don't line up. Then the types are erased and plain JavaScript runs.

### What is a type?

A type is a label describing what a value is: `number`, `string`, `boolean`, and so on. TypeScript uses these labels to catch mistakes before the program runs.

```ts
let age: number = 30;   // ✅ OK — 30 is a number
age = "thirty";         // ❌ Error: Type 'string' is not assignable to type 'number'
```

The `: number` part is a **type annotation** — you writing the label yourself.

### Compile time vs runtime

- **Compile time** = when the compiler checks your code (before running).
- **Runtime** = when the program actually runs.

TypeScript's whole job is to move bugs from runtime (where users see them) to compile time (where you see a red squiggle instead).

### The `any` type

`any` means "this could be anything — don't check it." It sounds harmless. It is not. Once a value is `any`, you can do *anything* to it and the compiler stays silent:

```ts
let mystery: any = "hello";
mystery.toFixed(2);       // ✅ Compiles... but CRASHES at runtime (strings have no toFixed)
mystery.nonsense.deeper;  // ✅ Compiles... crashes too
const n: number = mystery; // ✅ Compiles — any fits into ANY type, even wrongly
```

Worse, `any` **spreads**: if `mystery` is `any`, then `mystery.items` is `any`, and `mystery.items[0].price` is `any` too. One `any` at the top infects everything downstream.

### The `unknown` type

`unknown` also means "this could be anything" — but honestly. You **cannot use** an `unknown` value until you've checked what it is:

```ts
let data: unknown = JSON.parse('"hi"');
data.toUpperCase();          // ❌ Error: 'data' is of type 'unknown'
if (typeof data === "string") {
  data.toUpperCase();        // ✅ OK — you proved it's a string first
}
```

`any` = "trust me." `unknown` = "prove it." That's the whole lesson of this exercise.

### Interfaces (named object shapes)

An **interface** describes the shape of an object: which properties it has and their types.

```ts
interface Point {
  x: number;
  y: number;
}
const p: Point = { x: 1, y: 2 };  // ✅ OK
const q: Point = { x: 1, why: 2 }; // ❌ Error: 'why' does not exist in type 'Point'
```

Notice the typo protection: misspell a property and the compiler catches it. That's exactly what the original code gives up.

### `NaN` (a JavaScript refresher)

`NaN` means "Not a Number" — the result of broken math, like `10 * undefined`. Cruelly, `NaN`'s type IS `number`, so a variable "typed as number" can still be `NaN`. And any math involving `NaN` produces more `NaN` — it spreads through calculations exactly like `any` spreads through types.

### Narrowing and type guards (quick preview)

**Narrowing** = the compiler shrinking a type after you check it (like the `typeof` example above). A **type guard** is a function that does a check and tells the compiler about it, using a special return type `value is SomeType`. The refactored code uses one; exercise 11 covers them fully. For now, just know: it's a function that returns true/false, and when it returns true the compiler treats the value as the given type.

## 3. Walking through the original code

Open `original.ts`. First, the entry point:

```ts
function parseOrder(json: string): any {
  return JSON.parse(json);
}
```

`JSON.parse` turns a JSON string into a JavaScript value — but nobody knows its shape in advance, so the author wrote `: any` as the return type. That one word disarms the compiler for everything this function's result touches.

```ts
function orderTotal(order: any): number {
  return order.items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantety,
    0,
  );
}
```

`reduce` walks over the array adding up `price * quantity` per item... except the code says `quantety` — a typo. On a real order item, `item.quantety` doesn't exist, so it's `undefined`, so the math is `10 * undefined` = `NaN`. Because `item` is `any`, the compiler can't know `quantety` is wrong. Note the return type says `: number` — and `NaN` *is* a number — so the lie is complete.

```ts
function shippingLabel(order: any): string {
  return `${order.customer.name} — ${order.customer.adress}`;
}
```

Second typo: `adress` instead of `address`. Result: the string `"Ada — undefined"`. Again `any` means no complaint.

The bottom of the file parses a *correct* JSON order — the data has `quantity` and `address` spelled right. The bugs are in the code, not the data, and the compiler approved every line.

## 4. What's wrong with it (in beginner terms)

**Bug 1 — the NaN total.** You run the program. `total` is `NaN`. You go looking: the JSON is fine, the math looks fine... eventually you spot `quantety`. In plain JavaScript you'd expect this. But this is *TypeScript* with strict mode on — and it still didn't help, because `any` told it not to look. A customer would have been charged `NaN` dollars.

**Bug 2 — the undefined label.** The shipping label prints `"Ada — undefined"`. A real package might ship with that on it. Same cause: `adress` on an `any` value is just... `any`. No error.

**Bug 3 — the epidemic.** `total` is exported claiming `: number`. Other code doing `total * 1.08` for tax gets `NaN` too. One `any` at the boundary poisoned every calculation downstream. That's why the README calls it an epidemic.

**Bug 4 — false security.** The scariest part: the file *looks* typed. Annotations everywhere, strict mode on, zero errors. Someone reading it would trust it. `any` breaks the promise silently.

## 5. Try it yourself first!

Before reading the solution, try fixing `original.ts` (in a scratch copy):

1. **Vague hint:** The problem starts at one function. Which function tells the compiler to stop checking?
2. **Warmer:** Write down, on paper, the exact shape of the order object in the JSON string. What properties does an item have? A customer?
3. **Warmer still:** Turn that paper description into `interface` declarations — one for the item, one for the customer, one for the whole order.
4. **Specific:** Change `parseOrder`'s return type from `any` to your `Order` interface, and change every `order: any` parameter to `order: Order`. Watch the compiler instantly find both typos for you.
5. **Expert level:** `JSON.parse` could return *anything* — the string might not even be an order. Type the parsed value as `unknown` and write a check before returning it as `Order`.

## 6. Understanding the refactored solution

Open `refactored/orders.ts`.

**Three interfaces** name the shapes: `OrderItem` (`price`, `quantity`), `Customer` (`name`, `address`), `Order` (an `items` array and a `customer`). Now `quantety` and `adress` are *impossible to write* — the compiler rejects them.

**`unknown` at the boundary:**

```ts
const data: unknown = JSON.parse(json);
if (!isOrder(data)) {
  throw new Error('Not a valid order');
}
return data;
```

The parse result is typed `unknown` — the honest answer. You can't touch it until it's checked. `isOrder` is the type guard: it verifies at runtime that the value is an object with an `items` array and a `customer`. If the check passes, the compiler *narrows* `data` to `Order` inside that branch, so `return data` typechecks. If it fails, the code throws immediately — failing loudly at the edge instead of producing NaN deep inside.

**Inference does the middle.** Inside `orderTotal`, `sum` and `item` have no annotations — the compiler figures them out from `Order`. Fix the types at the edges and the interior comes for free (exercise 02 is all about this).

**The type tests at the bottom.** Lines marked `// @ts-expect-error` are assertions that the next line must *fail* to compile. The original's exact bugs (`quantety`, `adress`, using `unknown` unchecked) are pinned there forever — if someone ever weakens the types so those bugs compile again, the build breaks.

## 7. Words you learned (glossary)

- **Type** — a label describing what kind of value something is (`number`, `string`...).
- **Type annotation** — writing that label yourself, like `age: number`.
- **Compiler (`tsc`)** — the program that checks TypeScript types before your code runs.
- **Compile time / runtime** — before the program runs / while it runs.
- **Strict mode** — a compiler setting bundle that turns on TypeScript's toughest checks.
- **`any`** — "don't check this." Disables type checking and spreads to whatever it touches.
- **`unknown`** — "could be anything, so prove it before using it." The safe cousin of `any`.
- **Interface** — a named description of an object's shape.
- **Boundary** — where outside data (JSON, user input, network) enters your typed code.
- **Narrowing** — the compiler shrinking a type after a runtime check.
- **Type guard** — a function returning `value is T` that performs a check the compiler trusts.
- **`NaN`** — "Not a Number"; the result of broken math. Its type is still `number`!
- **`@ts-expect-error`** — a comment asserting "the next line MUST fail to compile."

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo each change before the next.

1. **In `refactored/orders.ts`**, change `quantity: number` in `OrderItem` to `quantety: number`. Expected: TWO errors — `orderTotal` now fails (`quantity` doesn't exist), and the `@ts-expect-error` above `testOrder.items[0]!.quantety` complains it's now "unused" because the line *does* compile. That's the type test catching a regression!
2. **In `refactored/orders.ts`**, inside `parseOrder`, delete the `if (!isOrder(data))` block. Expected: error on `return data` — "Type 'unknown' is not assignable to type 'Order'." The compiler refuses unchecked data.
3. **In `refactored/orders.ts`**, change `const data: unknown` to `const data: any`. Expected: no errors at all — which is exactly the danger. Then also delete the `isOrder` check: still no errors. Feel the chill, then undo.
4. **In `original.ts`**, change `parseOrder`'s return type from `any` to `unknown`. Expected: errors appear in `orderTotal` and `shippingLabel` calls... actually the errors appear where `order` is used — the compiler finally objects to touching unverified data.
5. **In `refactored/orders.ts`**, at the bottom, add `const x: number = testOrder.items[0]!.price;`. Expected: ✅ no error — correct property access is fine; only the typos are banned.
