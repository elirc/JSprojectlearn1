# React 30 — Stable props

**Lesson: the memo-killer trio — inline arrays, objects, and arrows are fresh
references every render, even when their contents never change.**

## Run it

Open `original.html` and click "tick" (a state change unrelated to the chart):
the chart's render counter climbs anyway, 20ms a pop. Refactor: ticks don't
touch it; changing the chart's color re-renders it exactly once.

## What's wrong with the original?

The chart author did everything right — heavy component, wrapped in `memo`. The
*caller* defeats it three ways on one line each:

```jsx
series={[3, 1, 4, 1, 5]}                     // fresh array every render
options={{ color: 'blue', logScale: false }} // fresh object every render
onZoom={() => console.log('zoom')}           // fresh function every render
```

Contents never change; references always do — and `memo` compares references
(project 10's `Object.is` model). So this memo has *never once* skipped a
render. The trap's cruelty is that none of these look stateful — they read as
plain configuration. Project 28 covered the function case; this generalizes it:
**any literal in JSX is a per-render allocation.**

## What changed in the refactor

The toolkit, one fix per prop type — in order of preference:

1. **Hoist constants to module scope** (`SERIES`, `CHART_OPTIONS`). Module
   scope renders zero times; a value that depends on nothing should be built
   once, ever. Simplest fix, zero hooks — always check for this first.
2. **`useMemo` for state-derived objects/arrays** — `options` keeps its
   reference until `color` actually changes. This is `useMemo`'s second job
   (project 27's first was expensive math): *reference stability as a
   correctness signal* for memoized consumers.
3. **`useCallback` for functions** (project 28).

And the receipt on screen: unrelated ticks leave the counter still; a real
color change re-renders exactly once — stability without staleness.

Same rule, wider than memo: these fresh references also re-trigger anything
that *depends* on them — a `useEffect` with an object dep fires every render
for the same reason. Reference discipline pays everywhere deps are compared.

## Key takeaway

When a memo'd component re-renders mysteriously, read its call site and hunt
the literals: `[...]`, `{...}`, `() =>` in JSX props are new every render.
Hoist what's constant, memo what's derived, callback what's callable — and the
memo you already wrote starts earning its keep.
