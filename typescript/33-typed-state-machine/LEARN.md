# 📘 Learning Guide: Typed State Machine

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Imagine an online shop order. It moves through stages: `pending` → `paid` → `shipped` → `delivered`. Some moves are legal (you can pay a pending order) and some are not (you cannot cancel an order that already shipped). A **state machine** is just this idea written down: a fixed list of states, plus rules saying which *event* moves you from which state to which other state.

The original code stores those rules in a table (good idea!) but types everything as `string`. So the compiler happily accepts nonsense: typo'd states, made-up events, forbidden moves. Nothing crashes — the code just silently does nothing, which is worse, because you can't tell "correctly rejected" apart from "you made a typo."

The refactor keeps the same table but derives *types* from it, so that illegal moves refuse to even compile.

## 2. Concepts you need first

### State machines and transition tables
A **state machine** has: states (nouns, like `paid`), events (verbs, like `ship`), and transitions (rules: "in state X, event Y takes you to state Z"). A **transition table** is those rules stored as data — an object of objects:

```ts
const table = {
  pending: { pay: 'paid' },   // "in pending, the pay event leads to paid"
  paid: {},                    // "in paid, no events are allowed" (terminal)
};
```

### Literal types
In TypeScript, `'paid'` is not just a string — it can be a *type* that only accepts that exact string. This is called a **string literal type**.

```ts
let mode: 'paid' = 'paid';  // ✅ OK
mode = 'shipped';           // ❌ Error: Type '"shipped"' is not assignable to type '"paid"'
```

A **union** of literals lists the allowed values: `'paid' | 'shipped'` means "one of these two exact strings."

### `as const` — stopping type widening
Normally TypeScript "widens" values: it sees `{ pay: 'paid' }` and remembers the loose type `{ pay: string }`, forgetting the exact word. Adding `as const` after an object tells the compiler: remember *everything* exactly, and treat it as read-only.

```ts
const a = { pay: 'paid' };          // type: { pay: string }        (widened)
const b = { pay: 'paid' } as const; // type: { readonly pay: 'paid' } (exact!)
```

This matters because the whole refactor derives types *from* the table — that only works if the table's exact words are preserved.

### `typeof` (the type-level one)
You know runtime `typeof x` from JavaScript. TypeScript has a second, compile-time-only `typeof` used in type positions: it means "the type of this variable."

```ts
const config = { port: 8080 } as const;
type Config = typeof config; // { readonly port: 8080 }
```

### `keyof` — the union of an object type's keys
`keyof SomeObjectType` gives you a union of its property names, as literal types.

```ts
type Row = { pay: 'paid'; cancel: 'cancelled' };
type Events = keyof Row; // 'pay' | 'cancel'
type Nothing = keyof {}; // never — an empty object has NO keys
```

That last line is the trick behind terminal states: a state with no transitions allows the event type `never` — a special type meaning "no value can ever have this type," so no call can supply one.

### Indexed access types — `T[K]`
Just like `obj[key]` at runtime, `SomeType[SomeKey]` at the *type level* looks up a property's type:

```ts
type Row = { pay: 'paid' };
type Target = Row['pay']; // 'paid'
```

You can chain it: `Table['pending']['pay']` walks two levels deep, entirely at compile time.

### Generics with constraints (`extends`)
A **generic** function has a type placeholder (like `S`) filled in at each call. A **constraint** (`S extends OrderState`) says "S must be one of these." The magic: when you call `transition('pending', ...)`, TypeScript infers `S = 'pending'` — the *exact literal* — and can then compute which events that specific state allows. (Generics are introduced gently in exercise 16; constraints in 17.)

### Mapped types (used by the table audit)
A **mapped type** builds a new object type by looping over keys: `{ [S in OrderState]: ... }` means "for each state S, compute something." Indexing the result with `[OrderState]` then collects all the computed pieces into one union. Exercise 25 covers mapped types fully; here you only need "it's a compile-time loop over keys."

### Conditional types (one line of it)
`A extends B ? X : Y` is a compile-time if-statement on types: "if every A is acceptable as a B, the answer is X, otherwise Y." The audit uses `TransitionTargets extends OrderState ? true : false` — literally asking "is every transition target a real state?"

