# 📘 Learning Guide: Ulam Spiral

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A page that draws the **Ulam spiral** — a genuinely mysterious picture from mathematics. The recipe:

1. Write the numbers 1, 2, 3, 4... in a square spiral: 1 in the center, 2 to its right, 3 above that, 4 to the left, and so on, coiling outward.
2. Put a dot wherever the number is **prime** (divisible only by 1 and itself: 2, 3, 5, 7, 11...).

You'd expect random static. Instead you get *diagonal streaks* — primes visibly clumping along diagonal lines. Mathematicians still don't fully understand why. Open either HTML file and you'll see it: a 404×404 canvas full of eerie diagonal rain, built from the first 10,000 numbers.

Both versions draw the same picture. The difference is that the original does everything — spiral walking, prime testing, pixel painting — tangled in one loop, while the refactor gives each job its own clean piece, using a JavaScript feature built exactly for this: **generators**.

## 2. Concepts you need first

### Canvas dots
`<canvas>` is a rectangle JavaScript draws on. This project needs just one drawing call:

```js
const ctx = document.getElementById("c").getContext("2d");
ctx.fillRect(200, 100, 3, 3); // a 3x3 dot at pixel (200, 100)
```

Pixel (0,0) is top-left; y grows downward.

### Grid coordinates vs pixel coordinates
Two coordinate systems live in this program:

- **Grid**: the spiral's own world. The center is (0,0); one step right is (1,0). Small, clean integers, can be negative.
- **Pixels**: where ink actually lands on the canvas.

The conversion is one formula: `pixel = center + grid × cellSize`. With a 404-wide canvas and 4-pixel cells, grid (3, -2) → pixel (202 + 12, 202 − 8) = (214, 194). Keep the two worlds separate and convert in *one* place, and they can never disagree. The original instead tracks both in parallel — that's its central sin.

### Prime numbers and trial division
A **prime** has exactly two divisors: 1 and itself. The simple test ("trial division") tries dividing:

```js
function isPrime(n) {
  if (n < 2) return false;
  for (let f = 2; f * f <= n; f++) {   // only up to the square root!
    if (n % f === 0) return false;      // divisible -> not prime
  }
  return true;
}
```

Why stop at the square root (`f * f <= n`)? Because divisors come in pairs: if 91 = 7 × 13, finding the small one (7) is enough — the big partner never needs checking. For n = 10,000 that's ~100 checks instead of ~10,000. The naive loop `for (i = 2; i < n; i++)` checks all the way up to n, and across the whole spiral that piles up to tens of millions of wasted operations.

### The remainder trick for turning
`(dir + 1) % 4` cycles 0 → 1 → 2 → 3 → 0 → ... — the standard way to rotate through four directions (right, up, left, down).

### Direction vectors
A direction as data: `{x: 1, y: 0}` means "step right." Add it to a position to move:

```js
const pos = { x: 2, y: 5 };
const dir = { x: 0, y: -1 }; // up (y shrinks upward here)
const next = { x: pos.x + dir.x, y: pos.y + dir.y }; // {x: 2, y: 4}
```

Four vectors in an array + the `% 4` trick = spiral turning with no if-chains. (Projects 16 and 17 use the same idea.)

### The spiral's rhythm
Watch a square spiral's leg lengths (a "leg" = a straight run before a turn): right 1, up 1, left 2, down 2, right 3, up 3... The pattern is **1, 1, 2, 2, 3, 3, ...** — *two legs per length*, because after going right-then-up you've grown the square by one ring in both dimensions, so the next two legs must each be one longer. That's the "why legs come in pairs" the original never explains.

### Generators: `function*` and `yield` (the star concept)
A **generator** is a function that can pause. Declared with `function*`, it uses `yield` to hand out a value and *freeze in place* until the caller asks for the next one:

```js
function* countUp() {
  let n = 1;
  while (true) yield n++;   // an INFINITE sequence — and that's fine
}
const gen = countUp();
console.log(gen.next().value); // 1
console.log(gen.next().value); // 2  (resumed exactly where it paused)
console.log(gen.next().value); // 3
```

Calling `countUp()` doesn't run the body at all — it returns a generator object. Each `.next()` runs until the next `yield`, then pauses. All the local variables (`n` here) survive between calls. This is called being **lazy**: values are produced on demand, one at a time, so an infinite loop inside a generator is harmless — you just stop calling `next()`.

Why is this perfect for spirals? Because "the sequence of spiral positions" is a *thing of its own* — an endless stream — and a generator lets you write it as its own function, with its own loops and state hidden inside, and *nothing else mixed in*. The consumer pulls positions and decides what each one means.

### `const _ of [0, 1]` — do something exactly twice
`for (const _ of [0, 1]) { ... }` runs a body twice. The `_` name signals "I don't use this variable; I just want two passes." It's an idiom for making a rule like "two legs per length" *visible as structure*.

