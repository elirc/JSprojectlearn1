# 11 — Password generator

**Lesson: options objects kill boolean-flag soup; guarantees beat probabilities.**

## Run it

```
node 11-password-generator/original.js
node --test 11-password-generator/
```

## What's wrong with the original?

1. **`generatePassword(12, true, false, true, true)`** — boolean-flag soup. Nobody can
   read a call site without counting parameters against the definition. Worse, passing
   flags in the wrong order or forgetting one is *not an error* — JavaScript happily
   fills missing params with `undefined`, which is falsy, which silently disables an
   option. The original file shows two such bugs that "compile" fine.
2. **A subtle correctness bug:** enabling numbers only makes digits *possible*, not
   *present*. An 8-char password has a real chance of containing no digit — and then a
   site that requires one rejects it, but only sometimes. Intermittent bugs born from
   "probably fine" randomness are miserable to track down.
3. Character pools are built by string concatenation inside the logic, so adding a pool
   means editing the function body.

## What changed in the refactor

- **One options object with defaults.** The call site now reads as configuration:
  `generatePassword({ length: 16, symbols: false, excludeAmbiguous: true })`. You
  can't pass options in the wrong order because there *is* no order. Every option
  you omit gets a sensible default. This is the standard JS pattern —
  `{ length = 16, ... } = {}` in the signature.
- **`POOLS` is data**, same move as projects 06 and 10. `excludeAmbiguous` became a
  tiny pool *filter* instead of a cleanup loop welded into the middle of the function.
- **The guarantee is constructed, not hoped for:** pick one char from each enabled
  pool first, fill the rest from all pools, then shuffle so the guaranteed characters
  aren't predictably at the front. Note the shuffle is Fisher–Yates — the well-known
  correct shuffle — extracted as a named helper.
- **Impossible requests throw**: all pools disabled, or `length: 2` with 4 guaranteed
  pools. The original would loop forever or lie, respectively.
- The "guarantees one from every pool" test runs 200 times — that's how you test a
  *promise about randomness*: hammer it.

## Key takeaway

Two or more boolean parameters = switch to an options object, every time. And when a
requirement says "must contain X," construct X's presence; don't leave it to chance.
