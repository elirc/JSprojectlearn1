# TS 35 — Typed errors

**Lesson: `catch (err: unknown)` + `instanceof` narrowing — js#30's error
discipline, with the compiler enforcing the part everyone skips.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The throws are js#30-correct (a real `ValidationError` class with a
payload); the catches fumble it with `catch (err: any)`. In JavaScript
*anything* can be thrown — a string, `undefined`, a `DOMException` from
three libraries down — and `any` lets the handler assume it got the error
it hoped for. Two failure modes, both classic: `err.message.toUpperCase()`
crashes **inside the catch block** when a string was thrown (the error
handler failing while handling an error), and the quiet variant relabels
*every* failure — including genuine bugs in `parseAge` — as "invalid
input" (js#30's swallowed-bug sin, made ergonomic by `any`).

## What changed in the refactor

- **`catch (err: unknown)`** — the honest type for "anything can be
  thrown." Unknown demands narrowing before *any* use: both original
  crash lines are type tests now. (Set `useUnknownInCatchVariables` — on
  in `strict` since 4.4 — and this is the default; writing `: unknown`
  explicitly documents intent either way.)
- **`instanceof ValidationError` narrows** (ts#09's tool #3): inside the
  branch, `.field` exists, typed. Outside it — **rethrow**. js#30 asked
  for expected-vs-unexpected discipline politely; `unknown` makes the
  check mandatory, because you literally can't touch the error without
  it.
- **`errorMessage(err: unknown)`** — the one helper every codebase needs:
  safe message extraction from arbitrary thrown values, written once
  instead of hand-rolled wrong at each log site.
- The second fumble's fix is procedural, enabled by the types: the
  unexpected path *logs as unexpected and rethrows* — never relabels.
  Bugs stay visible as bugs.

## Key takeaway

Type every catch variable `unknown`, then earn access by narrowing:
`instanceof YourError` for the failures you own, a message-extraction
helper for logging, `throw err` for everything else. It's js#30's
boundary discipline with the compiler standing guard at the one place
developers reliably cheat.
