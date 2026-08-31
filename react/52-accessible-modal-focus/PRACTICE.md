# 🏋️ Practice: Accessible Modal

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Running the HTML pages needs the CDN, but the focus rules are plain JavaScript: `node --test focus.test.js` from inside `refactored/` works with no internet at all.) The helpers live twice — in `refactored/focus.js`, which the Node tests import, and as a copy inside `refactored/index.html`, which the browser runs — so when an exercise changes them, change both.

## Exercises

### ⭐ 1. Choose where focus lands (warm-up)

Opening the dialog focuses the first focusable element inside it, which is the × Close button. That's a defensible default and a poor one here: the user came to edit their display name, and the first thing under their fingers is "throw this away". Give `Modal` an optional `initialFocusRef` prop — when the caller passes a ref, focus that element on open; otherwise keep the current behaviour. Point it at the Display name input.

**Practices:** keeping a component's default sane while letting the caller override it — project 36's "who owns this decision?" applied to focus.

**Hint:** the mount effect already picks a target. Give it two sources in priority order, and remember `ref.current` is only filled in *after* the DOM exists — which is exactly when effects run.

**Expected:** open the dialog and the tracker reads `<input> Ada` with the text field ringed in blue. Tab still cycles all four controls; Escape still returns you to "Edit profile…".

### ⭐⭐ 2. Predict the focus sequence (core)

Don't run anything yet. On paper, for **both** pages, write down what the focus tracker reads after each of these six steps:

1. Tab from the Email field until "Edit profile…" is focused, press **Enter**.
2. Tab.  3. Tab.  4. Tab.  5. Tab.  6. Press **Escape**.

The page behind, in DOM order, is: Email, Theme, "Edit profile…", "Save settings", "Help". The dialog, in DOM order, is: ×, Display name, Save, Cancel. Then run both pages and check yourself.

**Practices:** reading tab order straight off the DOM — the skill that lets you find these bugs without a screen reader.

**Hint:** in the original, nothing whatsoever moves focus, and the dialog's markup is simply appended to the page's tab order. In the refactor, one effect moves focus in and one handler decides every Tab afterwards.

**Expected:** the two lists diverge at step 1 and never agree again. One page visits controls the user cannot see; the other never leaves the dialog. Exactly one of them answers Escape.

### ⭐⭐ 3. The trap that went stale (planted bug) (core)

Make the dialog grow: add an "Add a pronoun" button that reveals a second text input. Then "optimise" the trap by computing the focusable list once, on open, and reusing it:

```jsx
const listRef = useRef([]);
useEffect(() => { listRef.current = focusableNow(); }, []);   // once, on open
// ...and in the keydown handler, use listRef.current instead of focusableNow()
```

Open the dialog, click "Add a pronoun", then Tab all the way around. What happens to the new input, and why? Then fix it, and say in one sentence what class of bug you just avoided.

**Practices:** the difference between a snapshot and a live query — and why "compute it once" is a trap when the thing you computed can change.

**Hint:** the cached array holds references to the elements that existed at 9am. The new input is not in it, so `indexOf` and the wrap-around arithmetic behave as if it doesn't exist.

**Expected:** with the bug, the new Pronouns input is unreachable by Tab — the cycle jumps straight over it — although clicking it still works, which is what makes the bug easy to ship. With the fix, it takes its place in the cycle immediately, between Display name and Save.

### ⭐⭐ 4. Describe it, and announce the result (core)

Two additions. First, a line of helper text in the dialog ("This name is shown on your public profile"), wired up with `aria-describedby` so a screen reader reads it *after* the dialog's name. Second, a **live region**: when Save is pressed, show "Profile saved" on the page behind and make sure assistive tech announces it without moving focus.

**Practices:** the two halves of "what does this thing say" — a static description read on arrival, and a dynamic announcement pushed later.

**Hint:** `aria-describedby` works exactly like `aria-labelledby` — an `id`, not text. For the announcement, a live region is an element that already exists on the page and whose *contents* change; `role="status"` gives you `aria-live="polite"` for free.

**Expected:** the dialog announces as "Edit profile, dialog. This name is shown on your public profile." Pressing Save closes the dialog, returns focus to "Edit profile…", and a status line appears — announced without stealing focus, because live regions never move it. Rendering the message only when it exists (`{message && ...}`) is a *worse* solution than an always-present empty region: readers watch a region for changes, so one that appears out of nowhere often goes unread.

### ⭐⭐⭐ 5. Honour positive tabindex (challenge)

