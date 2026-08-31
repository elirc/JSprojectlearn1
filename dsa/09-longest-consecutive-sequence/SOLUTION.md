# Solution walkthrough — Longest Consecutive Sequence

## The naive approach (and what it costs)

**Sort it.** Once the values are in order, consecutive values are
neighbours, so one pass finds the answer:

```js
export function longestConsecutive(nums) {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);   // copy: don't mutate!
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) continue;             // duplicate
    else if (sorted[i] === sorted[i - 1] + 1) run++;       // extends
    else run = 1;                                          // breaks
    longest = Math.max(longest, run);
  }
  return longest;
}
```

This is a perfectly respectable answer, and if you wrote it, well done —
the duplicate-skipping branch is easy to miss. Its cost is **O(n log n)**,
dominated by the sort.

But look at what sorting gave you and what you actually used. Sorting
computes a *total order* over all `n` values. All you ever asked was
"is `x + 1` also in the collection?" — a membership question. You paid for
a full ranking to answer a yes/no.

The genuinely slow approach is worse: for each number, scan the array for
`x+1`, then `x+2`, … That's O(n) per step and O(n³) in the worst case.

## The insight

Two moves, and the second is the clever one.

**Move 1: use a `Set`.** `set.has(x + 1)` is O(1), and building the set
also collapses duplicates automatically — the second thing the problem
needs. Now you can walk a run upward from any value without sorting.

**Move 2: only start walking from the start of a run.** If you walk upward
from *every* value, `[1,2,3,4]` gets walked from 1 (4 steps), from 2 (3
steps), from 3, from 4 — quadratic again. But there's a perfect test for
"am I the start?":

> `x` is the start of a run **iff** `x - 1` is not in the set.

If `x - 1` exists, then whatever run `x` is in, some smaller value will
walk through `x` anyway — so doing it here is pure duplicated work. Skip.

That single `continue` turns a quadratic algorithm into a linear one.

## The real approach, step by step

1. `const values = new Set(nums);` — O(n), and duplicates vanish.
2. `let longest = 0;`
3. For each `value` of `values`:
   - `if (values.has(value - 1)) continue;` — not a run start, skip.
   - Otherwise walk: `let current = value, length = 1;` then
     `while (values.has(current + 1)) { current++; length++; }`
   - `longest = Math.max(longest, length);`
4. `return longest;` — an empty input never enters the loop, so `0` comes
   out with no special case.

Trace `[100, 4, 200, 1, 3, 2]` (set: `{100, 4, 200, 1, 3, 2}`):

| value | is `value-1` present? | action |
|-------|----------------------|--------|
| 100 | 99? no → **start** | walk: 101? no. length 1 |
| 4 | 3? yes | skip |
| 200 | 199? no → **start** | walk: 201? no. length 1 |
| 1 | 0? no → **start** | walk: 2 ✓, 3 ✓, 4 ✓, 5 ✗. length **4** |
| 3 | 2? yes | skip |
| 2 | 1? yes | skip |

Answer: 4. Notice the run `1,2,3,4` was walked exactly once, from its
smallest member.

## Complexity

- **Time: O(n).** This one deserves a careful argument, because there *is*
  a loop inside a loop. Building the set is O(n). The outer loop runs once
  per distinct value. The inner `while` only ever runs for values that
  start a run — and it visits each member of that run once. Every value
  belongs to exactly one run, so across the entire outer loop the inner
  loop takes at most `n` steps **in total**, not per iteration. O(n) + O(n)
  = **O(n)**.
- **Space: O(n)** for the set. The sorting version needs O(n) too (for the
  copy that avoids mutating the input), so you're not paying extra.
- **Versus O(n log n):** at n = 1,000,000, roughly 1,000,000 steps versus
  ~20,000,000. Both finish; only one is the interview answer.

## Common mistakes

- **Forgetting the `x - 1` guard.** Everything still returns the right
  answer — it just quietly becomes O(n²) and times out on big inputs. This
  is the whole problem; without the guard you haven't solved it.
- **Counting duplicates.** `[1, 1, 1]` must be `1`. The `Set` handles this
  for free; a `Map` of counts or a raw array pass does not.
- **Sorting in place.** `nums.sort(...)` mutates the caller's array. Copy
  first (`[...nums]`) if you sort at all.
- **`nums.sort()` with no comparator** — lexicographic, so `[10, 9]` stays
  `[10, 9]`. Numbers always need `(a, b) => a - b`.
- **Starting `longest` at 1.** For `[]` the answer must be `0`. Start at 0
  and let the loop raise it, rather than special-casing the empty array.
- **Walking downward as well as upward.** Harmless but redundant: if you
  only start at run starts, there is nothing below you by definition.
- **Using `indexOf` / `includes` instead of a Set.** Those scan — O(n) per
  question — which puts you right back at O(n²) or worse.
