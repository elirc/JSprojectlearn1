# 🏋️ Practice: Sierpinski Triangle

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

All of these are pure point-and-triangle logic: you can paste your code into the browser console (F12) on the refactored page, or into a scratch `.mjs` file and run it with `node`. Copy `midpoint` in first — everything here builds on it.

## Exercises

### ⭐ 1. Centroid (warm-up)

`midpoint(a, b)` averages two points. Write `centroid([a, b, c])` — the balance point of a whole triangle, which is just the average of its three corners. Take the triangle as one array of three points and destructure it in the parameter, exactly like `drawSierpinski` does.

What it practices: point objects and destructuring — naming an operation instead of juggling six loose coordinates.

Hint: same shape as `midpoint`, but three terms divided by 3 — and remember the `({ ... })` parentheses trick for arrow functions returning objects.

Check: `centroid([{x:0,y:0}, {x:6,y:0}, {x:0,y:9}])` must give `{ x: 2, y: 3 }`.

### ⭐⭐ 2. Return the triangles instead of drawing them (core)

Write `collectTriangles(triangle, depth)` that does the same recursion as `drawSierpinski` but **returns an array of triangles** instead of putting ink anywhere. Base case: return `[[a, b, c]]` (an array holding one triangle). Recursive case: return the three sub-results combined into one array. No `ctx` parameter anywhere.

What it practices: recursion that builds and returns data — the cleanest possible split of "which triangles exist" from "what to do with them".

Hint: spread syntax combines arrays: `[...listA, ...listB, ...listC]`.

Check: with `unit = [{x:0,y:0}, {x:4,y:0}, {x:0,y:4}]`, `collectTriangles(unit, d).length` must be 1, 3, 9, 27 for depths 0–3, and at depth 1 the first triangle is `[{x:0,y:0}, {x:2,y:0}, {x:0,y:2}]`.

### ⭐⭐ 3. How much ink is left? (core)

Each level removes the middle quarter of every triangle, so the total filled area should shrink to ¾ of the previous level. Prove it: write `triangleArea([a, b, c])` (formula in the hint), then use `collectTriangles` from exercise 2 to sum the areas of all leaf triangles at a given depth.

What it practices: composing small pure functions on plain data, and checking code against a mathematical fact.

Hint: for corners a, b, c the area is `|((b.x−a.x)·(c.y−a.y)) − ((c.x−a.x)·(b.y−a.y))| / 2` — Math.abs makes corner order irrelevant.

Check: on the `unit` triangle from exercise 2 (area 8), the totals at depths 0, 1, 2, 3 must be exactly 8, 6, 4.5, 3.375.

### ⭐⭐ 4. Fit any canvas, not just a wide one (core)

`fittedTriangle(width)` assumes the canvas is wide enough for the triangle's height. Write `fittedTriangle(width, height)` that fits the largest equilateral triangle into **any** rectangle: if `width · √3/2` is taller than the canvas, derive the side length from the height instead, then center the triangle both horizontally and vertically.

What it practices: derived values instead of magic numbers — the rule that killed the original's mysterious `520`.

Hint: `side = Math.min(width, height / (Math.sqrt(3) / 2))`; then compute the left and top margins as `(available − used) / 2`.

Check: `fittedTriangle(600, 300)` must give a triangle with corners near (300, 0), (126.8, 300), (473.2, 300); `fittedTriangle(300, 520)` must give (150, 130.1), (0, 389.9), (300, 389.9) — centered in the tall canvas.

### ⭐⭐⭐ 5. Recursion without recursion (challenge)

Rewrite exercise 2 with **no recursive call**: `collectTrianglesIterative(triangle, depth)` keeps a stack (a plain array) of `[triangle, depth]` jobs. Loop while the stack isn't empty: pop a job; at depth 0 push the triangle to the results, otherwise push the three smaller jobs onto the stack. This is what the JavaScript engine secretly does with the call stack when you recurse.

What it practices: seeing recursion as "a to-do list of smaller jobs" — the mental model that makes stack overflows and depth limits make sense.

