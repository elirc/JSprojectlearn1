# 📘 Learning Guide: Towers of Hanoi

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

Towers of Hanoi is an old puzzle. You have three pegs (call them A, B, and C) and some discs of different sizes stacked on peg A, biggest on the bottom. Your job: move the whole stack to peg C. Rules: move one disc at a time, and never put a bigger disc on top of a smaller one.

This program doesn't draw the puzzle — it *solves* it and prints the list of moves. Run it with 3 discs and you get:

```
Move disc 1 from A to C
Move disc 2 from A to B
Move disc 1 from C to B
Move disc 3 from A to C
Move disc 1 from B to A
Move disc 2 from B to C
Move disc 1 from B to C
Total moves: 7
```

Disc 1 is the smallest disc. Follow those seven lines with coins on your tray table and the stack really does end up on C, legally.

## 2. Concepts you need first

**A function** is a named block of code you can run ("call") whenever you want, with inputs called *parameters*.

```js
function greet(name) {        // name is a parameter
  console.log("Hi " + name);
}
greet("Sam");                 // prints: Hi Sam
```

**`console.log`** prints text to the screen (the terminal). It's how a Node.js program "says" things.

**Return values.** A function can hand a result back to whoever called it, using `return`. Printing shows a value to a *human*; returning gives it to *code*.

```js
function double(x) { return x * 2; }
const y = double(5);      // y is now 10 — code can use it
console.log(y);           // prints: 10
```

**A global variable** is a variable created outside every function. Any function can read it — and worse, secretly change it.

```js
var count = 0;                 // global
function tick() { count++; }   // changes the global
tick(); tick();
console.log(count);            // prints: 2
```

**Recursion** is a function that calls *itself* to solve a smaller version of the same problem. Every recursion needs a **base case**: the smallest version of the problem, answered directly without another call, so the calls eventually stop.

```js
function countdown(n) {
  if (n === 0) return;    // base case: nothing to do
  console.log(n);
  countdown(n - 1);       // solve the smaller problem
}
countdown(3);             // prints: 3  2  1
```

Why recursion fits Hanoi: to move `n` discs from A to C, move the top `n-1` discs to B (a smaller Hanoi puzzle!), move the big disc to C, then move the `n-1` discs from B to C (another smaller puzzle).

**An array** is an ordered list of values in square brackets. `.length` tells you how many items it holds.

```js
const moves = ["up", "down", "up"];
console.log(moves.length);   // prints: 3
console.log(moves[0]);       // prints: up   (positions start at 0)
```

**An object** is a bundle of labeled values. Each label is called a *key* (or field/property).

```js
const move = { disc: 2, from: "A", to: "C" };
console.log(move.disc);    // prints: 2
console.log(move.to);      // prints: C
```

**The spread operator `...`** copies all items of one array into another. It's how you glue arrays together.

```js
const a = [1, 2];
const b = [...a, 3, ...a];
console.log(b);            // prints: [1, 2, 3, 1, 2]
```

**Destructuring** pulls fields out of an object into variables in one step.

```js
const { disc, from } = { disc: 1, from: "A", to: "C" };
console.log(disc, from);   // prints: 1 A
```

**Template literals** are strings written with backticks. `${...}` drops a value into the middle of the string.

```js
const n = 7;
console.log(`Total moves: ${n}`);   // prints: Total moves: 7
```

**Default parameters** give a parameter a fallback value used when the caller doesn't pass one.

```js
function hello(name = "world") { console.log(`Hi ${name}`); }
hello();          // prints: Hi world
hello("Ada");     // prints: Hi Ada
```

**`export` and `import`.** A *module* is just a file. `export` marks something in a file as usable elsewhere; `import` pulls it in. This lets one file hold logic and another hold printing.

```js
// math.js
export function add(a, b) { return a + b; }
// main.js
import { add } from './math.js';
console.log(add(2, 3));   // prints: 5
```

**Throwing an error.** `throw` stops the function and reports a problem. `RangeError` is a built-in error type meaning "the value is the right kind, but out of range." Crashing loudly beats returning a silently wrong answer.

