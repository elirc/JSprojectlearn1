# TS 17 — Generic constraints

**Lesson: unconstrained `T` means "I know nothing" — `extends` gives type
parameters requirements, and requirement + genericity beats either alone.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The author generic'd everything and hit the wall: an unconstrained `T` has
*no known members*, so `a.length` doesn't compile — and the chosen fix was
`(a as any).length`, making the `<T>` a costume over an unchecked body
(ts#01 inside ts#16). Results: `longest(42, 7)` compiles and returns the
*wrong number* quietly (`undefined >= undefined`); `describeEntity(new
Date())` renders `"#undefined: undefined"`. Conclusion drawn: "generics are
just any with extra steps." Missing piece: `T` can have *requirements*.

## What changed in the refactor

- **`<T extends { length: number }>`** — the constraint is the permission:
  `.length` is now legal in the body *because* every `T` must bring it.
  Strings and arrays still flow through with their exact types; `42` is
  rejected at the call (type-tested). No casts anywhere.
- **`<T extends Entity>`** — constraints can be your own interfaces.
- **Why not just `(entity: Entity)`? Because `T` *survives*.** The
  `tagEntity` example is the money shot: with a plain `Entity` parameter,
  passing `{id, name, role}` returns something that *forgot* `role`; with
  `T extends Entity`, the return type `T & { tagged: true }` remembers
  everything the caller passed. **Constraint = requirement; generic =
  memory.** You usually want both — this is why library signatures look
  like `<T extends X>` instead of just `X`.
- The decision rule: write the body first; whatever members it touches
  form the constraint (`{ length: number }` — structural, minimal, no
  more than the body needs). Constraints that demand more than the body
  uses reject callers for no reason.

## Key takeaway

When a generic body needs a member, don't cast — *constrain*:
`<T extends HasTheThing>`. You keep per-caller type memory (the reason to
be generic) while the compiler enforces the entry requirement (the reason
to have types). And if `T` never appears in the return, you didn't need a
generic — a plain interface parameter was enough.
