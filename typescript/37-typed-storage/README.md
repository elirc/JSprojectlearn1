# TS 37 — Typed storage

**Lesson: storage is a message from the past — and the past ran different
code. A key registry + per-key schemas make both the keys and the shapes
honest.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`save(key: string, value: unknown)` / `load(key): any` — freehand keys,
shrug-typed reads. Both classic storage corruptions walk right in:
**key collision** (feature B reuses `'settings'` for its own shape;
feature A's `fontSize + 2` becomes NaN) and **version drift** (v1 stored a
bare number, v2 expects an object → "launched undefined times"). The root
insight: stored data wasn't written by *your current code* — it's ts#13's
untrusted-input lesson **with a time dimension**, and `any` on the read
path launders whatever history left there.

## What changed in the refactor

- **A key registry**: `STORAGE_SCHEMAS` maps every storage key to its
  schema (imported from ts#34 — the schema layer earning cross-project
  rent). Keys become a derived union: typo'd or unregistered keys don't
  compile.
- **Key↔shape correlation** (ts#18/20's move): `save<K>(key: K, value:
  StoredShape<K>)` — feature B's wrong-shaped write to `'settings'` is a
  type test now. `StoredShape<K>` is extracted from the registry via
  `infer` (ts#27) — one source of truth, everything derived (ts#33's
  architecture, applied to persistence).
- **Every load validates** against the key's schema: v1's bare number
  fails v2's schema and returns `null` — "first launch (or old data)"
  instead of undefined-typed garbage. Corrupted JSON → `null` too
  (react#23's guarded load). The return type `StoredShape<K> | null`
  makes callers face absence (ts#05).
- Real-world upgrade path: versioned keys (`settings.v2`) with migration
  functions — the registry structure is exactly where those live.

## Key takeaway

Treat storage like a network boundary where the other party is your own
past self: register every key with its schema, correlate writes to keys,
validate every read. History can still surprise you — but it surfaces as
a typed `null` at the boundary, not as NaN arithmetic three features
away.
