# 📘 Learning Guide: Search in a Rotated Sorted Array

Bending an algorithm to a harder input — and learning that binary search only needs *a rule that eliminates half*, not a fully sorted array.

## 1. The problem in plain words

Start with a sorted array:

```
[0, 1, 2, 4, 5, 6, 7]
```

**Rotate** it: cut it at some position and swap the two pieces. Cut
after `2` and you get

```
[4, 5, 6, 7, 0, 1, 2]
```

It is no longer sorted — but it is not random either. It is two sorted
runs, one after the other, with a single **seam** where the values
drop (`7 → 0`). Everything before the seam is larger than everything
after it.

Find a value in it, in O(log n). If it isn't there, return `-1`.

## 2. Concepts you need first

- **Binary search** — `19-binary-search`, all of it: the `low`/`high`
  window, `while (low <= high)`, `mid = Math.floor((low + high) / 2)`,
  and `mid ± 1` to guarantee progress. This problem changes only *how
  you decide which side to keep*.
- **Loop invariants** — again the promise "if the target exists, its
  index is in `[low, high]`". Everything here is about keeping it true
  when the array is only locally sorted.
- **Case analysis** — proving that of two options at least one always
  holds, then handling each. That is today's actual reasoning skill.

## 3. How to think about it

**First, see the failure.** Run plain binary search on
`[4,5,6,7,0,1,2]` looking for `0`. The middle is `7`. `7 > 0`, so the
usual rule says "the answer is to the left" — and it is to the right.
The rule was never about the middle *value*; it was about the array
being sorted end to end, which it now isn't. Being able to say exactly
why an algorithm breaks is what tells you which piece to replace.

**Then, find what is still true.** The array has exactly one seam.
Cut anywhere. The seam falls on one side of the cut — so the **other
side has no seam at all, and is plainly sorted**. Check it:

```
[4, 5, 6, 7, 0, 1, 2]
 └── left ──┘ ^mid=7   left [4,5,6,7] sorted; right [7,0,1,2] has the seam

[4, 5, 6, 7, 0, 1, 2]
       ^mid=1 (index 5)  left [4..1] has the seam; right [1,2] sorted
```

Always at least one clean half. That is the fact the whole solution
hangs on, and it is worth checking by hand on three or four cuts until
it feels obvious.

**Now use it.** How do you tell which half is clean? Look at the left
half's two ends: `nums[low]` and `nums[mid]`. If
`nums[low] <= nums[mid]`, nothing dropped in there — left half clean.
Otherwise the seam is inside the left half, so the right half must be
the clean one.

**And then the decisive step.** In a *sorted* range you can answer
"is the target in here?" with total certainty — just check whether it
lies between the two ends. So:

- target inside the clean half → keep that half;
- target not inside it → it can only be in the other half, so keep
  that one.

Either way you throw away half the array, which is all binary search
ever needed. Note what you never had to compute: *where the seam
actually is*. You only needed to know which side to trust. Solving a
problem by ruling out possibilities, rather than by locating the thing
directly, is a move that pays off again and again.

One last detail worth understanding rather than memorising: check
`nums[mid] === target` **before** the branches. Having already ruled
`mid` out, the range tests exclude it and include the outer ends:
`nums[low] <= target < nums[mid]` on the left,
`nums[mid] < target <= nums[high]` on the right. Every `<` and `<=`
there has a reason.

## 4. Common wrong turns

- **Scanning for the seam.** An O(n) loop to find the pivot makes the
  whole solution O(n). (Finding it with a *second* binary search is
  legitimate — just more code than necessary.)
- **`nums[low] < nums[mid]` with a strict `<`.** When the window is one
  element wide, `low === mid` and the test is false, sending you into
  the right-half branch, which then reads bounds from the wrong side.
  `[1]` and `[3,1]` break. Use `<=`.
- **Symmetric range bounds.** `nums[low] <= target <= nums[mid]`
  re-admits `mid`; `nums[low] < target` shuts out `low` and makes
  `searchRotated([4,5,6,7,0,1,2], 4)` return `-1`. The asymmetry is
  load-bearing.
- **Testing equality after the branches.** Then `mid` is still a live
  candidate and every bound above needs rewriting. Equality first.
- **Comparing the target against `nums[mid]` alone**, as in plain
  binary search. That is exactly the rule rotation invalidates.
- **Assuming duplicates behave.** With `[2,2,2,0,2]`,
  `nums[low] === nums[mid]` tells you nothing about which half is
  clean, and the worst case falls back to O(n). Our inputs are
  distinct; know the caveat.

