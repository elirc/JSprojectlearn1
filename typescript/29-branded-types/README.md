# TS 29 — Branded types

**Lesson: js#32 solved money's *arithmetic* problem; brands solve its
*identity* problem — cents, dollars, and ids stop being interchangeable
`number`s.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The team adopted js#32's integer-cents discipline and typed everything
`number` — so the compiler can't tell cents from dollars from user ids, and
both classic unit bugs sail through: a form's *dollars* value walks into a
*cents* slot (`$10.35` item labeled `$0.10`), and `refund(amount, userId)`
with **swapped arguments** compiles cleanly (refunding $0.07 to user 1035).
Discipline prevented these in the JS track; discipline is exactly what
types exist to replace. (NASA lost a Mars orbiter to this bug class.)

## What changed in the refactor

- **The brand**: `type Cents = number & { readonly __brand: 'cents' }` — a
  phantom marker that no runtime value ever has; it exists only in the
  type. `Cents` *is* a number at runtime (zero cost, fully erased,
  arithmetic just works) but the compiler treats it as its own species.
  Both original bugs are type tests now, including the swapped arguments.
- **Constructors are the only doors** (js#29's encapsulation, for
  primitives): `cents(n)` holds the file's one honest cast — *sealed with
  validation* (integers only, js#32's rule, enforced at runtime). Brand =
  identity at compile time; door = validity at runtime; ts#13's boundary
  pattern applied to a single number.
- **Conversion is explicit**: `dollarsToCents(d)` is the only path between
  units — the `* 100` lives in exactly one audited place, instead of
  scattered and sometimes-forgotten.
- Where brands earn their keep: any primitive with *meaning* — money and
  units, ids (`UserId` vs `PostId`!), sanitized vs raw strings (js#35's
  escaped HTML is a classic brand candidate), validated emails. Cheap to
  add, and every mixed-up-argument bug in that domain dies.

## Key takeaway

`number` and `string` are TypeScript's most over-shared types. When two
values have the same primitive but different *meanings*, brand them: a
phantom-marker intersection, a validating constructor as the only door,
explicit conversion functions. The compiler then enforces what js#32
could only ask politely.
