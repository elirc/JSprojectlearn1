# TS 23 — Typed validator

**Lesson: js#31's validator with its types *connected* — `Schema<T>` ties every
schema to the shape it guards, so drift is a compile error.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The runtime logic is js#31's, working fine — but with `any` signatures, the
schema's *connection to the type it guards* is vibes. The demo schema has
already drifted three ways: `emial` (typo) validates a field `Signup`
doesn't have **while the real `email` goes unchecked**; `favoriteColor`
guards a ghost; and reading `errors.usrename` silently yields `undefined`.
A validator whose schema can quietly disagree with its type gives you
confidently unvalidated data — arguably worse than no validator.

## What changed in the refactor

- **Three connected types, one idea each**:
  - `Rule<T>` — js#31's `value → message | null`, typed per value;
  - `Schema<T> = { [K in keyof T]?: Rule<T[K]>[] }` — for each key of the
    shape, rules typed *for that key's value type*. This one line is the
    project: a mapped type (project 25 explains the machinery) encoding
    "schemas mirror shapes";
  - `Errors<T>` — error bags can only carry real fields, so typo'd *reads*
    fail too.
- **All three drifts became type tests**: the typo'd key, the ghost field,
  and — the subtle one — `minLength` (a `Rule<string>`) on the `number`
  field `age`. Key↔rule↔value correlation, ts#18 style, doing real work.
- **Rule factories got honest types** and (compare js#31) *simpler bodies*:
  `Rule<string>` doesn't need the `typeof value === 'string'` probing —
  the type system delivers what the runtime checks used to sniff for.
- The engine's two casts (`Object.keys` as `(keyof T)[]`) are the contained
  kind (ts#20's note): `Object.keys` returns `string[]` by design, the
  loop is sealed, the public surface is fully checked.

## Key takeaway

When one artifact (a schema, a config, a form) is *supposed to mirror* a
type, don't let the mirroring be a convention — encode it:
`{ [K in keyof T]: SomethingOf<T[K]> }`. The compiler then audits the
correspondence forever, and "the validator and the type disagree" joins
the list of bugs you used to have.
