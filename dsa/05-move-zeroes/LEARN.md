# 📘 Learning Guide: Move Zeroes

Editing an array *in place* with a write pointer — the pattern behind every
"filter without allocating" trick you'll ever write.

## 1. The problem in plain words

You're given an array of numbers. Slide all the zeros to the back. Keep
everything else in the order it was already in. Don't build a new array —
rearrange the one you were handed, and give it back.

```
before:  [0, 1, 0, 3, 12]
after:   [1, 3, 12, 0, 0]
          └ order preserved ┘  └ zeros ┘
```

The length stays the same (5 in, 5 out). You're rearranging, not deleting.

## 2. Concepts you need first

### In place vs. returning a copy

```js
function copyStyle(nums) {
  return nums.filter((n) => n !== 0);   // caller's array untouched
}

function inPlaceStyle(nums) {
  nums[0] = 99;                          // caller's array CHANGED
  return nums;
}
```

Arrays are handed around by **reference**: the caller's variable and your
parameter point at the same object in memory. Writing `nums[0] = 99` edits
that shared object, and the caller sees it. Doing `nums = somethingElse`
does *not* — that just re-points your local name and leaves the caller's
array exactly as it was.

```js
function nope(nums) {
  nums = [1, 2, 3];   // rebinds the local name only
}
const a = [0, 0];
nope(a);
a;                    // still [0, 0]
```

That distinction is the single most common source of "why didn't my
in-place function do anything?"

### Two indexes moving at different speeds

In problem 04 you had two pointers into two different arrays. Here both
pointers walk the *same* array, at different speeds:

```js
let write = 0;
for (let read = 0; read < nums.length; read++) {
  // read visits EVERY slot
  // write only advances when we keep something
}
```

`read` always moves. `write` sometimes stalls. So `write <= read` at all
times — which is precisely the safety guarantee that lets you overwrite
`nums[write]` without losing data you still need.

### Overwriting is safe when you're behind

The scary-looking line is `nums[write] = nums[read]`. Isn't that clobbering
something? Yes — a slot at index `write`, which is `<= read`, so it was
already visited and already copied forward if it deserved to be. The only
things you destroy are values you've finished with.

## 3. How to think about it

Say the naive plan out loud: "find a zero, cut it out, stick a zero on the
end." Now feel the problem — cutting an element out of the middle of an
array shifts everything after it, and your loop counter no longer lines up
with the elements. Splice-inside-a-loop is a bug factory.

Reframe. Don't move the zeros at all. **Compact the survivors to the
front**, and then paint the leftovers zero:

> Sweep the array. Every non-zero I meet gets packed into the next free
> slot at the front. When the sweep ends, however many slots are left over
> at the back get filled with zeros.

That's two simple loops, no shifting, no index games. Notice the shape of
the reframe: instead of asking "where does this zero go?", ask "where does
this keeper go?" Turning a removal problem into a packing problem is the
move.

## 4. Common wrong turns

- **`splice` inside a forward `for` loop.** After removing index `i`,
  everything shifts left — so `i++` skips an element. `[0, 0, 1]` comes out
  as `[0, 1, 0]`. It's also O(n²), because each splice shifts the tail.
- **Reassigning the parameter.** `nums = [...]` changes nothing for the
  caller. Mutate through the reference or not at all.
- **Returning a filtered copy.** Right contents, wrong object. This problem
  explicitly tests `moveZeroes(nums) === nums`.
- **Advancing `write` unconditionally.** Then `write` and `read` move
  together, every slot copies onto itself, and you've written a very
  elaborate way of doing nothing.
- **Forgetting to zero-fill the tail.** After compacting, the back of the
  array still holds stale copies (`[1, 3, 12, 3, 12]`). The second loop is
  not optional.
- **`if (nums[read])` instead of `if (nums[read] !== 0)`.** Truthiness
  lumps in `NaN`, `null`, `""` and `undefined`. Say what you mean; it also
  reads better to the next person.

## 5. The solution, step by step

```js
export function moveZeroes(nums) {
  let write = 0;                       // where the next keeper belongs

  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      nums[write] = nums[read];        // pack it forward
      write++;                         // ...and claim the next free slot
    }
    // zeros: skip. write stays put, so the next keeper overwrites this slot
  }

  for (let i = write; i < nums.length; i++) {
    nums[i] = 0;                       // paint the leftovers
  }

  return nums;                         // same object, rearranged
}
```

Trace `[0, 1, 0, 3, 12]`:

| read | value | keep? | array after | write |
|------|-------|-------|-------------|-------|
| 0 | 0 | no | `[0,1,0,3,12]` | 0 |
| 1 | 1 | yes → slot 0 | `[1,1,0,3,12]` | 1 |
| 2 | 0 | no | `[1,1,0,3,12]` | 1 |
| 3 | 3 | yes → slot 1 | `[1,3,0,3,12]` | 2 |
| 4 | 12 | yes → slot 2 | `[1,3,12,3,12]` | 3 |

`write` ends at 3 — exactly the number of non-zeros. Slots 3 and 4 get
zeroed → `[1, 3, 12, 0, 0]`. The junk sitting in the tail mid-run never
mattered; it was always going to be overwritten.

Once this clicks, notice how general it is. Replace `!== 0` with any test
and you have "filter this array in place" for free.

## 6. Complexity, gently

- **Time: O(n).** The first loop touches each slot once; the second touches
  each *leftover* slot once. Worst case about `2n` operations — and
  constants like that 2 are dropped, because what O-notation tracks is
  *how the cost grows*, not its exact value. Double the array, double the
  work.
- **The splice version: O(n²).** Each `splice` shifts up to `n` elements,
  and you may splice up to `n` times. For an array of 100,000 mostly-zeros
  that's billions of moves versus 200,000.
- **Space: O(1).** Two integers, forever, no matter how big `nums` gets.
  Contrast problem 01, where you *bought* speed with O(n) of memory. Here
  you get linear time for free — the sortedness of the problem isn't what
  saves you, the reframing is.

## 7. Words you learned

- **In place** — modifying the given structure instead of returning a copy;
  uses O(1) extra space.
- **Write pointer / slow-fast pointers** — one index reads everything,
  another marks where output goes.
- **Compaction** — packing the elements you keep into a contiguous prefix.
- **Reference semantics** — arrays and objects are passed as references, so
  mutations are visible to the caller; reassignment isn't.
- **Stable** — preserving the original relative order of the kept elements
  (the same word you met in problem 04).

## 8. Variations to try

1. **removeValue(nums, target)** — same write pointer, but keep everything
   that isn't `target`, and set `nums.length = write` to actually shorten
   the array. Compare that to the zero-fill ending.
2. **removeDuplicatesSorted(nums)** — given a *sorted* array, compact it so
   each value appears once, and return the new length. Same pattern, the
   test is `nums[read] !== nums[write - 1]`.
3. **moveZeroesToFront(nums)** — zeros first, non-zeros after, order of
   non-zeros preserved. Hint: sweep from the right with a write pointer
   starting at the end.
4. **The one-pass swap version** — instead of the fill loop, swap:
   `[nums[write], nums[read]] = [nums[read], nums[write]]` on every keeper.
   Prove to yourself it preserves order (hint: the slot at `write` is
   always either the same slot or a zero).
5. **partitionInPlace(nums, predicate)** — generalize: everything passing
   `predicate` to the front, the rest to the back, order preserved on the
   front side. You've basically already written it.
