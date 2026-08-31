# 📘 Learning Guide: Rock Paper Scissors

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The classic playground game, against the computer. You type your move on the command line; the computer picks one at random; the program announces the winner.

```
> node cli.js rock
You played rock, computer played scissors.
You win!

> node cli.js banana
Usage: node cli.js <rock|paper|scissors>
```

Rock beats scissors, paper beats rock, scissors beats paper, same move is a draw. Tiny game — but the *way* it's organized is your first taste of real program architecture.

## 2. Concepts you need first

**`process.argv` (command-line arguments).** When you run `node cli.js rock`, Node collects the words you typed into an array called `process.argv`. Slot 0 is node itself, slot 1 is the script path, slot 2 is your first word:

```js
// run: node demo.js rock
console.log(process.argv[2]);  // "rock"
```

**`Math.random()`.** Returns a random decimal from 0 (inclusive) up to but not including 1 — a different one every call:

```js
console.log(Math.random());  // e.g. 0.7231502...
console.log(Math.random());  // e.g. 0.0412886...
```

**`Math.floor()` and picking a random array item.** `Math.floor` chops off the decimal part. Multiply a random decimal by the array length, floor it, and you get a valid random index:

```js
const moves = ["rock", "paper", "scissors"];
const i = Math.floor(Math.random() * moves.length);  // 0, 1, or 2
console.log(moves[i]);   // a random move
```

**Objects as lookup tables.** An object maps names (keys) to values. Instead of writing `if` chains, you can *look the answer up*:

```js
const sound = { dog: "woof", cat: "meow" };
console.log(sound["dog"]);   // "woof"
console.log(sound.cat);      // "meow" — same thing, dot style
```

**`includes`.** Asks whether an array contains a value:

```js
console.log(["rock", "paper"].includes("rock"));   // true
console.log(["rock", "paper"].includes("rok"));    // false
```

**Throwing errors.** `throw new Error("message")` stops the function immediately and reports the message. It's how a function says "you called me wrong" — loudly, instead of silently doing nothing:

```js
function half(n) {
  if (typeof n !== "number") throw new Error("need a number");
  return n / 2;
}
```

**The ternary operator `? :`.** A one-line if/else that *produces a value*: `condition ? valueIfTrue : valueIfFalse`.

```js
const age = 20;
console.log(age >= 18 ? "adult" : "minor");  // "adult"
```

**Functions as values, and default parameters.** In JavaScript a function can be handed to another function like any other value. And a parameter can have a *default* used when the caller passes nothing:

```js
function greet(getName = () => "world") {
  return "Hello, " + getName();
}
console.log(greet());              // "Hello, world"
console.log(greet(() => "Sam"));   // "Hello, Sam"
```

Keep this one in mind — it's the key trick in the refactor.

**Pure functions.** A function that reads only its inputs and only returns a value — no printing, no randomness, no clock. Call it twice with the same input, get the same output. Pure functions are the easiest things in programming to test.

**`import` / `export` (modules).** A module is a file that shares code. `export` marks what's offered; `import` pulls it in elsewhere:

```js
// game.js
export const MOVES = ["rock", "paper", "scissors"];
// cli.js
import { MOVES } from './game.js';
```

**`??` (nullish coalescing).** "Left side, unless it's missing — then right side." `process.argv[2] ?? ''` means "the argument, or an empty string if there wasn't one."

**`process.exit(1)`.** Ends the program immediately. The number is a code for other programs: 0 means "all good", anything else means "something went wrong".

## 3. Walking through the original code

Everything happens at the top of one file, in order. First, read the player's move and roll the computer's:

```js
var playerMove = process.argv[2];

var r = Math.random();
var computerMove;
if (r < 0.333) {
  computerMove = "rock";
} else if (r < 0.666) {
  computerMove = "paper";
} else {
  computerMove = "scissors";
}
```

A random decimal is compared against thirds: bottom third rock, middle third paper, top third scissors.

Then, all nine combinations spelled out by hand:

```js
if (playerMove == "rock" && computerMove == "rock") {
  console.log("Draw!");
} else if (playerMove == "rock" && computerMove == "paper") {
  console.log("Computer wins!");
} else if (playerMove == "rock" && computerMove == "scissors") {
  console.log("You win!");
```

