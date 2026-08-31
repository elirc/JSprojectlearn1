# React 58 — Command palette

**Lesson: when adding one feature means editing five places, the problem
isn't the feature — it's that behaviour was written as code instead of
stored as data.**

## Run it

Open either file and press **Ctrl+K** (Cmd+K). Both palettes work
identically — type, arrow, Enter. Then open `original.html` and answer
one question: *where would you add a "Copy the log" command?* The five
places you'd have to edit are numbered in the source.

```
node --test react/58-command-palette/refactored/palette.test.js
```

## What's wrong with the original?

Nothing on screen — which is why this smell survives so long. It's one
200-line component in which five unrelated jobs are interleaved:

1. **Titles are identity.** Commands are strings, so every other part of
   the code re-derives meaning by comparing them. Rename "Say hello" and
   three unrelated functions break, silently.
2. **`runCommand` is an if-chain** of string equality — js#10's problem
   exactly, in a React file. Adding a command means finding the right
   `else if`.
3. **`iconFor` is a *second* if-chain** over the same strings. Any list
   of `if (x === ...)` over the same values is a table someone refused
   to write down.
4. **The fuzzy filter grew synonym special-cases** (`if (query ===
   'theme' && title === 'Toggle dark mode')`) — one panicked bug report
   at a time. Search behaviour is now per-command, and unfindable.
5. **The key handler reads seven values out of the render closure**, so
   its deps array is seven items long and the listener is torn down and
   re-subscribed *on every keystroke*. Trim the deps to shorten it and
   you get project 11's stale closure running last render's command.
6. **None of it is testable.** Ranking, matching, shortcut parsing, and
   what each command does are all trapped inside a component that needs
   a DOM and a keyboard to run at all.

## What changed in the refactor

- **Commands became data**: `{ id, title, icon, keywords, run }`. `id`
  is identity, `title` is display, `keywords` is search, `run(actions)`
  is behaviour. Adding "Copy the log" is one object — the icon, the
  search synonyms, the ranking and the keyboard all follow automatically
  because they were never per-command in the first place.
- **`run` takes an `actions` bag**, so the registry describes behaviour
  without importing React — and a test can pass a fake bag and assert
  that "Increase font size" really does call `setFontSize` with 18.
- **`fuzzyMatch` and `rankCommands` are pure and extracted.** Subsequence
  matching with a small integer score (consecutive letters and word
  starts win), a stable sort so ties keep registry order, and `positions`
  so the UI can bold the letters you typed. The synonym special-cases
  became a `keywords` array.
- **`matchesCombo('mod+k', event)` is pure too** — shortcut parsing that
  a test can drive with `{ key: 'k', ctrlKey: true }`.
- **`useGlobalKey`** subscribes once and uses the latest-ref pattern
  (project 25), so the handler is never stale (project 11) and never
  re-subscribes on a keystroke. Cleanup on unmount is project 18.
- **`CommandPalette` only renders** — a list, a cursor, four shortcuts.
  It has never heard of dark mode or font sizes, so it would drop into
  another app unchanged. That's project 35's composition test.

## Key takeaway

The five-places-to-edit feeling is a design signal, not a chore. It means
one concept — "a command" — has been smeared across a filter, an
if-chain, an icon lookup and a key handler. Write the concept down as a
row of data with a function in it, and the five edits collapse into one.
Every real palette (VS Code, Linear, Slack) is a registry plus a ranker
plus a renderer, and the registry is the part that makes it feel
extensible.
