# 📘 Learning Guide: Longest Consecutive Sequence

The problem where "obviously O(n²)" turns out to be O(n) — and where you
learn to count total work instead of counting nested loops.

## 1. The problem in plain words

You get a bag of integers in no particular order. Find the longest stretch
of numbers that go up by exactly 1 and are all present somewhere in the
bag. Report how *long* that stretch is.

```
[100, 4, 200, 1, 3, 2]

 present: 1, 2, 3, 4  ← consecutive, four of them
          100          ← alone
          200          ← alone

 answer: 4
```

The numbers don't need to be adjacent *in the array* — only their values
need to be consecutive. Duplicates don't help: `[1, 1, 1]` is a run of
length 1.

## 2. Concepts you need first

### `Set` — membership without counting

```js
const s = new Set([3, 1, 4, 1, 5]);
s.size;          // 4  — the duplicate 1 collapsed
s.has(4);        // true   O(1)
s.has(2);        // false  O(1)
for (const v of s) { /* insertion order, duplicates already gone */ }
```

A `Set` is a `Map` that only keeps keys. Two properties matter here, and
this problem needs *both*:

1. `has` is **O(1)** — instant membership, no scanning.
2. It **deduplicates automatically** — `new Set(nums)` throws away repeats
   without you writing a line.

Compare `nums.includes(x)`, which walks the array: O(n) per question. Ask
that question `n` times and you've built an O(n²) algorithm by accident.

### Set vs. Map, revisited

Problem 06 warned you that a `Set` forgets *how many*. Here that's not a
loss — it's the feature. When the question is "is this value present at
all?", a Set is exactly right. Match the structure to the question.

### Amortized / total-work counting

Look at this shape:

```js
for (const x of values) {
  while (/* something */) { /* step */ }
}
```

The reflex is "loop in a loop → O(n²)". That reflex is **wrong** when you
can prove the inner loop's total steps across *all* outer iterations is
bounded. If the inner loop runs 40 times on one outer iteration and 0 times
on the other 999, the total is still 40, not 40,000.

Learning to count total work rather than nesting depth is the single most
useful upgrade to your complexity intuition, and this problem is the
cleanest place to learn it.

## 3. How to think about it

The instinct is "sort it, then everything consecutive is adjacent". That
genuinely works and it's a fine first answer — write it if it helps. But
notice what it buys: sorting produces a complete ranking of all `n` values,
and the only question you ever ask is *"is `x + 1` here?"* You bought a
full ordering to answer a yes/no.

So drop the sort and get the yes/no directly:

> Put everything in a Set. For a number `x`, walk `x+1`, `x+2`, … as long
> as the Set has them, counting.

Now the trap: if you do that from every number, `[1,2,3,4]` gets walked
from 1, then from 2, then from 3, then from 4 — quadratic. The fix is to
notice that only *one* of those walks was useful:

> Only walk from the **start** of a run. And `x` is a start exactly when
> `x - 1` is not in the Set.

Everything else is skipped with a single O(1) check. Each run now gets
walked exactly once, from its smallest member. Say the whole plan out loud:

> Build a Set. For each value, if `value - 1` exists, skip it — someone
> else owns this run. Otherwise count upward while the next value exists.
> Keep the best count.

## 4. Common wrong turns

- **Skipping the `x - 1` guard.** The answers stay correct, so your tests
  pass and you think you're done — but you've written an O(n²) algorithm
  wearing an O(n) costume. This guard *is* the problem.
- **Using `includes` or `indexOf` for membership.** Both scan. A Set is the
  entire point.
- **Counting duplicates.** `[1,1,1]` → must be `1`. Free if you use a Set,
  a bug if you loop the raw array.
- **Starting `longest` at 1.** `[]` must return `0`. Start at 0; the loop
  raises it for any non-empty input, and you avoid a special case.
- **Mutating the input to sort it.** `nums.sort()` rearranges the caller's
  array. If you sort, sort a copy.
- **`.sort()` with no comparator.** Lexicographic on numbers — `[1,10,9]`.
  Problem 04's trap, still waiting.
- **Walking downward too.** Not wrong, just wasted: from a run start there
  is nothing below you by construction.

## 5. The solution, step by step

```js
export function longestConsecutive(nums) {
  const values = new Set(nums);        // O(1) lookups + duplicates gone
  let longest = 0;

  for (const value of values) {
    if (values.has(value - 1)) continue;   // not a run start — skip

    let current = value;
    let length = 1;
    while (values.has(current + 1)) {      // walk the run upward
      current++;
      length++;
    }

    if (length > longest) longest = length;
  }

  return longest;                          // [] → 0, no special case
}
```

Trace `[100, 4, 200, 1, 3, 2]`:

| value | `value - 1` present? | action |
|-------|----------------------|--------|
| 100 | 99? no → **start** | 101 absent → length 1 |
| 4 | 3? yes | skip |
| 200 | 199? no → **start** | 201 absent → length 1 |
| 1 | 0? no → **start** | 2 ✓ 3 ✓ 4 ✓ 5 ✗ → length **4** |
| 3 | 2? yes | skip |
| 2 | 1? yes | skip |

Three walks, six checks, answer 4. The run `1,2,3,4` was traversed exactly
once — from its smallest member, which is the only one that passes the
guard.

## 6. Complexity, gently

- **Time: O(n).** Building the Set is O(n). The outer loop runs once per
  distinct value. The inner `while` only runs for run *starts*, and it
  visits each member of that run once. Every value belongs to exactly one
  run, so the inner loop's steps across the whole outer loop add up to at
  most `n` — total, not per iteration. O(n) + O(n) = O(n).
- **Without the guard: O(n²).** For `[1..n]` you'd walk `n + (n-1) + … + 1`
  steps ≈ `n²/2`. Same answer, wildly different behaviour at scale.
- **Sorted version: O(n log n).** At a million values, ~20 million steps
  versus ~1 million.
- **Space: O(n)** for the Set. Once again you spent memory to buy speed —
  the same trade as problem 01, now buying a whole complexity class.

If you can explain out loud why the nested loop here is still linear, you
understand something that trips up a lot of people. Practise saying it.

## 7. Words you learned

- **`Set`** — a collection with O(1) membership and no duplicates.
- **Membership query** — "is this value present?" (as opposed to "how many"
  or "where").
- **Amortized analysis** — bounding the *total* work across all iterations
  instead of the worst single iteration.
- **Run / streak** — a maximal stretch of consecutive values.
- **Guard clause** — an early `continue`/`return` that skips work you can
  prove is unnecessary.

## 8. Variations to try

1. **longestConsecutiveRange(nums)** — return the run itself, e.g.
   `[1, 4]` for the classic example. Track the start value alongside the
   length.
2. **longestConsecutiveWithStep(nums, step)** — runs that go up by `step`
   instead of 1. Almost the same code; think about what the guard becomes.
3. **countRuns(nums)** — how many distinct runs are there? Notice you
   already visit each run exactly once — this is nearly free.
4. **The sorted version** — write it too, with the duplicate-skipping
   branch. Then say out loud which you'd ship and why. (Hint: "it depends
   on whether the input is already sorted" is a great interview answer.)
5. **longestConsecutiveInStream(nums)** — numbers arrive one at a time and
   you must report the current best after each. Much harder; the classic
   solution stores run lengths at the *ends* of each run in a Map. Try it
   only after the above feel easy.
