# Solution walkthrough — Move Zeroes

## The naive approach (and what it costs)

The first idea most people have is: find a zero, delete it, push a zero on
the end. Repeat.

```js
export function moveZeroes(nums) {
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) {
      nums.splice(i, 1);   // remove the zero...
      nums.push(0);        // ...and put one back at the end
    }
  }
  return nums;
}
```

Two problems. First, it's buggy: after `splice` every later element shifts
left by one, but `i++` still moves forward, so `[0, 0, 1]` skips the second
zero and returns `[0, 1, 0]`. (Fixing it needs an `i--`, which then risks
looping forever over the zeros you keep pushing onto the end.)

Second, even when fixed it's slow. `splice` isn't free: removing element
`i` shifts every element after it down one slot. With `k` zeros in an
`n`-element array that's up to `n · k` moves — **O(n²)** for an array of
mostly zeros.

The other common naive version is honest but wasteful:

```js
const kept = nums.filter((n) => n !== 0);
const result = [...kept, ...new Array(nums.length - kept.length).fill(0)];
```

Correct, O(n) time — but it builds two extra arrays, and it returns a *new*
one, which breaks this problem's "in place, same object" requirement unless
you copy everything back.

## The insight

Stop thinking of it as *moving zeros*. Think of it as **compacting the
non-zeros to the front**, then filling whatever's left with zeros.

The moment you frame it that way, you notice two different jobs happening
at two different speeds:

- **Reading** visits every slot, zero or not.
- **Writing** only happens for the values that survive.

So give them separate positions. `read` sweeps left to right; `write` marks
"where the next keeper belongs". Since `write` only advances when `read`
does *and* only for keepers, `write <= read` always holds — meaning every
slot you overwrite is one you have already read. Nothing is lost.

This is the **write-pointer** (or "slow/fast pointer") pattern, and it
shows up any time you filter an array in place.

## The real approach, step by step

1. `let write = 0;`
2. Loop `read` from `0` to `nums.length - 1`:
   - If `nums[read] !== 0`, then `nums[write] = nums[read]` and `write++`.
   - If it *is* zero, do nothing — don't advance `write`. The next keeper
     will land on this slot.
3. When the loop ends, `write` equals the number of non-zero values, and
   `nums[0..write-1]` holds them in their original order. Everything from
   `write` to the end is stale leftovers.
4. Fill the tail: `for (let i = write; i < nums.length; i++) nums[i] = 0;`
5. `return nums;` — the same object, mutated.

Trace `[0, 1, 0, 3, 12]`:

| read | value | keep? | array after | write |
|------|-------|-------|-------------|-------|
| 0 | 0 | no | `[0,1,0,3,12]` | 0 |
| 1 | 1 | yes → slot 0 | `[1,1,0,3,12]` | 1 |
| 2 | 0 | no | `[1,1,0,3,12]` | 1 |
| 3 | 3 | yes → slot 1 | `[1,3,0,3,12]` | 2 |
| 4 | 12 | yes → slot 2 | `[1,3,12,3,12]` | 3 |

Then zero-fill indexes 3 and 4 → `[1, 3, 12, 0, 0]`. The garbage in the
tail (`3, 12`) never mattered; it was always going to be overwritten.

There's also a swap variant — `[nums[write], nums[read]] = [nums[read], nums[write]]`
whenever `nums[read] !== 0` — which finishes in one pass with no fill step.
It's clever and equally correct, but the two-phase version is easier to
reason about and easier to defend out loud.

## Complexity

- **Time: O(n).** Each element is read once in the first loop, and each
  tail slot is written once in the second. At most `2n` operations total —
  still linear. Compare the splice version's O(n²).
- **Space: O(1).** Two integer variables, regardless of array size. No
  copy, no filtered array. That's what "in place" means: the extra memory
  you use doesn't grow with the input.

## Common mistakes

- **Using `splice` inside a forward loop.** Removing an element shifts
  everything after it, so the loop index skips the next element. Classic,
  and it produces almost-right output that passes casual eyeballing.
- **Returning a new array.** `nums.filter(...)` gives the right *contents*
  but the caller's array is untouched, so the identity test fails and any
  code holding the original reference sees nothing change.
- **Reassigning the parameter.** `nums = [...kept, ...zeros]` rebinds a
  local name; the caller's array is completely unaffected. You can only
  mutate *through* the reference (`nums[i] = ...`, `nums.length = ...`).
- **Advancing `write` on zeros too.** Then `write === read` forever and
  you've written an elaborate no-op.
- **Forgetting the zero-fill.** Without step 4 you return
  `[1, 3, 12, 3, 12]` — the leftovers are still sitting there.
- **Checking `if (nums[read])` instead of `!== 0`.** Truthiness treats
  `NaN`, `""`, `null`, and `undefined` as "zero" too. For a numbers-only
  array it happens to work, but say what you mean.
- **Sorting to push zeros back.** `sort((a, b) => (a === 0) - (b === 0))`
  looks slick but is O(n log n) and relies on sort stability you'd have to
  argue for. The write pointer is simpler *and* faster.
