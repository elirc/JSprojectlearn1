# 📘 Learning Guide: Sierpinski Triangle

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A page that draws the **Sierpinski triangle** — a famous **fractal** (a shape made of smaller copies of itself). Open the file and you see a big triangle full of triangular holes: one big hole in the middle, three smaller holes in the corners around it, nine smaller ones around those...

The recipe is simple to say:

- A triangle at "depth 0" is just drawn solid.
- A triangle at deeper depth splits into three corner triangles (connecting the midpoints of its sides), and the middle piece is left as a hole. Each corner triangle repeats the process, one level shallower.

The refactored version adds a **slider**: drag it from 0 to 8 and watch the fractal grow one level of detail at a time — recursion you can *see*.

## 2. Concepts you need first

### Canvas and drawing paths
`<canvas>` is an HTML element JavaScript draws on. You get a drawing object (the **context**) and issue commands:

```js
const ctx = document.getElementById("c").getContext("2d");
ctx.beginPath();          // start a new shape
ctx.moveTo(50, 10);       // pen to (50, 10) without drawing
ctx.lineTo(90, 80);       // line to (90, 80)
ctx.lineTo(10, 80);       // line to (10, 80)
ctx.fill();               // close and fill the shape with the current color
```

That's a filled triangle. `ctx.fillStyle = "#336"` sets the fill color. `ctx.clearRect(0, 0, w, h)` erases a rectangle — used to wipe the canvas before redrawing. Canvas coordinates: (0,0) is top-left, y grows *downward*.

### Recursion
**Recursion** is a function calling itself, each time on a smaller piece of the problem, until it hits a **base case** — a situation simple enough to answer directly, which stops the calling chain.

```js
function countdown(n) {
  if (n === 0) { console.log("go!"); return; } // base case
  console.log(n);
  countdown(n - 1);                            // smaller problem
}
countdown(3); // 3, 2, 1, go!
```

Without the base case, the function would call itself forever (until the browser gives up with a "too much recursion" error). The Sierpinski function's base case is `depth === 0` (just draw); its recursive step is "call myself three times with depth − 1." Note how fast the work grows: depth 6 means 3^6 = 729 little triangles; depth 8 means 6561.

### Objects as points, and why they beat loose numbers
A 2D point is naturally *one thing* with two parts:

```js
const a = { x: 300, y: 0 };
console.log(a.x); // 300
```

Compare passing `(x1, y1, x2, y2, x3, y3)` — six loose numbers whose *grouping* exists only in your head — versus three point objects. Once points are objects, you can write named operations on them:

```js
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
console.log(midpoint({x: 0, y: 0}, {x: 10, y: 4})); // { x: 5, y: 2 }
```

(One syntax gotcha: an arrow function returning an object literal needs parentheses around the braces — `() => ({...})` — or the braces get read as a function body.)

### Array destructuring (including in parameters)
```js
const [first, second] = ["a", "b"];        // first="a", second="b"
function label([a, b]) { return a + b; }    // unpack right in the parameter
console.log(label(["x", "y"]));             // "xy"
```

The refactor passes a triangle as an array of three points and unpacks it as `[a, b, c]` in the parameter list.

### Deriving numbers instead of hardcoding them
An **equilateral triangle** (all sides equal) with side length w has height `w × √3 / 2` ≈ `w × 0.866`. That's geometry, and the code can *say* it:

```js
const height = width * Math.sqrt(3) / 2; // ~520 when width is 600
```

A hardcoded `520` and a derived `width * Math.sqrt(3) / 2` produce the same pixels — but only one of them survives a canvas resize, and only one tells the reader *why*.

### Sliders: `<input type="range">`
```html
<input type="range" id="depth" min="0" max="8" value="6">
```

A draggable slider. Its `.value` is a *string* (`"6"`), so convert with `Number(...)`. Its `oninput` event fires continuously while dragging — perfect for live re-rendering.

## 3. Walking through the original code

The whole program is one function and one call.

**The function signature.**

```js
function tri(x1, y1, x2, y2, x3, y3, d) {
```

Seven positional numbers: three corners as six loose coordinates, plus depth `d`.

**The base case.**

```js
if (d == 0) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.fill();
  return;
}
```

At depth 0, draw the triangle and stop recursing. Note the drawing happens *inside* the recursive function — recursion logic and ink are fused.

**The recursive step.**

