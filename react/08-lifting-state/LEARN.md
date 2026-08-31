# 📘 Learning Guide: Lifting State Up

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A currency converter: two boxes, "USD" and "EUR", each with a number in a text field. The idea: type `100` in the USD box and the EUR box should show `92` (at a rate of 0.92 euros per dollar). In the refactor, it works in *both* directions — type euros and the dollars update too.

In the original, type in the USD box and... the EUR box just sits there showing its starting `9.20`. Nothing is broken in the code — every line does what it says. The bug is in *where the data lives*.

## 2. Concepts you need first

Components, props, `useState`, and controlled inputs (`value` + `onChange`) are taught from scratch in projects 01 and 07's LEARN.md files. New material below.

### The component tree

React apps form a family tree. `App` renders `DollarsBox` and `EurosBox`, so `App` is their **parent** and they are **siblings**:

```
        App
       /   \
DollarsBox  EurosBox
```

The tree matters because of the next rule.

### One-way data flow

In React, data travels in exactly one direction: **downward**, from parent to child, through props. A parent can hand values to its children. A child cannot reach *sideways* into a sibling, or *upward* into a parent. There is no `EurosBox.getState()` — no channel exists.

So if two siblings each own a private copy of "the amount," those copies can never talk. Not "it's hard" — there is no mechanism.

### Passing functions down (events flow up)

How does a child tell its parent anything, then? The parent hands the child a *function* as a prop; the child calls it when something happens:

```jsx
function Child({ onShout }) {
  return <button onClick={() => onShout('hi!')}>shout</button>;
}
function Parent() {
  return <Child onShout={(word) => console.log('child said', word)} />;
}
```

Data flows down as props; news flows up as function calls. That's the entire communication model.

### Lifting state up

When two components need the same data, the fix is structural: **move the state up to their closest common parent** (the nearest ancestor of both). The parent owns the one true value and passes it down to both, plus change-handler functions so either child can request updates. The children become **stateless** — no `useState` of their own; everything via props.

### Stateless (presentational) components

A stateless component is a pure "view": props in, JSX out, nothing remembered.

```jsx
function Price({ label, amount }) {
  return <p>{label}: {amount}</p>;
}
```

Stateless components are reusable (both currency boxes will be the SAME component) and trivially predictable.

### Deriving one value from another

If euros are always `dollars × 0.92`, you don't need a euros *state* — euros is a formula. Store the amount once (in dollars), compute euros during render. One stored value can feed any number of displayed views. (Project 09 makes this the headline.)

### Small JS bits used here

`Number('10')` converts a string to a number (inputs always give strings). `Math.round(n * 100) / 100` rounds to 2 decimal places. `Number.isFinite(n)` is false for the not-a-number results you get from converting junk like `'abc'` — used to blank the box instead of showing `NaN`.

## 3. Walking through the original code

```jsx
const RATE = 0.92; // USD -> EUR
```

The exchange rate as a constant.

```jsx
function DollarsBox() {
  const [dollars, setDollars] = useState('10');
  return (
    <div className="box">
      <h3>USD</h3>
      <input value={dollars} onChange={(e) => setDollars(e.target.value)} />
    </div>
  );
}
```

A self-contained box: its own state, a controlled input. Perfectly correct in isolation — that's what makes this bug sneaky.

```jsx
function EurosBox() {
  const [euros, setEuros] = useState('9.20');
  ...
}
```

An almost identical twin with its own private state. Look at the initial values: `'10'` and `'9.20'`. Someone computed 10 × 0.92 *by hand* and typed the answer in. That's the tell the README points at: a human doing at author-time what the code cannot do at runtime. The values agree for exactly as long as nobody types.

```jsx
function App() {
  return (
    <div>
      <h1>Currency converter</h1>
      <DollarsBox />
      <EurosBox />
```

`App` renders the two siblings and passes them *nothing*. Each box floats alone with its private copy of "the amount."

## 4. What's wrong with it (in beginner terms)

1. **The boxes cannot sync — structurally.** On screen: type `100` into USD. The USD box updates (its own state works fine). The EUR box shows `9.20`, forever. `DollarsBox` has no reference to `EurosBox`, no shared variable, no event channel. React state flows down only, and nothing is above both boxes holding the amount.
2. **There are two states for one fact.** The app is about ONE quantity of money, viewed in two currencies. The code stores TWO independent numbers. Any design with two copies of one fact eventually shows two different facts — here it happens on the very first keystroke.
3. **The tempting wrong fixes make it worse.** A beginner's instinct: keep both states and add machinery to copy one into the other (callbacks wired through the parent, `useEffect`s watching for changes). That can be made to *sort of* work — until the two effects trigger each other in a loop, or rounding makes them fight (type `10`, EUR becomes `9.2`, which writes back `9.99...`). The README calls this the Rube Goldberg machine; project 21 dismantles it. The real fix removes the second state instead of syncing it.

## 5. Try it yourself first!

