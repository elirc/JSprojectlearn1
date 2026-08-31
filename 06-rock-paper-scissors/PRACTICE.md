# 🏋️ Practice: Rock Paper Scissors

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Guard both doors (warm-up)
The test suite proves `decideWinner('rok', 'rock')` throws — but only checks a bad *player* move. Add a test asserting that a bad *computer* move throws too: `decideWinner('rock', 'rok')`. Also assert `decideWinner('Rock', 'rock')` throws — validation is case-sensitive on purpose (lowercasing is the CLI's job).
What it practices: testing a guard from every direction, and knowing which layer owns which job.
Hint: `assert.throws(() => decideWinner('rock', 'rok'))` — the arrow wrapper matters.

### ⭐⭐ 2. The counter-move
Write `counterMove(move)` returning the move that *beats* the given one: `counterMove('scissors') === 'rock'`, `counterMove('rock') === 'paper'`, `counterMove('paper') === 'scissors'`. Invalid moves must throw. Do it **without** writing a new table — derive the answer from the existing public functions.
What it practices: rules-as-data pays twice — a second table could drift out of sync with `BEATS`, but a derived answer can't.
Hint: the counter-move is the move `m` for which `decideWinner(m, move)` is `'player'`. `MOVES.find(...)` does the searching.

### ⭐⭐ 3. Move the words out of the CLI
`cli.js` builds its sentences inline. Write a pure function `describeRound(playerMove, computerMove)` in the game layer's style that returns the full two-line announcement as one string: `describeRound('rock', 'scissors')` must return exactly `'You played rock, computer played scissors.\nYou win!'`.
What it practices: facts vs. sentences — pushing wording into a pure, testable function so the shell shrinks to almost nothing.
Hint: call `decideWinner`, then translate its fact with the same lookup-object trick `cli.js` uses.

### ⭐⭐ 4. Score a recorded match
Write `scoreSeries(rounds)` where `rounds` is an array of `[playerMove, computerMove]` pairs. It returns a tally object. Expected: `scoreSeries([['rock','scissors'], ['paper','scissors'], ['rock','rock']])` gives `{ player: 1, computer: 1, draw: 1 }` (win, loss, draw). Unlike LEARN.md's best-of-five experiment this is a *pure function over given data* — no randomness, no printing — so it gets real tests.
What it practices: turning "a loop in the CLI" into a testable pure function; using an object as an accumulator.
Hint: start the tally at `{ player: 0, computer: 0, draw: 0 }` and use `decideWinner`'s return value directly as the key: `tally[decideWinner(p, c)] += 1`.

### ⭐⭐⭐ 5. A scripted random number generator
`randomMove(() => 0)` rigs *one* call — but a whole match needs a different value each round. Write `queuedRng(values)` returning a function that yields `values[0]`, then `values[1]`, ... on successive calls. Test: with `rng = queuedRng([0, 0.5, 0.99])`, three `randomMove(rng)` calls return exactly `['rock', 'paper', 'scissors']`. Then combine it with exercise 4 to test a full 3-round match deterministically.
What it practices: dependency injection at full strength — a fake with *memory*, built from a closure.
Hint: keep an index variable next to the returned arrow function and bump it on every call. That pair (variable + function using it) is a closure.

### ⭐⭐⭐ 6. Rulebook sanity as a property
The symmetry test checks no matchup has two winners. Add a stronger property test: for **every** move, count its wins and losses across all other moves — each must be exactly 1. Write it as loops over `MOVES`, not as listed cases. It must pass now, and it should *fail* if you temporarily add a fourth move to `MOVES` without extending the rules (try it, then undo).
What it practices: property tests that keep passing (or start failing!) as the rulebook grows — exactly what you want before attempting lizard-spock.
Hint: `MOVES.filter((b) => b !== a && decideWinner(a, b) === 'player').length` counts move `a`'s wins.

## Solutions

### 1. Guard both doors
```js
test('invalid computer move and wrong case both throw', () => {
  assert.throws(() => decideWinner('rock', 'rok'));
  assert.throws(() => decideWinner('Rock', 'rock'));
});
```
WHY: `decideWinner` validates *both* parameters, but an untested guard is a rumor, not a fact. The case-sensitivity assertion also documents the layering: `game.js` demands clean input, and forgiving `ROCK` is `cli.js`'s `toLowerCase()` job — separation of concerns, written down as a test.

### 2. The counter-move
```js
export function counterMove(move) {
  if (!isValidMove(move)) {
    throw new Error(`Moves must be one of: ${MOVES.join(', ')}`);
  }
  return MOVES.find((m) => m !== move && decideWinner(m, move) === 'player');
}
```
WHY: the tempting answer is a second table (`{ scissors: 'rock', ... }`) — but two tables can disagree after an edit, and nothing would notice. Deriving the answer from `decideWinner` means there is still exactly one rulebook; if `BEATS` ever changes, `counterMove` follows automatically. Guard first, work after — same shape as `decideWinner` itself.

### 3. describeRound
```js
export function describeRound(playerMove, computerMove) {
  const winner = decideWinner(playerMove, computerMove);
  const verdict = {
    player: 'You win!',
    computer: 'Computer wins!',
    draw: 'Draw!',
  }[winner];
  return `You played ${playerMove}, computer played ${computerMove}.\n${verdict}`;
}

test('describeRound pins the exact wording', () => {
  assert.equal(
    describeRound('rock', 'scissors'),
    'You played rock, computer played scissors.\nYou win!',
  );
});
```
WHY: it *returns* the sentences instead of printing them, so a test can pin the exact wording — the console version could only be eyeballed. `cli.js` shrinks to `console.log(describeRound(playerMove, randomMove()))`, and a future web UI could reuse the identical wording. Facts (`'player'`) stay in the rules; sentences live one layer out.

### 4. scoreSeries
```js
export function scoreSeries(rounds) {
  const tally = { player: 0, computer: 0, draw: 0 };
  for (const [p, c] of rounds) {
    tally[decideWinner(p, c)] += 1;
  }
  return tally;
}
// scoreSeries([['rock','scissors'], ['paper','scissors'], ['rock','rock']])
//   → { player: 1, computer: 1, draw: 1 }
```
WHY: because `decideWinner` returns a short fact, that fact works directly as an object key — no `if` chain translating results into counter names. The function is pure (data in, data out), so the test above is three lines; an invalid move anywhere in the list still throws, because the boundary guard travels with `decideWinner` wherever it's reused.

### 5. queuedRng and a deterministic match
```js
export function queuedRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('a scripted rng makes a whole match deterministic', () => {
  const rng = queuedRng([0, 0.5, 0.99]);
  assert.deepEqual(
    [randomMove(rng), randomMove(rng), randomMove(rng)],
    ['rock', 'paper', 'scissors'],
  );

  const rng2 = queuedRng([0, 0.5, 0.99]); // fresh queue for the match
  const rounds = ['rock', 'rock', 'rock'].map((mv) => [mv, randomMove(rng2)]);
  assert.deepEqual(scoreSeries(rounds), { player: 1, computer: 1, draw: 1 });
});
```
WHY: `randomMove(rng = Math.random)` accepts *any* function of the right shape, so a fake with memory slots straight in — that's the whole promise of dependency injection. The closure (`i` living on after `queuedRng` returns) is the standard way to build stateful fakes, and the same trick later fakes clocks and network responses. Note the fresh `rng2`: fakes with state need resetting between uses, just like real test fixtures.

### 6. Rulebook sanity property
```js
test('every move beats exactly one move and loses to exactly one', () => {
  for (const a of MOVES) {
    const wins = MOVES.filter((b) => b !== a && decideWinner(a, b) === 'player').length;
    const losses = MOVES.filter((b) => b !== a && decideWinner(a, b) === 'computer').length;
    assert.equal(wins, 1);
    assert.equal(losses, 1);
  }
});
```
WHY: the existing "beats exactly one" test lists three hand-picked cases; this one states the *rule* and lets the loop enumerate cases, so it automatically covers any future move. Add `'lizard'` to `MOVES` without rules and this fails immediately (the guard throws) — a property test doubling as a config check. For a real 5-move game each move beats exactly two, so the expected counts become the one line you'd edit.
