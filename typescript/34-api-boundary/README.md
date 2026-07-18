# TS 34 — The API boundary

**Lesson: interfaces describe the API you *remember* — a schema that validates
and carries its type keeps client and server honest with one definition.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

A fully-interfaced API client with a cast where the network meets the
types — which makes the interfaces decorative. The scenario is the one
that actually happens: **the API changed** (v2 renamed `email` → `mail`),
nobody told the client's types, and `data as User` kept promising the
March version. The crash (`.toLowerCase` of undefined) fires four layers
from the cast that lied. ts#13 taught the hand-rolled fix; this project
shows why it needs to scale: with many endpoints, hand-written guards
drift from interfaces just like the interfaces drift from the API.

## What changed in the refactor

- **`Schema<T>` bundles the guard with the type** — and `objectSchema<T>`
  takes `{ [K in keyof T]: guard-for-T[K] }` (ts#23's mapped correlation),
  so **the validator can't drift from the interface**: a field checker of
  the wrong type is a compile error (type-tested). One definition, both
  artifacts.
- **Combinators compose** (`arraySchema(UserSchema)`) — js#31's
  rule-composition, producing guards. This is the architecture of
  zod/valibot in ~40 lines; when you adopt the real library, you'll
  recognize every part (and real ones *infer* the interface from the
  schema, removing even the duplication this version keeps).
- **Drift gets a name**: `ApiDriftError`, thrown *at the boundary*,
  saying what actually happened — "the API and the client have drifted"
  — instead of a property-of-undefined crash pointing at innocent code.
  js#30's error taxonomy meeting ts#13's boundary.
- **Zero casts on the data path**: `fetchChecked` returns `T` because the
  guard narrowed it. Downstream code is *unchanged from the original* —
  the difference is entirely where and how failure surfaces.

## Key takeaway

Between your types and any system you don't control — servers, storage,
third parties — put a schema: one definition that both validates at
runtime and types at compile time. Interfaces alone describe your
memory of the contract; schemas notice when the other side breaks it.
