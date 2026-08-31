# React 52 — Accessible modal

**Lesson: a dialog that only *looks* like a dialog is a trap for everyone not
holding a mouse — accessibility is focus, keyboard and roles, three concrete
jobs you can code.**

## Run it

```
open original.html and refactored/index.html in a browser
node --test react/52-accessible-modal-focus/refactored/focus.test.js   <- the trap's RULES, tested in Node
```

Put the mouse in your lap. Both pages carry a yellow **focus tracker** printing
`document.activeElement` on every focus change, so the lesson is visible
without a screen reader: open the dialog, hold Tab, watch the highlight. In the
original it walks out of the dialog on the second press.

## What's wrong with the original?

It renders perfectly. Dim backdrop, centred card, heading, buttons — a modal by
every visual measure, and a `<div>` by every other. Five failures, all
reproducible with the Tab key:

1. **Focus never moves in.** Opening flips a boolean; nobody calls `.focus()`,
   so focus stays on the "Edit profile…" button *behind* the grey layer.
2. **Tab escapes.** The dialog renders inline, so it just joins the page's tab
   order: two presses land you on "Save settings" and "Help" — dimmed,
   unclickable, and perfectly typable.
3. **Escape does nothing.** The only exit is a mouse click.
4. **Assistive technology is told nothing.** No `role`, no `aria-modal`, no
   `aria-labelledby`: an anonymous div, announced as nothing, with the entire
   page behind it still readable and interactive.
5. **Focus is dropped on close.** The focused button unmounts, focus falls to
   `<body>`, and the next Tab restarts at the top of the page.

## What changed in the refactor

- **The decision left the effect.** `refactored/focus.js` holds pure functions —
  `isFocusable`, `getFocusable`, `nextFocusIndex(current, count, { shift })` —
  over plain element-shaped objects. Which element gets focus next is
  arithmetic over a list, so `focus.test.js` proves every wrap-around rule in
  Node with fake elements. The browser only does the `el.focus()`. Same
  decide-vs-do cut as the reducers in 13 and 40, aimed at the keyboard.
- **Focus in, focus back.** One effect stores `document.activeElement` on
  mount, focuses the first focusable element inside, and **restores it in the
  cleanup** — project 18's pairing where the cleanup is the feature, not the
  tidying up.
- **A real trap.** A `keydown` handler recomputes the focusable list *on every
  press* (a dialog grows controls while it's open), finds where focus is,
  asks `nextFocusIndex`, `preventDefault()`s and focuses the answer. Tab wraps
  last→first, Shift+Tab first→last. Escape closes.
- **Roles, so it means something.** `role="dialog"`, `aria-modal="true"` and
  `aria-labelledby` pointing at the heading turn the div into "Edit profile,
  dialog" for a screen reader; `aria-label="Close"` gives the × button a name
  instead of a multiplication sign.
- **Portalled out** with `createPortal` into `#modal-root` (project 38) — so
  the overlay escapes every clipping and stacking ancestor by construction.
- Honest scaling note (printed on the page): production code should reach for
  the native `<dialog>` element, the `inert` attribute, or a focus-trap
  library, which also hide the background from screen readers and handle
  quirks these ~40 lines don't — built from exactly these mechanics.

## Key takeaway

"Make it accessible" is not a vibe or a lint rule to appease — it decomposes
into three jobs with observable behaviour: **where is focus, what does the
keyboard do, and what is this thing called.** Watch the focus tracker and you
can *see* whether you did them. And the hardest of the three is pure logic —
which means it belongs in a tested module, not in a `keydown` handler.
