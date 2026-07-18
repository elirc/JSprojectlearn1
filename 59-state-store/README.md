# 59 — Reactive state store

**Lesson: one door into state (dispatch), one brain deciding changes (the
reducer), and subscribers who can't be forgotten — a mini Redux in 40 lines.**

## Run it

```
node 59-state-store/original.js
node --test 59-state-store/
```

## What's wrong with the original?

1. **Global mutable state**: any code can change anything, so when
   `cart.items` is mysteriously wrong the suspect list is the codebase.
2. **Every mutation site must remember to re-render the right things.**
   `removeItem` forgot `renderTotal()` — the total shows a deleted item.
   This class of bug scales with (mutation sites × render functions).
3. **Business rules live at mutation sites** — every place that touches
   coupons re-decides what a valid coupon is, and they disagree.
4. **Mutations leave no trace.** "How did state end up like this?" has no
   answer, because changes don't funnel through anywhere you could log.

## What changed in the refactor

- **`dispatch(action)` is the only door in.** Actions are plain data
  (`{type: 'item/removed', name}`), so every change is observable,
  loggable, and replayable. The middleware test builds the logger in
  five lines — the thing the original *couldn't even attempt*.
- **The reducer is the one brain**: `(state, action) → new state`, pure,
  immutable (project 26's no-mutation contracts, project 39's snapshot
  trick made routine). All coupon rules live in one tested place; invalid
  codes return the *same reference*, which is itself an assertable fact.
- **`subscribe` fires after every change** — rendering can't be forgotten
  at a mutation site because there are no mutation sites. Unsubscribe
  handles, listener-copy-before-notify: project 38's contract, reused.
- **Derived data is computed** (`totalCents(state)`), never stored beside
  state — a computed total *cannot* go stale.
- **Middleware is an onion**: each layer wraps the next dispatch.
  `reduceRight` builds `logger(crash(baseDispatch))`, and the thunk test
  shows how three lines of middleware turn function-actions into async
  workflows — extension without touching store or reducer.

## Key takeaway

Redux is not a library, it's a discipline: *state changes are data*.
Once every change is an action flowing through one dispatch, you get
logging, undo, devtools, and sync almost for free — they're all just
subscribers and middleware. When someone asks why not "just" mutate an
object, `removeItem`'s forgotten `renderTotal()` is the answer.
