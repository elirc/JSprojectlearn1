# Solution walkthrough — Permutations (backtracking)

## The naive approach and its cost

The first instinct is usually **nested loops**: one loop per position.

```js
for (const a of arr)
  for (const b of arr)
    for (const c of arr)
      if (a !== b && a !== c && b !== c) out.push([a, b, c]);
```

That is correct for exactly three elements. The fatal flaw isn't speed — it's
that the *number of loops* has to equal `n`, and `n` isn't known until runtime.
You cannot write a fixed stack of `for` loops for an array whose length varies.
Any attempt lands you in code generation or a hand-rolled counter.

The second instinct is **shuffle-and-collect**: generate random orderings and
add the new ones to a Set until you have `n!` of them. This terminates, but it
is a coupon-collector problem — the last few permutations take enormous numbers
of attempts — and it needs randomness, so your tests stop being reproducible.

What both attempts are groping toward: you need a loop structure whose *depth*
is decided at runtime. That is what recursion is for.

## The insight

**A permutation is a sequence of choices, and recursion can hold one choice
per stack frame.**

Think of `n` empty slots. Filling slot 0 means choosing one of `n` values.
Whatever you choose, filling the *remaining* slots is the same problem with one
fewer value available. So one function, calling itself, with the recursion
depth equal to `n` — a stack of loops built at runtime rather than in source.

The second half of the insight is about *state*. The obvious way to write it is
to pass a fresh "remaining values" array down every call. That works, but it
allocates a new array at every node of a tree with `n!` leaves. Instead, keep
**one shared `current` array** and mutate it — push before recursing, pop after.
Popping is what makes the sharing safe: by the time a call returns, it has
restored `current` to exactly the state it was handed. That discipline is
**backtracking**, and it is the entire idea:

```
CHOOSE    push the value, mark it used
EXPLORE   recurse — it handles everything below this point
UNCHOOSE  pop the value, unmark it   <- restores the caller's world
```

Because `current` gets rewound, saving a finished permutation means saving a
**copy**. Push `current` itself and you push a reference to an array that is
about to be emptied.

## The approach, step by step

1. **Set up three pieces of state** in the outer function: `out` (the results),
   `current` (the ordering being built), and `used` — a boolean per *index*
   of the input, recording what's already placed.
2. **Write an inner recursive function** — `backtrack()` — that closes over all
   three. Nothing needs to be passed as an argument; the shared state is the
   point.
3. **Base case:** `if (current.length === arr.length)`. Every slot is filled,
   so `current` is a complete permutation. `out.push([...current]); return;`
4. **Recursive case:** loop `i` from `0` to `arr.length - 1`. Skip any `i`
   where `used[i]` is already true — that value is placed further up this
   branch. For the rest, run choose / explore / un-choose.
5. **Kick it off** with a single `backtrack()` call, then `return out`.

Why track `used` by **index** and not by value? Because indices are always
unique even when values aren't. This problem promises distinct values, but the
index-based version is the one that survives contact with duplicates later —
and it avoids an O(n) `current.includes(...)` scan on every candidate.

The empty-array case needs no special handling: `current.length` is `0`,
`arr.length` is `0`, the base case fires immediately, and `out` becomes
`[[]]` — exactly right.

## Complexity

- **Time O(n × n!).** There are `n!` permutations and each one costs O(n) to
  copy into the output. The internal tree has more nodes than leaves — roughly
  `n! · e` of them — but that's a constant factor, so the copying dominates.
- **Space O(n) of working state**, and that is the number worth noticing:
  `current` is one array of length ≤ n, `used` is one array of length n, and
  the call stack is n frames deep. The backtracking discipline is what keeps
  it at O(n) instead of allocating fresh arrays down every branch.
- **Output space O(n × n!)**, which is not the algorithm's fault — the caller
  asked for that much data. Always separate "space my algorithm needs" from
  "space the answer occupies"; only the first one is a design choice.

There is no faster algorithm hiding here, and it's worth internalizing why:
producing `n!` arrays takes at least `n!` steps no matter how clever you are.
At n = 10 that's 3.6 million results; at n = 13 it's over 6 billion. If a
problem's *output* is exponential, the only real optimization is not producing
all of it — which is what the pruning variants (N-queens, sudoku) do.

## Common mistakes

- **Pushing `current` instead of `[...current]`.** The single most common bug
  in this problem. You get `n!` entries in `out` that are all the same array
  object, and since `current` ends up empty, they all read as `[]`. The "each
  permutation is its own array" test exists to catch precisely this.
- **Forgetting to un-choose.** Leave out `current.pop()` or `used[i] = false`
  and the state leaks sideways into the next loop iteration. You get far too
  few results, and the ones you get are wrong lengths.
- **Un-choosing in the wrong order or place.** Both undo lines belong *after*
  the recursive call, in the same iteration that made the choice. Putting them
  before the recursion undoes the choice you're about to explore.
- **Returning `[]` for an empty input.** `permutations([])` is `[[]]`. Special
  casing `arr.length === 0` to return `[]` is both wrong and unnecessary.
- **Tracking used values instead of used indices.** `current.includes(arr[i])`
  costs O(n) per candidate and breaks the moment the input has duplicates.
- **Mutating the input array.** Building the answer by `splice`-ing values out
  of `arr` and putting them back works, but one missed restore corrupts
  everything below it — and it violates the contract. Read `arr`; never write.
- **Assuming the outer order is fixed.** The permutations may come out in any
  order. If you sort the *inside* of a permutation to make a test pass, you
  have destroyed the answer.