...and six more branches just like these, one for every paper and scissors pairing. Each line hard-codes three things at once: the rule, the comparison, and the English sentence to print.

The file's own closing comment gives away the two problems:

```js
// If you typo "rok", none of the nine match and the program says
// nothing at all. How would you even test this file? You can't call
// it — you can only run it and read the console.
```

## 4. What's wrong with it (in beginner terms)

**Flaw 1: Nine branches for a three-line rulebook.** The whole game is "rock beats scissors, paper beats rock, scissors beats paper." The if-chain repeats each rule three times in different costumes. Here's the bite: the extended game rock-paper-scissors-lizard-spock has 5 moves — that's 25 combinations. Add it to this file and you're hand-writing 25 branches, and a single typo in branch 19 becomes a bug nobody notices for weeks. When rules grow as a *table*, adding a move means adding a line, not rewriting a wall of ifs.

**Flaw 2: Typos fail silently.** Play `"rok"` and no branch matches. The program prints the two moves and then... nothing. No winner, no error. Silence is the worst failure mode — the program *knows* something is wrong but doesn't tell you. You'll stare at your terminal wondering if the game is broken or you are.

**Flaw 3: Untestable by construction.** A test is just another program that calls your functions and checks the answers. But this file has no functions — the logic runs the instant the file loads, uses `Math.random()` (different every run), and "returns" its result by printing. There is nothing to call and nothing to check. The only test possible is running it over and over and reading the screen — which is you doing the computer's job.

## 5. Try it yourself first!

Try restructuring the original before reading on. Hints, vaguest first:

1. Could the rules live in a *data structure* instead of nine ifs? What's the smallest table that captures "what beats what"?
2. Try an object: each move is a key, and its value is the move it defeats.
3. Write `decideWinner(playerMove, computerMove)` that *returns* one of three short strings (`'player'`, `'computer'`, `'draw'`) instead of printing sentences. Same move → draw. Otherwise: does the table say the player's move beats the computer's?
4. Guard the door: if either move isn't in the moves list, `throw` an error.
5. Randomness: `MOVES[Math.floor(Math.random() * 3)]` replaces the thirds-checking. Bonus challenge — make the random function a *parameter* with `Math.random` as its default, so a test can pass a fake.
6. Split into two files: `game.js` (rules, no printing) and `cli.js` (reads argv, calls the rules, prints).

## 6. Understanding the refactored solution

**`game.js` — the rules, as data plus pure functions. No printing anywhere.**

The entire rulebook:

```js
const BEATS = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};
```

Read it like a table: rock beats scissors, and so on. Nine branches collapsed into three lines you can check against the playground rules at a glance.

```js
export function decideWinner(playerMove, computerMove) {
  if (!isValidMove(playerMove) || !isValidMove(computerMove)) {
    throw new Error(`Moves must be one of: ${MOVES.join(', ')}`);
  }
  if (playerMove === computerMove) return 'draw';
  return BEATS[playerMove] === computerMove ? 'player' : 'computer';
}
```

Validate first — a typo now throws a clear error instead of silence. Same move is a draw. Otherwise one table lookup: if your move's victim is what the computer played, you win; there's no third option, so else the computer wins. Note it returns a short *fact* (`'player'`), not a sentence (`"You win!"`). Facts are for logic; sentences are for screens.

```js
export function randomMove(rng = Math.random) {
  return MOVES[Math.floor(rng() * MOVES.length)];
}
```

This is **dependency injection** in its smallest form: the source of randomness (`rng` = random number generator) is a parameter. Normal code calls `randomMove()` and gets real randomness via the default. A test calls `randomMove(() => 0)` — a fake that always returns 0 — and *knows* the answer will be `'rock'`. The same trick tames clocks (`now = Date.now`) and anything else unpredictable.

**`cli.js` — the I/O shell.** (I/O = input/output: reading what the user typed, printing to the screen.)

```js
const playerMove = (process.argv[2] ?? '').toLowerCase();

if (!isValidMove(playerMove)) {
  console.log(`Usage: node cli.js <${MOVES.join('|')}>`);
  process.exit(1);
}
```

Missing argument becomes `''` via `??`, `toLowerCase()` forgives `ROCK`, and an invalid move prints friendly usage help and exits. Then it plays one round and translates the fact into English with a lookup table — the same rules-as-data idea, used for wording:

