# React 50 — Build your own hooks

**Lesson: the meta-capstone — `useState` is an array and a cursor. Build it, and
the Rules of Hooks stop being rules and become obvious.**

## Run it

Open `original.html`, click count++ twice, then "toggle name" — React throws
*"Rendered more hooks than during the previous render"* (console). Then open
`refactored/index.html`: a working counter app with **no React on the page** —
`useState` and `useEffect` are ~50 lines of plain JS you can read whole.

## What's wrong with the original?

Not the code — the *mental model*. The developer treats the Rules of Hooks
("only at the top level, only from components") as arbitrary ritual, and the
demo breaks one on purpose: a `useState` inside an `if`. React catches the
crude version; the subtle versions **swap state between hooks** — your count
becomes `'Ada'`. "Because the docs say so" is where most React developers
stop. This project is the js#45 move (build your test framework) aimed at
React: demystify the tool by constructing it.

## What changed in the refactor

`MiniReact`, in three pieces:

- **`useState` is an array plus a cursor.** Hook state lives in `hooks[]`;
  each render rewinds `cursor` to 0, and every hook call claims slot
  `cursor++`. First render initializes the slot; later renders *re-claim it
  by position*. `setState` writes the slot and schedules a re-render — and
  the updater form (project 11) is a two-line `typeof` check.
- **`useEffect` is a slot holding `{ deps, cleanup }`**: compare deps with
  `Object.is` (the honest-deps rule from 17, mechanized), run cleanup before
  re-running (18's guarantee — one line here), store the new cleanup.
- **`render` rewinds and re-invokes** — which is why component bodies re-run
  every render (24's lesson) and why each render is a snapshot (11).

And now the Rules explain themselves: **calls are matched to state by
order**. A hook inside an `if` shifts every later hook into the wrong slot —
`count` receives `'Ada'`. "Top level only" isn't ceremony; it's keeping the
cursor honest. Every rule you've followed for 50 projects is a consequence of
these ~50 lines.

(Honest scope note: real React adds per-component hook lists on a fiber tree,
batched updates, and a reconciler — the *architecture* of hooks is what you
just built; the industrial engineering around it is what you're paying React
for.)

## Key takeaway

Same as js#45, one level up: your tools are code someone wrote. When a
framework behavior seems arbitrary — hooks order, effect timing, snapshot
state — build the 50-line version and the mystery usually dissolves into a
data structure. You've now done it for test runners and for React itself;
that habit will outlive both.
