# 📘 Learning Guide: State Machine

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The life story of an online shop order. An order starts as **pending**, then gets **paid**, then **shipped**, then **delivered** — or it gets **cancelled** somewhere along the way. Our program tracks which stage an order is in and enforces the rules ("you can't ship a cancelled order").

Run the original and watch it fail:

```
{ isPaid: true, isShipped: true, isDelivered: false, isCancelled: true }
```

That order is *cancelled and shipped at the same time* — the warehouse mailed a package for an order the customer was told is dead. The refactor makes that contradiction literally impossible to express.

## 2. Concepts you need first

### Booleans and flags

A **boolean** is a value that is either `true` or `false`. A **flag** is a boolean used to record a yes/no fact, like `isPaid`:

```js
const order = { isPaid: false };
order.isPaid = true;
console.log(order.isPaid); // prints: true
```

### The combinatorial explosion (why flags multiply)

Each flag doubles the number of combinations. 1 flag = 2 combos. 2 flags = 4. 4 flags = 2×2×2×2 = **16**. If your business only has 5 real situations, the other 11 combos are nonsense that your data can still *represent* — like `isDelivered: true, isPaid: false` (delivered but never paid?). Every nonsense combo is a bug waiting for someone to forget a check.

### States and state machines

A **state** is "which situation am I in right now" — exactly one at a time, with a name: `pending`, `paid`, `shipped`, `delivered`, `cancelled`. An **event** is something that happens: `pay`, `ship`, `cancel`, `deliver`. A **state machine** is the combination of:

1. a list of states,
2. a list of events, and
3. a rulebook saying "in state X, event Y takes you to state Z" (each rule is a **transition**).

Traffic lights are a state machine (green → yellow → red). So is a video player (playing ⇄ paused). A state that allows no further events (like `delivered`) is called **terminal**.

### Objects as lookup tables

A plain object can act as a table you look things up in by name:

```js
const menu = { coffee: 3, tea: 2 };
console.log(menu["coffee"]);  // prints: 3
console.log(menu["soda"]);    // prints: undefined (not on the menu)
```

Two levels deep works too: `rules["paid"]["ship"]` asks "from paid, where does ship lead?" This is how the whole rulebook becomes *data* instead of code.

### Optional chaining `?.` and `??`

`a?.b` means "if `a` is missing (null/undefined), give `undefined` instead of crashing." `x ?? y` means "use `x`, unless it's null/undefined — then use `y`":

```js
const rules = { paid: { ship: "shipped" } };
console.log(rules["nope"]?.["ship"]); // prints: undefined (no crash)
console.log(undefined ?? "fallback"); // prints: fallback
```

### Throwing errors on purpose

`throw new Error("message")` stops execution loudly. We throw when a *caller* does something illegal — because a silent `console.log` warning is easy to miss, but a thrown error shows up in tests, logs, and crash reports immediately.

### `Object.keys` and `Object.entries`

`Object.keys(obj)` gives an array of an object's property names; `Object.entries(obj)` gives `[name, value]` pairs, perfect for loops:

```js
const rules = { pay: "paid", cancel: "cancelled" };
console.log(Object.keys(rules)); // prints: [ 'pay', 'cancel' ]
```

## 3. Walking through the original code

Each order is a bag of four flags:

```js
return {
  isPaid: false,
  isShipped: false,
  isDelivered: false,
  isCancelled: false,
};
```

Then one function per action, each flipping its flag — with whatever safety checks the author remembered *at the time*:

```js
function ship(order) {
  if (!order.isPaid) {
    console.log("can't ship unpaid order");
    return;
  }
  order.isShipped = true;
}
```

`ship` checks `isPaid` (clearly someone got burned by shipping unpaid orders once). But it does **not** check `isCancelled` — that flag was added later, and nobody went back to update `ship`.

```js
function deliver(order) {
  // ...but nobody remembered anything here:
  order.isDelivered = true;
}
```

`deliver` checks nothing at all. You can deliver an order that was never paid or shipped.

The demo then does: pay → cancel (fine, refund them) → **ship**. The one check in `ship` looks at `isPaid`, sees `true`, and ships a cancelled order. Also note the "errors": they're just `console.log` lines — the program prints a complaint and keeps going as if nothing happened.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the data can represent nonsense.** Four booleans allow 16 combinations; the business has 5 real situations. Nothing in the code prevents the other 11. Here's how it bites you: months from now a requirement arrives — "orders can be put on hold." Someone adds `isOnHold`. Now there are 32 combinations, and *every existing check in every function* is potentially wrong again. Each new flag silently doubles the chaos.

**Flaw 2: the rules are scattered and incomplete.** The rulebook lives as little `if` checks sprinkled across four functions, each added after a separate production incident. There is no single place to read "what are the rules?" A product manager asking "can a customer cancel after shipping?" requires reading all the code.

**Flaw 3: illegal actions fail silently.** `console.log("can't ship unpaid order")` then `return` — the caller has no idea the action failed. The program limps on with wrong data. Bugs that whisper get ignored; bugs that throw get fixed.

