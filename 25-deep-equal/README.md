# 25 — Deep equality checker

**Lesson: value vs reference — the single most important mental model in JavaScript —
and why "clever one-liners" like JSON comparison lie to you.**

## Run it

```
node 25-deep-equal/original.js
node --test 25-deep-equal/
```

## What's wrong with the original?

The opening line is the real lesson: `{a: 1} === {a: 1}` is **false**, because `===`
on objects compares *identity* (is it the same object in memory?), not *contents*.
Primitives compare by value; objects compare by reference. Every confusing JS bug
about "why didn't my comparison/React re-render/Set dedupe work" traces back here.

The JSON.stringify workaround then lies **in both directions**:

- *Falsely unequal*: `{a:1, b:2}` vs `{b:2, a:1}` — same object, different key order,
  different strings.
- *Falsely equal*: `{a: undefined}` vs `{}` — `undefined` vanishes when stringified.
- *Falsely equal, dangerous*: `NaN` stringifies to `"null"`, so `NaN` "equals" `null`.
- And it crashes on cyclic structures.

A shortcut that's *sometimes wrong* is worse than no shortcut — you'll trust it
exactly until it burns you.

## What changed in the refactor

- **The decisions are written down.** Every deep-equal implementation must choose:
  does NaN equal NaN? Is a present-but-undefined key the same as a missing key? The
  refactor documents its choices in the header (matching Node's
  `assert.deepStrictEqual`) and pins each one with a test. Unwritten semantics are
  where teammates' assumptions collide.
- **`Object.is` as the base case** — it's `===` with two repairs (NaN equals NaN,
  `0` differs from `-0`), and it also short-circuits identical references, which is
  why comparing a cyclic object *to itself* works.
- **Guard-clause ladder**: primitives out first, then null, then array/object
  mismatch, then Dates, then the recursive key walk — each line eliminates one
  category, so by the last line only same-shaped objects remain. Compare lengths
  first, then `every(key => hasOwn && recurse)` — checking both directions cheaply.
- This function gets **reused by project 45** (the mini test framework) — a
  deep-equal is the heart of every `assertEqual` you've ever called.

## Key takeaway

Burn this in: **primitives by value, objects by reference.** `===` answers "same
object?"; deep equality answers "same contents?" — and the second question has
genuine design decisions in it. When a one-liner claims to answer it for free, list
what it does on `NaN`, `undefined`, key order, and cycles before trusting it.
