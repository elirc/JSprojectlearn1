# 📘 Learning Guide: State Colocation (Project 29)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A little dashboard page with three panels stacked vertically:

- a search box you can type into (with "searching for: ..." appearing under it),
- a "BigChart" panel,
- a "BigTable" panel.

The chart and table are fakes — they just display a label — but each is artificially slowed down by 15 milliseconds to imitate real heavy components. Every panel shows its own render counter, so you can *watch* who does work.

In the original, typing one letter in the search box makes all three counters tick up together, and typing feels sluggish (~30ms per keystroke). In the refactor, typing moves only the search box's counter, and it's instant. The fix involves zero clever optimization — just moving one line of code.

## 2. Concepts you need first

### Re-renders flow downhill

Covered from scratch in project 27's LEARN.md; the one-sentence version: when a component's state changes, React re-runs that component **and everything it renders below it**, by default without asking whether the children cared.

```jsx
function Parent() {
  const [text, setText] = useState('');
  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <ExpensiveChild />  {/* re-runs on every keystroke, reads nothing */}
    </div>
  );
}
```

The critical detail: it's the state's **owner** that re-renders. Whoever calls `useState` is the owner. Change the state → the owner and its whole subtree re-run.

### "Blast radius"

An informal but useful term: the set of components that re-render when a piece of state changes = the owner plus everything below it in the tree. State owned at the top of the app has the whole app as its blast radius. State owned by a leaf component has a blast radius of one.

### Where should state live? (colocation vs lifting)

**Colocation** means keeping state as close as possible to the code that uses it — ideally *inside* the only component that reads it.

The opposite move, **lifting state up** (project 08 of this track), is for when *several* components need the same state: you move it to their closest shared parent.

These are not conflicting rules — they're the same rule read in both directions:

> State lives with exactly its readers. One reader → in that component. Several readers → their closest common parent. Everyone → context (later projects).

```jsx
// One reader: keep it inside.
function SearchBox() {
  const [text, setText] = useState(''); // nobody else needs this
  return <input value={text} onChange={e => setText(e.target.value)} />;
}
```

### Structural fix vs memoization fix

Project 28 taught the memoization machinery: `memo` + `useCallback` *suppress* re-renders that still get requested. Colocation is different — it changes the tree so the wasteful re-renders are **never requested at all**. No deps arrays, no reference-stability audits, nothing to maintain. That's why "move the state" is the first tool you should reach for, and memoization the second.

### Controlled input (brief)

`<input value={text} onChange={...} />` — the input displays state and reports keystrokes; the state is the single source of truth. Covered fully in project 07; used here without ceremony.

## 3. Walking through the original code

```jsx
let dashRenders = 0, chartRenders = 0, tableRenders = 0;

function slowdown(ms) {
  const until = performance.now() + ms;
  while (performance.now() < until) {}
}
```

Three global counters (plain variables, not state — pure instrumentation to display on screen), and the artificial 15ms brake that makes the fake components "heavy". `performance.now()` is a millisecond stopwatch.

```jsx
function BigChart() {
  chartRenders++;
  slowdown(15);
  return <div className="panel">📈 BigChart (renders: {chartRenders})</div>;
}
```

Every time React renders `BigChart`, the counter goes up and 15ms burn. `BigTable` is identical. Note neither takes any props — they depend on nothing.

```jsx
function Dashboard() {
  dashRenders++;
  const [searchText, setSearchText] = useState('');
```

Here's the decision that causes everything: the search text is owned by `Dashboard`, the **root** component. The comment in the file calls out the habit responsible: "state goes at the top."

```jsx
<input
  placeholder="type here — the WHOLE APP re-renders per keystroke"
  value={searchText}
  onChange={(e) => setSearchText(e.target.value)}
/>
{searchText && <p>searching for: {searchText}</p>}
```

A controlled input plus a conditional line of text. These two things are the *only* readers of `searchText` — and they're rendered directly by `Dashboard`, alongside:

```jsx
<BigChart />
<BigTable />
```

So the tree is: `Dashboard` owns the state, and the chart and table live under it.

## 4. What's wrong with it (in beginner terms)

On screen: type the word "hello" into the search box. Watch the three render counters — Dashboard, BigChart, BigTable — all tick up by one per letter, in perfect lockstep. Each letter also costs ~30ms (two 15ms brakes), so the typing has a slight rubber-band feel. On a real dashboard with a real chart and a real table it would be much worse.

Why does it happen? Mechanically:

1. keystroke → `setSearchText` → the owner (`Dashboard`) re-renders,
2. re-rendering `Dashboard` re-renders everything it returns — including `<BigChart />` and `<BigTable />`,
3. neither of them reads `searchText`. They redo 30ms of work to produce pixels identical to before.

