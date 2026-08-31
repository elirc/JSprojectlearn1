# 📘 Learning Guide: Permutations (backtracking)

How to explore every possibility without losing track of where you are.

## 1. The problem in plain words

Given `[1, 2, 3]`, list every order they can be written in: `[1,2,3]`,
`[1,3,2]`, `[2,1,3]`, `[2,3,1]`, `[3,1,2]`, `[3,2,1]`.

Six of them. Four values give 24, five give 120, six give 720. The pattern is
`n!` ("n factorial", `n × (n-1) × ... × 1`) — `n` choices for the first slot,
then `n-1` left for the second, then `n-2`, and so on.

Your job is to produce all of them. The order they come out in doesn't matter;
only the order *within* each one does.

## 2. Concepts you need first

- **Recursion with a base case (dsa/21).** Same two-part shape as merge sort:
  an input small enough to answer outright, and a recursive case that calls
  itself on something smaller. Here "smaller" means *fewer slots left to fill*.
- **The call stack (dsa/13).** Valid-parentheses taught you a stack — push on
  the way in, pop on the way out, each pop matching the most recent push. The
  recursion here does exactly that, and you'll run a second stack (`current`)
  in lockstep with it: every `push` before a recursive call gets a matching
  `pop` after it. If that pairing breaks, so does your answer.
- **References vs. copies.** `const b = a;` for an array copies nothing — `b`
  and `a` name one object; `[...a]` makes a genuine copy. Usually a footnote,
  here it's the difference between working code and `n!` empty arrays.
- **Counting the work (dsa/19).** Here the honest count is "a factorial
  number," and part of the lesson is recognizing when that's unavoidable.

## 3. How to think about it

Picture `n` empty slots to fill, left to right: `[ _ , _ , _ ]`, with values
`{1,2,3}` available.

For slot 0 you have three candidates. Pick `1`, and you're staring at
`[ 1 , _ , _ ]` with `{2,3}` available — *the same problem*, one size smaller.
That's your recursion; when no slots are left, you're holding a permutation.

The tree of every choice looks like this:

```
                         [ ]
          ┌───────────────┼───────────────┐
       choose 1        choose 2        choose 3
          │               │               │
         [1]             [2]             [3]
       ┌──┴──┐         ┌──┴──┐         ┌──┴──┐
      c2    c3        c1    c3        c1    c2
     [1,2] [1,3]     [2,1] [2,3]     [3,1] [3,2]
       │     │         │     │         │     │
      c3    c2        c3    c1        c2    c1
   [1,2,3][1,3,2]  [2,1,3][2,3,1]  [3,1,2][3,2,1]
     SAVE   SAVE      SAVE   SAVE      SAVE   SAVE
```

Six leaves, six permutations. Now the key question: **how do you walk that
tree without building a new array at every node?** Keep *one* array,
`current`, and rewind it — push on the way down, pop on the way back up. Here
is the real trace of the leftmost branch:

```
  choose 1  -> current = [1]
    choose 2  -> current = [1,2]
      choose 3  -> current = [1,2,3]   SAVE
    un-choose 3 -> current = [1,2]
    un-choose 2 -> current = [1]
    choose 3  -> current = [1,3]
      choose 2  -> current = [1,3,2]   SAVE
    un-choose 2 -> current = [1,3]
    un-choose 3 -> current = [1]
  un-choose 1 -> current = []
```

By the time a call returns it has put `current` back exactly as it found it.
That contract is what lets every sibling branch start from a clean slate, and
it has a name: **backtracking**.

You also need to know which values are still available: a `used` array of
booleans, one per input index, flipped `true` on the way down and `false` on
the way up — in perfect step with the pushes and pops.

## 4. Common wrong turns

- **Saving `current` instead of a copy of it.** `out.push(current)` puts a
  *reference* in the results, so all `n!` entries point at one array, which is
  rewound to empty before you return — you get `[[], [], [], ...]`. Push
  `[...current]`. This is the bug this problem is famous for.
- **Forgetting the un-choose, or doing only half of it.** Drop `current.pop()`
  and `current` only grows; drop `used[i] = false` and each branch permanently
  burns a value. Doing one but not the other is worst of all — the two pieces
  of state drift apart and the bug looks random.
- **Un-choosing before exploring.** Both undo lines go *after* the recursive
  call. Put them before and you've cancelled the choice you were about to
  explore.
- **Returning `[]` for the empty input.** `permutations([])` is `[[]]` — one
  permutation, which happens to be empty. A correct base case produces that on
  its own; if you're special-casing it, look at your base case instead.
