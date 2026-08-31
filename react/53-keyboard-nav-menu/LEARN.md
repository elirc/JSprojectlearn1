# 📘 Learning Guide: Keyboard Navigation

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

An "Actions ▾" dropdown, the kind every app has in the corner of a
document: Rename, Duplicate, Export as CSV, and a greyed-out Delete.
Both pages behave identically *if you use a mouse*. Now put the mouse
down. In the original, Tab jumps from "before the menu" straight to
"after the menu" — the whole menu is invisible to the keyboard, and no
key opens it. In the refactor, Tab reaches the trigger, Enter opens it,
arrows walk the items with a visible highlight, Home and End jump to
the ends, Delete is skipped, and Escape closes and puts you back on the
button. Both pages carry a `focus:` tracker and a `status:` line
showing `open` and `activeIndex`, so you can watch the difference
rather than take my word for it.

## 2. Concepts you need first

### Tab stops and `tabIndex`

The browser keeps an ordered list of **tab stops** — the elements Tab
moves focus to (Shift+Tab walks it backwards). By default that list
holds exactly the *interactive* elements: `<button>`, `<a href>`,
`<input>`, `<select>`, `<textarea>`. A `<div>` is not on it, however it
looks and whatever `onClick` you attached — the whole mystery of the
original: trigger and items are divs, so Tab goes over the menu like it
isn't there.

`tabIndex` edits that list. `tabIndex={0}` makes an element a tab stop
in DOM order — how you make a div reachable. `tabIndex={-1}` makes it
**not** a tab stop but still focusable by code: `el.focus()` works, Tab
never lands there. That second one is the useful one, and the one most
people have never heard of. `tabIndex={1}` or higher jumps the queue,
creating a second competing tab order — a famous footgun; don't.

### Roving tabindex (the pattern this project is named for)

Give each of ten menu items `tabIndex={0}` and your menu is now ten tab
stops: someone who doesn't want it must press Tab eleven times to get
past — worse than the bug you were fixing. The fix is exactly what its
name says: **exactly one item in the group has `tabIndex={0}` — the
active one — and every other has `-1`, so as the active item changes,
the `0` *roves* with it.**

So the group is **one** tab stop, arrows move *within* it, and you
re-enter wherever you left, because the `0` stayed there. Menus, tab
bars, toolbars, radio groups, trees and grids all work this way.

### Why hover and divs fail everyone

`onMouseEnter` exists only for someone holding a pointing device — not
for **keyboard users** (no pointer, so no menu), **touch users** (a
finger has no hovering state; phones fake one badly), or
**screen-reader users**, whose reading cursor moves through the
accessibility tree rather than across pixels. Hover is fine as a bonus;
never as the only way in.

That accessibility tree is built from your HTML plus ARIA attributes —
a screen reader never sees your CSS. `role="menu"` and `role="menuitem"`
get you "menu, four items" and "Rename, one of four";
`aria-haspopup="menu"` on the trigger announces "there's a menu behind
this button" *before* it's pressed; `aria-disabled="true"` on Delete
announces it as unavailable; and `aria-expanded={open}` says
"collapsed" / "expanded" — the most valuable attribute on the page,
because it's the only way a non-sighted user learns the press worked.

A `<div onClick>` has none of this; a `<button>` gets the button role,
Enter/Space activation and focusability free — which is why "just use a
button" is the most repeated advice in accessibility. Note that
`<button disabled>` is different again: a real HTML state, unclickable
*and removed from the tab order*. `aria-disabled` says "unavailable"
while keeping the element findable, which is what menus usually want.

### `event.key` and `preventDefault`

Every key event carries `event.key`: a string like `'ArrowDown'`,
`'Home'`, `'Escape'`, `'Enter'`, `' '` (space is a literal space) or
`'a'`. Compare against those — never the old numeric `keyCode`.
`event.preventDefault()` cancels the browser's built-in response; you
need it for ArrowDown and Space (both scroll the page), and you must
call it **only for keys you actually handle**. Prevent Tab and you've
built a keyboard trap where focus can enter your menu and never leave —
the single most severe accessibility failure there is.

### The big idea: keyboard interaction is a STATE problem

Beginners write keyboard support as a pile of handlers — one `if` per
key, each one finding the next div and calling `.focus()` on it. Every
branch reaches into the DOM, and "where am I?" is answered by asking
the document: project 15's mistake (state hidden in the DOM) in a
keyboard costume. The React answer is **one piece of state,
`activeIndex`, with each key a pure transition on it**:

