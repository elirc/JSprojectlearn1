# TS 07 — Enums vs unions

**Lesson: `as const` object + derived union gives enum ergonomics without enum
surprises — the modern idiom.**

## Run it

```
npm run typecheck
node --experimental-strip-types typescript/07-enums-vs-unions/refactored/status.ts
   (note: original.ts does NOT run under strip-types — that's surprise 3, live)
```

## What's wrong with the original?

Four documented enum surprises, each a comment in the file:

1. **Numeric enums are numbers, and numbers lie**: `Pending = 0`, and `0` is
   falsy — `if (!status)` treats *pending orders* as "no status." A genuine
   bug pattern in enum codebases.
2. **`99 as OrderStatus` compiles.** Numeric enums accept any number via
   assertion; there is no range check.
3. **Enums emit runtime code** — one of the few TS features that does. Types
   are supposed to *erase*; enums compile to a double-mapping object, which
   is also why type-stripping runtimes (Node `--experimental-strip-types`)
   reject the original file outright. Try it.
4. **The wire format is a number.** `{"status": 2}` in your logs; reorder
   the members and every stored value silently renumbers — adding
   `Cancelled` anywhere but the end is a data migration.

## What changed in the refactor

- **The idiom**: `const ORDER_STATUS = {...} as const` + `type OrderStatus =
  (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]`. Read that type
  right-to-left: keys of the object → indexed into the object → the union
  of its *values* (`'pending' | 'paid' | ...`). One source of truth; the
  union derives, so it can't drift from the constants.
- **Every surprise dissolves**: string values → no falsy-zero trap and
  readable wire format; no emitted code → strip-types runs it; no implicit
  numbering → reordering is free; `99`/`'refunded'`/`'shiped'` → compile
  errors (type-tested).
- **You keep both calling styles**: `ORDER_STATUS.Shipped` for the
  named-constant feel, raw `'shipped'` where brevity wins — both typecheck
  against the same union.
- Outside data narrows in through `isOrderStatus` (project 11's guard shape,
  built from `Object.values` — the guard also derives from the one truth).

## Key takeaway

When you want "one of these named values," reach for `as const` + derived
union, not `enum`. Same autocomplete, same single-source-of-truth — minus
the runtime emission, the numeric traps, and the migration hazards. (If you
inherit enums: string enums avoid surprises 1 and 4; the idiom avoids all
four.)