- **Tracking used *values* rather than *indices*.** `current.includes(arr[i])`
  works here, costs O(n) per candidate, and silently breaks the day the input
  has duplicates. Index flags cost O(1) and always mean the right thing.
- **Splicing values out of `arr` and back in.** A real technique, but it
  mutates the caller's array, and one missed restore corrupts every branch
  below it.

## 5. The solution, step by step

**Step 1 — set up the shared state** in the outer function:

```js
const out = [];
const current = [];
const used = new Array(arr.length).fill(false);
```

**Step 2 — declare an inner recursive function**, `backtrack()`, closing over
all three. It needs no parameters; the shared, rewound state *is* the design.

**Step 3 — the base case.** `current` is full, so it's a complete answer:

```js
if (current.length === arr.length) {
  out.push([...current]);
  return;
}
```

The spread is not optional — `current` is about to be popped back down to
nothing, so snapshot it now.

**Step 4 — the recursive case.** Loop over every index, skip the used ones,
and run the three-beat rhythm on each candidate:

```js
for (let i = 0; i < arr.length; i++) {
  if (used[i]) continue;

  used[i] = true;          // CHOOSE
  current.push(arr[i]);

  backtrack();             // EXPLORE

  current.pop();           // UN-CHOOSE
  used[i] = false;
}
```

Read the choose and un-choose blocks as mirror images — same two facts, set
then cleared, in reverse order. Every backtracking problem you write later,
you'll check by looking for exactly that symmetry.

**Step 5 — kick it off** with `backtrack();` and `return out;`. Notice nothing
special happens for `arr = []`: `current.length` and `arr.length` are both
`0`, the base case fires immediately, and `out` becomes `[[]]`.

Run the tests: `node --test dsa/23-permutations-backtracking/attempt.test.js`.

## 6. Complexity, gently

This is the first problem in the track where **the answer itself is the
bottleneck**, and that changes how you think about speed. There are `n!`
permutations, each an array of `n` values you must copy out, so just *writing
down* the answer costs O(n × n!) before any algorithm is involved. No
cleverness beats that. Feel the scale:

```
   n = 5      120 permutations        instant
   n = 8       40,320                 instant
   n = 10   3,628,800                 noticeable
   n = 13   6,227,020,800             not happening
```

So O(n × n!) is essentially optimal, and what's worth grading yourself on is
not speed but **working space**: `current` holds at most `n` values, `used`
holds `n` booleans, the call stack is `n` frames deep — O(n) total, however
many results stream out. Passing a fresh "remaining values" array down every
branch would also be correct, and would allocate millions of throwaway arrays.
The push/pop discipline is what buys you O(n). Keep those two numbers separate
from now on: **space the algorithm needs** versus **space the answer
occupies**. Only the first one you chose.

The real payoff isn't this problem, though — it's the shape. Subsets,
combinations, N-queens, sudoku, and word-search solvers are all
choose-explore-unchoose. Most add one line: a check, before choosing, that the
branch could still lead somewhere valid. That's **pruning**, and it's what
makes an N-queens solver finish in a reasonable lifetime.

## 7. Words you learned

- **Permutation** — an arrangement of all of a set's elements in some order.
- **Factorial (`n!`)** — `n × (n-1) × ... × 1`; how many permutations exist.
- **Backtracking** — build a partial solution, explore, then undo the last
  choice and try the next one.
- **Choose / explore / un-choose** — the three-beat rhythm of every
  backtracking loop.
- **Search tree** — the tree of all partial solutions; leaves are complete
  answers, and backtracking is a depth-first walk of it.
- **Pruning** — refusing to explore a branch you can prove is hopeless.
- **Shared mutable state** — one `current` array reused across the whole
  search, safe only because every call restores what it borrowed.

## 8. Variations to try

1. Generate all **subsets** (the power set). Same skeleton, one change: at each
   index you choose *include it or skip it*, and every node of the tree is an
   answer, not just the leaves. There are 2ⁿ.
2. Handle **duplicate inputs** — `permutations([1, 1, 2])` should give 3
   orderings, not 6. Sort first, then skip index `i` when
   `arr[i] === arr[i - 1] && !used[i - 1]`. Work out why that's the right
   condition; it's subtler than it looks.
3. Generate **combinations**: all `k`-element selections where order doesn't
   matter. Pass a `start` index down so you never look backwards.
4. Make it **lazy** with a generator (`function*` / `yield`) so the caller can
   pull one at a time and stop early. `n = 13` becomes fine as long as nobody
   asks for all of them — the only real answer to factorial output.
5. Solve **N-queens** for `n = 8`: permutations of `[0..7]` are exactly the
   ways to place one queen per row and column, so only diagonals can clash.
   Then move the check *into* the search and count nodes visited either way.
