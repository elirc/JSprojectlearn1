# Solution — Container With Most Water

## The naive approach and its cost

Try every pair. Two nested loops, `i` from 0, `j` from `i + 1`:

```js
let best = 0;
for (let i = 0; i < heights.length; i++) {
  for (let j = i + 1; j < heights.length; j++) {
    best = Math.max(best, Math.min(heights[i], heights[j]) * (j - i));
  }
}
```

Correct, and fine for tiny inputs. But it's **O(n²)**: for 100 000
lines that's ~5 billion area computations. We need to *skip* pairs —
and to skip safely, we need an argument for why a pair can't win.

## The insight

Two facts combine into that argument:

1. **The shorter line caps the area.** Water above it spills out.
2. **Starting from both ends, width only ever shrinks** as pointers
   move inward.

Now suppose `heights[left] <= heights[right]`. Consider *any* pair that
keeps `left` but uses some line inside the current window. Its width is
smaller, and its cap is still at most `heights[left]` (the min can't
exceed the shorter member). So **every** such pair loses to the area we
just measured. We can discard `left` entirely — the best pair involving
it has already been counted. That's the greedy step: always advance the
pointer at the shorter line.

## The approach, step by step

1. `left = 0`, `right = heights.length - 1`, `best = 0`.
2. While `left < right`:
   a. `area = Math.min(heights[left], heights[right]) * (right - left)`.
   b. `best = Math.max(best, area)`.
   c. If `heights[left] <= heights[right]`, do `left++`; else `right--`.
3. Return `best`.

Each iteration retires one line for good, so the loop runs at most
`n - 1` times. With fewer than two lines the loop never runs and `0`
comes back naturally — no special case needed.

Trace on `[1, 8, 6, 2, 5, 4, 8, 3, 7]`:

| left | right | min | width | area | best | move |
|------|-------|-----|-------|------|------|------|
| 0(1) | 8(7)  | 1   | 8     | 8    | 8    | left (1 ≤ 7) |
| 1(8) | 8(7)  | 7   | 7     | 49   | 49   | right (8 > 7) |
| 1(8) | 7(3)  | 3   | 6     | 18   | 49   | right |
| 1(8) | 6(8)  | 8   | 5     | 40   | 49   | left (tie) |
| …    | …     | …   | …     | ≤49  | 49   | …    |

The answer 49 is found on step two and never beaten.

## Complexity

- **Time: O(n).** Each step moves exactly one pointer inward; they meet
  after at most `n - 1` steps.
- **Space: O(1).** Two indexes and a running best.

## Common mistakes

- **Moving the taller pointer.** It *feels* symmetric, but only
  discarding the shorter line is provably safe. Try `[6, 1, 1, 1, 9]`
  with the wrong rule: after measuring the ends (area 6×4 = 24) it
  retires the 9, and every later pair is capped by 1s — it still
  reports 24 only by luck of the first measurement; on
  `[2, 1, 9, 8]` the wrong rule retires the 8, then the 9, and never
  measures 9-and-8 (area 8), returning 6 instead. The proof only
  covers the shorter side — don't freelance.
- **Using `Math.max` of the heights instead of `Math.min`.** The water
  level is set by the shorter line.
- **Forgetting the width.** Area is height × width, not just height.
- **Looping with `left <= right`.** A single line is not a container;
  when the pointers meet you're done.
- **Returning the pair of indexes** instead of the area.
