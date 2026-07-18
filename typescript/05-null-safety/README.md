# TS 05 — Null safety

**Lesson: `!` is a promise the compiler takes on faith — narrowing answers the
question `!` skips, and the answers turn out to be product decisions.**

## Run it

```
npm run typecheck
node --experimental-strip-types typescript/05-null-safety/refactored/accounts.ts
```

## What's wrong with the original?

`strictNullChecks` did its job — it asked, at both dangerous reads, "what if
this is missing?" And both times the author answered `!`: *it won't be*. It
will be: `lastLoginReport('bob')` crashes on the `undefined` account;
`'grace'` crashes on the `null` lastLogin. Each `!` is a load-bearing lie,
and the happy-path test (`'ada'` works) breeds exactly the false confidence
that ships it. Note the two *different* missing-nesses: `undefined` = no such
account, `null` = account exists, never logged in. The `!`s erased that
distinction along with the safety.

## What changed in the refactor

- **Narrowing is the whole mechanism**: `if (account === undefined) return
  ...` — after that line, the compiler *removes* `undefined` from the type
  (hover it: `Account`). Guard clauses (js#08) aren't just style here;
  they're how types get narrower. No casts, no assertions — control flow IS
  the proof.
- **The skipped branches were product decisions.** "No such user" and "has
  never logged in" are different messages a real product needs — the `!`s
  weren't skipping ceremony, they were skipping requirements. This is the
  recurring discovery when de-`!`-ing code: the compiler was asking a
  question the *product owner* had an answer to.
- **The compact toolkit** for lighter cases: `?.` (optional chaining) for
  safe access, `??` for defaults — with the js#27 footnote that `??` only
  fills `null`/`undefined`, unlike `||` which also clobbers `0` and `''`.
- **Type tests pin both crash sites** as must-not-compile.

## Key takeaway

Every `| undefined` and `| null` in a type is a question the compiler will
make you answer; `!` is answering "trust me." Reserve `!` for cases you can
*prove* locally (and even then prefer restructuring); everywhere else, let a
guard clause narrow the type — you'll usually find a real requirement living
in the branch you were about to skip.
