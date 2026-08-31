# 📘 Learning Guide: Error Boundaries (Project 37)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A dashboard with three independent widgets stacked in cards:

- **Weather**: "☀️ 22°C, sunny"
- **Stocks**: "📈 top holding: ACME"
- **News**: "📰 Nothing bad happened today."

Plus a sinister button: "simulate the empty-portfolio user". The stock widget has a real-world style bug — it assumes some data always exists, and for certain users it doesn't.

In the original, clicking that button turns the **entire page blank white**. Not just the stock card — weather and news vanish too. In the refactor, the same click shows a red "⚠️ Stocks failed to load. [retry]" card while weather and news carry on, and after fixing the data, "retry" brings the widget back.

## 2. Concepts you need first

### Throwing: how JavaScript signals failure

When code hits something impossible, it **throws** an error — execution stops on the spot and the error travels up through the callers until something catches it:

```js
const obj = {};
obj.positions[0];  // throws: cannot read properties of undefined
```

`obj.positions` is `undefined` (the field doesn't exist), and reading `[0]` from `undefined` is illegal. This exact message — "cannot read properties of undefined" — is arguably the most common crash in JavaScript apps, and it stars in this project.

`try/catch` is the normal tool for catching:

```js
try { risky(); } catch (err) { console.log('survived:', err.message); }
```

### Why try/catch can't save a rendering component

Your component functions are not called by you — they're called by **React**, inside its own rendering machinery. When `StockWidget` throws mid-render, the throw happens deep inside React's call, not inside any `try` block you could write in your JSX. You can't wrap `<StockWidget />` in try/catch — that line doesn't *call* the component, it just creates a description of it. React calls it later.

### React's default: one throw unmounts everything

When a component throws during render, React's deliberate policy is: a half-rendered tree can't be trusted to show correct UI, so — if nothing catches the error — **unmount the entire tree**. The whole app disappears; users get a white page. Harsh, but honest: better blank than silently wrong.

### Error boundaries: blast doors in the tree

An **error boundary** is a special component that catches render-time errors thrown by anything *below* it, and shows a **fallback** UI (a substitute like "this section failed") instead of letting the failure travel to the root:

```jsx
<ErrorBoundary>
  <RiskyWidget />
</ErrorBoundary>
```

If `RiskyWidget` throws, only the boundary's slot shows the fallback; siblings outside the boundary are untouched. Think of a ship's bulkheads: one flooded compartment doesn't sink the vessel.

### Class components (a 90-second history lesson)

Before hooks, components were written as **classes** — a JavaScript feature bundling data and methods:

```jsx
class Hello extends React.Component {
  state = { n: 0 };                              // state as a field
  render() { return <p>{this.props.name}</p>; }  // render() returns JSX
}
```

- `extends React.Component` — inherits React's component plumbing.
- `this.props` / `this.state` — props and state as object fields.
- `this.setState({...})` — the class version of a state setter.
- `render()` — the method React calls; equivalent to a function component's body.
- **Lifecycle methods** — specially-named methods React calls at set moments (mounting, erroring, etc.).

You'll rarely write classes today — **except here**. Error boundaries require two lifecycle hooks that have **no function/hook equivalent**: this is the one place classes are still mandatory. You write ~20 lines once per app and reuse it everywhere.

### The two error hooks

- `static getDerivedStateFromError(error)` — called when a descendant throws; whatever it returns becomes state, letting the next render show the fallback. (A `static` method belongs to the class itself, not an instance, and can't touch `this`.)
- `componentDidCatch(error, info)` — called after, with details (including `info.componentStack`, the chain of components involved). This is the **reporting** spot: in production, this line feeds your error-tracking service.

## 3. Walking through the original code

```jsx
function StockWidget({ portfolio }) {
  // The bug: assumes portfolio.positions exists. For SOME users
  // (empty portfolio), it's undefined.
  return (
    <div className="widget">
      📈 top holding: {portfolio.positions[0].symbol}
    </div>
  );
}
```

The buggy widget. `portfolio.positions[0].symbol` works only while `positions` exists and has at least one entry. Weather and News are trivial static widgets.

```jsx
const [portfolio, setPortfolio] = useState({
  positions: [{ symbol: 'ACME' }],
});
```

The app starts with healthy data.

```jsx
<button onClick={() => setPortfolio({})}>
  simulate the empty-portfolio user
</button>
<WeatherWidget />
<StockWidget portfolio={portfolio} />
<NewsWidget />
```

The button replaces the portfolio with `{}` — no `positions` field — recreating what some real user's account looks like. The three widgets are rendered bare: no boundary anywhere, so nothing catches.

## 4. What's wrong with it (in beginner terms)

On-screen story: the dashboard looks great. Click "simulate the empty-portfolio user". The **entire page goes blank**. No error message for the user, no weather, no news, nothing. (In the console — visible if you open the browser's developer tools — React logs the error; users never see consoles.)

The chain:

1. `setPortfolio({})` → re-render.
2. `StockWidget` runs, evaluates `portfolio.positions[0]` → `positions` is `undefined` → **throw** mid-render.
3. React looks up the tree for an error boundary. There isn't one.
4. Policy kicks in: unmount everything. Weather (perfectly healthy) — gone. News (perfectly healthy) — gone.

What makes this a *design* flaw and not just "a bug": bugs are inevitable — third-party widgets, weird account states, data your tests never saw. The unacceptable part is the **failure geography**: one widget's bad day, scoped to some users, took down three widgets and the user's trust. The blast radius of a failure defaulted to "everything", because nobody decided otherwise.

Note also what a plain `try/catch` couldn't have fixed: there's no place in `App` to put it — React calls `StockWidget`, not you.

## 5. Try it yourself first!

1. **Vague:** you can't prevent every throw. Can you contain one? What React feature exists solely to catch render-time errors from below?
2. **Warmer:** you'll need a class component (the only place they're still required) with the two special methods — one to flip into "failed" state, one to log. Its `render()` shows a fallback when failed, `this.props.children` otherwise.
3. **Specific:** write `class ErrorBoundary extends Component` with `state = { error: null }`, `static getDerivedStateFromError(error) { return { error }; }`, `componentDidCatch(error, info) { console.error(...); }`, and a render that returns a fallback div (with the error) or `children`. Wrap **each widget separately**.
4. **Design question before coding:** why one boundary per widget, not one around all three? What would each choice mean on screen?
5. **Stretch:** add a "retry" button in the fallback. What state change makes the boundary try its children again?

## 6. Understanding the refactored solution

The boundary, in full (~20 lines, written once per app):

```jsx
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error }; // render the fallback on the next pass
  }

  componentDidCatch(error, info) {
    // the reporting hook: send to your error tracker here
    console.error('Boundary caught:', error.message, info.componentStack);
  }
```

Two halves, two jobs: the static method flips the state so the *next* render shows the fallback; `componentDidCatch` **reports**. That console line is a placeholder for a real error tracker in production — failures must be seen by developers, not just softened for users.

```jsx
  render() {
    if (this.state.error) {
      return (
        <div className="widget fallback">
          ⚠️ {this.props.label ?? 'This section'} failed to load.
          <button onClick={() => this.setState({ error: null })}>
            retry
          </button>
```

The fallback is useful, not generic: labeled per section, with **retry** — which simply clears the error state, making `render()` return `this.props.children` again, so React re-attempts them. Genuinely useful when the cause was transient: click "fix the data", then "retry", and the widget returns. (`?? ` means "or, if that's null/undefined, use this instead".)

```jsx
<ErrorBoundary label="Weather"><WeatherWidget /></ErrorBoundary>
<ErrorBoundary label="Stocks"><StockWidget portfolio={portfolio} /></ErrorBoundary>
<ErrorBoundary label="News"><NewsWidget /></ErrorBoundary>
```

**Placement is the actual design decision.** One boundary per *independent region* — each dashboard card can die alone. One boundary around everything = a politer white screen (everything still shares one fate). One per button = noise. The usual professional pair: route-level (page can fail) + widget-level (cards can fail).

Boundaries' limits, from the README — they do **not** catch: errors in event handlers (you're outside render — use ordinary try/catch there), async/promise rejections, or errors in the boundary itself. Render-time failures only.

And the ethics: `StockWidget`'s bug **still deserves fixing** (the widget was deliberately left buggy in the refactor to prove containment). Boundaries contain and report failures; they don't excuse them. A boundary that silently eats errors is a lie at page scale.

## 7. Words you learned (glossary)

- **Throw / exception:** JavaScript's stop-everything failure signal, traveling up the call stack.
- **try/catch:** catches throws in code *you* call — useless for component render bodies, which React calls.
- **White screen (of death):** the blank page when an uncaught render error unmounts the whole tree.
- **Error boundary:** a component that catches render errors from its descendants and shows a fallback.
- **Fallback UI:** the substitute content shown where the failed section would have been.
- **Blast radius / failure geography:** which parts of the UI share a failure's fate — a choice you make with boundary placement.
- **Class component:** the pre-hooks component style; still required for error boundaries.
- **Lifecycle method:** a specially-named class method React calls at defined moments.
- **`getDerivedStateFromError`:** static lifecycle that turns a caught error into state → fallback render.
- **`componentDidCatch`:** lifecycle for logging/reporting the caught error (with the component stack).
- **`static`:** a method on the class itself rather than on instances; cannot use `this`.
- **Component stack:** the chain of components that were rendering when the error hit.
- **Retry:** clearing the boundary's error state so children get re-rendered from scratch.
- **Error tracker:** a production service collecting reported errors so developers see them.

## 8. Experiments to try on the plane (no internet needed)

(One-time note, detailed in project 27's LEARN.md: pages load React from a CDN — running them needs internet on first load; reading and editing don't.)

1. **Retry without fixing.** In the refactor, click "simulate", then "retry" *without* clicking "fix the data". Prediction: the fallback instantly returns — children re-render, hit the same bad data, throw again, get caught again. Retry recovers from *transient* causes only.
2. **One big boundary.** Replace the three boundaries with a single one around all three widgets. Prediction: "simulate" now shows ONE fallback where the whole dashboard was — politer than white, but weather and news still die for stocks' sins. Placement, not existence, is the design.
3. **Prove handlers aren't covered.** Add to `WeatherWidget` a button: `onClick={() => { throw new Error('handler boom'); }}`. Prediction: clicking it does NOT trigger the boundary's fallback (the error logs to the console; the UI stays). Event handlers need their own try/catch.
4. **Fix the actual bug.** Change StockWidget's line to `{portfolio.positions?.[0]?.symbol ?? 'no holdings yet'}` (`?.` stops safely at missing fields). Prediction: "simulate" now shows a friendly message and the boundary never fires. Best outcome of all — boundaries are the net, not the act.
