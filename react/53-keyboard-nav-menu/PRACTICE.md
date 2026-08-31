# 🏋️ Practice: Keyboard Navigation

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Running the HTML pages needs the CDN, but the rulebook is plain JavaScript: `node --test nav.test.js` from inside `refactored/` works with no internet at all.) `nextIndex` lives twice — in `refactored/nav.js`, which the Node tests import, and as a copy inside `refactored/index.html`, which the browser runs — so when an exercise changes the rulebook, change both.

The menu used throughout is the four items on the page, with the last one disabled:

```js
const LABELS  = ['Rename', 'Duplicate', 'Export as CSV', 'Delete (disabled)'];
const OPTIONS = { disabled: [3] };
```

## Exercises

### ⭐ 1. Jump a page at a time (warm-up)

Long menus want big movements. Add `'PageDown'` and `'PageUp'` to the rulebook: they move by **three** items instead of one, and — unlike the arrows — they **clamp** rather than wrap, because "page down" means "further down", never "back to the top". Disabled items still can't be landed on: if the item three away is disabled, take the nearest legal one *between it and where you started*. Add the two keys to `MENU_KEYS` so the handler prevents their default scrolling, and add tests.

**Practices:** extending a pure rulebook — one new case, one new test, zero component changes.

**Hint:** compute the target with `Math.min(current + 3, count - 1)`, then re-use the walking idea from `seek`, stepping *backwards* from that target (toward where you came from) until you find an enabled item.

**Expected:** in the four-item menu, PageDown from `Rename` (0) lands on `Export as CSV` (2) — index 3 is the disabled Delete, so it steps back one. PageDown again stays on 2 (clamped, no wrap). PageUp from 3 goes to 0, and from 2 also to 0. In an eight-item menu with nothing disabled, PageDown from 0 lands on 3 — a real three-item jump.

### ⭐⭐ 2. Predict the walk (core)

No editing, no running. On paper, work out `activeIndex` **and** which element has browser focus after each step of this sequence in `refactored/index.html`, starting with the menu closed and focus on the trigger:

```
Enter, ArrowDown, ArrowDown, ArrowDown, End, Home, e, Escape
```

Write eight rows: key → `activeIndex` → focused element. Two of the rows are the ones that separate people who've read the rulebook from people who've skimmed it — the third `ArrowDown`, and `End`.

**Practices:** reading a pure function as the source of truth for a UI, and remembering that the disabled item is a rule, not a colour.

**Hint:** every row is one call to `nextIndex(current, key, 4, { disabled: [3] })`. For the focus column, remember the effect: focus follows `activeIndex` while the menu is open, and `close({ restoreFocus: true })` puts it back on the trigger.

**Expected:** `activeIndex` goes `0, 1, 2, 0, 2, 0, 0` and then `-1`. If you wrote `3` anywhere, you highlighted a disabled item; if you wrote `0` for `End`, you forgot that `End` means *last enabled*.

### ⭐⭐ 3. Type to jump (core)

Real menus let you press `d` to jump to "Duplicate". Add a pure `typeaheadIndex(labels, char, current, options)` to `nav.js`: it searches **forward from the item after `current`**, wrapping around, and returns the index of the first enabled item whose label starts with `char` (case-insensitive), or `current` if there's no match. Anything that isn't a single alphanumeric character — `'Shift'`, `'ArrowDown'`, `'F5'` — is a no-op. Then wire it into `onListKeyDown` as the last branch, and test it.

**Practices:** growing the rulebook without growing the component; the "search from the *next* one, wrap around" idiom that makes repeated presses cycle through matches.

**Hint:** `e.key.length === 1` is the standard test for "a printable character was typed". For the wrap, walk `n` from 1 to `count` and look at `(current + n) % count` — that visits every item exactly once, starting just past where you are.

**Expected:** from `Rename`, pressing `d` moves to `Duplicate`. Pressing `d` again *stays* on `Duplicate` — the only other d-word is the disabled Delete, and disabled items are skipped, so the search wraps all the way round and finds Duplicate again. `e` from `Rename` gives `Export as CSV`; `r` from `Export as CSV` wraps back to `Rename`; `z` moves nothing.

### ⭐⭐ 4. The planted bug: a keyboard trap (core)