## 3. Walking through the original code

**Seven mutable variables.**

```js
var x = 50;   var y = 50;    // grid position
var px = 202; var py = 202;  // pixel position, tracked IN PARALLEL
var dir = 0;                 // 0=right 1=up 2=left 3=down
var steps = 1;               // current leg length
var stepsDone = 0;           // steps taken on this leg
var legs = 0;                // legs finished
```

Grid position AND pixel position, both hand-maintained. Plus three counters that together encode the spiral rhythm.

**The main loop, part 1: primality inline.**

```js
for (var n = 1; n <= 10000; n++) {
  var prime = n >= 2;
  for (var i = 2; i < n; i++) {
    if (n % i == 0) { prime = false; break; }
  }
  if (prime) ctx.fillRect(px, py, 3, 3);
```

For every n, run trial division *all the way to n* (no square-root bound), then maybe paint a dot at the current pixel position.

**Part 2: the parallel walk.**

```js
if (dir == 0) { x++; px += 4; }
if (dir == 1) { y--; py -= 4; }
if (dir == 2) { x--; px -= 4; }
if (dir == 3) { y++; py += 4; }
```

One step in the current direction — updating grid *and* pixels, in four separate branches. Eight update statements that must stay perfectly paired.

**Part 3: the counter dance.**

```js
stepsDone++;
if (stepsDone == steps) {
  stepsDone = 0;
  dir = (dir + 1) % 4;
  legs++;
  if (legs % 2 == 0) steps++;
}
```

Finished a leg? Reset the step counter, turn left (well, counterclockwise), count the leg, and — every *second* leg — lengthen the legs. This *is* the 1,1,2,2,3,3 rule, but you'd never read it off these five lines without already knowing it.

## 4. What's wrong with it (in beginner terms)

**1. Two positions tracked in parallel.** `x/y` and `px/py` must move in lockstep across four update sites. Story: you decide dots are too cramped and change the cell size to 6 pixels. You edit `px += 4` → `px += 6` in the right-branch... and the left-branch still says `px -= 4`. No error. The spiral draws — but every leftward leg now creeps 2 pixels short, and after a few rings the picture is subtly smeared. You stare at prime logic, at counter logic... the bug is in neither. Parallel bookkeeping fails *silently* and points suspicion everywhere. The fix is structural: keep only grid coordinates, convert to pixels with one formula in one place.

**2. Three jobs in one loop body.** Walking, primality, painting — interleaved. Want to test "does the spiral visit (1,1) at n=9"? You can't ask the code; the positions exist only as fleeting values inside a loop that also computes primes and paints. The only test is "look at the picture and squint."

**3. The slow prime check.** `for (i = 2; i < n; i++)` does ~n work per number, ~50 million operations for 10,000 numbers. It survives at this size, but set the count to 100,000 and the tab freezes. The square-root bound does the same job in a tiny fraction of the work.

**4. Structure that can't explain itself.** `legs % 2 == 0` encodes "two legs per length" — but only if you already know the fact. Code should *show* its rules, not bury them in counter arithmetic.

## 5. Try it yourself first!

