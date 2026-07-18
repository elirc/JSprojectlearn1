# TS 36 — The Result type

**Lesson: failure as a value in the signature — `Result<T, E>` makes
forgetting the error case a compile error, and gives each failure a name.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

js#30's mixed-convention catalogue, with types making it *worse*: `string
| null` (null meaning... something), a throwing parser whose signature
can't say so (TypeScript has no `throws` clause — grenade functions look
identical to safe ones), a `!` on a nullable (ts#05), and a catch-all
that maps *every* failure to silent defaults. Net effect: ops configures
port 8080, the file is malformed, and the app quietly serves on 3000 —
the *why* (missing file? broken JSON? wrong shape?) eaten by the catch.
No signature anywhere warned that failure was possible, let alone what
kind.

## What changed in the refactor

- **`Result<T, E>`** — ts#10's discriminated union with two variants,
  `ok`/`err` constructors, done. The signature
  `Result<AppConfig, ConfigError>` tells the whole story; the type tests
  prove you can't touch `.value` without checking `.ok`. Where
  exceptions are invisible in signatures, Results are the signature.
- **`ConfigError` is a union, not a string** — three named failures,
  each carrying its evidence (`path`, `detail`). The caller's `switch`
  is exhaustive (ts#12), so each failure gets its own response — the
  "why" the original ate is now *demanded* by the compiler. (ts#21's
  callback-result and ts#13's `| null` were early steps; this is the
  full form: null says *that* it failed, Results say *why*.)
- **The pipeline shape**: each step either continues or returns early
  with its specific error — js#08's guard clauses carrying typed
  evidence.
- **The division of labor stands** (the closing note in the code): bugs
  and unrecoverable states still *throw* (js#30); *expected,
  caller-actionable* failures — not-found, parse errors, validation —
  are Results. Two tools, two jobs; the mistake is using either for
  everything.

## Key takeaway

When a function's failure is part of its contract — callers should
handle it, differently per cause — put it in the return type:
`Result<T, YourErrorUnion>`. The compiler then does what documentation
never managed: makes every caller face every failure, by name.