A teammate got tired of the page scrolling behind the open menu and "fixed" it by hoisting the `preventDefault` to the top of the handler:

```jsx
function onListKeyDown(e) {
  e.preventDefault();            // no more scrolling, ever
  if (MENU_KEYS.includes(e.key)) { ... }
  ...
}
```

Every test still passes and the menu feels great. Open the page, open the menu, and try to get out with the keyboard. Describe exactly what happens, why it is the worst bug in this whole project, and fix it.

**Practices:** the rule that `preventDefault` belongs to keys you handle, and nothing else — and the reason `MENU_KEYS` is exported from the rulebook in the first place.

**Hint:** which key is missing from `MENU_KEYS` on purpose? Who owns it?

**Expected:** arrows, Home/End, Enter and Escape all behave normally — but Tab and Shift+Tab are dead. Focus can enter the menu and can never leave it by keyboard. A mouse user won't notice; a keyboard-only user is stuck on your page. (Escape still works here, which is luck, not design: remove that branch too and the trap is total.)

### ⭐⭐⭐ 5. Submenus, as a stack of indices (challenge)

Give "Export as CSV" a submenu — CSV, JSON (disabled), PDF — where `ArrowRight` enters the submenu and `ArrowLeft` leaves it. Do it **without touching `nextIndex`**, by generalising the state from a number to a path:

```js
{ path: [1, 0] }   // item 1 of the root, then item 0 of its submenu
```

Write a pure `nextFocus(state, key, tree)` in `nav.js` over a tree of `{ label, disabled?, items? }`, and test it. Rules: arrows/Home/End move the **last** element of the path within its own sibling list (same rules as before, including disabled-skipping and wrap-around); `ArrowRight` pushes the first enabled child if the focused item has a submenu; `ArrowLeft` pops, but never past the root; anything with nowhere to go returns **the same state object**, so React re-renders nothing.

**Practices:** making a pure rulebook grow a dimension without rewriting it — and discovering that "submenus" is a stack, not a feature.

**Hint:** two tiny helpers do all the tree work: `siblingsAt(tree, path)` (walk `path.slice(0, -1)` down through `.items` to get the list the last index indexes into) and `itemAt(tree, path)` (walk the whole path to get the focused item). Then `nextFocus` is `nextIndex` applied to `path[path.length - 1]`, plus a push branch and a pop branch.

**Expected:** starting at `{ path: [0] }` (Rename), the sequence `ArrowDown, ArrowRight, ArrowDown, ArrowLeft, ArrowUp` walks `[1] → [1,0] → [1,2] → [1] → [0]` — note `[1,0] → [1,2]` skipping the disabled JSON, and `ArrowDown` on `[1]` wrapping over the disabled Delete straight back to `[0]`. `ArrowRight` on Rename and `ArrowLeft` at the root both return the identical object you passed in (`assert.equal`, not `deepEqual`).

## Solutions

### 1. Jump a page at a time

```js
export const MENU_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'];
const PAGE = 3;

// ...inside nextIndex's switch, before `default`:
    case 'PageDown':
    case 'PageUp': {
      const from = current < 0 ? (key === 'PageDown' ? 0 : count - 1) : current;
      const target = key === 'PageDown'
        ? Math.min(from + PAGE, count - 1)
        : Math.max(from - PAGE, 0);
      // walk BACK toward the start point, so a disabled target never overshoots
      const found = seek(target, key === 'PageDown' ? -1 : 1, count, isDisabled, false);
      return found === -1 ? current : found;
    }

test('PageDown and PageUp move three, clamping at the ends', () => {
  const opts = { disabled: [3] };
  assert.equal(nextIndex(0, 'PageDown', 4, opts), 2);   // 3 is disabled, step back
  assert.equal(nextIndex(2, 'PageDown', 4, opts), 2);   // clamped, never wraps
  assert.equal(nextIndex(3, 'PageUp', 4, opts), 0);
  assert.equal(nextIndex(0, 'PageDown', 8), 3);         // a real three-item jump
});
```

**Why:** the existing `seek` helper already does everything hard — bounded walking, disabled-skipping, and a `loop` flag — so the new case is two lines of arithmetic plus a call with `loop: false`. Stepping *backwards* from the target when moving down is the detail worth pausing on: if you stepped forwards instead, a disabled item at the target would push you *past* the clamp and out of the region PageDown is supposed to cover. Clamping and wrapping are the same code with one boolean flipped, which is the payoff for having written `seek` generally in the first place.

