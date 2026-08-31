# Solution walkthrough — Merge Sorted Arrays

## The naive approach (and what it costs)

Glue the arrays together and let the built-in sort clean up the mess:

```js
export function mergeSorted(a, b) {
  return [...a, ...b].sort((x, y) => x - y);
}
```

This passes every test. It also throws away the single most valuable fact
you were handed: **both inputs are already sorted.** `sort` doesn't know
that, so it redoes the entire ordering job from scratch — roughly
`(n + m) · log(n + m)` comparisons. Merging two 1,000,000-element arrays
costs about 40,000,000 comparisons to rebuild order that already existed,
instead of the 2,000,000 the structure entitles you to.

There's a second trap hiding in that one-liner: `.sort()` *without* a
comparator sorts **lexicographically**, as if everything were a string. So
`[1, 5, 10].sort()` gives `[1, 10, 5]`. Numbers always need
`(x, y) => x - y`.

## The insight

Picture the two arrays as two face-up piles of cards, each pile sorted with
the smallest card on top. To build one combined sorted pile you never need
to look deeper than the two top cards, because:

> **The smaller of the two top cards is the smallest card left anywhere.**

Why is that guaranteed? Take the smaller top, call it `x`. Everything else
in `x`'s own pile sits *behind* `x`, and that pile is sorted, so all of it
is `>= x`. And `x` just beat the other pile's top, which by the same
argument is the smallest thing in *that* pile. Nothing unplaced can be
smaller than `x`. Take it, and repeat.

That is the whole algorithm. Two bookmarks, one comparison per output
element, no searching, no re-sorting.

## The real approach, step by step

1. Make an empty `merged` array for the output.
2. Make two indexes: `i = 0` (next unread slot in `a`), `j = 0` (same for
   `b`). These are your two **pointers**.
3. `while (i < a.length && j < b.length)` — while *both* still have cards:
   - If `a[i] <= b[j]`, push `a[i]` and do `i++`.
   - Otherwise push `b[j]` and do `j++`.
   - Advance **only** the index you took from. Advancing both is the
     classic bug: it silently drops elements.
4. Exactly one array is now exhausted. The other's leftovers are already
   sorted *and* are all `>=` everything you've placed, so append them
   as-is: `while (i < a.length) merged.push(a[i++]);` and the mirror loop
   for `b`. Only one of the two loops does any work — writing both is
   simpler than working out which.
5. Return `merged`.

Ties (`a[i] === b[j]`) are handled by the `<=`: take from `a` first. Either
choice is correct here since the values are equal, but committing to one
makes the merge **stable** — a property you'll want in problem 21
(merge-sort), where these same elements carry other data along.

## Complexity

- **Time: O(n + m).** Every loop iteration pushes exactly one element into
  `merged`, and `merged` ends with `n + m` elements — so there are exactly
  `n + m` iterations across all three loops. Each does one comparison and
  one push. Compare with concat-and-sort's `(n + m) log(n + m)`: for a
  million elements per side, ~2 million steps versus ~40 million.
- **Space: O(n + m)** for the output array, which the problem asks for.
  Beyond that you use **O(1)** extra space: two integer bookmarks, no
  matter how big the arrays get. Note the difference between "space the
  answer occupies" and "scratch space the algorithm needs" — interviewers
  usually mean the second.

## Common mistakes

- **Advancing both pointers after one push.** You lose an element per tie
  and the output comes out short. Advance only the side you consumed.
- **Forgetting the leftovers.** If you stop when the first array empties
  and return, `mergeSorted([1], [2, 3, 4])` returns `[1, 2]`. The drain
  loops are not optional.
- **Using `while (i < a.length || j < b.length)` for the main loop.** Now
  the body has to handle `a[i]` being `undefined`, and `undefined <= 5` is
  `false` — quietly wrong. Loop on `&&`, drain afterwards.
- **Mutating an input** with `a.push(...)` or `a.splice(...)`. The caller
  still owns those arrays; hand back a new one.
- **Returning an input array directly** when the other side is empty
  (`if (!b.length) return a;`). It looks like a nice shortcut, but now the
  caller's array and your "result" are the same object, so later edits to
  one show up in the other. Return `[...a]` if you want that shortcut.
- **`.sort()` without a comparator** — lexicographic, so `10` sorts before
  `9`. Even in the naive version, always pass `(x, y) => x - y`.