Hint: `stack.pop()` gives `[[a, b, c], d]` — you can destructure that whole shape in one `const`.

Check: at depth 4 it must return exactly 81 triangles, and sorting the JSON-stringified triangles from both versions must give identical lists (order may differ — that's fine and worth noticing).

## Solutions

### 1. Centroid

```js
const centroid = ([a, b, c]) => ({
  x: (a.x + b.x + c.x) / 3,
  y: (a.y + b.y + c.y) / 3,
});
centroid([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 9 }]); // { x: 2, y: 3 }
```

WHY: this is the README's core claim in miniature — because a point is one `{x, y}` value, "average of corners" becomes a nameable, testable one-liner. With six loose coordinates you'd be writing `(x1 + x2 + x3) / 3` twice and praying you didn't mix an x into the y line.

### 2. Return the triangles instead of drawing them

```js
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function collectTriangles([a, b, c], depth) {
  if (depth === 0) return [[a, b, c]];
  const ab = midpoint(a, b);
  const bc = midpoint(b, c);
  const ca = midpoint(c, a);
  return [
    ...collectTriangles([a, ab, ca], depth - 1),
    ...collectTriangles([ab, b, bc], depth - 1),
    ...collectTriangles([ca, bc, c], depth - 1),
  ];
}
```

WHY: the recursion is identical to `drawSierpinski` — only the base case changed from "ink" to "data". That's the separation the README describes ("swap the leaf function") taken one step further: now the whole `render()` could just be `for (const t of collectTriangles(...)) fillTriangle(ctx, t)`, and the recursion itself needs no canvas to be tested.

### 3. How much ink is left?

```js
function triangleArea([a, b, c]) {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
}

function totalArea(triangle, depth) {
  return collectTriangles(triangle, depth)
    .reduce((sum, t) => sum + triangleArea(t), 0);
}
const unit = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 4 }];
[0, 1, 2, 3].map((d) => totalArea(unit, d)); // [8, 6, 4.5, 3.375]
```

WHY: each level keeps 3 copies at ¼ area each, so total area is multiplied by ¾ per depth — and the code confirms the math exactly. Once triangles are plain data, "verify a property of the whole fractal" is a `reduce`, no pixels or squinting involved.

### 4. Fit any canvas

```js
function fittedTriangle(width, height) {
  const ratio = Math.sqrt(3) / 2;                 // height of side-1 triangle
  const side = Math.min(width, height / ratio);   // largest side that fits
  const triHeight = side * ratio;
  const left = (width - side) / 2;
  const top = (height - triHeight) / 2;
  return [
    { x: left + side / 2, y: top },
    { x: left, y: top + triHeight },
    { x: left + side, y: top + triHeight },
  ];
}
fittedTriangle(600, 300); // (300,0) (126.8,300) (473.2,300)
fittedTriangle(300, 520); // (150,130.1) (0,389.9) (300,389.9)
```

WHY: the original's `520` was a magic number; the refactor derived it from width; this version derives it from *both* dimensions, so no canvas shape can break it. Every value is computed from its source — resize anything and the geometry re-derives itself, which is exactly why derived values beat constants.

### 5. Recursion without recursion

```js
function collectTrianglesIterative(triangle, depth) {
  const result = [];
  const stack = [[triangle, depth]];
  while (stack.length > 0) {
    const [[a, b, c], d] = stack.pop();
    if (d === 0) {
      result.push([a, b, c]);
      continue;
    }
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    stack.push([[a, ab, ca], d - 1], [[ab, b, bc], d - 1], [[ca, bc, c], d - 1]);
  }
  return result;
}
// Same 81 triangles at depth 4:
const key = (t) => JSON.stringify(t);
const a = collectTriangles(unit, 4).map(key).sort();
const b = collectTrianglesIterative(unit, 4).map(key).sort();
a.length === 81 && a.join('|') === b.join('|'); // true
```

WHY: a recursive call is really "push a smaller job, come back to it later" — this version makes that stack visible as an array you own. The results arrive in a different order (the stack is last-in-first-out), which is why the check sorts both lists: the *set* of triangles is what the fractal is; the order was never part of its meaning.
