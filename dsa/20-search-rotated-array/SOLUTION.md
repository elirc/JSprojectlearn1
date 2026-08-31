# Solution — Search in a Rotated Sorted Array

## The naive approach and its cost

**Linear scan.** `indexOf`. O(n), correct, and it throws away almost
all of the structure you were handed. Fine as a sanity check, wrong as
an answer.

**Find the pivot, then binary search.** Walk the array to find where
the values drop, then binary search whichever piece can contain the
target. Correct — but the walk is **O(n)**, so the whole thing is O(n)
and the binary search is decoration. (Finding the pivot with a *second*
binary search is legitimate — just two passes where one will do.)

**Plain binary search.** Fails, and it is worth seeing exactly why:

```
[4, 5, 6, 7, 0, 1, 2]   target 0
       ^mid = 7
```

`7 > 0`, so the usual rule says "go left". But `0` is on the right. The
rule `nums[mid] > target ⇒ answer is left` relies on the array being
sorted *as a whole*, and this one isn't. Rotation breaks the global
comparison while leaving the local structure intact — that gap is the
whole problem.

## The insight

Cut a rotated sorted array anywhere. There is exactly one place where
the values drop (the seam), and it can only be on one side of the cut.
So:

> **At least one of the two halves is plainly sorted.**

Try it on `[4, 5, 6, 7, 0, 1, 2]`:

```
mid = 3 (value 7):  left  [4,5,6,7] sorted ✓   right [7,0,1,2] not
mid = 1 (value 5):  left  [4,5]     sorted ✓   right [5,6,7,0,1,2] not
mid = 5 (value 1):  left  [4,5,6,7,0,1] not    right [1,2] sorted ✓
```

Which one? Compare the ends of the left half: if `nums[low] <= nums[mid]`
the left half has no drop, so it is the sorted one; otherwise the seam
is on the left and the right half is the clean one.

And a *sorted* half is something you can interrogate perfectly: the
target is in it **iff** it lies between that half's two ends. If it is,
recurse (well, loop) into it. If it isn't, the target can only be in
the other half. Notice that you never need to know where the seam
actually is — only which side is clean. That indirection is the trick
worth keeping.

## The approach, step by step

1. `let low = 0; let high = nums.length - 1;` — same window as
   `19-binary-search`, same `while (low <= high)`, same `mid`.
2. `if (nums[mid] === target) return mid;` — do this **first**, so the
   two branches below can treat `mid` as already ruled out.
3. `if (nums[low] <= nums[mid])` — the left half `[low..mid]` is
   sorted. (`<=` matters: when the window is one wide, `low === mid`
   and the half is trivially sorted.)
   - `if (nums[low] <= target && target < nums[mid]) high = mid - 1;`
     the target is inside that sorted range.
   - `else low = mid + 1;` it isn't, so search the other half.
4. `else` — the right half `[mid..high]` is the sorted one.
   - `if (nums[mid] < target && target <= nums[high]) low = mid + 1;`
   - `else high = mid - 1;`
5. Loop ends → `return -1`.

The asymmetric comparisons (`nums[low] <=` but `< nums[mid]`, and
`nums[mid] <` but `<= nums[high]`) are deliberate: `mid` was tested for
equality in step 2 and must be excluded, while `low` and `high` are
still live candidates.

Trace `searchRotated([4,5,6,7,0,1,2], 0)`:

| low | high | mid | nums[mid] | which half sorted | decision |
|-----|------|-----|-----------|-------------------|----------|
| 0   | 6    | 3   | 7         | left [4..7]       | 0 not in [4,7) → low = 4 |
| 4   | 6    | 5   | 1         | left [0,1]        | 0 in [0,1)  → high = 4 |
| 4   | 4    | 4   | 0         | —                 | **return 4** |

And an unrotated array behaves exactly like ordinary binary search: the
left half is always sorted, so only the first branch ever runs.

## Complexity

- **Time: O(log n).** Every turn ends with `low = mid + 1` or
  `high = mid - 1`, exactly as in plain binary search — the window
  still halves. Deciding which half is sorted costs one extra
  comparison, not an extra pass.
- **Space: O(1).** Three numbers.
- Note what *didn't* change: the cost. Rotation makes the code trickier
  without making it slower — the sign of a good "same idea, harder
  input" variant.

## Common mistakes

- **Checking `nums[mid] === target` after the branches.** Then `mid`
  is not yet ruled out and the range tests need different bounds; most
  people get one of them wrong. Test for equality first.
- **`nums[low] < nums[mid]` instead of `<=`.** When the window narrows
  to one element, `low === mid` and a strict `<` sends you down the
  "right half is sorted" path with `nums[high]` from the wrong side.
  Single- and two-element arrays break.
- **Getting the range bounds symmetric.** `nums[low] <= target <= nums[mid]`
  re-includes `mid`; `nums[low] < target < nums[mid]` excludes `low`,
  and then `searchRotated([4,5,6,7,0,1,2], 4)` returns `-1`.
- **Mixing up `nums[low]` and `nums[high]`** when deciding which half
  is sorted. Pick one convention — this solution always asks about the
  left half first — and stay with it.
- **Finding the pivot with a linear scan.** Correct answer, O(n), so
  the exercise is unmet.
- **Assuming duplicates work.** With duplicates (e.g. `[2,2,2,0,2]`),
  `nums[low] === nums[mid]` tells you nothing and the worst case
  degrades to O(n). Our input is distinct — but say the caveat out
  loud; the duplicate version is a favourite follow-up question.
