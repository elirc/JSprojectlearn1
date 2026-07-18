# React 28 — React.memo + useCallback

**Lesson: `memo` compares props by reference — a fresh arrow function defeats it
silently. `useCallback` keeps the reference stable.**

## Run it

Open `original.html` and type in the filter box: laggy, and the row-render
counter climbs by 60 per keystroke. Refactor: smooth, counter frozen at 60.

## What's wrong with the original?

The author did the "right thing" — wrapped the slow `Row` in `React.memo` — and
got nothing for it. `memo` skips re-rendering when props are unchanged, *judged
by `Object.is` per prop* (project 10's reference model, now pointed the other
direction). `const handlePick = (id) => setPicked(id)` creates a **new function
object every render**, so every Row's `onPick` "changed" every time. The memo
isn't broken; it's being fed a fresh prop and dutifully re-rendering 60 slow
rows per keystroke (~120ms of work whose pixels cannot change).

This failure is silent — no warning, no error, just a memo that never fires.
Most `memo` wrappers in real codebases are in exactly this state.

## What changed in the refactor

- **`useCallback((id) => setPicked(id), [])`** — `useMemo` for a function:
  returns the *same* function object across renders until deps change. Rows
  now see `Object.is`-equal props and skip. The counter is the receipt.
- **The empty deps are honest** because the callback uses the updater form
  (project 11) — it reads nothing from render scope. That's the recurring
  synergy: updater functions make callbacks dep-free, which makes them
  stable, which makes memo work.
- **The chain, spelled out on the page**: stable props (`useCallback` for
  functions, `useMemo` for objects/arrays) → memo'd child → skip. Every link
  required. One inline `style={{...}}` or fresh array in the props and that
  child's memo is decoration — project 30 is a bug-hunt for exactly those.
- Priorities, honestly: composition fixes (state colocation — project 29,
  children-as-props — project 33) beat memoization when available; they remove
  renders *structurally*. `memo`+`useCallback` is for when a genuinely shared
  parent re-renders and children are genuinely heavy. And like project 27:
  measure first, and keep a render counter visible while you work.

## Key takeaway

`memo` is a contract: "I'll skip if you keep my props reference-stable." The
component can't hold up its end alone — the *parent* must stop manufacturing
fresh functions and objects per render. When you add `memo`, always audit what's
being passed in; a memo without stable props is a comment that lies.