```js
setActiveIndex((i) => nextIndex(i, e.key, items.length, { disabled }));
```

`nextIndex` is `(state, event) => nextState`, the same shape as project
13's reducer and the JS track's `step(state, input)`. Arithmetic on a
number: no DOM, no React, testable in Node in milliseconds — and
rendering, including the tab order itself, then follows from it.

## 3. Walking through the original code

The open/close contract, in full:

```jsx
<div className="menu"
     onMouseEnter={() => setOpen(true)}
     onMouseLeave={() => setOpen(false)}>
  <div className="trigger">Actions ▾</div>
```

Two pointer events and a div. Notice what `open` depends on: the
physical position of a mouse. There is no other route to `true`. The
items are `<div onClick={() => onPick(item.label)}>`s whose `disabled`
flag only adds a class that greys the text — `onClick` never checks it,
so the "disabled" Delete fires like anything else — and the complete
visual feedback system is one CSS rule, `.item:hover`, with no `:focus`
anywhere.

Now search the original for `activeIndex`: it appears once, in the
status line, printing `—` and a note that no such state exists. That
absence *is* the bug — there is no state for a key press to change, so
there is nothing a key press could usefully do.

## 4. What's wrong with it (in beginner terms)

Experience it as four different people. **The keyboard user** presses
Tab and goes "before the menu" → "after the menu"; no key, combination
or trick opens it, so the feature simply does not exist for them, and
nothing explains why. **The screen-reader user** hears two buttons —
"Actions" is announced as plain text if their reading cursor sweeps it,
with no "button", no "has menu", no "collapsed", and even open it's
four unlabelled lines. **The touch user** taps "Actions ▾": some phones
synthesise a hover and it appears, others do nothing, and it then won't
dismiss, because `onMouseLeave` needs a pointer that has left.

**The mouse user** — yes, this one too — opens the menu and moves
diagonally toward "Export as CSV". The path clips the corner outside
the wrapper, `onMouseLeave` fires, the menu evaporates. Everyone has
felt this bug in real software; now you know why.

One root cause behind all four: **the interaction lives in pointer
events instead of in state**. Fix that and all four improve at once.
Accessibility here isn't a separate feature for a minority; it's what
falls out of a better state model.

## 5. Try it yourself first!

1. **Vague:** the menu must work without a mouse. What single question
   does a mouse answer that a keyboard has to answer some other way?
2. **Warmer:** "which item is the user on?" The pointer's position
   answers it; without one, *you* must store the answer. Add
   `const [activeIndex, setActiveIndex] = useState(-1)` and render the
   highlight from it before touching a single key handler.
3. **Warmer still:** write the key rules as a function taking a number
   and a key string and returning a number, with no React and no DOM
   inside — ArrowDown, ArrowUp, Home, End, "any other key changes
   nothing", wrapping at both ends, skipping the disabled item.
4. **The semantics and the tab order:** a real `<button>` trigger with
   `aria-expanded` and `aria-haspopup="menu"`, `role="menu"` /
   `role="menuitem"` on the list, and exactly one item with
   `tabIndex={0}` (the active one) and `-1` for the rest. Check with
   Tab that the whole menu is one stop.
5. **The one imperative bit:** state alone doesn't move the focus
   caret — keep an array of refs and `.focus()` the active item in a
   `useEffect`. Then check your work: Escape must close *and* return
   focus to the trigger, and Tab must always be able to leave. If it
   can't, you've built a trap; undo it immediately.

## 6. Understanding the refactored solution

