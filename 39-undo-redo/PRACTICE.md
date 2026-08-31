# 🏋️ Practice: Undo / Redo

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. clear() — forget the timeline, keep the document (warm-up)

Add `clear()` to `History`: the past and the future are dropped, but `present` stays exactly as it is. This is what an editor does after "Save as new file" — the document survives, the history doesn't. Check offline: from `new History('')`, push `'a'`, push `'b'`, undo (so `canUndo` and `canRedo` are both true), then `clear()` — now both are `false`, `present` is still `'a'`, and pushing `'c'` followed by one undo returns `'a'`.

What it practices: a method that only touches the two containers it's allowed to, and a test that checks what *didn't* change.

Hint: two lines. Reassigning (`this.#past = []`) or emptying (`this.#past.length = 0`) both work — pick one and be consistent.

### ⭐⭐ 2. A bounded history (core)

Snapshots of a big document add up, so real editors cap the undo depth. Give the constructor an options object: `new History(initial, { limit: 3 })` keeps at most 3 past states, dropping the *oldest* when a push would exceed it. The default must stay unlimited so every existing test passes untouched. Check offline: with `limit: 3`, push `a, b, c, d, e`, then undo three times — you get `d`, `c`, `b`, and then `canUndo` is `false` (the initial `''` and `'a'` have fallen off the front). Redoing all the way back must still return `'e'`.

What it practices: adding an option without changing the default behavior, and knowing which end of an array to trim.

Hint: `constructor(initialState, { limit = Infinity } = {})`, then after pushing: `if (this.#past.length > this.#limit) this.#past.shift();` — `shift` removes the *oldest*, `pop` would remove the newest and break undo entirely.

### ⭐⭐ 3. Ignore pushes that change nothing (core)

If a user clicks into a text box and clicks out without typing, the app may push a state identical to the present — and now they have a useless undo step that appears to do nothing. Make `push` return early when the new state deep-equals the current one, using `deepEqual` from project 25. Check offline: pushing `'a'` twice then undoing once returns `''` and leaves `canUndo` false; `new History({ text: 'hi', cursor: 0 })` followed by pushing an equal-looking *new object* leaves `canUndo` false, but pushing `{ text: 'hi', cursor: 1 }` records normally. Crucially, an ignored push must NOT kill the redo future.

What it practices: reusing a utility you already built, and thinking through what "no change" should mean for *every* part of the state.

Hint: `import { deepEqual } from '../../25-deep-equal/refactored/deep-equal.js';` and make the guard the very first line of `push`, before `#future = []`.

### ⭐⭐ 4. timeline() — see the whole strip (core)

