# 📘 Learning Guide: Enums vs Unions

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code tracks an order's status — pending, paid, shipped, delivered — and answers questions like "does this order need action?"

The type-level problem: the original uses TypeScript's `enum` feature for the statuses. Enums *look* like the perfect tool for "one of these named values," but they carry four genuine surprises: their default numeric values interact badly with JavaScript's truthiness rules (pending orders get treated as "no status"!), arbitrary numbers can sneak in, they generate runtime code when every other type feature erases, and they put meaningless numbers in your saved data. The lesson: the modern alternative — a plain `as const` object plus a derived union type — gives you everything enums promise with none of the surprises.

## 2. Concepts you need first

### What is an enum?

`enum` is a TypeScript keyword for declaring a set of named constants:

```ts
enum OrderStatus {
  Pending,    // automatically = 0
  Paid,       // = 1
  Shipped,    // = 2
}
const s: OrderStatus = OrderStatus.Paid;   // ✅ OK — refer to values by name
```

By default each member gets a **number**, counted up from 0. That auto-numbering is the root of several problems below.

### Falsy values (a JavaScript refresher)

JavaScript treats some values as "false-like" in conditions: `0`, `''`, `null`, `undefined`, `NaN`, and `false`. So:

```ts
const status = 0;
if (!status) {
  // this RUNS, because 0 is falsy
}
```

Connect the dots: `OrderStatus.Pending` is `0`, and `0` is falsy. Any code that writes `if (!status)` to mean "no status given" silently fires for *pending* orders too. A real bug pattern in enum-using codebases.

### Type erasure (types disappear at runtime)

