# React 14 — Event handlers

**Lesson: `onClick` wants a function, not a function call — plus the two DOM event
facts (`preventDefault`, propagation) React doesn't hide from you.**

## Run it

Open `original.html`: click **submit** and watch the page reload your log away;
click **disarm** and watch it *also* select the row. Then uncomment blooper 1 and
meet the infinite render loop.

## What's wrong with the original?

Five bloopers, all real commits:

1. **`onClick={say('boom')}`** — this *calls* `say` during render and passes its
   *result* to onClick. Because it sets state, it re-renders, which calls it
   again: infinite loop. The distinction — `f` is a function, `f()` is its
   result — is the whole lesson.
2. The arrow "fix" that works but was cargo-culted — the authors never learned
   *why*, so blooper 1 recurs in their code whenever the arrow feels redundant.
3. Arrow-wrapping to pass arguments (`() => say(size)`) — correct! — but done as
   superstition rather than understanding.
4. **Form submit reloads the page.** HTML's default for submit is *navigate*;
   without `preventDefault` your SPA does a full reload and state evaporates.
5. **The disarm button also selects its row** — events bubble up through
   ancestors, and the row's onClick hears the button's click.

## What changed in the refactor

- **The one rule, stated as a table in the code**: `onClick={f}` right;
  `onClick={f()}` wrong (runs during render); `onClick={() => f(x)}` right and
  *the* way to pass arguments. Once this reads as obvious, blooper 1 is
  permanently extinct.
- **Named handlers** (`handleChooseSize`, `handleSubmit`) — the `handleX`
  convention plus a real function beats an inline arrow once logic exceeds one
  call, and gives the README/debugger something to name.
- **`event.preventDefault()`** in `handleSubmit` — keep the semantic `<form>`
  (Enter-to-submit works) and opt out of navigation only.
- **`event.stopPropagation()`** in `handleDisarm` — "this click is mine."
  Bubbling is usually a feature (it's how one listener serves a list); stop it
  only at controls that live *inside* other click targets.

## Key takeaway

JSX event props take *functions to call later*. Parentheses run things *now* —
during render, which is never when you want a handler to run. When you need
arguments, wrap in an arrow; when the browser's default or bubbling fights you,
`preventDefault`/`stopPropagation` are one line each, on the `event` you were
already handed.
