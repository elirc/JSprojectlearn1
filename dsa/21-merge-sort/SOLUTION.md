# Solution walkthrough — Merge Sort

## The naive approach and its cost

The sorts most people invent first are *selection sort* ("find the smallest,
move it to the front, repeat") or *bubble sort* ("swap neighbors that are out
of order until nothing moves"). Both work. Both are **O(n²)**: for each of
the n positions you re-scan up to n elements. At n = 1,000 that's a million
steps; at n = 1,000,000 it's a trillion — unusable.

The question that leads out of O(n²): *can I avoid re-comparing the same
elements over and over?*

## The insight

Two observations combine into the whole algorithm:

1. **Merging two already-sorted arrays is cheap.** You did it in dsa/04:
   two pointers, always take the smaller front element — O(n) total,
   because each element is looked at once.
2. **An array of length 0 or 1 is already sorted.** Free base case.

So: if I could somehow get two sorted halves, I could finish in O(n).
How do I sort a half? *The same way.* That self-reference is recursion, and
because the halves keep shrinking, they eventually hit length ≤ 1 — sorted
for free. This split-solve-combine pattern is called **divide & conquer**.

## The approach, step by step

1. **Base case.** `if (arr.length <= 1) return [...arr];`
   Return a *copy* (`[...arr]`), because our contract is "new array,
   input untouched."
2. **Divide.** `const mid = Math.floor(arr.length / 2);` then
   `arr.slice(0, mid)` and `arr.slice(mid)`. For length 5 that's sizes
   2 and 3 — unequal halves are fine.
3. **Conquer.** Call `mergeSort` on each half. Do **not** trace into the
   recursion in your head — just trust the contract: "returns a sorted
   copy." (This trust is the skill this problem teaches.)
4. **Combine.** Merge the two sorted halves: pointers `i` and `j` at the
   start of each, repeatedly push the smaller of `a[i]` / `b[j]` into the
   output, advance that pointer. When one side runs out, append the rest of
   the other side — those leftovers are already sorted and all ≥ what's in
   the output.

Tie-break with `a[i] <= b[j]` (take from the left half on ties). That makes
the sort **stable**: equal elements keep their original relative order.

## Complexity

- **Time O(n log n).** The splitting builds a tree of subarrays that is
  `log₂ n` levels deep (halving, just like binary search in dsa/19). Every
  level's merges touch each element exactly once — O(n) work per level.
  `log n` levels × O(n) per level = O(n log n). At n = 1,000,000 that's
  ~20 million steps instead of a trillion.
- **Space O(n).** The merge builds output arrays; at any moment the live
  copies total O(n). The recursion stack adds O(log n) on top — negligible.

## Common mistakes

- **No base case (or `length === 0` only).** A length-1 array must return
  immediately too, or `slice(0, 0)` gives you an empty half and `slice(0)`
  gives you the *same* array back — infinite recursion, stack overflow.
- **Splitting at `arr.length / 2` without `Math.floor`.** A fractional
  index makes `slice` behave, but your mental model breaks; always floor.
- **Merging by concatenating then re-scanning.** `[...left, ...right]` and
  then "fix it up" isn't merging — the two-pointer walk *is* the algorithm.
- **Forgetting the leftovers.** After the main merge loop, one array almost
  always has unconsumed elements. Dropping them loses data — the duplicate
  test catches this.
- **Mutating the input.** `arr.sort()` or writing into `arr` breaks the
  "returns a new array" contract; the mutation test catches it.
- **Using `a[i] < b[j]`** instead of `<=`. Still sorts numbers correctly,
  but loses stability — a habit worth building now, before you sort objects.