```js
console.log(
  { player: 'You win!', computer: 'Computer wins!', draw: 'Draw!' }[winner],
);
```

The payoff: `game.js` doesn't know a console exists; `cli.js` doesn't know the rules. Swap the CLI for a web page later and `game.js` doesn't change one character. That's **separation of concerns** in practice.

**`game.test.js` — the tests.** Node has a built-in test runner (`node --test`). `test(name, fn)` declares a test; `assert.equal(a, b)` fails loudly if they differ; `assert.throws(fn)` passes only if `fn` throws. Highlights:

- *Every* move vs itself is checked as a draw with a loop over `MOVES` — three checks from one line of test code.
- The "rules are symmetric" test loops over all pairs and asserts `decideWinner(a, b)` never equals `decideWinner(b, a)` for different moves. It tests a *property* of the whole rulebook, not a list of examples — if you ever edit `BEATS` into something contradictory, this catches it.
- `decideWinner('rok', 'rock')` must throw — the silent-typo bug is now permanently fenced off.
- `randomMove(() => 0)` must be `'rock'`, `() => 0.5` → `'paper'`, `() => 0.99` → `'scissors'` — possible only because the rng is injectable.

## 7. Words you learned (glossary)

- **Architecture**: how a program is split into parts and who's allowed to talk to whom.
- **`process.argv`**: array of the words typed after `node` on the command line.
- **`Math.random()`**: random decimal from 0 up to (not including) 1.
- **`Math.floor()`**: drops the decimal part of a number.
- **Lookup table**: an object used to *look up* answers instead of branching with ifs.
- **Key / value**: the name and the stored answer in an object (`rock: 'scissors'`).
- **Rules-as-data**: encoding a rulebook as a data structure the logic consults.
- **Pure function**: reads only its inputs, only returns a value; same input → same output.
- **I/O**: input/output — reading from the user, printing to the screen.
- **Separation of concerns**: each file has one job and doesn't know about the others'.
- **Throw / `Error`**: stop immediately and report a message when called incorrectly.
- **Ternary (`? :`)**: one-line if/else that produces a value.
- **Default parameter**: fallback value used when the caller passes nothing.
- **Dependency injection**: passing in a capability (like randomness) instead of hard-coding it.
- **RNG**: random number generator.
- **Deterministic**: always produces the same result — the opposite of random; what tests need.
- **Flaky test**: a test that sometimes passes, sometimes fails (randomness is a classic cause).
- **Module / `import` / `export`**: files sharing functions and constants.
- **`??`**: "left side, unless missing — then right side."
- **Exit code**: number a program ends with; 0 = success, non-zero = failure.
- **Assertion**: a test statement that crashes if a claimed fact is false.

## 8. Experiments to try on the plane (no internet needed)

1. **Add lizard and spock.** In `game.js`, change `BEATS` values to arrays: `rock: ['scissors', 'lizard']`, etc. (Rules: lizard beats spock & paper; spock beats scissors & rock; scissors also beats lizard; paper also beats spock.) Change the check to `BEATS[playerMove].includes(computerMove)` and add both moves to `MOVES`. Expected: `node --test` still passes the symmetry test, and `node cli.js lizard` just works — the CLI never mentions specific move names.
2. **Prove silence vs. throwing.** Run `node original.js rok` (silent nothing after two lines), then `node refactored/cli.js rok` (usage message). Same typo, opposite experience.
3. **Rig the game.** In `cli.js`, temporarily replace `randomMove()` with `randomMove(() => 0)`. Expected: the computer plays rock every single time — you now see exactly what the tests see.
4. **Break the symmetry on purpose.** In `BEATS`, change `paper: 'rock'` to `paper: 'scissors'`, then run `node --test 06-rock-paper-scissors/`. Expected: the "rules are symmetric" test fails — now both scissors and paper claim to beat each other's victim, and some matchup has two winners. Restore it after.
5. **Score a best-of-five.** In `cli.js`, wrap the round in a loop that plays 5 rounds (reusing the same `playerMove`), counts `'player'` vs `'computer'` results, and prints a final tally. Notice you never touch `game.js` — the architecture is doing its job.