## 5. The solution, step by step

```js
export function searchRotated(nums, target) {
  let low = 0;
  let high = nums.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (nums[mid] === target) return mid; // rule mid out first

    if (nums[low] <= nums[mid]) {
      // LEFT half [low..mid] has no seam → it is sorted
      if (nums[low] <= target && target < nums[mid]) {
        high = mid - 1;   // target is inside the clean half
      } else {
        low = mid + 1;    // so it can only be in the other half
      }
    } else {
      // RIGHT half [mid..high] is the sorted one
      if (nums[mid] < target && target <= nums[high]) {
        low = mid + 1;    // inside the clean half
      } else {
        high = mid - 1;   // other half
      }
    }
  }

  return -1;
}
```

Trace `searchRotated([4,5,6,7,0,1,2], 0)`:

| low | high | mid | nums[mid] | clean half | reasoning | next |
|-----|------|-----|-----------|-----------|-----------|------|
| 0 | 6 | 3 | 7 | left [4..7] | 0 is not in [4,7) | low = 4 |
| 4 | 6 | 5 | 1 | left [0,1]  | 0 **is** in [0,1) | high = 4 |
| 4 | 4 | 4 | 0 | — | equal | **return 4** |

And a miss, `searchRotated([4,5,6,7,0,1,2], 3)`:

| low | high | mid | nums[mid] | clean half | next |
|-----|------|-----|-----------|-----------|------|
| 0 | 6 | 3 | 7 | left [4..7] | 3 not in [4,7) → low = 4 |
| 4 | 6 | 5 | 1 | left [0,1]  | 3 not in [0,1) → low = 6 |
| 6 | 6 | 6 | 2 | left [2,2]  | 3 not in [2,2) → low = 7 |
| 7 | 6 | — | — | — | `low > high` → **-1** |

Sanity check the unrotated case, `[1,2,3,4,5]`: `nums[low] <= nums[mid]`
is always true, so only the first branch ever runs — and it is exactly
ordinary binary search. A good generalisation collapses back to the
thing it generalises.

## 6. Complexity, gently

**Time: O(log n).** Every path through the loop ends in `low = mid + 1`
or `high = mid - 1`, so the window still halves every turn, just as in
problem 19. The extra comparison that decides which half is clean is
constant work — it does not add a pass, so it does not change the
class.

**Space: O(1).** Three numbers.

The lesson underneath the numbers: **binary search does not require a
sorted array. It requires a rule that reliably eliminates half the
search space.** Sortedness is the most common source of such a rule,
not the only one. Once you see it that way, binary search starts
showing up in places with no array at all — "what is the smallest
capacity that finishes the job in time?", "what is the integer square
root?" — anywhere a yes/no test is *monotone* (once it flips, it stays
flipped). Problem 19's variation 5 was the first hint; this problem is
the second.

## 7. Words you learned

- **Rotation** — cutting a sequence and swapping the two pieces;
  `[1,2,3,4,5]` rotated by 2 is `[3,4,5,1,2]`.
- **Pivot / seam** — the one index where a rotated sorted array drops.
- **Locally sorted** — sorted within a region though not overall.
- **Case analysis** — proving at least one of two situations always
  holds, then handling each.
- **Monotone predicate** — a yes/no test that flips exactly once across
  the range; the real precondition for binary search.
- **Degenerate case** — the boundary input (rotation by 0, one element,
  empty) that a correct solution handles without special-casing.

## 8. Variations to try

1. **Find the minimum** of a rotated sorted array in O(log n) — i.e.
   locate the seam itself. Compare `nums[mid]` with `nums[high]` and
   think about which side must hold it.
2. **Find the rotation amount** — how far it was rotated. (It is the
   index of the minimum. One line, once you have variation 1.)
3. **With duplicates.** `[2,2,2,0,2]`: when `nums[low] === nums[mid]`
   you cannot tell which half is clean. The usual fix is `low++` and
   try again — which makes the worst case O(n). Explain why that is
   unavoidable.
4. **Rotate an array in place** in O(n) time and O(1) space. Hint:
   reverse the whole thing, then reverse each piece. (Your
   `17-reverse-linked-list` instincts, applied to arrays.)
5. **Binary search on the answer.** Given `x`, find `Math.floor(sqrt(x))`
   without `Math.sqrt`: search 0..x for the largest `m` with
   `m * m <= x`. No array anywhere — just a monotone test.
6. **Search a 2D sorted matrix** — rows sorted, each row starting above
   the previous one's end. Treat it as one long sorted array and map
   the index with `/` and `%`.