```js
tri(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2, (x1 + x3) / 2, (y1 + y3) / 2, d - 1);
tri((x1 + x2) / 2, (y1 + y2) / 2, x2, y2, (x2 + x3) / 2, (y2 + y3) / 2, d - 1);
tri((x1 + x3) / 2, (y1 + y3) / 2, (x2 + x3) / 2, (y2 + y3) / 2, x3, y3, d - 1);
```

Each call is "one corner + two midpoints," but written as raw coordinate arithmetic — *twelve* midpoint expressions, inline, each an opportunity to type `y1` where `x1` belonged. The same midpoint (e.g. of corners 1 and 2) is even computed twice in different calls.

**The kickoff.**

```js
ctx.fillStyle = "#336";
tri(300, 0, 0, 520, 600, 520, 6);
```

Six magic numbers and a 6. `300` is half of 600 (top corner centered), and `520` is secretly `600 × √3/2` (the height of an equilateral triangle with side 600) — but nothing in the code says any of that.

## 4. What's wrong with it (in beginner terms)

**1. Twelve chances to transpose a subscript.** Look at `(x1 + x3) / 2, (y1 + y3) / 2` — now imagine one of the twelve reads `(y1 + x3) / 2`. Would it crash? No. Would you notice? You'd see a fractal that looks... slightly wrong somehow, maybe only at certain depths, with lopsided holes. Which of twelve near-identical expressions is to blame? They all look the same. Bugs that produce *plausible garbage* instead of errors are the most expensive kind, and this code shape manufactures opportunities for exactly those.

**2. Magic corners.** You widen the canvas to 800. Now what? The top corner should be `(400, 0)` — okay, half the width, you guessed that. But `520`? If you don't know the √3/2 fact, you either measure pixels by eye or your triangle silently stretches out of shape. A derived value would have updated itself; a magic number makes *you* the calculator, forever.

**3. "Count commas" arguments.** Quick: in `tri(300, 0, 0, 520, 600, 520, 6)`, which argument is the depth? You had to count. Every call site of a many-positional-argument function is a little puzzle, and every reader pays that cost again.

**4. Recursion and drawing are welded together.** Want to *count* the triangles instead of drawing them? Render into SVG? Animate? You can't reuse the recursion — the `ctx.fill()` is baked into its base case.

## 5. Try it yourself first!

1. Vague: what single small data shape would let every coordinate pair travel as one value?
2. Make points: `{ x, y }`. A triangle is then `[a, b, c]` — three points in an array.
3. Write the fractal's one true operation: `midpoint(a, b)`. Test it in isolation: midpoint of (0,0) and (10,4) should be (5,2).
4. Rewrite the recursion using named midpoints — `ab`, `bc`, `ca` — and three readable calls: `[a, ab, ca]`, `[ab, b, bc]`, `[ca, bc, c]`. Draw a triangle on paper, label the corners and midpoints, and check each call against your picture, corner by corner.
5. Split drawing out: a `fillTriangle(ctx, [a, b, c])` leaf function, called only in the base case.
6. Replace the magic corners with a `fittedTriangle(width)` function using `Math.sqrt(3) / 2`.
7. Bonus: add a range slider for depth and re-render on `oninput`. If your redraw is a single `render()` function that clears and redraws, this is three lines.

## 6. Understanding the refactored solution

**`midpoint` — the fractal's only math, named.**

```js
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
```

Written once, tested by eye once, trusted everywhere. The twelve inline expressions collapse into three calls to this.

**The recursion, readable at last.**

```js
function drawSierpinski(ctx, [a, b, c], depth) {
  if (depth === 0) { fillTriangle(ctx, [a, b, c]); return; }
  const ab = midpoint(a, b);
  const bc = midpoint(b, c);
  const ca = midpoint(c, a);
  drawSierpinski(ctx, [a, ab, ca], depth - 1);
  drawSierpinski(ctx, [ab, b, bc], depth - 1);
  drawSierpinski(ctx, [ca, bc, c], depth - 1);
}
```

This now *reads like the definition of the fractal*: split at the midpoints, recurse into the three corner triangles. The middle triangle `[ab, bc, ca]` is simply never drawn — that's the hole. Each recursive call names its corners, so you can verify it against a sketch. This is the README's core claim: grouping x and y into a point isn't bureaucracy — it's what makes operations *nameable*, and named operations are what make code checkable.