```js
function ageCheck(age) {
  if (age < 0) throw new RangeError("age can't be negative");
  return age;
}
```

**`process.argv`** is an array of the words you typed on the command line. Position 2 is the first thing after the program name — so `node cli.js 4` puts `"4"` (a string) at `process.argv[2]`. `Number(...)` turns that string into a number, and `??` means "use the left side unless it's missing, then use the right side."

**A test** is a small program that runs your function and checks the answer automatically. `assert.equal(a, b)` complains if `a` isn't `b`; `assert.deepEqual` compares arrays/objects piece by piece. Node has a built-in test runner: `node --test`.

## 3. Walking through the original code

```js
var moveCount = 0; // global counter, updated from inside the recursion
```

A global variable that will count moves. Keep an eye on it — it's the villain of this project.

```js
function hanoi(n, from, to, via) {
  if (n == 0) {
    return;
  }
```

The solver takes the number of discs and three peg names: where the stack is (`from`), where it should go (`to`), and the spare peg (`via`). If there are zero discs, there's nothing to do — that's the base case, and it stops the recursion.

```js
  hanoi(n - 1, from, via, to);
  moveCount++;
  console.log("Move disc " + n + " from " + from + " to " + to);
  hanoi(n - 1, via, to, from);
}
```

The three-step insight in code: (1) move the `n-1` smaller discs onto the spare peg, (2) move disc `n` — the biggest — to the target, adding 1 to the global counter and printing the move, (3) move the `n-1` discs from the spare onto the big disc. Notice the peg names swap roles in each recursive call.

```js
hanoi(3, "A", "C", "B");
console.log("Total moves: " + moveCount);
```

Solve for 3 discs, then print the counter: 7.

```js
moveCount = 0; // ...and now every caller has to remember this line.
```

Manual cleanup of the global — the file itself admits the problem.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the global counter leaks between runs.** `moveCount` lives *outside* the function, so it survives between calls. Call `hanoi(3, ...)` once: 7. Call it again: 14, because the counter kept the old 7. Here's how it bites you: imagine you build a puzzle website. A visitor solves the 3-disc puzzle, then clicks "play again." Your page now announces "Total moves: 14" for a 7-move solution. You stare at `hanoi` for an hour — but the bug isn't *in* the function, it's in the variable next to it. Functions that secretly write to outside variables "work alone, break together."

**Flaw 2: it prints instead of returning.** The moves — the actual answer! — are shot straight at the terminal, where no code can touch them. Want to animate the discs on a web page? Check every move is legal? Count moves without a global? You can't: the answer is gone, spent as ink. It's like a calculator that shouts results out the window instead of showing them on its screen.

**Not a flaw: the recursion.** Beginners expect recursion to be the scary part. Here it was correct all along. The mess was everything *around* it.

## 5. Try it yourself first!

Close this file and try fixing `original.js` yourself. Hints, vaguest first:

1. What should `hanoi` give back to its caller, instead of printing?
2. If a function *returns* the list of moves, do you still need a counter at all?
3. Each move needs three facts: which disc, from where, to where. What JavaScript thing bundles labeled facts?
4. The recursion has three parts: moves-before, the big move, moves-after. If each recursive call returns an array, how do you make one array out of `before + one move + after`? (Square brackets and `...` twice.)
5. Base case: how many moves does a 0-disc puzzle take? Return exactly that.
6. The move count for `n` discs is now just `.length` of what the function returns.

## 6. Understanding the refactored solution

The refactor splits into three files. **`hanoi.js`** holds the logic:

```js
export function solveHanoi(discs, from = 'A', to = 'C', via = 'B') {
  if (!Number.isInteger(discs) || discs < 0) {
    throw new RangeError(`discs must be a non-negative integer, got ${discs}`);
  }
  if (discs === 0) return [];

  return [
    ...solveHanoi(discs - 1, from, via, to),
    { disc: discs, from, to },
    ...solveHanoi(discs - 1, via, to, from),
  ];
}
```

Design choices, one by one:

