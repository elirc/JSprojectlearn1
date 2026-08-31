# DSA track — 30 problems (solve it yourself!)

This track is different from the others: instead of *reading* a flawed
original and a refactor, **you write the code**. Each problem gives you a
stub file and a test suite that switches itself on as soon as you start
implementing. Data structures & algorithms are interview classics, but
they're here because they make you *fluent* — loops, recursion, and data
shapes stop costing brain power.

## How to work a problem

1. Read `README.md` — the problem, examples, and graded hints.
2. Read `LEARN.md` if the technique is new to you (it teaches it from scratch).
3. Implement in `attempt.js` (delete the `TODO` line and write your code).
4. Run the tests: `node --test dsa/01-two-sum/attempt.test.js`
   (they auto-skip while the TODO marker is still in the file).
5. Stuck? Take one more hint. Still stuck? Read `SOLUTION.md` — the full
   approach walkthrough — then implement it *from memory*, not by copying.
6. Compare with `solution/solution.js` (its own tests always pass:
   `node --test dsa/01-two-sum/solution/solution.test.js` — pass the file,
   not the folder; on Windows, `node --test <folder>` can misfire).

Everything runs offline with Node. `npm test` at the repo root stays green
even with unsolved problems (unsolved tests skip, they don't fail).

## The curriculum

| # | Problem | Technique |
|---|---------|-----------|
| 01 | two-sum | Arrays, hashmap lookup — the "trade memory for speed" move |
| 02 | reverse-string-words | String/array manipulation, edge cases |
| 03 | max-subarray | Kadane's algorithm — carrying the best-so-far |
| 04 | merge-sorted-arrays | Two-pointer merging |
| 05 | move-zeroes | In-place array editing, write pointer |
| 06 | anagram-check | Counting characters (js#02's skill, weaponized) |
| 07 | first-unique-char | Hashmap counting, two passes |
| 08 | group-anagrams | Hashmap with computed keys |
| 09 | longest-consecutive-sequence | Set membership, O(n) thinking |
| 10 | valid-palindrome-two-pointers | Two pointers from both ends |
| 11 | container-most-water | Two pointers, greedy narrowing |
| 12 | longest-substring-no-repeat | Sliding window |
| 13 | valid-parentheses | Stack — matching things that nest |
| 14 | min-stack | Stack with extra bookkeeping |
| 15 | queue-with-two-stacks | Amortized cost, structure from structure |
| 16 | build-linked-list | Nodes and pointers from scratch |
| 17 | reverse-linked-list | Pointer surgery — THE linked-list rite of passage |
| 18 | detect-cycle | Floyd's tortoise & hare |
| 19 | binary-search | Halving; the off-by-one minefield |
| 20 | search-rotated-array | Binary search with a twist |
| 21 | merge-sort | Divide & conquer recursion |
| 22 | quick-select-kth | Partitioning, average-case reasoning |
| 23 | permutations-backtracking | Backtracking — choose, explore, un-choose |
| 24 | tree-traversals | Pre/in/post-order, BFS level order |
| 25 | validate-bst | Passing constraints down a recursion |
| 26 | max-depth-and-diameter | Returning info up a recursion |
| 27 | islands-count | Grid DFS/BFS flood fill |
| 28 | course-schedule | Graph cycle detection / topological sort |
| 29 | top-k-frequent | Heaps (hand-built) and bucket tricks |
| 30 | coin-change | Dynamic programming intro — table of subanswers |

Do them in order — each technique builds on the previous ones, and later
LEARN.md files assume the earlier ones.

## The rules of getting good

- **Struggle is the workout.** 20 minutes of being stuck teaches more than
  an hour of reading solutions. Take hints one at a time.
- **Say the plan out loud before coding.** If you can't say it, you can't
  code it.
- **After solving: state the time and space complexity.** Every SOLUTION.md
  shows how.
- **Re-solve from scratch two days later.** If it flows, you own it.
