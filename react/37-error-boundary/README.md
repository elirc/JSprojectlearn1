# React 37 — Error boundaries

**Lesson: one render crash unmounts your whole app by default — put blast doors
around independent regions.**

## Run it

Open `original.html`, click "simulate the empty-portfolio user": white screen —
three widgets dead because one hit bad data. Refactor: the stocks card shows a
contained failure; weather and news live on; "retry" recovers it.

## What's wrong with the original?

Nothing *catches*. When a component throws during render, React's deliberate
default is to unmount the entire tree — a half-rendered UI can't be trusted, so
with no boundary to stop it, the failure propagates to the root. Result: a bug
that affects *one widget for some users* (empty portfolio → the classic
`cannot read properties of undefined`) takes down weather, news, and the
user's faith in the product. `try/catch` can't help — the throw happens inside
React's render call, not your event handler.

## What changed in the refactor

- **A ~20-line `ErrorBoundary`** — the one place class components remain
  *required* (no hook equivalent for `componentDidCatch`). Two halves:
  `getDerivedStateFromError` switches it to fallback rendering;
  `componentDidCatch` is the **reporting hook** — in production, this line
  feeds your error tracker. Write it once per app; use it everywhere.
- **Placement is the design decision**: one boundary per *independent region*
  (each dashboard card), so a crash is contained to exactly the UI that
  actually failed. One boundary around everything = a politer white screen;
  one per button = noise. Match doors to bulkheads: route-level + widget-level
  is the usual pair.
- **Recovery**: the fallback's *retry* clears the error state and re-renders
  children — genuinely useful when the cause was transient data (fix the
  data, click retry, the widget returns).
- **What boundaries don't catch**: event handler errors (use `try/catch` —
  you're outside render), async/promise rejections (js#43's territory), and
  errors in the boundary itself. They're for *render-time* failures.
- js#30's ethics still apply: the StockWidget bug **still deserves fixing** —
  boundaries contain and *report* failures, they don't excuse them. A
  boundary that silently eats errors is js#38's swallowed-listener sin at
  page scale.

## Key takeaway

Decide your app's failure geography on purpose: which regions may die alone?
Wrap each in a boundary with a useful fallback and real reporting. The
default — everything shares one fate — is the only unacceptable answer.
