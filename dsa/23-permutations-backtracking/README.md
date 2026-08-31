# 23 — Permutations (backtracking)

Given an array of **distinct** values, return every possible ordering of them.
Three elements give 6 orderings, four give 24, five give 120 — the count is
`n!` and it explodes fast.

This is your introduction to **backtracking**: build a partial answer one
choice at a time, recurse, then *undo the choice* and try the next one. That
choose-explore-unchoose rhythm is the shape behind subsets, N-queens, sudoku
solvers, and maze solving — permutations is where you learn it.

## Signature

```js
/**
 * @param {Array} arr - array of distinct values (may be empty)
 * @returns {Array[]} every ordering of arr
 */
export function permutations(arr) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `permutations([1, 2])` | `[[1,2], [2,1]]` | two elements, two orderings (2! = 2) |
| `permutations([1, 2, 3])` | `[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]` | 3! = 6 orderings |
| `permutations([7])` | `[[7]]` | one element, one ordering |
| `permutations([])` | `[[]]` | **not** `[]` — there is exactly one way to arrange nothing |

## Constraints & edge cases

- **The order of the permutations themselves does not matter.** Only the order
  *inside* each permutation is meaningful. The tests normalize before
  comparing — they map each permutation to `p.join(",")` and `.sort()` the
  resulting strings — so any outer ordering passes. (The table above just
  shows one plausible output.)
- `permutations([])` must return `[[]]`, a list containing one empty
  permutation — not the empty list. This falls out naturally from a correct
  base case, so if you have to special-case it, something else is off.
- Input values are **distinct**, so you never have to de-duplicate the output.
- Each returned permutation must be its **own array object**. Pushing the same
  working array `n!` times is the classic bug here, and the tests check for it.
- The input array must be unchanged when you return.
- Target complexity: O(n × n!) time — n! results, each costing O(n) to copy —
  and O(n) of working space beyond the output itself.

## Hints (take them one at a time!)

1. Think of it as filling `n` numbered slots left to right. For slot 0 you
   have `n` candidates. Once you commit to one, filling the remaining slots is
   *the same problem* on the values you haven't used yet — so dsa/21's
   "trust the recursion" applies again.
2. Carry two pieces of state through the recursion: `current`, the partial
   ordering built so far, and `used`, a boolean per input index marking what
   is already placed. When `current.length === arr.length` you have a complete
   permutation — record it. Otherwise loop over every index, skip the used
   ones, and recurse on each remaining candidate.
3. The rhythm inside that loop is exactly three steps.
   **Choose:** `used[i] = true; current.push(arr[i]);`
   **Explore:** `backtrack();`
   **Un-choose:** `current.pop(); used[i] = false;`
   The un-choose is the whole technique — it rewinds the state so the next
   iteration starts clean (it is dsa/13's stack pop, run by the recursion).
   And when you record a finished permutation, push `[...current]`, a copy —
   `current` itself is about to be emptied out from under you.

## Run it

```
node --test dsa/23-permutations-backtracking/attempt.test.js
```
