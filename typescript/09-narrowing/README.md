# TS 09 — Narrowing

**Lesson: casts answer the compiler's "how do you know?" with "I just do" —
narrowing answers it with a runtime check the compiler can verify.**

## Run it

```
npm run typecheck
node --experimental-strip-types typescript/09-narrowing/refactored/pretty.ts
```

## What's wrong with the original?

Six `as` casts in one function, each one a hope. `prettyValue(null)` crashes
on the first cast (`(null as string).toUpperCase`); `prettyValue(-5)` falls
through two hope-branches into `join()` and crashes there. The key fact about
`as`: **it checks nothing** — it's not a conversion, it's an instruction to
stop asking. The author's runtime probes (`.toUpperCase !== undefined`) are
almost-narrowing, done by hand, invisibly to the compiler — so the compiler
can't help, and the probes have gaps the compiler would have caught.

## What changed in the refactor

- **Zero casts, four narrowing tools**, each demonstrated:
  1. `value === null` — equality narrows away null/undefined/literals;
  2. `typeof value === 'string'` — the primitive workhorse;
  3. `instanceof` — for class instances (`Error`);
  4. `'meow' in pet` — for shape unions (with the honest note that if you
     *control* the types, project 10's discriminants are sturdier).
- **The compiler does the sudoku**: after each guard, hover `value` — the
  union shrinks (`string | number | string[]` → ... → `string[]` *by
  elimination*, no final check needed). Guard clauses (js#08) aren't just
  readable here; they're the mechanism by which types get precise.
- **The crash case was a feature in disguise** — negative numbers now render
  as `(5.00)` instead of crashing. Recurring discovery (ts#05 again): the
  branches casts skip usually contain requirements, not ceremony.
- The safety checks and the type checks are *the same lines* — that
  alignment is what "type-driven" means in practice: write the check you'd
  want at runtime anyway, and the compiler rides along.

## Key takeaway

When TypeScript says a member doesn't exist on a union, it's asking "which
branch are you in?" — answer with a check (`===`, `typeof`, `instanceof`,
`in`), never with `as`. If you can't write the check, you don't actually
know — and that's the compiler doing its job.