`getFocusable` assumes DOM order is tab order, which is true only when every element sits at `tabindex="0"`. The real rule: elements with a **positive** tabindex come first, in ascending order, ties broken by DOM order; then everything at `0`, in DOM order. Add `tabOrder(candidates)` to `focus.js` implementing that, write tests for it, and use it in the trap. Then put `tabIndex={1}` on the Save button and watch what happens.

**Practices:** encoding a fiddly platform rule as a pure function, and discovering *why* the rule is a footgun by implementing it.

**Hint:** partition, don't sort the whole list — `filter` the positives, `filter` the rest, sort only the positives ascending, concatenate. `Array.prototype.sort` is stable in modern JavaScript, so equal tabindexes keep the order you gave them.

**Expected:** five new tests pass. On the page, `tabIndex={1}` on Save makes it the *first* stop in the dialog's cycle — Save, ×, Display name, Cancel — so the tab order no longer matches what the eye sees. That's the lesson: you implemented the rule, and the demonstration is an argument for never using it.

## Solutions

### 1. Choose where focus lands

```jsx
function Modal({ titleId, title, onClose, initialFocusRef, children }) {
  // ...
  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    const target = (initialFocusRef && initialFocusRef.current) || focusableNow()[0];
    if (target) target.focus();
    return () => { /* ...restore as before... */ };
  }, []);                       // deliberately mount-only: "initial" focus
```

```jsx
function App() {
  const nameRef = useRef(null);
  // ...
  <Modal titleId="edit-profile-title" title="Edit profile"
         initialFocusRef={nameRef} onClose={() => setOpen(false)}>
    <input id="displayName" ref={nameRef} defaultValue="Ada" />
```

