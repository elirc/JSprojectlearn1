# 📘 Learning Guide: Binary Search

Throwing away half the possibilities with a single comparison — and the handful of off-by-one details that decide whether it works.

## 1. The problem in plain words

You have a sorted array, like `[1, 3, 5, 7, 9]`, and a value you're
looking for. Return where it is, or `-1` if it isn't there.

Checking every element works and is boring. Because the array is
**sorted**, you can do enormously better: look at the middle element
and one of three things is true.

- It *is* the target — done.
- It is **smaller** than the target — then every element to its left is
  smaller too, so the answer, if any, is to the right.
- It is **bigger** — the answer, if any, is to the left.

One comparison eliminates half the array. Repeat on what's left. That
is the whole algorithm, and it is exactly how you'd find a name in a
phone book, or play "guess my number between 1 and 100".

The difficulty is not the idea. It is writing the loop so that it
checks every candidate exactly once and always terminates.

## 2. Concepts you need first

- **Sorted order** — the precondition that makes everything work. Break
  it and binary search returns wrong answers *silently*.
- **Array indexes** — valid positions run `0` to `length - 1`. Indexes
  must be whole numbers; `nums[1.5]` is `undefined`, not an error.
- **`Math.floor`** — rounds down, so `Math.floor(1.5) === 1`. This is
  how the middle of an even-sized window becomes a legal index.
- **Loop invariants** — from `12-longest-substring-no-repeat` and
  `14-min-stack`: a statement that stays true after every turn. Today's
  is the star of the show.
- **Two pointers over an array** — `10-valid-palindrome-two-pointers`
  and `11-container-most-water` moved `low` and `high` inward from the
  ends. Same shape here, but the jumps are big.

## 3. How to think about it

**Play the game first.** I'm thinking of a number from 1 to 100. You
guess 50; I say "higher". You have just eliminated fifty numbers with
one question. You guess 75, I say "lower" — you're down to 51..74. Seven
questions gets you to any number in 100; ten gets you to 1000. That
feeling — *questions grow much slower than the range* — is what O(log n)
means, and you already have the intuition.

**Now the bookkeeping**, which is where the real work is. Represent
"what's still possible" with two indexes:

```
nums:  [1, 3, 5, 7, 9]
        ^low        ^high      window = the whole array
```

State the promise you intend to keep:

> **If `target` is in the array, its index is between `low` and `high`,
> inclusive.**

Check it at the start: true, trivially. Now each turn must (a) keep the
promise true and (b) make the window strictly smaller.

```js
const mid = Math.floor((low + high) / 2);
if (nums[mid] === target) return mid;   // done
if (nums[mid] < target) low = mid + 1;  // mid and everything left: too small
else                    high = mid - 1; // mid and everything right: too big
```

Both branches keep the promise (the target can't be in the discarded
half) and both shrink the window by at least one — because of the `+ 1`
and `- 1`. Those two little offsets are the difference between an
algorithm and an infinite loop: `mid` was just *checked*, so keeping it
in the window is not only unnecessary, it's the bug. On a two-element
window `mid === low`, so `low = mid` would leave everything unchanged
forever.

**When does it stop?** When the window is empty — `low > high`. At that
moment the promise says: *if the target were in the array, it would be
in this window*, and the window is empty. So it isn't in the array.
Return `-1`. Notice you didn't reason about the data at all; you
reasoned about the invariant. That's the skill this problem teaches.

**The other decision:** `while (low <= high)` or `while (low < high)`?
Ask when `low === high`: the window holds exactly one candidate, and it
hasn't been checked yet. Skipping it would miss real answers — so
`<=`. (Test it against `binarySearch([7], 7)`, which must be `0`.)

## 4. Common wrong turns

- **`while (low < high)`.** The famous one. Any answer that ends up
  alone in the window is reported missing.
- **`low = mid` / `high = mid`.** Infinite loop on small windows. Move
  *past* the middle; you already know it isn't the target.
- **No `Math.floor`.** A fractional index makes `nums[mid]`
  `undefined`, every comparison false, and the whole thing quietly
  wrong. JavaScript won't warn you.
- **Mixing window conventions.** Closed `[low, high]` uses
  `high = length - 1` with `<=`; half-open `[low, high)` uses
  `high = length` with `<`. Both are correct; a blend of the two is
  never correct. Pick the closed one until it's automatic.
