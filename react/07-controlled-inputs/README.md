# React 07 — Controlled inputs

**Lesson: one source of truth. `value` + `onChange` makes React own the form;
`getElementById` leaves your data hiding in the DOM.**

## Run it

Open both files. In the refactor, notice the live preview and the submit button
enabling itself as you type — then look for those features in the original.
(They're absent because they're *impossible* there.)

## What's wrong with the original?

It treats React like jQuery: render some inputs, then **reach into the DOM by id**
to read (`.value`) and write (`fillDemoData`). That creates *two* sources of
truth — React's state and the DOM's input values — and everything bad follows:

- **React can't see what's typed**, so no live preview, no disable-until-valid,
  no character counters. The username exists only inside a DOM node, invisible
  to rendering.
- **The DOM copy survives by luck.** Conditionally unmount the form, or change a
  `key` upstream, and typed values silently vanish — React rebuilds from *its*
  truth, which doesn't include them. (js#14's "state trapped in the DOM," in its
  React costume.)
- **`document.getElementById` breaks with two forms on the page** (duplicate
  ids) and couples the component to global document structure.

## What changed in the refactor

- **The controlled-input pattern**: `value={username}`
  `onChange={(e) => setUsername(e.target.value)}`. The input *displays* state;
  typing *updates* state; the input cannot disagree with React because it has no
  independent memory. This pair is the fundamental React form idiom.
- **The blocked features each cost one line once state owned the data**: live
  preview is `{username && ...}`, disable-until-valid is
  `disabled={!isValid}` where `isValid` is *derived during render* (project 09's
  drumbeat).
- **"Fill demo data" writes state, not DOM** — and the inputs follow, because
  they render *from* it. Programmatic form control comes free.
- Small correctness upgrades: a real `<form onSubmit>` (Enter key works) with
  `preventDefault`, and `type="button"` on the non-submit button so it doesn't
  accidentally submit.

## Key takeaway

In React, data flows down (`value`) and events flow up (`onChange`) — inputs are
no exception. The moment you type `document.getElementById` inside a component,
you've created a second source of truth, and one of them will eventually lie.
