# 17 — Snake

**Lesson: the game loop, and immutable-ish state updates — `state = step(state)`
instead of ten mutated globals.**

## Run it

Open `original.html` and `refactored/index.html` in a browser.
Refactored extras (nearly free once state is data): Space pauses, R restarts.

## What's wrong with the original?

1. **Ten globals mutated from three places.** `snake`, `dx`, `dy`, `foodX`, `foodY`,
   `score`, `dead`, `changedThisTick`... The keyboard handler writes some, the interval
   writes others, and the snake array is mutated by `unshift` in one branch and `pop`
   in another. To know what the game's state *is* at any moment, you must simulate
   every writer in your head.
2. **It has a real, classic input bug** (patched with the `changedThisTick` flag, which
   is itself a code smell): direction changes were applied *immediately* on keypress,
   so two quick keypresses within one tick could turn the snake 180° through itself.
   The refactor fixes this *structurally* — key presses only record a *request*, and
   direction is applied exactly once per tick inside `step`. The bug becomes
   unrepresentable rather than guarded against.
3. **Food can spawn on the snake** — nobody checked.
4. **Rules and rendering share one function**, and magic `20`s/`400`s must silently
   agree with the canvas HTML attributes.

## What changed in the refactor

- **One state object, one transition function.** `step(state, input)` takes the world
  and returns the *next* world; the old one is never modified (spread + slice instead
  of `unshift`/`pop`). The whole game loop is two lines:
  `state = step(state, requestedDirection); render(ctx, state);`
  This is the pattern under Redux, game engines, and simulations alike:
  **next state = f(current state, input)**.
- **Growth becomes elegant** as a data decision: eat → `[head, ...snake]` (keep tail);
  move → `[head, ...snake.slice(0, -1)]` (drop tail). Compare the original's
  mutate-then-maybe-unmutate dance.
- **Pause and restart cost ~6 lines total.** Pause is just a `status` value that makes
  `step` return the state unchanged; restart is `state = newGame()`. Try adding either
  to the original — you'll be auditing every global. When features are cheap, the
  architecture is right.
- **Rendering reads state and draws it.** It decides nothing — same as projects 14/16.
- `GRID`, `CELL`, `TICK_MS`, and a `DIRECTIONS` key-map (rules-as-data again) replace
  the scattered magic numbers and per-key ifs.

## Key takeaway

Globals mutated from multiple places make every bug a whodunit. Concentrate change
into one `step` function that maps old state to new state, and the game becomes a pure
data transformation with a thin drawing layer — testable, pausable, replayable.