### 2. Predict the walk

| key | `activeIndex` | focus |
|---|---|---|
| Enter | 0 | `Rename` |
| ArrowDown | 1 | `Duplicate` |
| ArrowDown | 2 | `Export as CSV` |
| ArrowDown | **0** | `Rename` |
| End | **2** | `Export as CSV` |
| Home | 0 | `Rename` |
| e | 0 | `Rename` (nothing moves) |
| Escape | −1 | the `Actions ▾` **button** |

**Why:** the two interesting rows are both about the disabled item. The third `ArrowDown` starts at 2, steps to 3, finds Delete disabled, and keeps travelling *in the same direction* — off the end, around to 0. `End` means "the last **enabled** item", so `seek(count - 1, -1, ...)` starts at 3, rejects it, and settles on 2; a menu whose last item is disabled would otherwise put your highlight on something you can't choose. The `e` row is the no-op contract earning its keep: `nextIndex` returns `current` unchanged, React sees the same number, nothing re-renders, and — because the handler only prevents keys in `MENU_KEYS` — the browser's own default for `e` still happens. The last row is the courtesy that makes the menu usable: closing returns focus to the trigger, so Tab continues from where you logically are instead of from the top of the document.

### 3. Type to jump

```js
export function typeaheadIndex(labels, char, current, options = {}) {
  const isDisabled = disabledPredicate(options.disabled);
  const needle = String(char).toLowerCase();
  if (needle.length !== 1 || !/[a-z0-9]/.test(needle)) return current;  // not a printable char
  const count = labels.length;
  for (let n = 1; n <= count; n++) {
    const i = (Math.max(current, -1) + n + count) % count;              // start just past current
    if (isDisabled(i)) continue;
    if (labels[i].toLowerCase().startsWith(needle)) return i;
  }
  return current;                                                       // no match: no-op
}

// last branch of onListKeyDown — no preventDefault: this key isn't ours to cancel
if (e.key.length === 1) {
  setActiveIndex((i) => typeaheadIndex(ITEMS.map((it) => it.label), e.key, i, { disabled: DISABLED }));
}
```

**Why:** starting the search at `current + 1` rather than `current` is what makes repeated presses *cycle*: pressing `d` twice in a menu with two d-items visits both instead of sticking on the first. The `% count` wrap plus a loop bounded by `count` guarantees every item is visited exactly once and the function always terminates — the same bounded-walk discipline as `seek`. Skipping disabled items is why the second `d` in our menu stays on Duplicate: Delete matches, but it isn't a legal destination, so the search wraps past it and returns to the only enabled match. And `char.length !== 1` is the whole reason this branch can sit safely last in the handler — `'ArrowDown'`, `'Shift'` and `'F5'` are all multi-character strings, so they fall straight through as no-ops.

### 4. The planted bug: a keyboard trap

```jsx
function onListKeyDown(e) {
  if (MENU_KEYS.includes(e.key)) {
    e.preventDefault();          // prevent HERE — inside the branch that handles the key
    setActiveIndex((i) => nextIndex(i, e.key, ITEMS.length, { disabled: DISABLED }));
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(activeIndex); return; }
  if (e.key === 'Escape') { e.preventDefault(); close({ restoreFocus: true }); return; }
  // handled, deliberately NOT prevented:
  if (e.key === 'Tab') { triggerRef.current?.focus(); setOpen(false); setActiveIndex(-1); }
}
```

**Why:** `preventDefault` at the top cancels the browser's response to *every* key, and the browser's response to Tab is the entire tab order. Focus enters the menu and cannot leave: no next control, no browser chrome, no address bar. For a keyboard-only user that is not an inconvenience, it's the end of the session — they must close the tab. It is the exact inverse of project 52, where a modal traps focus *on purpose* and still guarantees an exit via Escape. The structural defence is already in the code: `MENU_KEYS` is exported from `nav.js` next to the rules that consume those keys, so "which keys do we handle" and "which keys do we cancel" are one list that can't drift. Tab is not on it, and never will be. Note also what the tests couldn't catch — `nav.test.js` still passes 16/16, because this is a bug about the *browser's* behaviour, not the rulebook's. Pure-function tests are worth a lot; they are not worth everything.

