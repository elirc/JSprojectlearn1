# 📘 Learning Guide: Merge Sort

How to sort anything fast by trusting a smaller version of yourself.

## 1. The problem in plain words

You get an array of numbers in any order. Produce a new array with the same
numbers arranged from smallest to largest — without using the built-in
`.sort()`, and without touching the original array.

Sorting by hand is easy for 5 numbers. The interesting question is: what
*procedure* sorts 5 numbers, 5,000 numbers, and 5,000,000 numbers, all with
the same code, and doesn't slow to a crawl on the big one?

## 2. Concepts you need first

- **Two-pointer merging (dsa/04).** Given two arrays that are *each already
  sorted*, you can weave them into one sorted array in a single pass: keep
  one finger on the front of each, repeatedly take the smaller of the two
  fronts. Merge sort is 80% this — go re-read your dsa/04 solution.
- **Halving (dsa/19).** Binary search taught you that repeatedly cutting a
  problem in half gets you to size 1 in about log₂ n steps. 1,000,000
  elements → only ~20 halvings. That "log n levels" picture returns here.
- **Recursion — a function calling itself.** You've brushed against it, but
  merge sort is where it clicks, so here is the mental model spelled out:

  A recursive function has two parts:
  1. A **base case**: an input so small the answer is trivial, returned
     directly, no self-call. (Here: arrays of length 0 or 1.)
  2. A **recursive case**: solve the input by calling *yourself* on a
     strictly **smaller** input, then doing a bit of work with the result.

  The rule that makes recursion usable: **never trace the inner calls.**
  When you write `const left = mergeSort(firstHalf)`, treat that line as
  calling a library function that is documented to return a sorted copy.
  It happens to be you — irrelevant. This is called *trusting the
  recursion* (or "the recursive leap of faith").

## 3. How to think about it

Imagine sorting a shuffled deck of 8 cards with a friend:

1. You split the deck: 4 cards for you, 4 for your friend.
2. You each somehow sort your own little pile.
3. You merge: both piles face-up, repeatedly take the smaller top card.

Step 3 you already know (dsa/04). Step 2 is the trick — "somehow sort your
own pile." But your pile of 4 can be sorted the *same way*: split into
2 and 2, sort each, merge. And a pile of 2? Split into 1 and 1 — and a pile
of **one card is already sorted**. The problem bottoms out by itself.

Draw the picture for `[5, 2, 8, 1]`:

```
        [5, 2, 8, 1]            split
        /          \
    [5, 2]        [8, 1]        split
    /    \        /    \
  [5]    [2]    [8]    [1]      base cases — already sorted!
    \    /        \    /
    [2, 5]        [1, 8]        merge
        \          /
        [1, 2, 5, 8]            merge
```

Splitting goes down; merging comes back up. **All the actual sorting work
happens in the merges.** The splits just chop the problem into pieces small
enough that "sorted" is automatic.

## 4. Common wrong turns

- **Trying to trace the whole recursion tree in your head.** For length 8
  that's 15 calls; you will lose the thread and conclude recursion is
  magic. Don't trace. Check three things instead: (1) the base case is
  right, (2) each call is on a *smaller* array, (3) *assuming* the two
  recursive results are sorted, your merge produces a sorted whole. If all
  three hold, the function is correct — that's induction, quietly.
- **Base case `length === 0` only.** Then `mergeSort([7])` splits into
  `[]` and `[7]` — and recursing on `[7]` repeats forever. Stack overflow.
  The base case must catch length 1.
- **Merging with concat.** `[...left, ...right]` puts the halves side by
  side; it doesn't interleave them. `[2,5]` + `[1,8]` must become
  `[1,2,5,8]`, not `[2,5,1,8]`.
- **Forgetting merge leftovers.** When one half runs dry, the other still
  has elements — append them, they're already in order.
- **Sorting in place "to save memory."** In-place merge sort is genuinely
  hard (real libraries jump through hoops for it). Here the contract is
  explicitly "return a new array" — take the easy road.

## 5. The solution, step by step

**Step 1 — base case.** Length 0 or 1: return a copy.

```js
if (arr.length <= 1) return [...arr];
```

(`[...arr]` and not `arr`, so the caller never receives our input aliased.)

**Step 2 — split.** Find the midpoint, slice two halves. `slice` already
copies, so the original is never touched.

```js
const mid = Math.floor(arr.length / 2);
```

**Step 3 — recurse on both halves and trust the results.**

```js
const left = mergeSort(arr.slice(0, mid));
const right = mergeSort(arr.slice(mid));
```

From this line on, `left` and `right` are sorted. Period. Don't look down.

**Step 4 — merge (the dsa/04 move).** Two pointers `i`, `j` starting at 0.
Loop while both are in range: push the smaller of `a[i]`/`b[j]`, advance
that pointer. Use `<=` so ties take from the left half first (that keeps
equal elements in their original order — "stability"). Afterwards, append
whichever side still has elements.

**Step 5 — return the merged array.** That's the sorted result for this
level, which the level above will merge with its sibling, and so on up.

Run the tests: `node --test dsa/21-merge-sort/attempt.test.js`.

## 6. Complexity, gently

Look at the diagram in section 3 as *levels*:

- Level 0: one array of 8. Level 1: two arrays of 4. Level 2: four of 2.
  Level 3: eight of 1. Halving means there are about **log₂ n levels**
  (same reason binary search takes log n steps).
- Now count merge work per level: level 3→2 merges 8 elements total,
  level 2→1 merges 8 total, level 1→0 merges 8 total. **Every level
  touches each element once: O(n) per level.**

O(n) work × O(log n) levels = **O(n log n) time**. For n = 1,000,000:
n² ≈ 10¹² steps, n log n ≈ 2×10⁷. That's the difference between "hours"
and "instant."

**Space O(n):** the slices and merged outputs. (Compare: your dsa/05 and
dsa/10 tricks were O(1) space — sorting this way pays memory for speed.)

## 7. Words you learned

- **Divide & conquer** — split the problem, solve pieces recursively,
  combine the piece-answers.
- **Base case** — the input small enough to answer directly; every
  recursion must reach one.
- **Recursive case** — solving by calling yourself on smaller input.
- **Trusting the recursion** — treating your own recursive call as a
  black box that honors its contract; the only sane way to write recursion.
- **Merge** — weaving two sorted sequences into one, in linear time.
- **Stable sort** — equal elements keep their original relative order.
- **O(n log n)** — the running time of good comparison sorts; n work
  across each of log n halving levels.

## 8. Variations to try

1. Sort **descending** by flipping one comparison. Which line?
2. Make it generic: `mergeSort(arr, compare)` taking a comparator like the
   built-in sort's `(a, b) => a - b`. Now sort an array of `{name, age}`
   objects by age.
3. Write `merge` as a standalone exported function with its own tests
   (you basically re-create dsa/04).
4. Count **inversions**: pairs `i < j` with `arr[i] > arr[j]`. A tiny
   addition inside merge counts them all in O(n log n) — a classic
   interview follow-up.
5. Hybrid: for subarrays under ~10 elements, use insertion sort instead of
   recursing further (this is what real libraries do). Measure with
   `console.time` whether it helps at n = 100,000.
