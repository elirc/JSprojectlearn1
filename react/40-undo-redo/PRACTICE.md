# 🏋️ Practice: Undo/Redo

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Running the HTML pages needs the CDN, but the reducer is plain JavaScript: `node --test history-reducer.test.js` from inside `refactored/` works with no internet at all.) The reducer lives twice — in `refactored/history-reducer.js`, which the Node tests import, and as a copy inside `refactored/index.html`, which the browser runs — so when an exercise changes the reducer, change both.

## Exercises

### ⭐ 1. Draw the timeline (warm-up)

The undo and redo buttons already show counts. Make the history *visible* instead: a `Timeline` component that renders one `●` per past state, then `◉` for the present, then one `○` per future state. It takes the whole `history` object as a prop and adds no state of its own — the shape you already have contains everything.

**Practices:** deriving UI straight from the data shape, the way `disabled={history.past.length === 0}` already does.

**Hint:** `history.past.map((_, i) => ...)` — you never need the past *values* here, only how many there are.

**Expected:** a fresh page shows a lone `◉`. Paint three cells: `●●●◉`. Press undo twice: `●◉○○`. Paint anything new: `●●◉` — the hollow circles vanish, because a new action wipes the future.

### ⭐⭐ 2. The repaint that lies (core)

Pick red, click cell 1, then click cell 1 *again* with red still selected. Nothing on screen changes — but watch the undo button: it says `undo (2)`. Press it once and the palette doesn't move; press it again and the red finally disappears. The guard `if (next === history.present) return history;` in `undoable` was supposed to prevent exactly this. Work out why it never fires, then fix `paletteReducer` so a paint that changes nothing returns the palette it was given.

**Practices:** reference equality from the *producing* side — a no-op guard only works if your reducer actually returns the same reference.

**Hint:** `palette.map(...)` builds a brand-new array every single time, even when every element comes out identical. Compare before you copy.

**Expected:** after the fix, clicking a cell that already has the selected color leaves the counter at `undo (1)`, and every undo press visibly changes a cell. Painting a *different* color still records normally.

### ⭐⭐ 3. Predict the timeline (core)

Assume the refactor **before** your exercise-2 fix. Starting from `createHistory(['#fff','#fff','#fff','#fff'])` with red (`#c33`) selected, the user does: (1) paint cell 0, (2) paint cell 0 again, (3) undo, (4) undo, (5) redo, (6) select blue and paint cell 3, (7) undo. For each step write down `past.length`, the four cell colors, and `future.length` — and name the one press where the screen doesn't change even though the counters do.

**Practices:** replaying actions through a reducer in your head, which is exactly what `actions.reduce(reducer, start)` does in the test file.

**Hint:** step 2 records a history entry whose `present` *looks* identical to the one before it. What does undoing onto an identical-looking snapshot look like from the outside?

**Expected:** your seven lines match the solution's table exactly, including the ending state `past=1, ['#c33','#fff','#fff','#fff'], future=1`.

### ⭐⭐ 4. Jump anywhere on the timeline (core)

Make the dots from exercise 1 clickable, so clicking the second `●` returns the palette to what it looked like two steps ago in one press. Add a `'jumped'` case to `historyReducer` that takes an absolute index into the flattened timeline `[...past, present, ...future]`, and let `undoable` intercept a `{ type: 'jump', index }` action the way it already intercepts `undo` and `redo`. Clamp out-of-range indexes rather than letting them produce an `undefined` present.

**Practices:** extending a higher-order reducer — new time-travel powers land in the wrapper, and `paletteReducer` still knows nothing.

**Hint:** rebuild the whole timeline as one array, then slice it into three pieces around the chosen index: `slice(0, index)`, `timeline[index]`, `slice(index + 1)`.

**Expected:** paint three cells (`●●●◉`), click the leftmost dot — all four cells go white, undo is disabled, redo reads `redo (3)`, and the strip shows `◉○○○`. Paint from there and the three hollow circles vanish, exactly like any other new action.

### ⭐⭐⭐ 5. Some actions shouldn't be undoable (challenge)

Move `selectedColor` out of `useState` and into the reducer state, so it becomes `{ cells, selected }` with a `'selected'` action. Now picking a color pollutes the undo stack — one wasted undo press per swatch click. Fix it by giving the wrapper an options argument: `undoable(reducer, { ignore: ['selected'] })`, where ignored action types still update `present` but never touch `past` or `future`. Then run the sequence in the Expected line and watch what the archived snapshots do to your "non-undoable" field.

