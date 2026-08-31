# 11 — Container With Most Water

You are given an array of non-negative numbers. Each number is the height
of a vertical line standing at that index (the x-axis is the floor).
Pick **two** lines; together with the floor they form a container.
The water it holds is:

```
area = Math.min(heights[i], heights[j]) * (j - i)
```

(the *shorter* line caps the water level — anything above it spills out).

Return the **largest area** any pair of lines can hold.

## Signature

```js
/** @param {number[]} heights @returns {number} */
export function maxArea(heights)
```

## Worked examples

**Example 1:** `maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])` → `49`
The best pair is index 1 (height 8) and index 8 (height 7):
`min(8, 7) * (8 - 1) = 7 * 7 = 49`. No other pair beats it.

**Example 2:** `maxArea([4, 3, 2, 1, 4])` → `16`
The two ends: `min(4, 4) * (4 - 0) = 4 * 4 = 16`. Width wins here.

**Example 3:** `maxArea([1, 2, 1])` → `2`
Pairs: (0,1)→1, (0,2)→2, (1,2)→1. Best is the two ends: `min(1,1) * 2 = 2`.

**Example 4:** `maxArea([2, 3, 10, 5, 7, 8, 9])` → `36`
Index 2 (height 10) and index 6 (height 9): `min(10, 9) * 4 = 36`.
The tallest line pairs with a far-away tall-ish line — not its neighbour.

## Constraints & edge cases

- Heights are non-negative integers; zeros are allowed.
- Fewer than two lines → return `0` (no container possible).
- Arrays can be large (think 100 000 elements) — checking every pair
  is ~5 billion checks. Aim for **O(n)**.
- The answer is an *area*, not the pair of indexes.

## Hints

Take them one at a time. Struggle first — that's the workout.

<details><summary>Hint 1 (nudge)</summary>

Brute force works: try every pair `(i, j)` and keep the best area.
Write it if you want — then ask: what is its time cost, and which
pairs is it wasting time on?
</details>

<details><summary>Hint 2 (direction)</summary>

Start with the *widest* container: leftmost line and rightmost line.
Any other pair is narrower. So a narrower pair can only win by being
**taller where it counts**. You met two pointers from both ends in
`10-valid-palindrome-two-pointers` — same stance, new question.
</details>

<details><summary>Hint 3 (the key insight)</summary>

The shorter of the two lines caps the area. If you move the *taller*
pointer inward, the width shrinks and the cap can't rise (it's still
limited by that same shorter line — or worse). So moving the taller
pointer can never find a better answer. Which pointer *must* you move?
</details>

<details><summary>Hint 4 (nearly the algorithm)</summary>

`left = 0`, `right = heights.length - 1`, `best = 0`. While
`left < right`: compute the area, keep the max, then advance the
pointer standing at the **shorter** line (either one on a tie).
Return `best` when the pointers meet.
</details>

## Run

```
node --test dsa/11-container-most-water/attempt.test.js
```
