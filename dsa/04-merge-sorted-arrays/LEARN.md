# 📘 Learning Guide: Merge Sorted Arrays

Your first **two-pointer** algorithm — and the engine room of merge sort,
which you'll build yourself in problem 21.

## 1. The problem in plain words

You have two lists of numbers. Each one is already sorted, smallest to
largest. Produce one new list with everything from both, still sorted.

```
a = [1, 3, 5]
b = [2, 4, 6]

           →  [1, 2, 3, 4, 5, 6]
```

The catch: you must *use* the fact that they're already sorted. Dumping
both into one array and calling `.sort()` gets the right answer while
learning you nothing — and does far more work than necessary.

## 2. Concepts you need first

### What "already sorted" actually buys you

Sortedness is information, and information saves work. In an unsorted
array, "what's the smallest element?" costs a full scan — O(n). In a sorted
array it's `arr[0]` — O(1), free. Whenever a problem hands you sorted
input, ask: *what do I now get for free?*

### A pointer is just a bookmark

"Pointer" sounds intimidating; in JavaScript it is a plain number variable
holding an index:

```js
let i = 0;        // I've read everything before index 0 (i.e. nothing)
console.log(a[i]) // the next unread element
i++;              // done with that one; move the bookmark
```

"Two pointers" means two of those bookmarks moving independently. That's
the whole technique. What makes it powerful is that each pointer only ever
moves *forward*, so the total number of steps is bounded by the array
lengths.

### Reading past the end is silent

```js
const a = [1, 2];
a[5];             // undefined — no error, no warning
undefined <= 1;   // false
undefined + 1;    // NaN
```

JavaScript won't stop you from walking off the end of an array; it hands
you `undefined` and lets the comparison quietly do the wrong thing. This is
why the bounds checks (`i < a.length`) in a two-pointer loop matter so
much.

### `push` builds, spread copies

```js
const out = [];
out.push(7);            // out is now [7]
const copy = [...a];    // brand-new array with the same contents
copy === a;             // false — different objects
```

`push` appends to the end in O(1). When a problem says "return a **new**
array", it means the caller's arrays must be untouched — build a fresh one
and `push` into it.

## 3. How to think about it

Deal yourself two piles of cards, each sorted with the smallest face-up on
top. Now physically merge them into one sorted pile. What do you actually
do?

You look at the two top cards, take the smaller one, put it down, and look
again. You never dig into the middle of a pile. Say it out loud:

> Compare the fronts. Take the smaller. Advance only that side. Repeat
> until one side is empty, then dump the rest of the other side on top.

Why is taking the smaller front always safe? Suppose `a`'s front is the
smaller of the two. Everything else in `a` sits behind it in a sorted
array, so it's all bigger. And it beat `b`'s front, which is the smallest
thing in `b`. So nothing unplaced anywhere is smaller. It's genuinely the
next element of the answer — no lookahead, no regret.

Once one pile is empty, there's nothing left to compare against, and the
other pile is already in order. Pour it on.

## 4. Common wrong turns

- **Advancing both pointers after one push.** Easy to type `i++; j++;` out
  of symmetry. You push one element but consume two, so elements vanish.
  Advance only the side you took from.
- **Forgetting the leftovers.** The main loop stops the moment *one* array
  empties, and the other may still be half full. `mergeSorted([1], [2,3,4])`
  returning `[1, 2]` is this bug.
- **Looping with `||` instead of `&&`.** `while (i < a.length || j < b.length)`
  runs while *either* has cards — so the body compares `a[i]` when `a` is
  exhausted, and `undefined <= 5` is `false`, silently taking from the
  wrong side. Loop on `&&`, drain afterwards.
- **Mutating the inputs.** `a.push(...)` or `a.shift()` edits the caller's
  array. (`shift()` has a second problem: it re-indexes the whole array
  each call, turning an O(n) algorithm into O(n²).)
