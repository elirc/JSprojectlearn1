# TypeScript track — 42 projects

Same method, new twist: in this track **the compiler is the test runner**.

- `original.ts` — code that *compiles cleanly* under strict mode and is still
  unsafe, because the type checker has been disarmed (`any`, assertions, wrong
  models). Compiling ≠ safe is the recurring villain.
- `refactored/` — the same program with types that make the bugs
  *unrepresentable*, plus **type tests**: lines marked `// @ts-expect-error`
  that assert bad code *fails* to compile. (tsc errors if a `@ts-expect-error`
  is unused — so these are real, failing-when-broken tests.)
- `README.md` — what changed and why.

## Run it

```
npm run typecheck          # tsc over the whole track — must be clean
npx tsc -p typescript      # same thing, directly
```

Files also run under Node's type stripping:
`node --experimental-strip-types typescript/01-any-epidemic/original.ts`
(works for most projects; a few use enums/type-level-only code and are
typecheck-only).

## The curriculum

### Basics: annotations & inference (01–08)
| # | Project | Lesson |
|---|---------|--------|
| 01 | any-epidemic | `any` disables checking and SPREADS; `unknown` is the honest type |
| 02 | type-inference | Let inference work; annotate boundaries |
| 03 | shared-interfaces | Inline object types drift; name your shapes |
| 04 | optional-fields | `?`, `undefined`, and missing — js#25's lesson, typed |
| 05 | null-safety | strictNullChecks and narrowing vs the `!` lie |
| 06 | literal-unions | `'asc' \| 'desc'` beats `string` (js#05's mode strings, fixed) |
| 07 | enums-vs-unions | `as const` objects + unions vs enum pitfalls |
| 08 | readonly | The type-level answer to js#26's mutating `sort()` |

### Narrowing & guards (09–14)
| # | Project | Lesson |
|---|---------|--------|
| 09 | narrowing | Control-flow narrowing replaces casts |
| 10 | discriminated-unions | THE lesson: react#20's status object, compiler-enforced |
| 11 | type-guards | User-defined `is` predicates vs `as` |
| 12 | exhaustive-switch | `never` makes missed cases compile errors (js#40) |
| 13 | unknown-boundary | `JSON.parse` returns lies; validate at the edge (js#31) |
| 14 | satisfies-vs-as | `satisfies` checks; `as` overrides; know which you're doing |

### Functions & generics (15–24)
| # | Project | Lesson |
|---|---------|--------|
| 15 | function-types | Precise signatures; `void` returns; callback types |
| 16 | generics-intro | The rule of three, type-level (js#04) |
| 17 | generic-constraints | `extends` — generics with requirements |
| 18 | keyof-lookup | `keyof T` and `T[K]`: property access, proven safe |
| 19 | typed-array-utils | js#26's utilities, generically typed |
| 20 | typed-event-emitter | js#38's emitter with a typed event map |
| 21 | callback-types | Typing functions that take functions |
| 22 | overloads | One function, several honest signatures |
| 23 | typed-validator | js#31's schema, typed end to end |
| 24 | utility-types | Partial/Pick/Omit/Record — stop hand-copying types |

### Type-level modeling (25–33)
| # | Project | Lesson |
|---|---------|--------|
| 25 | mapped-types | Write your own Partial — mapped types demystified |
| 26 | template-literals | String types: `` `on${Capitalize<E>}` `` |
| 27 | conditional-types | `T extends U ? X : Y` for practical unwrapping |
| 28 | infer-routes | `infer`: extract `:id` params from route strings |
| 29 | branded-types | js#32's cents as a type `number` can't impersonate |
| 30 | impossible-states | react#20's status, typed so wrong combos don't compile |
| 31 | as-const | Widening, and how to stop it |
| 32 | typed-actions | react#13's reducer actions, payload-correlated |
| 33 | typed-state-machine | js#40's transition table, compiler-checked |

### Integration & capstones (34–42)
| # | Project | Lesson |
|---|---------|--------|
| 34 | api-boundary | Typed fetch: runtime validation creates compile-time trust |
| 35 | typed-errors | js#30's error classes with `unknown` catch |
| 36 | result-type | `Result<T, E>` — errors as values, union-checked |
| 37 | typed-storage | js/react#23's storage hook, generically safe |
| 38 | declaring-modules | Write a `.d.ts` for an untyped JS library |
| 39 | strictness-flags | What each strict flag catches (noUncheckedIndexedAccess!) |
| 40 | typed-ast | js#49's expression AST as a discriminated union |
| 41 | generic-lru | js#41's LRU cache as `LruCache<K, V>` |
| 42 | type-testing | The capstone: test your *types* with Expect/Equal |

## The TypeScript one big idea

Types are the "make impossible states unrepresentable" lesson (js#40)
industrialized: every unit of this track turns a runtime bug from the JS track
into a compile error. The skill is *modeling* — choosing types so that the
wrong program doesn't typecheck — not annotating everything in sight.
