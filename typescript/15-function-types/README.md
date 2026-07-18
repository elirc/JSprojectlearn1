# TS 15 — Function types

**Lesson: `Function` is the `any` of callables — write real signatures, name
the recurring ones, and understand what `void` actually promises.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

1. **`task: Function`** accepts any function and permits any call —
   `runTask` invokes everything with `('surprise', 42)` and `Function`
   can't object; a two-argument adder gets nonsense args silently.
   `Function` is to callables what `any` is to values (ts#01): the off
   switch.
2. **`callback: any`** means the handler's parameter is a guess — and the
   guess has a typo (`result.vlaue`) the compiler waved through.
3. **The `void` trap**: `scores.forEach(saveScore)` compiles even though
   `saveScore` returns a meaningful `boolean` — and the `-5` rejection
   evaporates into forEach's ignored returns.

## What changed in the refactor

- **Real signatures**: `type Task = () => void` — arity, parameter types,
  and return, all stated. Wrong-arity callbacks and non-functions became
  type tests. Naming the alias is ts#03's rule applied to functions: shapes
  used twice get names.
- **Contextual typing pays you back**: with `ResultHandler` declared, the
  call site writes `(result) => ...` — *no annotation* — and `result` is
  `TaskResult`, typo-proof. Type the function type once; every callback
  written against it gets inference for free (ts#02 through functions).
- **The `void` fact worth knowing**: a `() => void` context *accepts*
  callbacks that return more — by design (so `arr.forEach(arr2.push)`-style
  code works). `void` means "I won't look at it," not "you may not return
  it." That's *why* the original compiled — and why the real fix is
  modeling: rejections became data (`filter`), not ignored booleans.

## Key takeaway

Every place a function travels — parameters, callbacks, handlers — deserves
a signature as precise as your data types: `(x: X) => Y`, aliased if
recurring. `Function` and `any`-callbacks reintroduce project 01's epidemic
through the side door, and `void`'s tolerance means *you*, not the
compiler, must keep meaningful returns out of return-ignoring slots.
