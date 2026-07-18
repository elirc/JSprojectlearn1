# 21 — Sierpinski triangle

**Lesson: recursion you can *see*, and the difference a data shape (a Point) makes.**

## Run it

Open `original.html` and `refactored/index.html` in a browser. The refactor adds a
depth slider — drag it and watch the recursion unfold level by level.

## What's wrong with the original?

1. **Six loose coordinates per triangle.** `tri(x1, y1, x2, y2, x3, y3, d)` forces
   every midpoint to be computed inline — *twelve* coordinate expressions in the
   recursive calls, any one of which can hide a transposed subscript. The bug wouldn't
   even crash; you'd just get a subtly glitched fractal and no idea which expression
   to blame.
2. **Magic corner coordinates.** `tri(300, 0, 0, 520, 600, 520, 6)` — where do these
   numbers come from? (`520 ≈ 600·√3/2`, an equilateral triangle's height — but
   nothing says so.) Resize the canvas and you're re-deriving six numbers by hand.
3. **Depth is a positional mystery.** Which argument is the `6`? Count commas.

## What changed in the refactor

- **`{ x, y }` points instead of coordinate pairs.** Immediately, `midpoint(a, b)`
  becomes definable — *the* operation of this fractal, written once and named. The
  recursive step then reads like the definition of the fractal: split at midpoints
  `ab`, `bc`, `ca`; recurse into `[a, ab, ca]`, `[ab, b, bc]`, `[ca, bc, c]`. You can
  check it against a picture, corner by corner. Grouping related values into an object
  isn't "extra structure" — it's what allows *naming operations* on them.
- **`fittedTriangle(width)` derives the corners** from the canvas width, with
  `Math.sqrt(3) / 2` right there in the code saying *why* the height is what it is.
  Derived values can't go stale; magic numbers can.
- **Drawing is separated from recursing**: `drawSierpinski` decides *which* triangles
  exist; `fillTriangle` puts ink on canvas. Want to render as SVG, or count triangles
  instead of drawing? Swap the leaf function.
- **The depth slider is the teaching payoff**: re-rendering at any depth was trivial
  (`render()` is a pure redraw — project 14's pattern), and stepping 0 → 1 → 2 → 3
  shows *what the recursion does* better than any comment could.

## Key takeaway

When function arguments travel in fixed groups (x and y, r/g/b, start and end), fuse
them into one object. Every operation on the group gets a name, every call site
shrinks, and whole categories of transposition bugs disappear.
