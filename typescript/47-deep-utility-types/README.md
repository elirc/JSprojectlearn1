# TS 47 — Deep utility types

**Lesson: `T[K] extends object` is the wrong question. Everything that
isn't a primitive answers yes — arrays, tuples, functions, Dates — and
a recursive utility that doesn't stop at the leaves quietly corrupts
all four.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

ts#42 caught one bug in this type. Here is the rest of the family. The
same three-line `DeepPartialBad<T>` breaks in four different ways, and
every one of them **compiles**:

- **Arrays** — mapping `?` over `string[]` makes the *elements*
  optional: `(string | undefined)[]`. `{ tags: ['a', undefined, 'c'] }`
  is accepted by a type whose whole promise is "fields may be
  missing", and a downstream `.map(t => t.toUpperCase())` crashes.
- **Tuples** — same mechanism, worse: `[number, number]` becomes a
  pair of maybes, so `{ point: [1, undefined] }` passes and
  `point[1].toFixed(2)` throws.
- **Functions** — `keyof ((event: string) => void)` is `never`, so
  mapping produces `{}` and the call signature is *thrown away*. `{}`
  accepts anything non-nullish, so `{ onSave: 42 }` compiles: a number
  in a callback slot, with the compiler's blessing.
- **Dates** — mapping over `Date` makes every method optional, and a
  type whose every property is optional is satisfied by `{}`. So
  `{ createdAt: {} }` compiles and `createdAt.getTime()` throws.

Each is a type that *lies*: it says "a partial Config" and means
"almost anything."

## What changed in the refactor

- **Stop at the leaves.** `Atomic = Primitive | AnyFunction | Date |
  RegExp | Error` is the list of things to copy *whole* rather than
  recurse into, and `T extends Atomic ? T : ...` is the first branch.
  Adding `Map` or `URL` to your codebase's version is a one-line
  change instead of one bug per type.
- **Ask three questions in order**, not one: atomic → array-shaped →
  plain object. The array branch is
  `{ [K in keyof T]: DeepPartial<T[K]> }` — a homomorphic mapped type,
  which preserves the container (`string[]` stays an array,
  `[number, number]` stays a 2-tuple) while still recursing into
  elements, so `users: User[]` becomes `{ id?: number }[]`. Leaving
  the `?` off that branch is precisely what removes the holes.
- **`DeepReadonly<T>` is shorter**, because objects, arrays and tuples
  all want the same modifier and homomorphic mapping turns `string[]`
  into `readonly string[]` for free — one branch covers all three.
- **Thirteen type tests** — one per flaw plus the cases that must not
  regress (ts#42's `Expect<Equal<>>`) — and four `@ts-expect-error`
  lines replaying the original's four accepted-garbage values.
  (`AnyFunction = (...args: never[]) => unknown` matches every
  function without naming `Function`: `never` parameters accept any
  parameter list, `unknown` accepts any return.)

## Key takeaway

Recursive types need a base case, exactly like recursive functions —
and in TypeScript the base case is *wider than you think*. `object`
means "not a primitive", which sweeps in every built-in and every
callable. Write the leaf list explicitly, test each category, and pin
the result with `Expect<Equal<>>`: a type utility used across a
codebase is load-bearing code, and this is the one place where a
subtle bug reaches every file at once.