### 5. Submenus, as a stack of indices

```js
/** The sibling list that the last index of `path` indexes into. */
function siblingsAt(tree, path) {
  let list = tree;
  for (const i of path.slice(0, -1)) list = list[i].items || [];
  return list;
}

/** The item `path` points at. */
function itemAt(tree, path) {
  let item = null;
  let list = tree;
  for (const i of path) { item = list[i]; list = (item && item.items) || []; }
  return item;
}

export function nextFocus(state, key, tree) {
  const { path } = state;
  if (path.length === 0) return state;                 // nothing active yet

  if (MENU_KEYS.includes(key)) {                       // move within the current level
    const siblings = siblingsAt(tree, path);
    const current = path[path.length - 1];
    const next = nextIndex(current, key, siblings.length,
      { disabled: (i) => !!siblings[i].disabled });
    if (next === current) return state;                // no-op: same object out
    return { path: [...path.slice(0, -1), next] };
  }

  if (key === 'ArrowRight') {                          // push into a submenu
    const children = itemAt(tree, path).items || [];
    const first = nextIndex(-1, 'ArrowDown', children.length,
      { disabled: (i) => !!children[i].disabled });
    if (first === -1) return state;                    // no submenu, or all of it disabled
    return { path: [...path, first] };
  }

  if (key === 'ArrowLeft') {                           // pop out of one
    return path.length <= 1 ? state : { path: path.slice(0, -1) };
  }

  return state;
}

const TREE = [
  { label: 'Rename' },
  { label: 'Export', items: [
      { label: 'CSV' }, { label: 'JSON', disabled: true }, { label: 'PDF' } ] },
  { label: 'Delete', disabled: true },
];

test('arrows move within a level, and wrap over disabled siblings', () => {
  assert.deepEqual(nextFocus({ path: [0] }, 'ArrowDown', TREE).path, [1]);
  assert.deepEqual(nextFocus({ path: [1] }, 'ArrowDown', TREE).path, [0]);
  assert.deepEqual(nextFocus({ path: [0] }, 'End', TREE).path, [1]);
});

test('ArrowRight pushes, ArrowLeft pops, submenus obey the same rules', () => {
  assert.deepEqual(nextFocus({ path: [1] }, 'ArrowRight', TREE).path, [1, 0]);
  assert.deepEqual(nextFocus({ path: [1, 0] }, 'ArrowDown', TREE).path, [1, 2]);  // skips JSON
  assert.deepEqual(nextFocus({ path: [1, 2] }, 'ArrowDown', TREE).path, [1, 0]);  // wraps
  assert.deepEqual(nextFocus({ path: [1, 0] }, 'ArrowLeft', TREE).path, [1]);
});

test('dead ends return the SAME state object, and a journey folds cleanly', () => {
  const leaf = { path: [0] };
  assert.equal(nextFocus(leaf, 'ArrowRight', TREE), leaf);   // Rename has no submenu
  assert.equal(nextFocus(leaf, 'ArrowLeft', TREE), leaf);    // already at the root
  assert.equal(nextFocus(leaf, 'q', TREE), leaf);            // unknown key
  const keys = ['ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  assert.deepEqual(keys.reduce((s, k) => nextFocus(s, k, TREE), leaf).path, [0]);
});
```

**Why:** the whole submenu feature turned out to be a stack. `ArrowRight` is `push`, `ArrowLeft` is `pop`, and every other key is the rulebook you already had, applied to `path[path.length - 1]` instead of to a bare number. `nextIndex` didn't change by a character — that's the dividend of having written it as arithmetic over `(current, key, count, options)` rather than as something that knew about menus. Two details are load-bearing. Returning the *identical* `state` object for dead ends (rather than a fresh `{ path: [...path] }`) is the no-op contract scaled up to an object: `Object.is` says nothing changed, so React skips the re-render — the same reference-equality reasoning as project 13's reducer and project 10's mutation trap, read from the other side. And computing the entry point with `nextIndex(-1, 'ArrowDown', ...)` rather than hardcoding `0` means a submenu whose first item is disabled still opens on something you can actually choose, and a submenu with *no* enabled items refuses to open at all — one call, two edge cases, no new code.