### `@ts-expect-error` — type tests
A comment that says "the NEXT line must FAIL to compile." If the line fails: fine. If the line unexpectedly compiles: the *comment itself* becomes an error. This turns compile errors into test cases. The whole track uses this trick.

## 3. Walking through the original code

The table:

```ts
export const TRANSITIONS: Record<string, Record<string, string>> = {
  pending: { pay: 'paid', cancel: 'cancelled' },
  ...
};
```

`Record<string, string>` means "an object with any string keys and string values." So the annotation says: this table can contain *anything*. All the exact knowledge — which states exist, which events each allows — is thrown away on line one.

The transition function:

```ts
export function transition(state: string, event: string): string {
  const next = TRANSITIONS[state]?.[event];
  return next ?? state; // unknown anything -> silently stay put
}
```

`?.` (optional chaining) means "if the left side is missing, give up and produce `undefined` instead of crashing." `??` (nullish coalescing) means "if the left side is `null`/`undefined`, use the right side instead." Combined: any lookup that misses — wrong state, wrong event, typo — quietly returns the current state. No error. No signal.

Then the file demonstrates the damage: `transition('pendign', 'pay')` (typo'd state — no-op forever), `transition('paid', 'refund')` (event that exists nowhere), `transition('shipped', 'cancel')` (the forbidden business move). All compile. All silently do nothing.

Finally `BROKEN` shows the table itself is unchecked: a transition targeting `'payed'` — a state that doesn't exist — compiles fine, because the annotation only demands "some string."

## 4. What's wrong with it (in beginner terms)

**Flaw 1: silence instead of answers.** The runtime bug story: a developer writes `transition('pendign', 'pay')` — one transposed letter. The order stays `pendign` forever. No crash, no log. Customer support gets a ticket weeks later: "my order never moves." The bug is invisible because a wrong answer looks identical to a correct rejection.

**Flaw 2: the caller can't distinguish "no" from "huh?".** `transition('shipped', 'cancel')` returning `'shipped'` might mean "cancelling shipped orders is forbidden" (a business rule) or "you spelled something wrong" (a bug). Same return value. The type `string` carries no information.

**Flaw 3: the rulebook itself can rot.** Add a transition pointing at `'payed'` and you've created a state that no row of the table knows about — every order that reaches it is stuck forever. The compiler said nothing, because `string` matches `'payed'` just fine.

## 5. Try it yourself first!

1. **Vague hint:** the table already knows everything. Can the *types* be made to know it too?
2. **Warmer:** what one keyword makes TypeScript remember the exact strings in an object literal instead of widening them to `string`? (See section 2.)
3. **Warmer still:** once the table's type is exact, `keyof typeof TRANSITIONS` gives you... what? Could that replace `state: string`?
4. **Specific:** make `transition` generic: `<S extends OrderState>` for the state. Then the events allowed in state S are `keyof (typeof TRANSITIONS)[S]` — write that as a helper type `EventFor<S>` and constrain the second parameter with it.
5. **Last piece:** the return type is a double index: `(typeof TRANSITIONS)[S][E]`. Try it, then try chaining two calls.

## 6. Understanding the refactored solution

The table is identical, plus two words:

```ts
export const TRANSITIONS = {
  pending: { pay: 'paid', cancel: 'cancelled' },
  ...
} as const;
```

`as const` preserves every literal. Now everything derives from it:

```ts
export type OrderState = keyof typeof TRANSITIONS;
// 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
```

Not hand-written — *derived*. Add a state to the table, the union updates itself. One source of truth.

```ts
export type EventFor<S extends OrderState> = keyof (typeof TRANSITIONS)[S];
```

Read it inside-out: take the table's type, index it by state S (that's S's row), take that row's keys. `EventFor<'pending'>` is `'pay' | 'cancel'`. `EventFor<'delivered'>` is `keyof {}` = `never` — terminal states accept no event at all.

```ts
export type NextState<S extends OrderState, E extends EventFor<S>> =
  (typeof TRANSITIONS)[S][E];
```

Double indexing: row, then cell. `NextState<'pending', 'pay'>` is the literal `'paid'`.

```ts
export function transition<S extends OrderState, E extends EventFor<S>>(
  state: S, event: E,
): NextState<S, E> {
  return TRANSITIONS[state][event];
}
```

Because E is constrained by *S specifically*, `transition('pending', 'ship')` fails: `'ship'` is not in `EventFor<'pending'>`. And because the return type is the exact literal (`'paid'`, not `string`), you can chain: the result of one call is a valid `S` for the next. The types walk the machine with you.

**The audit.** You'd love to write `TRANSITIONS satisfies Record<OrderState, Record<string, OrderState>>` — "every target must be a real state." But `OrderState` is *derived from* the table, so checking the table against it is circular, and the compiler refuses. The workaround: a mapped type collects every target into one union (`TransitionTargets`), and then one line asserts the relationship:

```ts
const tableIsSound: TransitionTargets extends OrderState ? true : false = true;
```

If every target is a real state, the conditional type is `true` and assigning `true` works. If any target is a typo (like `'payed'`), the conditional becomes `false`, and `true` doesn't fit into the type `false` — a compile error pointing at the corruption. `void tableIsSound;` just marks the variable as intentionally unused.

The `@ts-expect-error` lines at the bottom are the payoff: all five silent no-ops from the original are now *tests that the compiler rejects them*.

## 7. Words you learned (glossary)

- **State machine** — a system with named states and rules for which event moves you between them.
- **Transition table** — those rules stored as a data object (state → event → next state).
- **Literal type** — a type that allows exactly one value, like `'paid'`.
- **Union type** — a type allowing one of several options: `'a' | 'b'`.
- **Widening** — TypeScript forgetting an exact value (`'paid'`) in favor of a loose type (`string`).
- **`as const`** — suffix that prevents widening and makes the value read-only.
- **`typeof` (type-level)** — gets the type of a variable, for use inside type expressions.
- **`keyof`** — the union of an object type's property names.
- **Indexed access type** — `T[K]`: looking up a property's type, at compile time.
- **Generic** — a function/type with a placeholder type filled in per use.
- **Constraint (`extends`)** — a rule limiting what a generic placeholder may be.
- **`never`** — the type with no possible values; here, "no events allowed."
- **Mapped type** — a compile-time loop building an object type from a set of keys.
- **Conditional type** — `A extends B ? X : Y`, an if-statement for types.
- **Terminal state** — a state with no outgoing transitions.
- **`Record<K, V>`** — object type with keys K and values V; `Record<string, string>` means "any strings at all."
- **Optional chaining `?.` / nullish coalescing `??`** — runtime operators: "skip if missing" / "fallback if missing."
- **`@ts-expect-error`** — a comment asserting the next line must fail to compile.
- **Single source of truth** — one place (the table) that everything else derives from.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change (then undo it).

1. **Add a state.** In `refactored/machine.ts`, add `refunded: {}` to the table and give `paid` a new event: `refund: 'refunded'`. Expected: everything still compiles — `OrderState` and `EventFor` update automatically. Then try `transition('paid', 'refund')` — it should typecheck and its result type is `'refunded'`.
2. **Corrupt the table.** Change `pay: 'paid'` to `pay: 'payed'`. Expected: the `tableIsSound` line stops compiling — the audit catches it — and several other lines complain too.
3. **Break a type test.** Delete the `// @ts-expect-error` comment above `transition('shipped', 'cancel')`. Expected: now the *call itself* is reported as an error — proving the test was real.
4. **Remove `as const`.** Delete `as const` from the table. Expected: a cascade — `keyof typeof TRANSITIONS` still works, but the row types widen to `string`, so `NextState` and the audit fall apart. This shows `as const` is the keystone.
5. **Chain further.** Write `transition(transition(transition('pending', 'pay'), 'ship'), 'deliver')`. Expected: ✅ compiles, and hovering shows the result type `'delivered'`. Then swap `'deliver'` for `'cancel'` — ❌ error, because `EventFor<'shipped'>` doesn't include `'cancel'`.
