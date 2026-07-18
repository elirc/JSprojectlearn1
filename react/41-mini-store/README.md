# React 41 — Mini store (useReducer + Context)

**Lesson: reducer + context = a global store — the Redux architecture, built
from parts you already own.**

## Run it

Open both files — identical shop. Then count cart props: seven signatures in
the original, zero in the refactor.

## What's wrong with the original?

The state management is *right* (a pure cart reducer — project 13). The
*distribution* is the problem: `cart` and `dispatch` hand-carried through every
layer — project 34's courier hallway with two suitcases. Three components
forward the pair without using it; every new cart consumer threads it through
every layer in between; every layout refactor re-plumbs it.

## What changed in the refactor

- **The store recipe, ~25 lines**: `cartReducer` (13) + `CartProvider` (34) +
  two hooks. Readers call `useCart()`, writers call `useCartDispatch()`, from
  any depth. The couriers dropped to zero props. This *is* the core
  architecture of Redux — one rulebook, one provider, reach-in hooks — built
  from track parts.
- **Two contexts, deliberately** (project 33's splitting): `dispatch` is
  stable forever (React guarantees it), so write-only components like
  `ProductButton` **never re-render on cart changes** — they subscribe to the
  never-changing channel. Read/write split as a performance structure, free
  at design time.
- **Both hooks fail loudly without a provider** (34's discipline, js#30's
  boundary throws).
- **The reducer remains pure and Node-testable** — nothing about
  distribution touched the rules. That separation (rules vs. plumbing vs.
  view) is the whole track in one example.
- Honest scaling note (on the page): real stores (Redux Toolkit, Zustand) add
  devtools, middleware, and *per-field* subscriptions (context still wakes
  all readers of a changed value — 33's limits apply). Adopt one when you
  feel those needs; you'll recognize everything inside it.

## Key takeaway

"Global state" isn't a library decision — it's this composition: a pure
reducer for rules, a provider for scope, split read/write hooks for access.
Build it once from scratch and store libraries stop being magic; they're this
recipe with conveniences bolted on.