1. Vague: the program answers two independent questions — "where does number n sit?" and "is n prime?" Can you make each answerable on its own?
2. Fix the prime check first (it's the one-line win): `i < n` → `i * i <= n`.
3. Now extract the walk. Write a function that produces spiral *grid* positions only — no pixels, no primes. Try it first returning an array of the first k positions; check by hand: (0,0), (1,0), (1,−1), (0,−1), (−1,−1), (−1,0), (−1,1)...
4. Upgrade to a generator: `function* spiralPositions()` with `yield`, and an infinite `while (true)`. Structure the rhythm honestly: outer loop = leg length grows; inside it, exactly two legs (`for (const _ of [0, 1])`); inside that, `legLength` steps, yielding after each.
5. Use direction vectors + `% 4` for turning instead of four if-branches.
6. The renderer is now a simple consumer: pull a position per n, and if `isPrime(n)`, paint at `center + position × cellSize` — the *only* place pixels are mentioned.
7. Put `cellSize`, `dotSize`, `count` in a CONFIG object at the top.

## 6. Understanding the refactored solution

**CONFIG.** Three labeled knobs — cell size, dot size, count. The tunable surface of the program, in one visible place.

**`spiralPositions()` — the spiral as a pure stream.**

```js
function* spiralPositions() {
  const DIRECTIONS = [ {x:1,y:0}, {x:0,y:-1}, {x:-1,y:0}, {x:0,y:1} ];
  let position = { x: 0, y: 0 };
  let directionIndex = 0;
  let legLength = 1;
  yield position;
  while (true) {
    for (const _ of [0, 1]) {              // two legs share each length
      const direction = DIRECTIONS[directionIndex];
      for (let step = 0; step < legLength; step++) {
        position = { x: position.x + direction.x, y: position.y + direction.y };
        yield position;
      }
      directionIndex = (directionIndex + 1) % 4;
    }
    legLength++;
  }
}
```

Read the loop nest aloud and it *is* the spiral rule: "forever: for each of two legs — walk legLength steps in the current direction (yielding each cell), then turn; then lengthen the legs." The 1,1,2,2,3,3 rhythm became visible structure — an actual loop that runs twice — instead of three counters conspiring. The original's `steps`, `stepsDone`, `legs` bookkeeping is *gone*, replaced by the shape of the code.

And note what's absent: pixels and primes. This generator yields grid positions and nothing else. It's infinite (`while (true)`) — harmless, because generators are lazy; positions materialize only as the consumer calls `next()`. Tomorrow you could pair the same stream with letters, colors, or game tiles.

**`isPrime`** — trial division with the square-root bound (`factor * factor <= n`), the project 08 lesson reused. Also a pure function: testable in isolation with nothing but `console.log(isPrime(91))`.

**`drawSpiral` — the consumer.**

```js
const positions = spiralPositions();
for (let n = 1; n <= count; n++) {
  const { x, y } = positions.next().value;
  if (isPrime(n)) {
    ctx.fillRect(center.x + x * cellSize, center.y + y * cellSize, dotSize, dotSize);
  }
}
```

Pull one position per number; if the number is prime, convert grid → pixels with the one formula and paint. This is the *only* place pixel coordinates exist, so the parallel-drift hazard is structurally impossible. Each of the three sections — spiral, primality, rendering — can now be read, tested, and replaced alone.

## 7. Words you learned (glossary)

- **Ulam spiral**: numbers written in a square spiral with primes marked — showing unexplained diagonal streaks.
- **Prime**: a whole number ≥ 2 divisible only by 1 and itself.
- **Trial division**: testing primality by trying divisors.
- **Square-root bound**: only test divisors up to √n, since divisors pair up small×large.
- **Grid coordinates**: the spiral's own integer world, centered at (0,0).
- **Pixel coordinates**: actual canvas positions; derived from grid by one formula.
- **Direction vector**: `{x, y}` step amounts; adding it moves one cell.
- **Leg**: one straight run of the spiral before a turn; lengths go 1,1,2,2,3,3...
- **`% 4` cycling**: `(i + 1) % 4` rotates through four options endlessly.
- **Generator (`function*`)**: a function that can pause at `yield` and resume later, keeping its local state.
- **`yield`**: hand a value to the caller and freeze until the next request.
- **`.next().value`**: ask a generator for its next value.
- **Lazy**: computed only when asked — which makes infinite sequences usable.
- **Stream**: a sequence consumed one item at a time rather than built all at once.
- **Consumer**: the code that pulls values from a stream and gives them meaning.
- **Pure math function**: computes from inputs only — no canvas, no globals; trivially testable.
- **Mutable variable**: a variable that gets reassigned; seven of them in one loop is a warning sign.
- **`_` (underscore)**: conventional name for "a loop variable I don't use."
- **CONFIG object**: named, grouped tunable constants at the top of a file.

## 8. Experiments to try on the plane (no internet needed)

1. **Test the spiral without drawing anything**: open the refactored page, press F12 for the console, and run: `const g = spiralPositions(); for (let i = 0; i < 8; i++) console.log(g.next().value);` Expected: (0,0), (1,0), (1,−1), (0,−1), (−1,−1), (−1,0), (−1,1), (0,1) — the first ring, verifiable on paper. *This* is what "testable in isolation" means; the original literally cannot do this.
2. **Zoom out**: in CONFIG set `cellSize: 2`, `dotSize: 1`, `count: 40000`. Expected: a denser spiral with even more dramatic diagonal streaks — and it renders fast, because `isPrime` uses the sqrt bound. (Try count 40000 in the original and feel the `i < n` loop chug.)
3. **Draw composites instead**: change `if (isPrime(n))` to `if (!isPrime(n))`. Expected: the photographic negative — and the diagonals are visible as *gaps* now. One-line change, because "what appears at each position" lives in exactly one line.
4. **Reuse the stream for a different picture**: replace the `isPrime` line with `if (n % 7 === 0)`. Expected: multiples of 7 form a tidy, boring lattice — which makes the primes' streaky half-order feel weirder. The generator needed zero changes.
5. **Break the rhythm and see what a spiral *isn't***: in the generator, change `for (const _ of [0, 1])` to `[0]` (one leg per length). Expected: the walk stops closing rings and skews off — a hands-on proof of *why* legs must come in pairs. Undo it and watch the square spiral return.
