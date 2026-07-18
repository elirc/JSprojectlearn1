# TS 42 — Type testing

**Lesson: the capstone — types are code, so they get tests. `Expect<Equal<A,
B>>` makes type regressions fail the build.**

## Run it

```
npm run typecheck        (the type tests run INSIDE the typecheck)
```

## What's wrong with the original?

The team's type-testing workflow is "hover and squint" — and the file
shows both of its failure modes. Their `DeepPartial` has a real bug
(`T[K] extends object` is true for *arrays*, so mapping `?` over `tags`
makes the *elements* optional — a sparse `(string | undefined)[]` whose
holes crash a downstream `.map`) that shipped because hovering only
tests the cases you thought to hover. And their
`IdsOf` hover "looks fine" — but was `never` excluded or absorbed? Is
`undefined` in there? Hovers truncate; unions launder `never`; and the
next refactor of either type has no safety net whatsoever.

## What changed in the refactor

- **Two utilities, the whole framework**:
  - `Equal<A, B>` — `true` only for *exactly* equal types (the
    two-generic-functions idiom; memorize it as a unit — it's the
    standard, used by type-challenges and every type-test library);
  - `Expect<T extends true>` — only accepts `true`, so a failed `Equal`
    errors *at the exact assertion that regressed*.
  Assertions live in a tuple type; `npm run typecheck` runs them. Tests
  for types, exactly as js#45 built tests for values — the parallel
  capstone.
- **The bug gets fixed AND pinned**: `DeepPartial` grows an
  arrays-pass-through-whole branch, and the regression test
  (`DeepPartial<Config>['tags']` equals `string[] | undefined`) makes
  the original's bug unshippable forever. `@ts-expect-error` remains the
  negative-space tool (the whole track's habit, now named as one half of
  a testing discipline: `Expect<Equal<>>` for what must hold,
  `@ts-expect-error` for what must not).
- **`IdsOf` gets its intent written down**: exactly `number | string`,
  id-less entries contribute `never` — no hover required, and the next
  refactor has a net.

## Key takeaway

You've spent 42 projects making types do real work — modeling states,
correlating keys, parsing strings. Work that load-bearing deserves what
all load-bearing code gets: tests. `Equal` + `Expect` +
`@ts-expect-error`, checked by the build. When a clever type has no type
tests, it's js#45's original all over again — correctness by squinting.