- **Handling the empty array with a special `if`.** Not needed:
  `high = -1` makes `0 <= -1` false and the function returns `-1` on
  its own. Let the invariant do the work.
- **`if (binarySearch(...))`.** Index `0` is falsy. Compare against
  `-1` explicitly.
- **Forgetting the array must be sorted.** Binary search on unsorted
  input doesn't throw — it lies.

## 5. The solution, step by step

```js
export function binarySearch(nums, target) {
  let low = 0;
  let high = nums.length - 1; // -1 when empty → the loop never runs

  while (low <= high) {              // <= : a 1-wide window still counts
    const mid = Math.floor((low + high) / 2);

    if (nums[mid] === target) return mid;

    if (nums[mid] < target) {
      low = mid + 1;                 // discard mid and everything left
    } else {
      high = mid - 1;                // discard mid and everything right
    }
  }

  return -1; // window empty → it was never there
}
```

Found — `binarySearch([1, 3, 5, 7, 9], 9)`:

| low | high | mid | nums[mid] | action              |
|-----|------|-----|-----------|---------------------|
| 0   | 4    | 2   | 5         | too small → low = 3 |
| 3   | 4    | 3   | 7         | too small → low = 4 |
| 4   | 4    | 4   | 9         | **return 4**        |

Missing — `binarySearch([1, 3, 5, 7, 9], 4)`:

| low | high | mid | nums[mid] | action              |
|-----|------|-----|-----------|---------------------|
| 0   | 4    | 2   | 5         | too big → high = 1  |
| 0   | 1    | 0   | 1         | too small → low = 1 |
| 1   | 1    | 1   | 3         | too small → low = 2 |
| 2   | 1    | —   | —         | `low > high` → **-1** |

Two habits worth stealing: trace both a hit *and* a miss, and always
trace a one-element and a two-element array. Nearly every binary-search
bug shows up in a window of size 1 or 2.

## 6. Complexity, gently

Each turn the window halves. Starting from n, how many halvings reach
1?

```
n → n/2 → n/4 → n/8 → … → 1
```

That count is log₂(n). Concretely:

| array size    | linear scan | binary search |
|---------------|-------------|---------------|
| 100           | 100         | 7             |
| 1,000         | 1,000       | 10            |
| 1,000,000     | 1,000,000   | 20            |
| 1,000,000,000 | a billion   | 30            |

Read the last two rows again: a thousand-fold more data costs **ten
more steps**. That is why O(log n) is treated as almost-free, and why
sorted structures (and later, trees) are worth so much.

Space is O(1): three numbers, no allocation.

The honest footnote: this speed assumes the array is *already* sorted.
Sorting costs O(n log n) — more than a single linear scan. Binary
search wins when you search the same data many times, which is the
usual case.

## 7. Words you learned

- **Binary search** — repeatedly halving a sorted search space.
- **Logarithmic time, O(log n)** — steps grow by one when the input
  doubles.
- **Search window / search space** — the range still worth examining,
  here `[low, high]`.
- **Closed vs half-open interval** — `[low, high]` includes `high`;
  `[low, high)` doesn't. Different loop conditions; don't mix them.
- **Loop invariant** — the promise kept every turn ("the answer, if it
  exists, is inside the window") that proves the algorithm correct.
- **Off-by-one error** — the family of bugs this problem is famous for:
  `<` vs `<=`, `mid` vs `mid ± 1`.
- **Precondition** — something that must be true before you call
  (here: sorted input).

## 8. Variations to try

1. **Recursive version.** Same logic, `low`/`high` as parameters.
   Compare the readability and the space cost.
2. **Lower bound (`firstIndexOf`)** — with duplicates allowed, return
   the *first* index equal to the target. Instead of returning on a
   match, record it and keep searching left.
3. **Insertion point** — return where the target *would* go if
   inserted, keeping the array sorted. (Surprise: it's `low` after the
   loop. Work out why.)
4. **Find the closest value** to the target rather than an exact match.
5. **Binary search on an answer, not an array** — e.g. integer square
   root: the "array" is the numbers 0..x, and the test is
   `mid * mid <= x`. This trick generalises binary search far beyond
   lookups, and problem 20 is your first taste of bending it.
6. **The overflow footnote** — in C or Java, `(low + high) / 2` can
   overflow, so people write `low + (high - low) / 2`. JavaScript
   numbers are too big for that to bite here, but you will meet the
   idiom and should know why it exists.
