# 55 — File-based JSON database

**Lesson: "just save it to a JSON file" hides three real database problems —
atomic writes, write serialization, and an API that owns the update cycle.**

## Run it

```
node --test 55-json-db/
```

## What's wrong with the original?

1. **`writeFileSync` is not atomic.** It truncates the file to zero bytes,
   *then* writes. A crash or power cut between those steps leaves an empty
   or half-written file — the save operation destroys the data it was
   saving. This is the classic way hobby apps lose everything.
2. **Sync I/O blocks the whole process** — in a server, every request
   stalls while one touches disk.
3. **First run crashes** (no ENOENT handling), and a corrupt file bricks
   the app with a bare `JSON.parse` throw.
4. **Load-everything/save-everything API**: every caller re-implements
   read-modify-write, so two concurrent callers both load `{users:[A]}`,
   one saves `[A,B]`, the other overwrites with `[A,C]` — B silently gone.
   The lost-update problem, on your laptop.

## What changed in the refactor

- **Atomic write = temp file + `rename()`.** Rename is atomic on the same
  filesystem, so readers see the old complete file or the new complete
  file, never a torn one. Detail worth stealing: the temp file lives in
  the *same directory* as the target — `/tmp` is often a different
  filesystem, where rename silently becomes copy+delete (not atomic).
- **`update(fn)` is the whole write API.** You hand your mutation to the
  db; it owns load → modify → save. Callers *can't* re-implement the cycle
  wrong because they never hold the cycle.
- **Writes are serialized on a promise chain** (`#writeChain`): each update
  runs after the previous one's save completes, and sees its changes. The
  test fires 20 un-awaited concurrent increments — all 20 land. A failed
  update rejects its caller but re-chains so the queue never wedges
  (compare project 43's "one bad attempt shouldn't kill the harness").
- **Missing file → `defaultData`** (cloned, so two dbs never share one
  object — project 25's reference-vs-value lesson). **Corrupt file → loud
  `SyntaxError`**: silently replacing a damaged file with defaults would
  *be* data loss with extra steps.

## Key takeaway

Files are shared mutable state with a power cord. Any persistent store —
even one file — needs the same two guarantees a database gives you:
torn-write protection (atomic rename) and lost-update protection
(serialized read-modify-write). Fifty lines buys both; skipping them is
how "it's just a JSON file" becomes a support nightmare.
