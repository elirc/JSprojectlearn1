# React 53 — Keyboard navigation

**Lesson: keyboard support isn't a pile of extra event handlers bolted onto a
mouse UI — it's one piece of state. "Which item is active?" is a number, and
every key is a pure function of it.**

## Run it

```
open original.html and refactored/index.html in a browser
   — then drive both with Tab and the arrow keys only, hands off the mouse.
     The original locks you out; the refactor doesn't.
node --test react/53-keyboard-nav-menu/refactored/nav.test.js   <- every key rule, tested in Node
```

## What's wrong with the original?

The menu is excellent with a mouse and unusable without one, and every reason
is the same one: the interaction lives in *pointer events*, not in state.

- **Hover is the open/close contract.** `onMouseEnter`/`onMouseLeave` means
  there is no way to open the menu with a keyboard — and no way on a phone
  either. It also breaks for mouse users: move diagonally toward the third
  item, clip the corner of the wrapper, and the menu vanishes mid-reach.
- **Trigger and items are all `<div onClick>`s.** Divs are not tab stops, do
  not fire on Enter or Space, and announce as nothing: Tab walks straight from
  "before the menu" to "after the menu" (the focus tracker shows the jump), and
  with no `role`, `aria-haspopup` or `aria-expanded`, an assistive-technology
  user is never told a menu exists, let alone whether it's open.
- **The only highlight is `:hover`.** Even if focus somehow arrived, nothing on
  screen would move. Sighted keyboard users need to *see* where they are.
- **"Delete (disabled)" is grey and fully clickable.** Disabled is a colour
  here, not a rule.

There is no `activeIndex` anywhere in the original — precisely why no key press
has anything to do, as the status line says out loud.

## What changed in the refactor

- **One number of state, one pure rulebook.** `activeIndex` is the entire
  interaction, and `nextIndex(current, key, count, { disabled, loop })` in
  `refactored/nav.js` is the only thing that changes it: a `switch` over
  `event.key` returning a number. Zero React, zero DOM — so `nav.test.js` tests
  wrap-around, `Home`/`End`, disabled-skipping and an all-disabled menu in Node,
  the way project 13 tests a reducer.
- **Roving tabindex.** Exactly one item carries `tabIndex={0}` (the active
  one); every other carries `-1`. The whole menu is *one* tab stop — Tab gets
  you to it, arrows move within it. The pattern real menus, tabs, toolbars and
  grids use, and four characters of JSX once the state exists.
- **Real semantics**: a `<button>` trigger with `aria-haspopup="menu"` and
  `aria-expanded`, `role="menu"`/`role="menuitem"` on the list, `aria-disabled`
  on Delete — which the arrows now skip and clicks now refuse.
- **Decide vs. do, drawn sharply.** The pure function decides *which* index;
  one `useEffect` calls `.focus()` on that item's node. Focus is a side effect,
  so it lives in an effect (project 18's discipline, listeners cleaned up).
- **Escape closes and gives focus back to the trigger** — the same
  return-focus courtesy project 52 builds into its modal, minus the trap: here
  Tab deliberately closes the menu and *leaves*, because the handler
  `preventDefault()`s only the keys it handles. Arrows and Home/End are ours;
  Tab is the browser's, forever.
- **The mouse still works, unchanged** — hovering sets `activeIndex`, clicking
  selects. Keyboard support was added, not traded for.

## Key takeaway

When a widget "needs keyboard support", don't start writing `onKeyDown`
branches. Ask what single piece of state the keys are moving, name it, make the
transitions a pure function you can unit-test, and the handlers collapse into
`setActive(nextIndex(active, e.key, ...))` — after which the accessible version
and the mouse version are the same code.
