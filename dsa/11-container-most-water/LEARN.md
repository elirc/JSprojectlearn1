# 📘 Learning Guide: Container With Most Water

How to skip almost all the pairs in a pair-picking problem — safely — with two pointers and a one-line proof.

## 1. The problem in plain words

Picture a bar chart. Every bar is a wall. Choose two walls, pour water
between them: the water rises until it reaches the top of the *shorter*
wall, then spills over. The amount of water is

```
(the shorter wall's height) × (how far apart the walls are)
```

Your job: choose the two walls that hold the most water, and return
that amount. Not the walls themselves — the amount.

Two forces fight each other: walls far apart give **width**, tall walls
give **height**. `[4,3,2,1,4]` is won by width (the two 4s at the
ends). `[1,8,6,2,5,4,8,3,7]` is won by two tall walls that are
*fairly* far apart. The best answer balances both.

## 2. Concepts you need first

- **Two pointers** — you used them in `04-merge-sorted-arrays` (both
  moving forward) and `10-valid-palindrome-two-pointers` (one at each
  end, walking inward). This problem uses the ends-inward version.
- **Greedy choice** — making a locally-justified decision (here:
  "abandon this wall forever") without backtracking. A greedy step is
  only sound if you can argue *nothing discarded could have won*.
- **`Math.min` / `Math.max`** — the water level is `Math.min` of two
  heights; the running answer is a `Math.max` accumulator, exactly like
  the best-so-far you carried in `03-max-subarray` (Kadane).

## 3. How to think about it

Start from the brute force: every pair, `n(n-1)/2` of them, O(n²).
Whenever a brute force enumerates *pairs*, ask: **can I rule out whole
groups of pairs without looking at them?**

Set your pointers at the two ends. This pair has the maximum possible
width. Every other pair is narrower, so any pair that beats it must
make up for lost width with extra *usable* height.

Now the key question. Say the left wall is the shorter one (height 5,
say, and the right wall is 9). Think about *all* the pairs that keep
this left wall and pick some other right wall inside the window:

- their width is **smaller** than what we just measured;
- their water level is **at most 5** — the level is the min of two
  heights, and one of them is still that same 5.

Smaller width × capped height = strictly no better. Every pair
involving that left wall is now beaten by the measurement we already
took. The wall is *exhausted* — drop it, move the left pointer inward.

That argument is the whole algorithm. Each step measures once and
permanently retires one wall, so after at most `n - 1` steps every wall
has been retired and the best measurement is the answer.

Note what the argument does **not** say: it never claims the pair you
just measured is the best. It claims the *discarded wall* can't be part
of anything better. Best-so-far tracking does the rest.

## 4. Common wrong turns

- **"Move the taller pointer — keep the short one, it needs help."**
  Backwards. The short wall is the *limiter*; keeping it caps every
  future pair. The proof in section 3 only works when you discard the
  shorter wall.
- **"Move both pointers when the heights are equal."** Tempting, and
  it happens to... be unsafe to reason about quickly. On a tie, moving
  *either one* is safe (both are limiters); moving both in one step
  skips the pair (left+1, right) and (left, right−1) without
  justification. Keep the rule simple: move exactly one pointer per step.
- **Computing `Math.max(h[i], h[j]) * width`.** Water spills over the
  short wall. It's `min`, always.
- **Stopping at the first "local best".** Area can dip and rise again
  as pointers move. Run until the pointers meet; keep the max.
- **Special-casing empty/one-element arrays with an early return you
  then get wrong.** With `while (left < right)` the loop body simply
  never runs and `best = 0` returns itself. Trust the loop shape.

## 5. The solution, step by step

```js
export function maxArea(heights) {
  let left = 0;                        // widest possible container:
  let right = heights.length - 1;      // one pointer at each end
  let best = 0;

  while (left < right) {
    const width = right - left;
    const shorter = Math.min(heights[left], heights[right]);
    const area = shorter * width;
    if (area > best) best = area;      // best-so-far, Kadane-style

    if (heights[left] <= heights[right]) {
      left++;                          // left wall is the limiter — retire it
    } else {
      right--;                         // right wall is the limiter — retire it
    }
  }

  return best;
}
```

Walk `[1, 8, 6, 2, 5, 4, 8, 3, 7]` by hand once:

1. `1` vs `7`, width 8 → area 8. Left wall (1) is shorter → retire it.
2. `8` vs `7`, width 7 → area **49**. Right wall (7) shorter → retire.
3. `8` vs `3`, width 6 → area 18. Retire the 3.
4. `8` vs `8`, width 5 → area 40. Tie → retire the left 8.
5. …areas keep coming in under 49. Pointers meet. Answer: **49**.

Nine walls, eight measurements, done. The brute force would have made 36.

## 6. Complexity, gently

Count pointer moves: every loop iteration moves exactly one pointer
exactly one step inward, and they start `n - 1` apart. So the loop body
runs at most `n - 1` times — **O(n) time**. Compare: the brute force
touches every pair, `n(n-1)/2` ≈ n²/2 — **O(n²)**. For n = 100 000
that's ~100 000 steps versus ~5 000 000 000.

Space: `left`, `right`, `best` — three numbers regardless of input
size. **O(1) space.**

## 7. Words you learned

- **Two pointers (converging)** — one index at each end, walking
  toward each other; the window between them only shrinks.
- **Greedy algorithm** — commits to a choice each step and never
  revisits it; correct only when backed by an exchange-style argument.
- **Limiting factor** — the component that caps the result (the
  shorter wall); improvements anywhere else are wasted.
- **Best-so-far accumulator** — a running max updated every step
  (you've carried one since Kadane).
- **Exhausting a candidate** — proving an element can't appear in any
  better answer, so it can be discarded permanently.

## 8. Variations to try

1. **Return the pair.** Modify `maxArea` to return `[i, j]` of the
   winning walls instead of the area. (Track indexes alongside `best`.)
2. **Brute force benchmark.** Write the O(n²) version, generate a
   random 50 000-element array, and time both with `console.time`.
   Feel the difference.
3. **Trapping rain water (harder).** Same chart, but water sits in
   *every* valley, not between one chosen pair. Try it with two
   pointers carrying `maxLeft` / `maxRight`.
4. **Strictly increasing input.** Predict, without running, where the
   pointers end up for `[1,2,3,...,n]` — then verify.
