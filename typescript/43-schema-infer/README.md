# TS 43 — Schema infer

**Lesson: one definition, both worlds — write the schema as a value,
derive the type from it. `Infer<typeof schema>` is the hand-written
interface that can never drift.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The validator *works*: it walks a `{ name: 'string', age: 'number' }`
object and rejects bad payloads. Then it returns `any` — so data is
checked exactly at the boundary and unchecked everywhere after it,
which is the one place it felt safe. `user.nmae.toUpperCase()`
compiles and throws; `user.address.city` compiles and throws. ts#01's
villain, arriving through the front door of the very function meant to
keep it out.

The team's fix makes it worse: hand-write a `User` interface *beside*
the schema and `as User` onto the result. One shape, two descriptions,
and they drift. `email` was added to the interface and never to
`userSchema`, so `validate()` doesn't check it, the assertion swears
it's there, and `typedUser.email.split('@')` throws on a payload that
**passed validation**. The reverse drift is quieter still: add a field
to the schema and the interface silently under-describes data you
already trust.

## What changed in the refactor

- **The schema carries its own type.** `Validator<T>` is a runtime
  object (`parse()`, the checking) with a type parameter recording
  what it produces. `s.string()` is a `Validator<string>`; `s.array(x)`
  lifts `T` to `T[]`; `s.object({...})` maps a record of validators to
  a record of their outputs. One value, two jobs.
- **`Infer<S>` reads the type back**: `S extends Validator<infer T> ? T
  : never` — ts#27's conditional plus `infer`, pointed at your own
  convention. `type User = Infer<typeof userSchema>` derives the
  interface instead of repeating it, so drift is not a discipline
  problem, it's a *nonexistent* problem: the schema is the only
  description, and `parse()` returns `User` with no cast at the call
  site.
- **The generic is the whole trick.** `object<S extends Record<string,
  Validator<unknown>>>(shape: S)` captures the argument's exact type
  (ts#31: annotating the parameter `Record<string, Validator<unknown>>`
  instead would widen it and the mapping would produce
  `Record<string, unknown>`). The library keeps one cast, inside
  `parse()`, justified by the loop above it (ts#20's contained
  unsafety) — the public signature is exact.
- **Type tests**: `Expect<Equal<User, {...}>>` pins the inferred shape
  exactly (ts#42), and every original bug — the typo, the phantom
  `email`, `age.toUpperCase()`, `user.address` — is now a
  `@ts-expect-error`.

## Key takeaway

When a shape is described twice, the two copies drift; the only
question is when. Make one of them derivable from the other, and
choose the *runtime* one as the source — it's the copy that has to be
right for the program to work. This is exactly how zod, valibot and
friends earn their place: not by validating better than your `if`
statements, but by making `Infer<typeof schema>` the only type you
ever write.
