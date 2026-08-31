# 🏋️ Practice: State Colocation

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for the file: everything can be written and predicted offline; running the pages needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Predict the counters (warm-up)

Imagine adding this to the *refactor's* `Dashboard` (and nothing else changes):

```jsx
const [tick, setTick] = useState(0);
// in its JSX, under the h1:
<button onClick={() => setTick((t) => t + 1)}>tick</button>
```

Fresh page: all four counters (Dashboard, SearchBox, BigChart, BigTable) read 1. Predict every counter after: type `hi` in the search box, then click `tick` twice. Then answer: why didn't colocation protect the chart from the tick button?

*Practices:* blast radius = the state's owner plus everything below it.
*Hint:* `tick` is owned by the root.
*Expected:* your four numbers and the explanation match the solution.

### ⭐⭐ 2. Compact-mode checkbox (core)

Give `BigTable` a "compact" checkbox that switches its padding between `12px` and `2px`. Place the state so that toggling it costs exactly one BigTable render — and typing in the search box still costs the table nothing.

*Practices:* colocating brand-new state on the first try, instead of defaulting to the top.
*Hint:* who reads `compact`? Only the table. So who owns it?
*Expected:* toggling moves only BigTable's counter (+1 per toggle, 15ms each — fine for a rare action); Dashboard's counter stays 1 forever.

### ⭐⭐ 3. Two search boxes (core)

Render a second `<SearchBox />` in `Dashboard` (say, one above the chart, one below). Type `abc` into the first, then `z` into the second. Predict, then verify: (a) does each box keep its own text? (b) what do the two "SearchBox renders:" numbers show, and why are they misleading?

*Practices:* every instance owns its own state; instrumentation via a shared module variable counts *all* instances.
*Hint:* `searchRenders` is one global `let`, incremented by whichever instance renders.
*Expected:* texts are fully independent. The counter is shared: work out how many times it was incremented in total (mounts count too) — and note that each box *displays* the value as of its own last render, so the two on-screen numbers disagree.

### ⭐⭐ 4. Clear-all from the parent (core)

Product asks for a "clear search" button in the Dashboard header. The text lives inside `SearchBox` — the parent can't call its setter. Implement it *without* lifting the text back up (that would re-tax the chart per keystroke). Then note the one cost your solution does pay.

*Practices:* commanding a colocated child to start over; weighing blast radii per action.
*Hint:* a component's `key` controls its identity (project 31 makes this the whole lesson).
*Expected:* clicking "clear search" empties the box. The click re-renders Dashboard and therefore the chart and table once (~30ms) — a fair price for a rare action, unlike per-keystroke.

### ⭐⭐⭐ 5. A clock that doesn't tax the dashboard (challenge)

Add a `Clock` panel showing "up N s", ticking once per second via `setInterval`. Requirement: each tick re-renders *only* the clock. Also write one sentence on what the app would cost per second if the seconds state lived in `Dashboard`.

*Practices:* colocation for state that changes *by itself* — where wrong placement hurts even with nobody typing.
*Hint:* the interval needs `useEffect` with cleanup (projects 18/25) and the updater form.
*Expected:* the clock's own counter climbs once per second; chart, table, search and Dashboard counters never move while you watch.

## Solutions

### 1. Predict the counters

Typing `hi`: SearchBox 1→3; the other three stay 1 — the keystrokes' owner is `SearchBox`, so its blast radius is itself. Two ticks: `tick`'s owner is `Dashboard`, whose blast radius is the whole app — so Dashboard 1→3, BigChart 1→3, BigTable 1→3, and SearchBox 3→5 (it's in the subtree too, even though it ignores `tick`).

**Why:** colocation shrank the blast radius of the *search text*, not of everything. Any state still owned by the root still re-renders the world. The lesson generalizes: audit each `useState` separately — every piece of state has its own owner and its own radius.

### 2. Compact-mode checkbox

```jsx
function BigTable() {
  tableRenders++;
  slowdown(15);
  const [compact, setCompact] = useState(false);
  return (
    <div className="panel" style={{ padding: compact ? 2 : 12 }}>
      🗃 BigTable (renders: {tableRenders}){' '}
      <label>
        <input type="checkbox" checked={compact}
               onChange={(e) => setCompact(e.target.checked)} />
        compact
      </label>
    </div>
  );
}
```

**Why:** `compact` has exactly one reader — the table — so the table owns it. A toggle re-renders one component; Dashboard never learns it happened. Had the habit "state at the top" won, every toggle would also burn the chart's 15ms and repaint the search box for nothing.

### 3. Two search boxes

```jsx
<SearchBox />
<BigChart />
<SearchBox />
```

(a) Yes — each `<SearchBox />` is its own *instance* with its own `useState` slot; typing in one never touches the other. (b) The global counts every render by *either* instance: 2 mounts + 3 keystrokes in box one + 1 in box two = 6 total increments. But each box shows the number as of its own last render — after the sequence above, box one displays 5 (its last render was the 5th increment) and box two displays 6. The numbers disagree because the *instrumentation* is shared even though the *state* is not.

**Why:** state belongs to instances; module variables belong to the file. That's exactly why module `let` is fine for debug counters and wrong for real data — two instances would fight over it (project 26's drawers, one level up).

### 4. Clear-all from the parent

```jsx
function Dashboard() {
  dashRenders++;
  const [searchSession, setSearchSession] = useState(0);
  return (
    <div>
      <h1>Dashboard (renders: {dashRenders})</h1>
      <button onClick={() => setSearchSession((s) => s + 1)}>clear search</button>
      <SearchBox key={searchSession} />
      <BigChart />
      <BigTable />
    </div>
  );
}
```

**Why:** changing `key` tells React "different thing" — the old SearchBox instance is unmounted (text state destroyed) and a fresh one mounts with `''`. Colocation survives: keystrokes still cost one small component. The cost you accept: the clear *click* changes Dashboard state, so the whole subtree re-renders once. Compare the alternative — lifting the text into Dashboard — which would re-tax chart and table on *every keystroke* to make a *rare* button cheap: backwards economics.

### 5. A clock that doesn't tax the dashboard

```jsx
let clockRenders = 0;

function Clock() {
  clockRenders++;
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="panel">⏱ up {secs}s (renders: {clockRenders})</div>;
}
// in Dashboard's JSX: <Clock />
```

(Add `useEffect` to the destructured hooks at the top of the file.)

**Why:** the seconds have one reader — the clock face — so the clock owns them. Owned by `Dashboard`, this state would re-render chart + table every single second: ~30ms of waste per second, forever, with no user interaction at all — self-ticking state is where bad placement hurts most. The `[]` effect with `clearInterval` cleanup and the `s => s + 1` updater are the standard interval recipe (project 25): one interval, no stale closure, no leak on unmount.
