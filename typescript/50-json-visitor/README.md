# TS 50 — JSON visitor

**Lesson: `typeof null === 'object'` is a bug generator only while JSON is
typed `any` — write the six variants down and the missing case becomes a
compile error instead of a page crash.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`walk(value: any)` tests `Array.isArray`, then `typeof value === 'object'`,
then treats everything else as a leaf. That covers JSON's variants… except
one. `typeof null` is `'object'`, so `"after": null` walks into the object
branch and `Object.keys(null)` throws *"Cannot convert undefined or null to
object"*. Six leaves render, the seventh kills the page, and the stack trace
blames `Object.keys` rather than the case nobody enumerated.

The same hole has two more shapes. `describe` switches on `typeof` with a
`default: return 'unknown'` — booleans land there, so the viewer prints
"verbose: unknown" (ts#12's silent-default disease: a bucket that answers
*something* for every input can never report a missing case). And
`walk(() => 42)` runs happily, because `any` let a **function** into a JSON
walker; nothing crashes, the output is just quietly wrong.

## What changed in the refactor

- **`Json` is written down** — a recursive union of exactly six things:
  `string | number | boolean | null | Json[] | { [key: string]: Json }`.
  Recursive type aliases like this have been legal since TS 3.7 and are the
  honest model of "parsed JSON".
- **`null` gets its own visitor slot.** It is a *variant*, not a flavour of
  object, whatever `typeof` says. The crash is now a case with a handler.
- **One traversal, an exhaustive switch, `assertNever` at the bottom**
  (ts#12, ts#40). The `value === null` test runs first, so by the time the
  `'object'` branch is reached the compiler has already removed `null` from
  the type — order enforced by narrowing, not by a code comment.
- **`JsonVisitor<T>` makes consumers exhaustive too**: a visitor missing a
  handler doesn't compile, so `describe`'s `'unknown'` bucket is gone and
  booleans report as `'boolean'`. Two consumers ship here; every future pass
  gets the same guarantee from the same type, with no new switch to sync.
- **Type tests prove the extension story**: a miniature visitor over
  `Json | undefined` fails at `assertNever` (adding a variant breaks every
  traversal at compile time — the point of the exercise), a visitor missing
  `null` is rejected, and functions, `undefined`, `Date`s, and a function
  buried three levels deep in a nested literal are all refused entry.

## Key takeaway

Recursive data — JSON, trees, ASTs, UI documents — is where "model the
variants" pays compound interest, because a single missed case reappears at
every depth. Enumerate the union, give `null` its own arm, put `assertNever`
in the default, and hand consumers a visitor interface instead of asking
them to write their own switch. Then "we forgot a case" is a build failure
in one file, not a `TypeError` in production at 4 p.m.
