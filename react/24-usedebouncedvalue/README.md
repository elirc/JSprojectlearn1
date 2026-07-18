# React 24 — useDebouncedValue

**Lesson: js#28's debounce can't survive re-renders — in React, debounce the
*value*, not the function.**

## Run it

Open `original.html`, type 5 letters, and watch the search counter: **5
searches**, each 500ms late. Refactor: type "react" quickly — one search, for
the final string.

## What's wrong with the original?

The js#28 `debounce(fn, ms)` is correct — *for a world where the debounced
function is created once*. A component body re-runs on every render, so
`debounce(...)` builds a **brand-new wrapper with a brand-new empty timer** each
keystroke. The old render's pending timer? Nobody holds its `clearTimeout`
handle anymore — it fires regardless. Net result, visible on the counter: one
search per keystroke, each delayed 500ms. **Worse than no debounce** — you kept
the latency and lost the deduplication. This is the collision between js#28's
closures-as-state and React's renders-are-snapshots (project 11): per-call
closure state doesn't survive re-render unless React is holding it.

## What changed in the refactor

- **The reframe: debounce the value.** `useDebouncedValue(query, 500)` returns
  a value that trails `query` by 500ms of quiet. Inside: one effect whose
  cleanup clears the pending timer whenever `value` changes —
  **cleanup-before-rerun (project 18) literally is the debounce**. The timer
  survives re-renders because `useState`/`useEffect` are how React holds state
  across them.
- **Downstream code gets a plain value**, so everything composes normally: the
  fetch effect deps on `[debouncedQuery]` and keeps its project-19 race guard.
  Debouncing stopped being a special calling convention and became data flow.
- **The input stays instant** — it renders from `query`; only the expensive
  work follows `debouncedQuery`. Two values, two jobs: responsiveness and
  restraint.
- (A debounced *callback* is still sometimes right — for that you'd stabilize
  the wrapper with `useRef`/`useCallback`, project 26/28 material. But for
  "expensive reaction to fast-changing input," the value version is simpler
  and composes better.)

## Key takeaway

Patterns built on closure state (debounce, throttle, memoize-with-cache) break
inside render bodies, because render bodies are re-run. The React translation
is always the same: move the hidden state into hooks, and where possible
express the pattern as a *derived value* — then ordinary effects and deps do
the rest.