**The rulebook is one pure function** (`refactored/nav.js`, copied into
the page because browsers can't import modules from `file://`):

```js
export function nextIndex(current, key, count, options = {}) {
  if (count <= 0) return -1;
  switch (key) {
    case 'ArrowDown': case 'ArrowUp':      // all four cases call seek()
    case 'Home':      case 'End':   { ... }
    default: return current;               // the no-op contract
  }
}
```

A `switch` that returns a number. That `default` matters more than it
looks: "any key I don't handle leaves the state exactly as it was" is a
*rule*, and returning `current` unchanged is how the component knows
nothing happened — the "same value in, same value out" contract project
13's reducer uses for rejected input.

All four cases delegate the walking to `seek(start, step, count,
isDisabled, loop)`, which steps from `start` until it finds an enabled
index, wrapping at the ends or treating them as walls. Note its loop
bound, `attempts < count`: a `while (isDisabled(i))` would spin forever
the day someone disables every item, freezing the tab, while the
bounded version returns `-1` — and `nav.test.js` asserts that in a
millisecond rather than hanging a browser.

**The handler is three lines and no cleverness:**

```jsx
if (MENU_KEYS.includes(e.key)) {
  e.preventDefault();                    // ONLY the keys we handle
  setActiveIndex((i) => nextIndex(i, e.key, ITEMS.length, { disabled: DISABLED }));
  return;
}
```

`MENU_KEYS` is exported beside the rules so the `preventDefault`
decision and the movement rules can never drift apart; Tab is
deliberately absent from it.

**Decide vs. do.** The pure function decides *which index*; moving
focus is a side effect, so it lives in an effect that runs after the
render which put those nodes on screen:

```jsx
useEffect(() => {
  if (!open || activeIndex < 0) return;
  itemRefs.current[activeIndex]?.focus();
}, [open, activeIndex]);
```

That's "separate deciding from doing" in two functions: arithmetic you
can test, and one line you can't. **Roving tabindex is rendered from
state** the same way — `tabIndex={i === rovingIndex ? 0 : -1}`, where
`rovingIndex` is `activeIndex` when something is active and the first
enabled item otherwise, so the list always has exactly one door.

**Escape returns focus:** `close({ restoreFocus: true })` calls
`triggerRef.current.focus()`; without it, closing leaves focus on a
node that no longer exists and the browser dumps you at the top of the
document. Project 52 does the same for a modal — return focus where you
took it from. **Tab, by contrast, is handled by *not* handling it:** its
branch closes the menu and hands focus back to the trigger *without*
`preventDefault`, so the browser's own tab move continues from there to
the next control. One tab stop, behaving like one. And **the mouse lost
nothing**: `onMouseEnter` sets `activeIndex`, `onClick` selects — the
pointer became one more way to change the same state instead of the
only way anything happens.

## 7. Words you learned (glossary)

- **Tab stop:** an element Tab moves focus to. By default, only
  interactive elements.
- **tabIndex:** edits the tab order. `0` = a stop in DOM order; `-1` =
  focusable by code only; positive = queue-jumping, avoid.
- **Roving tabindex:** exactly one element in a group has
  `tabIndex={0}` and the rest `-1`, so the group is one tab stop and
  arrows move within it.
- **Active descendant:** the alternative — focus stays on the container
  and `aria-activedescendant` names the active child by id.
- **`event.key`:** the string identifying the pressed key
  (`'ArrowDown'`, `'Escape'`, `' '`).
- **`preventDefault`:** cancels the browser's built-in response. Call it
  only for keys you handle.
- **Keyboard trap:** a region focus can enter but not leave. The most
  severe accessibility bug you can ship.
- **Focus / selection / activation:** *focus* = where key events go;
  *selection* = what's highlighted as chosen; *activation* = running it.
- **`aria-expanded` / `aria-haspopup`:** whether the thing this control
  opens is open, and that it opens a popup at all.
- **`role`:** overrides what an element *is* in the accessibility tree
  (`role="menu"`, `role="menuitem"`).
- **`aria-disabled` vs `disabled`:** `disabled` is a real HTML state
  that also removes the element from the tab order; `aria-disabled`
  announces "unavailable" while keeping it findable.
- **No-op contract:** an unrecognised input returns the state unchanged.
- **Wrap-around:** past the last item lands on the first; before the
  first lands on the last.

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs
internet on first load. The rulebook needs nothing —
`node --test refactored/nav.test.js` works at 30,000 feet.

1. **Break the roving tabindex.** Change `tabIndex={i === rovingIndex ?
   0 : -1}` to `tabIndex={0}`. Expected: everything still *works*, but
   the menu is now four tab stops — Tab through it and count. The bug
   you'd have shipped by "just making the items focusable".
2. **Build the keyboard trap on purpose, then undo it.** Add
   `e.preventDefault()` as the first line of `onListKeyDown`, before
   any key check. Expected: arrows still work and Tab is dead — focus
   can never leave. Feel how fast the page becomes a prison.
3. **Delete the focus effect.** Comment out the `useEffect` that calls
   `.focus()`. Expected: `activeIndex` still updates on every arrow
   press — the *decision* is untouched — but the highlight stops moving
   and Enter stops working, because focus never left the first item.
   That gap is exactly the decide/do split.
4. **Add `loop: false`.** Pass `{ disabled: DISABLED, loop: false }`.
   Expected: the ends become walls — ArrowDown on the last item stays
   put instead of jumping to the first. One option, no new handler
   code; the tests for it already exist in `nav.test.js`.