**`fillTriangle` — the leaf.** All the ink lives here: beginPath, moveTo, two lineTos, fill. The recursion above decides *which* triangles exist; this decides what "draw one" means. Swap this function for `console.count('triangle')` and the same recursion counts triangles instead of drawing them.

**`fittedTriangle(width)` — derived, not magic.**

```js
const height = width * Math.sqrt(3) / 2;
return [{ x: width / 2, y: 0 }, { x: 0, y: height }, { x: width, y: height }];
```

Top-center, bottom-left, bottom-right — computed from the canvas width, with the √3/2 geometry visible in the code. Resize the canvas and the triangle re-derives itself.

**The wiring and the slider.** `render()` reads the slider, updates the label, clears the canvas (`clearRect`), sets the color, and redraws from scratch at the chosen depth. `slider.oninput = render` makes dragging live. Because rendering was already "pure redraw from current settings" (the same screen-is-a-function-of-state pattern as project 14), the slider cost about three lines — and it's the teaching payoff: step 0 → 1 → 2 → 3 and you can *watch* the recursive step replace each triangle with three smaller ones.

## 7. Words you learned (glossary)

- **Fractal**: a shape containing smaller copies of itself at every scale.
- **Sierpinski triangle**: the fractal made by repeatedly removing the middle quarter of a triangle.
- **Recursion**: a function calling itself on smaller versions of the problem.
- **Base case**: the condition that stops recursion by answering directly.
- **Recursive step**: the part that breaks the problem into smaller calls.
- **Depth**: how many levels of splitting remain; depth 0 = just draw.
- **Canvas / context (`ctx`)**: the HTML drawing surface / its drawing-commands object.
- **Path (`beginPath`/`moveTo`/`lineTo`/`fill`)**: describing a shape point-by-point, then filling it.
- **`clearRect`**: erase a rectangle of the canvas (used before a full redraw).
- **Point object**: `{ x, y }` — a coordinate pair as one value.
- **Midpoint**: the point halfway between two points (average x, average y).
- **Destructuring**: unpacking arrays/objects by shape, e.g. `function f([a, b, c])`.
- **Positional arguments**: values identified by their order in a call — fragile past two or three.
- **Transposition bug**: swapping two look-alike values (x1 for y1) with no crash, just wrong output.
- **Magic number**: a hardcoded value whose origin is unexplained (the `520`).
- **Derived value**: a value computed from its source (`width * Math.sqrt(3) / 2`) so it can't go stale.
- **Equilateral triangle**: all three sides equal; height = side × √3/2.
- **`<input type="range">`**: a slider control; `.value` is a string; `oninput` fires while dragging.
- **Leaf function**: the small function doing the concrete work at the bottom of a recursion.

## 8. Experiments to try on the plane (no internet needed)

1. **Watch the recursion unfold**: open the refactored page, drag the slider slowly 0 → 8. Expected: 1 triangle, then 3, 9, 27... each level replacing every triangle with three corner copies. (At depth 8 that's 6561 triangles, drawn instantly.)
2. **Plant a transposition bug and observe how sneaky it is**: in the refactored `midpoint`, change `(a.y + b.y) / 2` to `(a.y + b.x) / 2`. Expected: no error — a mangled, skewed fractal. Now imagine finding that same typo among the original's twelve inline expressions instead of in one three-line function. Undo it.
3. **Count instead of draw**: replace the body of `fillTriangle` with `window.count = (window.count || 0) + 1;` and after `render()` add `console.log(window.count)` (reset `window.count = 0` at the start of render). Expected: 729 at depth 6 — the recursion reused for a completely different job because drawing was separated from recursing. (Open the console with F12.)
4. **Resize without pain**: change the canvas tag to `width="800" height="700"`. Expected: the refactored triangle fits itself (corners are derived). Try the same on original.html — you'd be editing `300, 0, 0, 520, 600, 520` by hand.
5. **Color by depth**: pass `depth` into `fillTriangle` and set `ctx.fillStyle = ['#336', '#66a', '#99d', '#cce', '#eef'][depth % 5]` before filling... but wait — at the base case, depth is always 0! Change the recursion to draw at *every* level (draw first, then recurse) and see layered translucent shading with `ctx.globalAlpha = 0.3`. Expected: a ghostly fractal showing all recursion levels at once — and a better feel for when each call happens.