The chart and table are being **billed for state they don't use**, purely because the state lives *above* them in the tree. There's no bug in any single component — the flaw is in *where the state lives*.

The README adds a nice symmetry: project 08 showed state placed too *low* (two siblings each kept a private copy and couldn't share). This project is state placed too *high*. Both break the same rule: state lives with exactly its readers.

## 5. Try it yourself first!

1. **Vague:** don't add any new API. Ask of `searchText`: "who actually reads this?" List the readers.
2. **Warmer:** the readers are the `<input>` and the "searching for" line — nothing else. Could those two things and their state live together somewhere smaller than `Dashboard`?
3. **Specific:** create a new component (call it `SearchBox`), move the `useState` and the input and the message into it, and render `<SearchBox />` from `Dashboard`. `Dashboard` keeps no search state at all.
4. **Check yourself:** type — only SearchBox's counter should move. If Dashboard's counter still ticks, some search state is still living in Dashboard.
5. **Stretch:** could you have fixed the lag instead with `memo` around BigChart and BigTable (project 28)? Yes — but compare: how many lines, and what do you now have to maintain forever?

## 6. Understanding the refactored solution

The refactor adds one component and moves three lines:

```jsx
function SearchBox() {
  searchRenders++;
  const [searchText, setSearchText] = useState('');

  return (
    <div className="panel">
      <input ... value={searchText}
        onChange={(e) => setSearchText(e.target.value)} />
      {searchText && <p>searching for: {searchText}</p>}
```

The state now lives in the smallest component that covers all its readers. A keystroke re-renders `SearchBox` — one input and one line of text — and nothing else. The chart and table aren't being skillfully skipped; they're simply **outside the blast radius**. There is no re-render to suppress.

```jsx
function Dashboard() {
  dashRenders++;
  return (
    <div>
      <h1>Dashboard (renders: {dashRenders})</h1>
      <SearchBox />
      <BigChart />
      <BigTable />
```

`Dashboard` became stateless. Its counter stays at 1 forever after the first paint.

Design points worth absorbing:

- **Zero memoization.** No `memo`, no `useCallback`, no deps arrays. Structural fixes are free forever; memoization is machinery you maintain. Try relocation first, machinery second.
- **The unified rule:** push state down to a single reader; lift it up to the closest common parent when several read it. Both directions serve "state lives with exactly its readers."
- **Deletability bonus:** SearchBox now carries its own state, so deleting or moving the search feature is a one-line change in Dashboard. Colocated code is easier to move and remove.
- **The diagnostic habit:** when you inherit a slow React app, the first question is "what state is living too high?" Most React performance problems are state-placement problems wearing a performance costume.

## 7. Words you learned (glossary)

- **State owner:** the component that calls `useState` for a piece of state; the one that re-renders when it changes.
- **Subtree:** a component and everything rendered beneath it.
- **Blast radius:** informal term for everything re-rendered by a state change (owner + subtree).
- **Colocation:** placing state in the smallest component that reads it.
- **Lifting state up:** moving state to the closest common parent when several components need it.
- **Structural fix:** removing wasteful renders by changing the tree, so they never happen.
- **Memoization fix:** suppressing requested renders with `memo`/`useCallback`/`useMemo` (projects 27–28).
- **Controlled input:** an input whose value comes from state and whose keystrokes update it.
- **Stateless component:** a component with no `useState` of its own — it only arranges children.
- **Instrumentation:** visible counters proving who rendered (explained in project 27's LEARN.md).

## 8. Experiments to try on the plane (no internet needed)

(One-time note, detailed in project 27's LEARN.md: the pages load React from a CDN, so *running* them needs internet on first load — reading and predicting works anywhere.)

1. **Move the state back up.** In the refactor, lift `searchText` back into `Dashboard` and pass `value`/`onChange` as props to `SearchBox`. Prediction: all counters march together again — proof that what matters is where the state *lives*, not where the input *appears*.
2. **Add a second reader.** Make `BigTable` display the search text (pass it as a prop). Now one reader isn't enough — where must the state live? Prediction: you're forced to lift it to `Dashboard`, and the table legitimately re-renders per keystroke; the chart still shouldn't. What tool from project 28 could then spare the chart?
3. **Raise the pain.** Change `slowdown(15)` to `slowdown(50)` in both heavy components in the *original*. Prediction: typing becomes obviously miserable (~100ms per letter). The same edit in the refactor changes typing not at all — the heavy components never re-render.
4. **Prove Dashboard is quiet.** In the refactor, type 20 characters and check Dashboard's counter. Prediction: still 1. Then click nothing else and explain to yourself why nothing except SearchBox ever re-rendered.