**Practices:** configurable higher-order reducers (this is redux-undo's `filter` option), and the limits of bolting exemptions onto a snapshot-based history.

**Hint:** compute `next` first, then branch: `if (ignore.includes(action.type)) return { ...history, present: next };` — before the `'did'` dispatch, after the no-op check.

**Expected:** select blue → counter stays `undo (0)`; paint cell 0 → `undo (1)`; select green → still `undo (1)`; paint cell 1 → `undo (2)`. Now press undo twice. First press: cells rewind, swatch highlight stays green. Second press: cells go white **and the highlight jumps back to blue** — the field you exempted moved anyway. The solution explains why, and why the original refactor was right to keep `selectedColor` outside the reducer.

### ⭐⭐⭐ 6. Test the time machine (challenge)

Add four tests to `refactored/history-reducer.test.js` covering exercise 4's `jump`: that it walks to any index and leaves the other two containers correct, that out-of-range indexes clamp, that a new action after a jump kills the future just like a plain `'did'`, and — separately — that an inner reducer returning its input reference records nothing when the state is an *array* (the existing no-op test uses a number, where `===` is easy to satisfy by accident). Run them with `node --test history-reducer.test.js` from inside `refactored/`.

**Practices:** writing reducer tests that pin down edge cases and invariants, not just the happy path.

**Hint:** `replay` and the `counter` reducer at the top of the file are already there; `assert.deepEqual` compares contents, `assert.equal` on two objects compares references — you want both kinds here.

**Expected:** `# pass 9`, `# fail 0` — the five original tests plus your four, all green, with no browser involved.

## Solutions

### 1. Draw the timeline

```jsx
function Timeline({ history }) {
  return (
    <p style={{ letterSpacing: 4, fontSize: 20 }}>
      {history.past.map((_, i) => <span key={`p${i}`}>●</span>)}
      <span>◉</span>
      {history.future.map((_, i) => <span key={`f${i}`}>○</span>)}
    </p>
  );
}
// inside App, under the buttons:  <Timeline history={history} />
```

**Why:** the counts on the buttons and the dots here are the same fact rendered twice — `past.length` and `future.length` were already the truth, so no new state appears anywhere. Index keys are honest in this one case: the items *are* positions, they have no identity and no state of their own, so React can never mix them up (project 03's warning is about lists of *things*, not lists of slots). Everything a time machine needs to show is already in `{ past, present, future }`, which is the point of picking that shape.

### 2. The repaint that lies

```js
function paletteReducer(palette, action) {
  switch (action.type) {
    case 'painted': {
      if (palette[action.index] === action.color) return palette; // nothing to do
      return palette.map((c, i) => (i === action.index ? action.color : c));
    }
    default:
      return palette;
  }
}
```

**Why:** `undoable` decides whether to record by asking `next === history.present` — a *reference* comparison. `map` always allocates a fresh array, so even a paint that changes nothing came back as a different object, and the wrapper dutifully filed it as history. The guard was never broken; it was never given the chance to fire. Returning the input unchanged is the standard contract for "this action was a no-op", and it is the same contract the `default` branch has been honoring all along.

### 3. Predict the timeline

| step | action | past | cells | future |
|---|---|---|---|---|
| 0 | (start) | 0 | `#fff #fff #fff #fff` | 0 |
| 1 | paint 0 red | 1 | `#c33 #fff #fff #fff` | 0 |
| 2 | paint 0 red again | 2 | `#c33 #fff #fff #fff` | 0 |
| 3 | undo | 1 | `#c33 #fff #fff #fff` | 1 |
| 4 | undo | 0 | `#fff #fff #fff #fff` | 2 |
| 5 | redo | 1 | `#c33 #fff #fff #fff` | 1 |
| 6 | paint 3 blue | 2 | `#c33 #fff #fff #36c` | 0 |
| 7 | undo | 1 | `#c33 #fff #fff #fff` | 1 |

The dead press is step 3.

**Why:** step 2 archived a snapshot that *looks* exactly like the one replacing it, so step 3's undo faithfully swaps in a palette with identical colors — counters move, pixels don't. Step 5's redo pulls the first item off `future` and pushes the old present onto `past`, which is why `past` and `future` trade one item without changing the total. Step 6 is the invariant everyone eventually meets in a real editor: a new action after an undo empties `future`, so the `#c33`-only state you undid past is gone forever and only step 7's fresh entry can be walked back to.

### 4. Jump anywhere on the timeline

```js
// in historyReducer, alongside 'did' / 'undid' / 'redid':
case 'jumped': {
  const timeline = [...past, present, ...future];
  const index = Math.max(0, Math.min(action.index, timeline.length - 1));
  return {
    past: timeline.slice(0, index),
    present: timeline[index],
    future: timeline.slice(index + 1),
  };
}

// in undoable, next to the other two interceptions:
if (action.type === 'jump') return historyReducer(history, { type: 'jumped', index: action.index });
```

```jsx
function Timeline({ history, dispatch }) {
  const timeline = [...history.past, history.present, ...history.future];
  const here = history.past.length;
  return (
    <p style={{ letterSpacing: 4, fontSize: 20 }}>
      {timeline.map((_, i) => (
        <span key={i} style={{ cursor: 'pointer' }}
              onClick={() => dispatch({ type: 'jump', index: i })}>
          {i < here ? '●' : i === here ? '◉' : '○'}
        </span>
      ))}
    </p>
  );
}
```

**Why:** `past`, `present` and `future` are three windows onto one straight line of states, so "jump to step N" is just re-cutting that line at a different point — undo is `jump(here - 1)` and redo is `jump(here + 1)` in disguise. Clamping matters because `timeline[999]` would hand `undefined` to `present` and the palette would render blank; a reducer that can be fed any action from any button should never assume the index is sane. And notice where the new power landed: in the wrapper, next to `undo` and `redo`. `paletteReducer` gained time-travel-by-click without adding a line, which is the entire promise of a higher-order reducer.

### 5. Some actions shouldn't be undoable

```js
function editorReducer(state, action) {
  switch (action.type) {
    case 'selected':
      if (state.selected === action.color) return state;
      return { ...state, selected: action.color };
    case 'painted': {
      if (state.cells[action.index] === state.selected) return state;
      return {
        ...state,
        cells: state.cells.map((c, i) => (i === action.index ? state.selected : c)),
      };
    }
    default:
      return state;
  }
}

function undoable(reducer, { ignore = [] } = {}) {
  return function (history, action) {
    if (action.type === 'undo') return historyReducer(history, { type: 'undid' });
    if (action.type === 'redo') return historyReducer(history, { type: 'redid' });
    if (action.type === 'jump') return historyReducer(history, { type: 'jumped', index: action.index });

    const next = reducer(history.present, action);
    if (next === history.present) return history;              // no-op: record nothing
    if (ignore.includes(action.type)) return { ...history, present: next }; // change, but don't record
    return historyReducer(history, { type: 'did', next });
  };
}

// in App:
const [history, dispatch] = useReducer(
  undoable(editorReducer, { ignore: ['selected'] }),
  createHistory({ cells: ['#fff', '#fff', '#fff', '#fff'], selected: '#c33' }),
);
const { cells, selected } = history.present;
```

**Why:** the ignore branch sits deliberately between the two others — after the no-op check (an ignored action that changed nothing still deserves nothing) and before the `'did'` dispatch (which is the only place that writes to `past`). But run the Expected sequence and the leak shows: every archived snapshot is the *whole* `{ cells, selected }` object, including the selection that happened to be current when it was filed. Undoing far enough restores an old snapshot and drags its old `selected` back with it — you can exempt an action from being *recorded*, but you can't exempt a field from being *photographed*. The real fix is the one the refactor already made: state that shouldn't time-travel doesn't belong in the time machine, so `selectedColor` stays in its own `useState` outside the history entirely.

### 6. Test the time machine

```js
test('jump walks straight to any point on the timeline', () => {
  const h = replay([
    { type: 'add', amount: 1 },
    { type: 'add', amount: 2 },
    { type: 'add', amount: 3 },
  ]);
  assert.deepEqual(h.past, [0, 1, 3]);
  assert.equal(h.present, 6);

  const start = reducer(h, { type: 'jump', index: 0 });
  assert.equal(start.present, 0);
  assert.deepEqual(start.past, []);
  assert.deepEqual(start.future, [1, 3, 6]);

  const back = reducer(start, { type: 'jump', index: 3 });
  assert.equal(back.present, 6);
  assert.deepEqual(back.future, []);
});

test('jump clamps out-of-range indexes instead of exploding', () => {
  const h = replay([{ type: 'add', amount: 1 }]);
  assert.equal(reducer(h, { type: 'jump', index: 99 }).present, 1);
  assert.equal(reducer(h, { type: 'jump', index: -5 }).present, 0);
});

test('a new action after a jump kills the future, exactly like a plain did', () => {
  const h = replay([{ type: 'add', amount: 1 }, { type: 'add', amount: 2 }]);
  const rewound = reducer(h, { type: 'jump', index: 0 });
  const branched = reducer(rewound, { type: 'add', amount: 100 });
  assert.equal(branched.present, 100);
  assert.deepEqual(branched.past, [0]);
  assert.deepEqual(branched.future, []);
});

test('an inner reducer that returns the same reference records nothing', () => {
  const rows = ['a', 'b'];
  const listReducer = (list, action) =>
    action.type === 'appended' ? [...list, action.item] : list;
  const undoableList = undoable(listReducer);
  const h0 = createHistory(rows);
  const h1 = undoableList(h0, { type: 'shrugged' });
  assert.equal(h1, h0);          // the whole history object came back untouched
  assert.equal(h1.present, rows); // and so did the array inside it
});
```

**Why:** the first three tests pin the *invariants* rather than one lucky path: after any jump the three containers must still spell out the same timeline, a hostile index must not produce an `undefined` present, and branching after a jump must obey the same future-wiping rule as branching after an undo. The fourth uses an array on purpose — with a number, `assert.equal(h1.present, 0)` passes even if your reducer rebuilt the state, because `0 === 0` regardless of where it came from. With `rows` the assertion is genuinely about identity, which is what the no-op guard actually depends on, and it's the same trap exercise 2 fell into.