- **It returns an array of move objects** instead of printing. The `return [...]` line *is* the puzzle insight: smaller-stack moves, then the big move, then smaller-stack moves again, glued with spread. The shape of the data matches the shape of the idea.
- **The base case is 0, not 1.** "Zero discs, zero moves" — return the empty array. The one-disc case doesn't need special code; it falls out naturally (its two recursive calls each return `[]`).
- **No counter anywhere.** The move count is `moves.length`. It cannot drift, because it isn't stored — it's derived from the answer itself.
- **Default parameters** mean `solveHanoi(3)` just works with pegs A, C, B.
- **The guard clause** at the top throws a `RangeError` for nonsense like `-1` or `2.5` discs, instead of quietly misbehaving.
- **`describeMove`** turns a move object into an English sentence. It's kept *out* of the solver on purpose: solving and wording are different jobs.

**`cli.js`** is the thin printing layer: read the disc count from the command line (defaulting to 3 via `??`), call `solveHanoi`, loop over the moves printing `describeMove(move)`, then print `moves.length`. All the printing lives here; none in the solver.

**`hanoi.test.js`** shows why returning data wins. The first tests check 0 discs → `[]` and 1 disc → one move. The `2^n - 1` test verifies the famous formula (n discs always take exactly 2ⁿ−1 moves) for n from 1 to 10 — four lines. The star is the *replay* test: it builds three pegs as arrays, stacks 5 discs on A, then replays every returned move, asserting each one takes the top disc (`.at(-1)` means "last item of the array") and never lands a big disc on a smaller one — and finally that peg C holds `[5, 4, 3, 2, 1]`. The original, which printed, could never be checked like this.

## 7. Words you learned (glossary)

- **Function** — a reusable, named block of code that takes inputs and can return an output.
- **Parameter** — a named input to a function.
- **Return value** — the result a function hands back to the code that called it.
- **Global variable** — a variable outside all functions, visible (and changeable) everywhere.
- **Recursion** — a function calling itself on a smaller version of the problem.
- **Base case** — the smallest problem, answered directly, so recursion stops.
- **Array** — an ordered list of values; positions start at 0.
- **Object** — a bundle of labeled values (key: value pairs).
- **Spread operator (`...`)** — copies an array's items into another array.
- **Destructuring** — pulling object fields into variables: `const { disc } = move`.
- **Template literal** — a backtick string that can embed values with `${...}`.
- **Default parameter** — a fallback value used when an argument isn't passed.
- **Module** — a file whose `export`ed things other files can `import`.
- **Guard clause** — an early check at the top of a function that rejects bad input.
- **`throw` / `RangeError`** — stop and report an error; `RangeError` means "value out of range."
- **`process.argv`** — array of the words typed on the command line.
- **`??` (nullish coalescing)** — "use the left value, unless it's missing — then use the right."
- **Test / assertion** — code that automatically checks a function's answer.
- **`.at(-1)`** — the last item of an array.

## 8. Experiments to try on the plane (no internet needed)

1. **See the global bug live.** In `original.js`, copy the `hanoi(3, "A", "C", "B");` line and the `Total moves` line so they run twice, and delete the final `moveCount = 0;`. Expected: first "Total moves: 7", then "Total moves: 14".
2. **Feel the 2ⁿ−1 explosion.** In the refactored version, run `node refactored/cli.js 10`. Expected: 1023 moves scroll by. Try 20 for 1,048,575 (still fast — just long).
3. **Break the base case.** In `hanoi.js`, change `if (discs === 0) return [];` to check `=== 1` and return `[]`. Expected: `node refactored/cli.js 3` prints only 3 moves — every disc-1 move vanishes, and the replay test fails.
4. **Swap the last two lines inside the returned array** (put the big move after the second spread). Expected: same number of moves, but the replay test fails with "never big on small" — the order was load-bearing.
5. **Rename the pegs.** Call `solveHanoi(3, 'left', 'right', 'middle')` from `cli.js`. Expected: same 7 moves, with your names — proof the solver never cared what pegs are called.
