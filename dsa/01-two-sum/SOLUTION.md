# Solution walkthrough — Two Sum

## The naive approach (and what it costs)

Check every pair. Outer loop picks `i`, inner loop picks `j > i`, and if
`nums[i] + nums[j] === target` you return `[i, j]`:

```js
for (let i = 0; i < nums.length; i++) {
  for (let j = i + 1; j < nums.length; j++) {
    if (nums[i] + nums[j] === target) return [i, j];
  }
}
```

This is correct! But count the work: for each of the `n` elements you scan
up to `n` others — roughly `n * n / 2` pair-checks. That's **O(n²)** time.
For 10 elements, ~50 checks: fine. For 100,000 elements, ~5,000,000,000
checks: not fine. The inner loop is *re-discovering* the same values over
and over.

## The insight

Flip the question. Standing at element `x`, don't ask "which later element
pairs with me?" Ask: **"has my partner already walked past?"** My partner
is exactly `target - x` — a single, known value. If we kept a *memory* of
every value we've seen (and where we saw it), that question is a single
instant lookup instead of a scan.

A `Map` is that memory: `map.has(value)` and `map.get(value)` take O(1)
time — constant, no matter how big the map grows.

## The real approach, step by step

1. Create an empty `Map` called `seen` (value → index).
2. Loop `i` from `0` to the end:
   a. Compute `need = target - nums[i]`.
   b. If `seen.has(need)`: done — return `[seen.get(need), i]`.
      The stored index is from an earlier iteration, so it's automatically
      the smaller one. Ascending order for free.
   c. Otherwise `seen.set(nums[i], i)` and continue.
3. If the loop finishes, the input broke its promise (no pair exists);
   throwing is a reasonable response.

The **check-before-store** order in step 2 matters: if you stored first,
then for `nums = [4, 2, 6]`, `target = 8`, at `i = 0` you'd find `need = 4`
already in the map (you just put it there) and return `[0, 0]` — the same
element twice. Checking first makes self-pairing impossible.

Duplicates are also handled for free: with `[3, 3]` and target `6`, the
first 3 is stored at `i = 0`; at `i = 1`, `need = 3` is found → `[0, 1]`.
(The second 3 would *overwrite* the first in the map — but we never get
that far, and even when overwrites happen they only ever hurt if you
needed the earlier duplicate, which you don't: the earlier one is found
before the overwrite could matter.)

## Complexity

- **Time: O(n).** One pass; each element does a constant amount of work
  (one subtraction, one `has`, one `get`-or-`set`). Compare: the naive
  version does ~n²/2 operations. For n = 100,000 that's the difference
  between 100,000 steps and 5 billion.
- **Space: O(n).** The map can grow to hold every element (worst case: the
  answer is the last pair). This is the classic trade: **spend memory to
  buy speed.** The naive version uses O(1) extra space but O(n²) time.

## Common mistakes

- **Storing before checking** → returns the same index twice when
  `target` is exactly `2 * nums[i]` (see step 2 above).
- **Sorting first** to use two pointers — sorting works for "do such
  values exist?" but destroys the original indices this problem asks for.
- **Using an object `{}` instead of a `Map`** — mostly works, but object
  keys become strings, which invites subtle bugs (and `Map` states your
  intent: this is a lookup table, not a record).
- **Returning values instead of indices.** Read the return type twice;
  interviews dock this constantly.
- **Assuming the pair is adjacent** or that the array is sorted. Neither
  is promised.
