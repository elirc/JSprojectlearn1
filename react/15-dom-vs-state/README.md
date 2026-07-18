# React 15 — DOM poking vs state

**Lesson: in React, you don't change the page — you change state and let the page
follow. classList toggles via refs are state React can't see, with a lifetime you
don't control.**

## Run it

Open `original.html`: collapse the *first* section, then click "re-render app"
twice. Your collapsed section springs back open. In the refactor, collapsed
sections survive anything.

## What's wrong with the original?

`ref.current.classList.toggle('collapsed')` — the jQuery reflex inside a React
component. It works on first click, and it's wrong three ways:

1. **The state has the wrong lifetime.** Collapsed-ness lives on a DOM node, and
   React *recycles DOM nodes whenever it likes* — unmount/remount (the demo), a
   key change, a list reorder. Your class attribute is luggage on a plane you
   don't own. This is js#14's "state trapped in the DOM," inside the framework
   that was invented to end it.
2. **React can't see it**, so nothing can be derived from it: no "collapse all"
   (who would you ask which are collapsed?), no "2 of 3 open" counter, no
   persistence. Features aren't hard — they're *unreachable*.
3. Two writers, one DOM: React renders from its state, you patch behind its
   back — the recipe for "works until an unrelated change re-renders."

## What changed in the refactor

- **Collapsed-ness became data**: a `Set` of collapsed ids in `useState`. The
  `Section` renders `{!collapsed && <body>}` — the class/visibility is
  *computed from* state, never poked. Refs didn't even survive the refactor;
  none were needed.
- **The unreachable features each cost one line** — collapse all (`new
  Set(allIds)`), expand all (`new Set()`), the open counter (derived, project
  09). This is the recurring proof: when state is visible data, features are
  cheap.
- `Section` became stateless (props down, events up — projects 07/08's
  contract), so *any* policy is possible at the top: "only one open at a time"
  would be a two-line change.
- When *are* refs right? For things that aren't render state: focusing an
  input, measuring size, scroll position, or holding non-visual values (project
  26). The line: **if it changes what's on screen, it's state; refs are for
  talking to the DOM, not for storing truth about it.**

## Key takeaway

React's deal is: describe the page as a function of state, and never touch the
DOM behind its back. Every `classList`/`style`/`innerHTML` write via a ref is a
second source of truth with a lifetime you don't control. Change the data;
let the page follow.