Add `timeline()` returning `{ states, index }`: every remembered state in chronological order, and where the present sits in that array — the data a "history sidebar" or a devtools time-travel slider renders from. Watch out for one subtlety: `#future` is stored newest-first (it's a stack), so it must be reversed to read chronologically. Check offline: from `''`, push `'a'`, push `'b'`, undo → `{ states: ['', 'a', 'b'], index: 1 }`; undo again → same states, `index: 0`; then push `'z'` → `{ states: ['', 'z'], index: 1 }`.

What it practices: reading a data structure's *ordering* carefully instead of assuming, and exposing state for a UI without exposing the private arrays themselves.

Hint: `[...this.#past, this.#present, ...[...this.#future].reverse()]`. The inner spread matters — `this.#future.reverse()` would reverse the real array in place and corrupt redo.

### ⭐⭐⭐ 5. Merge a burst of typing into one undo step (challenge)

Typing "Hello" should be one undo, not five. Add `pushMerging(nextState, mergeWindowMs)`: if the previous push happened less than `mergeWindowMs` ago, *replace* the present instead of recording a new past entry; otherwise push normally. Any undo or redo ends the current burst. Make time injectable — take a `now` function in the constructor options, defaulting to `Date.now` — so the test needs no real waiting. Check offline with a fake clock: three pushes 100ms apart with a 500ms window leave one undo step (undo → `''`, then `canUndo` false); the same two pushes 900ms apart leave two.

What it practices: injecting the clock so time-dependent behavior is testable — projects 06, 28 and 43 all use this trick.

Hint: keep a `#lastPushAt` field initialized to `-Infinity`, so the very first push can never merge. Set it back to `-Infinity` inside `undo()` and `redo()` to end the burst.

### ⭐⭐⭐ 6. A property test for the round trip (challenge)

Instead of more examples, assert a *rule*: for any sequence of pushes followed by any number of undos and the same number of redos, the present must be exactly what it was before. Write a test that loops 200 random trials — random push count (1–8), random undo count (deliberately allow more undos than there are states, so the no-op boundary is exercised), counting how many undos actually moved, then redoing that many. Assert `present` is unchanged and `canRedo` is `false` at the end. It should pass; delete the `this.#future = []` line from `push` and it should still pass — then explain to yourself why, and what test *does* catch that deletion.

What it practices: property-based testing over hand-picked examples, and understanding the limits of any single property.

Hint: `if (h.canUndo) { h.undo(); undone++; } else h.undo();` — call it either way so you also exercise the harmless boundary, but only count the real ones.

## Solutions

### 1. clear()

```js
clear() {
  this.#past = [];
  this.#future = [];
}
```

```js
test('clear() drops the timeline but keeps the document', () => {
  const history = new History('');
  history.push('a');
  history.push('b');
  history.undo();
  history.clear();
  assert.equal(history.present, 'a');
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});
```

WHY: the three-container shape makes this trivially obvious — "forget the history" is literally "empty the two history containers", and there is no pointer to reset or invariant to re-establish. Compare with the original's array-plus-pointer design, where clearing means emptying the array, resetting the pointer *and* re-seeding it with the current value, in the right order. When the data shape matches the concept, new operations write themselves.

### 2. A bounded history

```js
export class History {
  #past = [];
  #future = [];
  #present;
  #limit;

  constructor(initialState, { limit = Infinity } = {}) {
    this.#present = initialState;
    this.#limit = limit;
  }

  push(nextState) {
    this.#past.push(this.#present);
    if (this.#past.length > this.#limit) this.#past.shift(); // drop the OLDEST
    this.#present = nextState;
    this.#future = [];
  }
  // ...unchanged
}
```

WHY: `{ limit = Infinity } = {}` is the two-part default that keeps every existing call site working — the inner default supplies the value, the outer `= {}` allows the whole options argument to be omitted. `shift()` is the only correct choice: the oldest state is the one nobody is likely to undo back to, while `pop()` would throw away the step the user is about to undo *right now*. Notice the eviction is one line in one place, because push is the only method that grows the past. Verified by running: with `limit: 3` the undos reach `d`, `c`, `b` and then stop, and redoing all the way returns `'e'`.

### 3. Ignore no-op pushes

```js
import { deepEqual } from '../../25-deep-equal/refactored/deep-equal.js';

push(nextState) {
  if (deepEqual(nextState, this.#present)) return; // nothing happened
  this.#past.push(this.#present);
  this.#present = nextState;
  this.#future = [];
}
```

WHY: the guard has to come first, before `this.#future = []` — otherwise a push that changes nothing would still destroy the redo future, which is the exact bug this project is about, sneaking back in through a new door. `deepEqual` rather than `===` is essential for object states: immutable updates create new objects every time, so `===` would call every one of them a change. This is project 25 earning rent, the same way project 26 does in the log analyzer. Verified by running: duplicate pushes leave `canUndo` false, `{text:'hi',cursor:1}` still records, and an ignored push preserves `canRedo`.

### 4. timeline()

```js
timeline() {
  return {
    states: [...this.#past, this.#present, ...[...this.#future].reverse()],
    index: this.#past.length,
  };
}
```

WHY: `index` needs no bookkeeping — the present always sits immediately after the past, so `this.#past.length` *is* the position. The `[...this.#future]` copy before `.reverse()` is not optional: `Array.prototype.reverse` mutates, so reversing the private array directly would silently invert the redo order and make the next `redo()` jump to the wrong state — a bug that would show up nowhere near this method. Returning a fresh array also means the caller can't reach in and mutate history, which is the point of the `#` fields. Verified by running: `{ states: ['', 'a', 'b'], index: 1 }`, then `index: 0`, then `{ states: ['', 'z'], index: 1 }` after a new push.

### 5. Merging a burst

```js
constructor(initialState, { limit = Infinity, now = Date.now } = {}) {
  this.#present = initialState;
  this.#limit = limit;
  this.#now = now;
}

#lastPushAt = -Infinity;

pushMerging(nextState, mergeWindowMs) {
  const at = this.#now();
  const merge = this.canUndo && at - this.#lastPushAt < mergeWindowMs;
  this.#lastPushAt = at;

  if (merge) {
    this.#present = nextState; // replace, don't record
    this.#future = [];
    return;
  }
  this.push(nextState);
}

undo() {
  if (!this.canUndo) return this.#present;
  this.#future.push(this.#present);
  this.#present = this.#past.pop();
  this.#lastPushAt = -Infinity; // an undo ends the burst
  return this.#present;
}
// redo() gets the same one-line reset
```

```js
// scratch test, run with node:
let clock = 1000;
const history = new History('', { now: () => clock });
history.pushMerging('H', 500);
clock += 100; history.pushMerging('He', 500);
clock += 100; history.pushMerging('Hel', 500);
assert.equal(history.present, 'Hel');
assert.equal(history.undo(), '');        // the whole burst, one step
assert.equal(history.canUndo, false);
```

WHY: `#lastPushAt = -Infinity` is the initial value that makes the *first* push unmergeable without a special case — any real timestamp minus `-Infinity` is `Infinity`, which is never less than the window. Resetting it on undo/redo is what stops this scenario: type, undo, type again within 500ms, and the second burst would otherwise merge into a state the user just navigated away from. Passing `now` as a function instead of calling `Date.now()` inside makes the whole feature testable in microseconds — the same injection projects 06, 28 and 43 use. Verified by running: three pushes 100ms apart collapse to one undo step; the same pushes 900ms apart stay separate.

### 6. The round-trip property test

```js
test('PROPERTY: k undos followed by k redos always restore the present', () => {
  for (let trial = 0; trial < 200; trial++) {
    const history = new History(0);
    const pushes = 1 + Math.floor(Math.random() * 8);
    for (let i = 1; i <= pushes; i++) history.push(i);

    const before = history.present;
    const requested = Math.floor(Math.random() * (pushes + 3)); // may overshoot
    let undone = 0;
    for (let i = 0; i < requested; i++) {
      if (history.canUndo) { history.undo(); undone++; } else { history.undo(); }
    }
    for (let i = 0; i < undone; i++) history.redo();

    assert.equal(history.present, before, `trial ${trial}`);
    assert.equal(history.canRedo, false);
  }
});
```

WHY: undo and redo are inverses, and a property test says that once instead of enumerating dozens of sequences. Deliberately requesting more undos than exist exercises the `if (!this.canUndo) return this.#present` boundary in every trial, which hand-written examples usually skip. But notice the limit: this property still passes if you delete `this.#future = []` from `push`, because the trials never push *after* undoing — the property is real, it just doesn't cover that path. Only the existing "a new action kills the old future" test catches that line, which is a good lesson about properties: they check a shape, not everything. Verified by running: 200 random trials pass.
