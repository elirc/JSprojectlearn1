# 14 — To-do list app

**Lesson: state lives in data, not in the DOM. The screen is a *function of* the state.**

## Run it

Open `original.html` and `refactored/index.html` in a browser. They look identical.
That's the point — the difference is what happens when you try to *change* them.

## What's wrong with the original?

**The `<ul>` is the database.** There is no list of todos anywhere in the JavaScript —
the only record is the HTML itself. Every feature therefore has to:

1. *Read* data back out of the DOM (`updateCounter` literally counts `<li>` elements
   and inspects their CSS classes to learn what the app's own data is), and
2. *Patch* the DOM by hand, consistently with every other feature's patches — which is
   why `updateCounter()` is manually called from three places. Forget one call site
   and the counter silently lies.

Now imagine adding what every todo app needs next: **persistence** (save... the HTML?),
filters (all/active/done), "clear completed", undo. Each feature multiplies the manual
bookkeeping. This architecture doesn't scale past roughly the features it already has.

Bonus bug: `span.innerText = input.value` — fine here, but the habit of putting user
input into `innerHTML` (its sibling) is how XSS happens. The refactor uses
`textContent` and says why.

## What changed in the refactor

The file reorganizes into five labeled layers — read them top to bottom:

1. **STATE**: `todos` is a plain array of `{ id, text, done }`. The single source of
   truth. Note each todo gets an `id` — array indexes break the moment you delete.
2. **ACTIONS**: `addTodo` / `toggleTodo` / `removeTodo` are the *only* code that
   mutates state, and each ends with `render()`. One protocol, no exceptions.
3. **RENDER**: wipes the list and redraws everything from `todos`. "Rebuild it all"
   feels wasteful, but it buys total consistency: the counter and the list are derived
   from the *same array*, so they cannot disagree. (React's whole idea is making this
   pattern fast; learn the pattern here and React will feel obvious later.)
4. **PERSISTENCE**: `JSON.stringify(todos)`. Two lines — because the state was already
   plain data. In the original this feature is nearly unimplementable.
5. **WIRING**: events call actions. Nothing else.

## Key takeaway

Ask of any UI: "if I deleted the entire DOM and re-rendered, would the app come back
intact?" If yes, your state lives in data and features are cheap. If no, your data is
trapped in the page and every feature is an archaeology dig.