- **Returning an input array as a shortcut.** `if (b.length === 0) return a;`
  hands back the caller's own array — now two variables point at one
  object and later edits leak between them.

## 5. The solution, step by step

```js
export function mergeSorted(a, b) {
  const merged = [];
  let i = 0;                         // next unread index in a
  let j = 0;                         // next unread index in b

  while (i < a.length && j < b.length) {   // both still have cards
    if (a[i] <= b[j]) {
      merged.push(a[i]);
      i++;                           // advance ONLY the side we took from
    } else {
      merged.push(b[j]);
      j++;
    }
  }

  while (i < a.length) { merged.push(a[i]); i++; }   // drain leftovers:
  while (j < b.length) { merged.push(b[j]); j++; }   // only one loop runs

  return merged;
}
```

Trace `mergeSorted([1, 2, 2], [2, 3])` by hand:

| i | j | a[i] | b[j] | take | merged |
|---|---|------|------|------|--------|
| 0 | 0 | 1 | 2 | a (1 ≤ 2) | [1] |
| 1 | 0 | 2 | 2 | a (2 ≤ 2, tie) | [1,2] |
| 2 | 0 | 2 | 2 | a (tie again) | [1,2,2] |
| 3 | 0 | — | 2 | main loop ends (i is off the end of a) | [1,2,2] |
| — | 0 | | | drain b: push 2, push 3 | [1,2,2,2,3] |

Notice the `<=`: on a tie we take from `a`. Any choice is *correct* (the
values are equal), but always preferring `a` makes the merge **stable** —
equal elements keep their original relative order. That matters in problem
21, where the numbers you're merging carry other data along for the ride.

## 6. Complexity, gently

- **Time: O(n + m).** Every iteration of every loop pushes exactly one
  element, and the result holds exactly `n + m` elements — so there are
  exactly `n + m` iterations in total. Linear in the combined size, and you
  cannot do better: you have to at least *write* every element once.
- **Concat-and-sort: O((n+m) log(n+m)).** For a million elements per side
  that's ~40 million comparisons versus ~2 million. Same answer, twenty
  times the work, because `sort` isn't told what you already know.
- **Space: O(n + m)** for the returned array — unavoidable, it *is* the
  answer. Extra scratch space beyond the output: **O(1)**, just two integer
  bookmarks. That distinction ("output space" vs "auxiliary space") is
  worth naming out loud in an interview.

## 7. Words you learned

- **Two pointers** — two indexes walking a structure, each advancing on its
  own schedule.
- **Merge** — combining sorted sequences into one sorted sequence.
- **Stable** — equal elements keep their original relative order.
- **Auxiliary space** — memory used *beyond* the output. Here: O(1).
- **In bounds** — index is `>= 0` and `< length`; outside that, JS gives
  you `undefined` instead of an error.
- **Drain / flush** — appending the remainder after the main loop ends.

## 8. Variations to try

1. **mergeDedup(a, b)** — same merge, but the output has no repeats:
   `mergeDedup([1,2,2],[2,3])` → `[1,2,3]`. Hint: skip a push when the
   value equals the last thing in `merged`.
2. **mergeDesc(a, b)** — both inputs sorted *descending*; output descending.
   One character changes. Find it.
3. **mergeK(arrays)** — merge an array of sorted arrays by folding:
   `arrays.reduce(mergeSorted, [])`. Then reason about why merging them
   pairwise in a tournament is faster than one at a time (this is the seed
   of problem 21).
4. **mergeInPlace(a, m, b, n)** — the LeetCode variant: `a` has `n` spare
   slots at the end, and you must merge `b` into it *without* extra space.
   Trick: fill from the **back**, largest first, so you never overwrite an
   element you still need. Genuinely harder — try it after the above.
5. **intersect(a, b)** — same two-pointer walk, but only emit values that
   appear in *both*. Advance the smaller side; on a tie, emit and advance
   both. (Here advancing both is correct — notice why.)