**Why:** `||` gives you priority with a fallback in one expression — caller's choice first, sensible default second — so a caller that passes nothing gets exactly today's behaviour. The ref must be created by `App`, because `App` renders the input (it's `children`); `Modal` only *uses* the ref it's handed, which is the same ownership split as any controlled prop. And the empty dependency array is right here rather than a lint violation to apologise for: this is *initial* focus, and re-running it every time the ref identity changed would yank the cursor out from under someone mid-typing.

### 2. Predict the focus sequence

**The original:**

| step | tracker reads |
|---|---|
| 1. Enter | `<button> Edit profile…` — the dialog opened; focus never moved |
| 2. Tab | `<button> Save settings` — behind the dim layer |
| 3. Tab | `<a> Help` — also behind it |
| 4. Tab | `<button> ×` — finally inside the dialog |
| 5. Tab | `<input> Ada` |
| 6. Escape | `<input> Ada` — nothing happens; Escape isn't handled |

**The refactor:**

| step | tracker reads |
|---|---|
| 1. Enter | `<button> Close` — the mount effect moved focus to the first control inside |
| 2. Tab | `<input> Ada` |
| 3. Tab | `<button> Save` |
| 4. Tab | `<button> Cancel` |
| 5. Tab | `<button> Close` — the wrap; the page behind is unreachable |
| 6. Escape | `<button> Edit profile…` — closed, and focus restored |

**Why:** the original's dialog is markup appended to the page, so its controls join the end of the document's tab order and the two "unreachable" controls in between stay perfectly reachable — the grey layer stops mouse clicks (it's a full-viewport div) and stops nothing else. The refactor's list is the four controls inside the dialog; `nextFocusIndex(3, 4)` returns `0` instead of walking off the end, and the cleanup restores `returnFocusRef.current` on unmount. Note step 4 in the original: you *do* eventually get in, which is worse than never getting in, because the barrier is now inconsistent rather than absent.

### 3. The trap that went stale

```jsx
// the bug: a snapshot of the DOM as it was at open time
const listRef = useRef([]);
useEffect(() => { listRef.current = focusableNow(); }, []);

// the fix: delete listRef entirely and ask the DOM every time
const list = focusableNow();
```

```jsx
const [showPronouns, setShowPronouns] = useState(false);
// ...inside the dialog:
{!showPronouns && <button onClick={() => setShowPronouns(true)}>Add a pronoun</button>}
{showPronouns && <input id="pronouns" placeholder="pronouns" />}
```

**Why:** `focusableNow()` is a *query*, and caching a query is caching an answer to a question the page will keep re-asking. The cached array holds element references from open time; the new input isn't among them, so `list.indexOf(document.activeElement)` returns `-1` whenever you're standing on it, and `nextFocusIndex` treats that as "focus is outside the trap" and yanks you to the first element. Even the elements that *are* in the list can go stale — a removed one is still in the array, and `.focus()` on a detached node does nothing at all, quietly ending the cycle. The class of bug: **state that duplicates a source of truth and then drifts from it** — project 09's derived-state smell, wearing a DOM costume. The DOM is fast at this; a `querySelectorAll` over one dialog per keypress is free.

### 4. Describe it, and announce the result

```jsx
<div className="dialog" role="dialog" aria-modal="true"
     aria-labelledby={titleId} aria-describedby="edit-profile-desc" ref={dialogRef}>
  <button className="x" onClick={onClose} aria-label="Close">×</button>
  <h3 id={titleId}>{title}</h3>
  <p id="edit-profile-desc" style={{ color: '#666', fontSize: 13 }}>
    This name is shown on your public profile.
  </p>
  {children}
```

```jsx
function App() {
  const [message, setMessage] = useState('');
  // ...
  <div role="status" className="tracker">{message}</div>   {/* always rendered */}
  // ...and the Save button:
  <button onClick={() => { setMessage('Profile saved'); setOpen(false); }}>Save</button>
```

**Why:** `aria-labelledby` and `aria-describedby` both point at ids, and the split matters — the *name* is what identifies the dialog ("Edit profile"), the *description* is the extra sentence read afterwards, so putting the helper text in the label would make every announcement of the dialog recite it. The live region solves the other problem: focus is back on "Edit profile…", so a screen reader has no reason to look at a message somewhere else on the page. `role="status"` marks that element as watched, and `polite` means "say it when you finish the current sentence" rather than interrupting. Keeping the region mounted with empty contents is the load-bearing detail: assistive tech subscribes to *changes inside* a region it already knows about, and a region that pops into existence carrying text is frequently missed.

### 5. Honour positive tabindex

```js
/**
 * The real tab order: positive tabindexes first (ascending, DOM order
 * breaking ties), then everything at 0 in DOM order.
 */
export function tabOrder(candidates) {
  const focusable = getFocusable(candidates);
  const positives = focusable.filter((el) => el.tabIndex > 0);
  const zeros = focusable.filter((el) => !(el.tabIndex > 0));
  positives.sort((a, b) => a.tabIndex - b.tabIndex);  // stable: ties keep DOM order
  return [...positives, ...zeros];
}
```

```js
const el = (name, extra = {}) => ({ tag: 'button', name, tabIndex: 0, ...extra });

test('with no positive tabindex, tab order is DOM order', () => {
  const list = [el('a'), el('b'), el('c')];
  assert.deepEqual(tabOrder(list).map((e) => e.name), ['a', 'b', 'c']);
});

test('positive tabindex jumps the queue, in ascending order', () => {
  const list = [el('a'), el('b', { tabIndex: 2 }), el('c'), el('d', { tabIndex: 1 })];
  assert.deepEqual(tabOrder(list).map((e) => e.name), ['d', 'b', 'a', 'c']);
});

test('equal positive tabindexes keep DOM order', () => {
  const list = [el('a', { tabIndex: 3 }), el('b'), el('c', { tabIndex: 3 })];
  assert.deepEqual(tabOrder(list).map((e) => e.name), ['a', 'c', 'b']);
});

test('unfocusable elements are still dropped', () => {
  const list = [el('a', { tabIndex: 2, disabled: true }), el('b'), el('c', { tabIndex: -1 })];
  assert.deepEqual(tabOrder(list).map((e) => e.name), ['b']);
});

test('an empty list stays empty', () => {
  assert.deepEqual(tabOrder([]), []);
});
```

Then swap the one line in the trap — `const list = focusableNow()` becomes a call that runs `tabOrder` instead of `getFocusable` over the candidates — and nothing else changes, because `nextFocusIndex` only ever knew about indexes into a list someone else ordered.

**Why:** partitioning beats sorting the whole array, and not only for speed: a single `sort` comparator would have to encode "0 sorts after 5", which is exactly the kind of inverted special case that turns into a bug. Sorting only the positives lets each half say what it means. Stability is what buys the tie-breaking rule for free — since ES2019 `Array.prototype.sort` preserves the relative order of equal elements, so two elements at `tabindex="3"` come out in DOM order without any extra code. The payoff is the demo: `tabIndex={1}` on Save makes it the first stop in the cycle, so a sighted keyboard user watches the ring start in the middle of the dialog and jump backwards. Positive tabindex is *global* to the document, too, which means one component's `tabIndex={1}` reorders pages it has never heard of. You now know the rule well enough to explain, in a code review, why the answer is always `0` or `-1`.