Almost everything TypeScript adds — annotations, interfaces, unions — is **erased** when the code compiles to JavaScript. The types exist only at compile time; the running program never sees them. Enums are a famous exception: an `enum` compiles into an actual JavaScript object that exists at runtime. This matters for tools that run TypeScript by simply *stripping* the types (like Node's `--experimental-strip-types` flag): they can strip annotations, but an enum isn't an annotation — it's code — so such tools reject the file.

### `as const` (freeze the exact values into the types)

Normally, TypeScript "widens" object property types: `{ a: 'x' }` is typed as `{ a: string }`, because you might reassign `a`. Adding `as const` after an object literal tells the compiler: treat every value as its exact **literal type**, and make everything `readonly`:

```ts
const COLORS = { Sky: 'blue', Grass: 'green' } as const;
// type: { readonly Sky: 'blue'; readonly Grass: 'green' }
COLORS.Sky = 'red';   // ❌ Error: Cannot assign to 'Sky' because it is read-only
```

Without `as const`, `COLORS.Sky` would just be `string`. With it, it's exactly `'blue'`. (Exercise 31 goes deep on widening.)

### `typeof`, `keyof`, and indexing types (the derivation toolkit)

Three type-level operators combine to *derive* a union from a const object. Slowly:

```ts
const ORDER_STATUS = { Pending: 'pending', Paid: 'paid' } as const;

type Obj = typeof ORDER_STATUS;   // the object's TYPE:
                                  // { readonly Pending: 'pending'; readonly Paid: 'paid' }
type Keys = keyof Obj;            // the KEYS as a union: 'Pending' | 'Paid'
type Values = Obj[Keys];          // index the type by all keys -> the VALUES:
                                  // 'pending' | 'paid'
```

- `typeof X` (in type position) = "the type of the value X."
- `keyof T` = "a union of T's property names."
- `T[K]` = "the type of property K on T" — indexing with a *union* of keys gives the union of all the value types.

Put together on one line, `(typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]` reads as: "take the object's type, look up every key, union the results" — i.e., **the union of the object's values**: `'pending' | 'paid'`. Change the object, and this union updates automatically. One source of truth.

### Type guards (quick reminder from earlier exercises)

A function typed `value is T` that returns true/false; when it returns true, the compiler treats the value as `T`. The refactor uses one to check strings arriving from outside. Exercise 11 covers them fully.

## 3. Walking through the original code

Open `original.ts`. The enum:

```ts
export enum OrderStatus {
  Pending,    // = 0
  Paid,       // = 1
  Shipped,    // = 2
  Delivered,  // = 3
}
```

Four members, auto-numbered 0–3. Then surprise 1, live:

```ts
export function isActionRequired(status: OrderStatus): boolean {
  if (!status) {
    return true;   // "no status"? No — this branch runs for PENDING orders.
  }
  return status === OrderStatus.Paid;
}
```

`!status` is true when `status` is `0` — and `Pending` IS `0`. The function accidentally works here (pending orders do need action), which makes it worse: the pattern gets copied somewhere it doesn't work.

Surprise 2:

```ts
export const mystery: OrderStatus = 99 as OrderStatus; // compiles!
```

Numeric enums accept any number through an assertion. There's no range check — `99` is now wearing an `OrderStatus` badge.

Surprises 3 and 4 live in the comments: the enum compiles to a real runtime object (so type-stripping runtimes reject this file — the README invites you to try), and an API serializes this as `{"status": 2}` — unreadable in logs, and if anyone inserts a member in the middle of the enum, every stored number silently changes meaning. `describe(OrderStatus.Shipped)` returning `"status code 2"` shows the readability cost directly.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — pending orders vanish.** Runtime story: a dashboard shows "orders needing attention" and someone writes `if (!order.status) showWarning()`, meaning "warn if status is missing." Every *pending* order triggers the warning — or in the inverse pattern, every pending order is *skipped* by `if (order.status)` filters. The bug is invisible in code review because `!status` looks reasonable.

**Flaw 2 — `99` wears the uniform.** Since the enum is just numbers underneath, a cast lets any number in. Downstream code doing `status === OrderStatus.Paid` quietly returns false for `99` forever — no crash, no log, no meaning.

**Flaw 3 — the enum is runtime code.** Types are supposed to vanish at compile time. Enums don't — they emit a double-mapping object (`{0: 'Pending', Pending: 0, ...}`). Practical consequence: `node --experimental-strip-types` runs every other file in this track, but *rejects this one*. Your types have become a runtime dependency.

**Flaw 4 — the wire format is a migration hazard.** Your database stores `2` meaning Shipped. A teammate adds `Cancelled` after `Paid`, renumbering Shipped to 3. Every stored `2` now means Cancelled. Nothing errors — history just silently changes meaning. With string values, adding a status is just... adding a status.

## 5. Try it yourself first!

1. **Vague hint:** The root problem is that the statuses are secretly *numbers*. What if they were strings? Which surprises would evaporate?
2. **Warmer:** Try replacing the enum with a plain object: `const ORDER_STATUS = { Pending: 'pending', ... }`. What type does `ORDER_STATUS.Pending` have without `as const`? (Hover it: `string`.) Add `as const` and hover again.
3. **Warmer still:** You now need a type meaning "any one of those four strings." You could hand-write `'pending' | 'paid' | 'shipped' | 'delivered'` — but then you'd have TWO lists to keep in sync. Can you *derive* the union from the object?
4. **Specific:** The incantation is `type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]`. Build it up in three steps like Section 2 did, hovering each intermediate type.
5. **Stretch:** Write `isOrderStatus(value: unknown)` that returns whether a runtime value is one of the statuses — using `Object.values(ORDER_STATUS)` so even the *checker* derives from the one source of truth.

## 6. Understanding the refactored solution

Open `refactored/status.ts`.

**The const object:**

```ts
export const ORDER_STATUS = {
  Pending: 'pending',
  Paid: 'paid',
  Shipped: 'shipped',
  Delivered: 'delivered',
} as const;
```

A plain object — erases to plain JavaScript, runs anywhere. `as const` makes each value a literal type (`'pending'`, not `string`), which is what makes the next line possible.

**The derived union:**

```ts
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
// = 'pending' | 'paid' | 'shipped' | 'delivered'
```

Read right-to-left: keys of the object → indexed into the object's type → the union of its values. The union *derives* from the object, so they cannot drift: add a fifth entry to the object and the union grows automatically.

**Every surprise dissolves:**

- Strings aren't `0`, so no falsy trap — `isActionRequired` compares explicitly: `status === ORDER_STATUS.Pending || status === ORDER_STATUS.Paid`.
- `99` can't impersonate a string union (type-tested at the bottom); neither can `'refunded'` or the typo `'shiped'`.
- No runtime emission beyond a plain object — strip-types runs this file happily.
- The wire format is `{"status": "shipped"}` — readable logs, reorder-safe, no renumbering ever.

**Both calling styles survive:** `ORDER_STATUS.Shipped` when you want the named-constant feel and autocomplete; the raw literal `'shipped'` where brevity wins. Both are the same type.

**The boundary guard:** `isOrderStatus` checks unknown runtime values against `Object.values(ORDER_STATUS)` — even the validation logic derives from the single source of truth.

## 7. Words you learned (glossary)

- **`enum`** — TypeScript's named-constant feature; auto-numbers members and emits runtime code.
- **Falsy** — values treated as false in conditions: `0`, `''`, `null`, `undefined`, `NaN`, `false`.
- **Type erasure** — TypeScript types vanishing at compile time; enums are the exception.
- **Type stripping** — running TypeScript by deleting the type annotations (e.g. Node's `--experimental-strip-types`); breaks on enums.
- **`as const`** — freeze a literal's types to exact values and mark them `readonly`.
- **Literal type** — a type of exactly one value, like `'pending'`.
- **Widening** — the compiler generalizing `'pending'` to `string`; `as const` prevents it.
- **`typeof` (type position)** — the type of a value: `typeof ORDER_STATUS`.
- **`keyof`** — union of a type's property names.
- **Indexed access (`T[K]`)** — the type of property `K` on `T`; with a union key, the union of value types.
- **Derived type** — a type computed from a value, so it can't drift from it.
- **Wire format** — how data looks when serialized (e.g. in JSON over a network).
- **Single source of truth** — one definition from which everything else is derived.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/status.ts`**, add `Cancelled: 'cancelled',` to the `ORDER_STATUS` object. Expected: ✅ no errors — and hover `OrderStatus` to see the union grew to five members automatically. No second list to update. (Compare: in the original enum, where you insert `Cancelled` determines whether stored numbers change meaning.)
2. **In `refactored/status.ts`**, remove `as const` from the object. Expected: ❌ errors — hover `OrderStatus` first: it collapsed to plain `string` (the values widened), so the `@ts-expect-error` tests at the bottom now "unexpectedly compile" (`99` still fails, but `'refunded'` and `'shiped'` become legal strings). `as const` is the keystone.
3. **In `refactored/status.ts`**, add at the bottom: `export const s: OrderStatus = 'paid';`. Expected: ✅ no error — raw literals work when they match exactly.
4. **In `refactored/status.ts`**, add: `const fromApi: string = 'shipped'; export const t: OrderStatus = fromApi;`. Expected: ❌ error — a plain `string` can't be assigned to the union, even if its runtime value happens to match. That's what `isOrderStatus` is for: `if (isOrderStatus(fromApi)) { ... }` narrows it legally.
5. **Two-file experiment:** run the original through a type-stripping runtime if you have Node 22+ installed: `node --experimental-strip-types typescript/07-enums-vs-unions/original.ts` — expected: it REFUSES (enum needs real compilation). Then try the refactored file — expected: runs fine. Types that erase are types that travel.