1. **Vague hint:** don't ask "how do I make the boxes talk?" Ask "how many amounts actually exist in this app?" The answer is one. Who should own it?
2. **More specific:** move a single `useState` into `App` — store the amount in ONE currency (say dollars). Delete both children's `useState`s.
3. **Make the children dumb:** turn both boxes into one reusable component receiving `label`, `amount`, and `onAmountChange` as props. It renders a heading and a controlled input, nothing more.
4. **Derive the other box:** compute `euros` from `dollars * RATE` during `App`'s render and pass it down. Typing dollars should now move BOTH boxes.
5. **Both directions:** when the EUR box reports a change, what should `App` set? (Hint: convert back — `newEuros / RATE` — and store *that* in the one state.)
6. **Polish:** inputs hand you strings; `Number(...)` before math, and round the result so the boxes don't fill with `9.200000000000001`.

## 6. Understanding the refactored solution

**One stateless child serves both boxes:**

```jsx
function CurrencyBox({ label, amount, onAmountChange }) {
  return (
    <div className="box">
      <h3>{label}</h3>
      <input value={amount} onChange={(e) => onAmountChange(e.target.value)} />
    </div>
  );
}
```

No `useState`. It displays `amount` and reports keystrokes upward through `onAmountChange`. It doesn't know whether it's dollars or euros — which is exactly why ONE component can be both boxes. Notice the shape `{ value-ish prop, on-change-ish prop }`: this is the controlled-input contract from project 07, promoted one level — a *controlled component*.

**The single owner:**

```jsx
const [dollars, setDollars] = useState('10');
const euros = format(Number(dollars) * RATE);
```

`App` — the closest common parent — owns the ONE state. Euros is a plain `const`, recomputed each render. It cannot be stale, because it isn't stored; it's a formula over the truth.

**Wiring both directions:**

```jsx
<CurrencyBox label="USD" amount={dollars} onAmountChange={setDollars} />
<CurrencyBox label="EUR" amount={euros} onAmountChange={handleEurosChange} />
```

The USD box edits the source directly (`setDollars` passed straight down as the handler). The EUR box — the *derived* view — routes its edits through a translator:

```jsx
function handleEurosChange(newEuros) {
  setDollars(format(Number(newEuros) / RATE));
}
```

Typing euros converts back to dollars and updates the one true state; the next render recomputes `euros`, and both boxes repaint from the single source. Two-way sync, zero syncing code — both directions are just "update the owner."

**The tidy-up helper:**

```jsx
function format(n) {
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : '';
}
```

Rounds to cents and shows an empty box (instead of `NaN`) while you type something un-numeric.

**The decision procedure to keep forever** (from the README): who needs this state? *One component* → keep it there (colocation, project 29). *A few components* → lift it to their closest common parent (this project). *Everyone everywhere* → context (project 34). Start low; lift only as far as needed.

## 7. Words you learned (glossary)

- **Component tree** — the parent/child structure formed by who renders whom.
- **Siblings** — components with the same parent; they have no direct channel.
- **One-way data flow** — data moves parent→child via props, never sideways or up.
- **Callback prop** — a function passed down so the child can send news up (`onAmountChange`).
- **Lifting state up** — moving state to the closest common parent of all who need it.
- **Closest common parent** — the nearest ancestor of every component sharing the data.
- **Stateless component** — props in, JSX out, no `useState`.
- **Controlled component** — displays a `value` prop, reports edits via an `on...Change` prop; the controlled-input contract at component scale.
- **Derived value** — computed from stored state during render (`euros`); can't go stale.
- **Source of truth** — the one stored copy (`dollars`) everything else is computed from.
- **Colocation** — keeping state in the lowest component that needs it.
- **`Number()` / `Number.isFinite()`** — string→number conversion, and the junk detector for it.

## 8. Experiments to try on the plane (no internet needed)

Note once: these pages load React from a CDN, so *running* them needs internet on first load (if opened before the flight, the browser may have React cached). Reading and editing the code is fully offline — write predictions first.

1. **Reproduce the original's bug knowingly:** type `100` in USD, then type `50` in EUR. Prediction: the app now confidently displays two amounts that mean different money (100 USD ≈ 92 EUR, but the EUR box says 50). Two states, one concept — now visibly lying.
2. **Add a third view for free (refactor):** under the boxes add `<p>In pounds: {format(Number(dollars) * 0.79)}</p>`. Prediction: it tracks every keystroke in either box, with no new state — a third derived view of the one truth. Adding GBP to the *original* would mean a third private state and three-way syncing.
3. **Change the rate:** set `RATE = 2` in the refactor. Prediction: EUR instantly shows double the dollars, both directions still consistent. In the original, prediction: nothing changes at all until you edit the hand-typed `'9.20'` too — the stale-initials problem made vivid.
4. **Break the derived edit:** in `handleEurosChange`, change `/ RATE` to `* RATE`. Prediction: type `92` in EUR and dollars becomes `84.64` instead of `100`; then the render recomputes EUR as `77.87`... the boxes now chase each other downward as you type in EUR. A good taste of why the translator function must be the exact inverse.
5. **Try to sabotage the sync (refactor):** find ANY sequence of typing that makes the two boxes disagree with `dollars × RATE = euros` (allowing rounding). Prediction: you can't — the invariant is enforced by structure (one state + a formula), not by discipline. That's what "correct by construction" means.