## 5. Try it yourself first!

1. **Vague hint:** Instead of four yes/no answers, could the order store *one* answer to "what stage are you in?"
2. **Warmer:** Replace the four flags with a single field: `state: "pending"`. List the 5 legal values. Now `cancelled && shipped` cannot even be written.
3. **The rules:** instead of `if` checks inside each function, write the rulebook as one object: for each state, which events are allowed and where they lead. Sketch it on paper first — it's 5 lines.
4. **The engine:** write one function `transition(state, event)` that looks up `rules[state][event]`. Found? Return the new state. Not found? Throw an error.
5. **Bonus:** write `allowedEvents(state)` returning `Object.keys(rules[state])` so a UI could enable/disable buttons from the same table.

## 6. Understanding the refactored solution

**The rulebook is a table:**

```js
export const TRANSITIONS = {
  pending: { pay: 'paid', cancel: 'cancelled' },
  paid: { ship: 'shipped', cancel: 'cancelled' },
  shipped: { deliver: 'delivered' },
  delivered: {}, // terminal
  cancelled: {}, // terminal
};
```

Read it out loud: "from pending you may pay (→ paid) or cancel (→ cancelled); from paid you may ship or cancel; from shipped only deliver; delivered and cancelled are the end." That's the *entire* business rulebook — five lines a non-programmer can review. Changing the rules means editing data, not hunting through functions.

**The engine is tiny:**

```js
export function transition(state, event) {
  const next = TRANSITIONS[state]?.[event];
  if (next === undefined) {
    const allowed = Object.keys(TRANSITIONS[state] ?? {});
    throw new Error(`Cannot "${event}" an order that is ${state}` + ...);
  }
  return next;
}
```

Look up the move in the table. Legal → return the next state. Illegal → **throw**, with a helpful message that even lists what *was* allowed. Notice the design shift: instead of many functions each enforcing partial rules, one five-line engine enforces the whole table.

**`allowedEvents` keeps the UI honest:**

```js
export function allowedEvents(state) {
  return Object.keys(TRANSITIONS[state] ?? {});
}
```

A screen can ask "which buttons should be clickable right now?" and get the answer *from the same table that enforces the rules*. The UI and the rules can never disagree, because they're one source of truth.

**The tests:** the happy path walks pending → delivered. "THE original bug" test proves `transition('cancelled', 'ship')` throws. And the last test is special — it's **exhaustive**: it loops over the whole table and checks every target state actually exists as a defined state. It tests the *rulebook itself*, so a typo like `ship: 'shiped'` can't hide. When rules are data, you can test the whole book, not just sample pages.

## 7. Words you learned (glossary)

- **Boolean / flag** — a true/false value / a boolean recording a yes-no fact.
- **Combinatorial explosion** — each new flag doubling the possible combinations (2ⁿ).
- **State** — the one named situation you're in right now.
- **Event** — a happening that may move you to another state.
- **Transition** — a rule: "in state X, event Y leads to state Z."
- **State machine** — states + events + a transition rulebook.
- **Terminal state** — a state with no way out (delivered, cancelled).
- **Transition table** — the rulebook written as a data object.
- **Make illegal states unrepresentable** — design data so nonsense can't even be written down.
- **Single source of truth** — one place the rules live, which everything else derives from.
- **Optional chaining (`?.`)** — safe lookup that yields undefined instead of crashing.
- **`??`** — fallback when the left side is null/undefined.
- **Throw** — stop loudly with an error instead of limping on.
- **Exhaustive test** — a test that checks every entry in the rulebook, not just examples.
- **Happy path** — the normal, everything-goes-right sequence.

## 8. Experiments to try on the plane (no internet needed)

1. **Count the nonsense.** On paper, list all 16 flag combinations from the original and mark the real ones. Expected: only ~5 make sense; you've just discovered the states the refactor names.
2. **Trigger the helpful error.** In a scratch file, call `transition('cancelled', 'ship')` inside try/catch and print `e.message`. Expected: `Cannot "ship" an order that is cancelled (terminal state)`.
3. **Add a new rule.** Give the business a "refund" feature: in `TRANSITIONS`, add `refund: 'cancelled'` to the `delivered` row. Run the tests (`node --test 40-state-machine/refactored/` when back online with node — or just re-read the exhaustive test and convince yourself it still passes). Expected: one line of data changed, zero engine code touched.
4. **Break the table on purpose.** Change `ship: 'shipped'` to `ship: 'shiped'` (typo). Expected: the exhaustive test fails with a message naming the bad target — the rulebook test caught a typo no example test would.
5. **Build a different machine.** Using the same `transition` engine, write a traffic-light table: `{ green: { next: 'yellow' }, yellow: { next: 'red' }, red: { next: 'green' } }` and step it 4 times from green. Expected: green → yellow → red → green → yellow. The engine is reusable; only the table changes.
