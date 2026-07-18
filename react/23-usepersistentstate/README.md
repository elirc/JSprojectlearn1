# React 23 — usePersistentState

**Lesson: wrap a policy (persistence) into a hook with `useState`'s exact
signature, and the policy becomes impossible to forget.**

## Run it

Open `original.html`, type a username, refresh: gone. Refactor: everything
survives, including the username.

## What's wrong with the original?

Three settings, three persistence strategies: theme saves manually inside its
handler, font size saves via an effect, and username — added last — **saves not
at all**. The pattern existed in the first two settings, but as *prose to
imitate*, not *code to call*; the third author had to remember, and didn't.
Plus the unguarded parts: storage is read on every render (lazy init exists for
this), and a corrupted entry (`Number('abc')` → `NaN`) breaks the UI — nothing
treats storage as what it is, user-editable input (js#14 guarded its load for
the same reason).

## What changed in the refactor

- **`usePersistentState(key, default)` — useState's signature plus a key.**
  Drop-in replacement: consumers destructure `[value, setValue]` exactly as
  before. Because using the hook *is* the persistence, the username can't
  forget to persist — the policy moved from convention to construction.
- **The policy details live once, done right**:
  - *Lazy initialization* — `useState(() => ...)`: the function runs once on
    mount, not per render. Any expensive-to-compute initial state wants this.
  - *JSON serialization* — numbers, objects, arrays all work, not just strings.
  - *Guarded load* — corrupted/missing entries fall back to the default in a
    `try/catch` instead of crashing (storage is input; validate at the
    boundary, js#30).
  - *Write-through effect* — saving is automatic on every change; there is no
    "remember to save" call site anywhere.
- This is project 22's lesson compounding: `useFetch` packaged
  status+race-guard; this packages init+parse+guard+save. Custom hooks are
  where correctness machinery goes to be inherited rather than re-remembered.

## Key takeaway

When a stateful policy must apply uniformly — persistence, undo, analytics on
change — don't document the pattern, *package* it as `useX` with a familiar
signature. The best conventions are the ones that stopped being conventions
and became the only way to do it.
