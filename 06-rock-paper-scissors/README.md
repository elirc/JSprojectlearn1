# 06 — Rock paper scissors

**Lesson: game rules as *data*, separated from I/O — your first real architecture.**

## Run it

```
node 06-rock-paper-scissors/original.js rock
node 06-rock-paper-scissors/refactored/cli.js rock
node --test 06-rock-paper-scissors/
```

## What's wrong with the original?

1. **Nine hand-written branches** for a game whose entire rulebook is "rock beats
   scissors, paper beats rock, scissors beats paper." The if-chain encodes the rules
   *and* the comparison *and* the output message in every line. Add one move
   (lizard-spock style) and 9 branches become 25.
2. **Typos fail silently.** Play `"rok"` and no branch matches — the program prints
   the moves and then just... ends. The refactor validates input and *throws* from the
   rules layer, while the CLI layer turns that into a friendly usage message.
3. **Untestable by construction.** Everything happens at the top level of the script
   with `Math.random()` and `console.log` baked in. You cannot call any of it.

## What changed in the refactor

- **The rulebook became a data structure.** `BEATS = { rock: 'scissors', ... }` — three
  lines you can read like a table. `decideWinner` is then two lines of logic: same move
  is a draw, otherwise check the table. Rules-as-data is a huge pattern: project 10
  (operators), 13 (ciphers), and 18 (scoring categories) are all the same idea.
- **`decideWinner` returns `'player' | 'computer' | 'draw'`** — a *fact*, not a
  sentence. The CLI maps facts to English at the edge. Later you could swap the CLI
  for a web UI without touching `game.js` at all. That's the practical meaning of
  "separation of concerns."
- **`randomMove(rng = Math.random)`** — dependency injection in its smallest possible
  form. Randomness makes tests flaky, so the source of randomness is a parameter with
  a sensible default. Tests pass `() => 0` and get a deterministic answer. Remember
  this trick; it works for clocks (`now = Date.now`) too.
- Look at the "rules are symmetric" test — it checks a *property* across all pairs
  instead of listing cases. Cheap to write once the rules are pure functions.

## Key takeaway

`game.js` doesn't know the console exists. `cli.js` doesn't know the rules. Each file
can change — or be replaced — without the other noticing. Projects 14–18 scale this
exact split up to real UIs.
