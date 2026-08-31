# Solution — Min Stack

## The naive approach and its cost

**Scan on demand.** Keep one array; `getMin()` loops over it:

```js
getMin() { return this.values.length ? Math.min(...this.values) : undefined; }
```

Correct, O(1) for everything *except* `getMin`, which is **O(n)** —
and the problem explicitly forbids that.

**One cached variable.** Keep `this.min`, update on push. Push is easy
(`this.min = Math.min(this.min, value)`), but `pop()` breaks it: if the
value being popped *is* the minimum, what's the new minimum? You don't
know without scanning — the single variable threw that history away.
The failure teaches the requirement: we don't need *the* minimum, we
need **the minimum at every depth of the stack**, so any pop can
restore the right one instantly.

## The insight

Record, alongside each element, *the minimum of the stack up to and
including that element*. That's one extra number per push, computable
in O(1) from the previous record:

```
push 5:  values [5]        mins [5]
push 3:  values [5,3]      mins [5,3]
push 7:  values [5,3,7]    mins [5,3,3]   ← 7 doesn't beat 3
pop:     values [5,3]      mins [5,3]
pop:     values [5]        mins [5]       ← the 5 "comes back" for free
```

The `mins` stack is a **snapshot history**: popping rewinds both stacks
one step, so the answer to "what was the min before?" was never lost.
Duplicates work with zero special-casing — push `1` twice and `mins`
holds `1` twice, so one pop removes one copy.

## The approach, step by step

1. Constructor: two arrays, `values` and `mins`. Invariant: **always
   the same length**, and `mins[i] === Math.min(...values.slice(0, i + 1))`
   (conceptually — never actually computed that way).
2. `push(value)`:
   - `values.push(value)`
   - new running min = `mins` empty ? `value` : `Math.min(value, top of mins)`
   - `mins.push(that)`
3. `pop()`: pop `mins` (discard), pop `values` and return it. Popping
   both keeps the invariant; on empty arrays both pops are harmless
   and `undefined` comes back naturally.
4. `top()`: last element of `values`, or `undefined`.
5. `getMin()`: last element of `mins`, or `undefined`.

Every method is a constant number of array-end operations. No loops
anywhere in the class — if you wrote a loop, something's off.

## Complexity

- **Time: O(1)** for `push`, `pop`, `top`, `getMin` — all of them are
  one or two array-end operations.
- **Space: O(n)** extra — one entry in `mins` per entry in `values`.
  (A classic trade: memory for speed, the same deal as `01-two-sum`'s
  hashmap.)

## Common mistakes

- **The single `this.min` variable.** Passes every test that never pops
  the minimum. Dies on the classic sequence the moment `-3` leaves.
  If your min stack has no second storage, it's wrong somewhere.
- **Pushing to `mins` only when the new value is a new minimum**
  (the "sparse" variant). It *can* work, but then `pop()` must compare
  the popped value against the top of `mins` to decide whether to pop
  it too — and with duplicated minimums (`push(1); push(1)`) you must
  have pushed *both* copies, or use `<=` carefully. The
  same-length-always version has no such edge cases; prefer it until
  the sparse one is boring to you.
- **Forgetting to pop `mins` in `pop()`.** The stacks drift out of
  step and `getMin` reports minimums of elements that already left.
- **`getMin` scanning with `Math.min(...values)`.** Correct output,
  wrong complexity — this problem is *about* the O(1) guarantee.
- **Throwing on empty pop/top/getMin.** Our contract says `undefined`;
  match the contract your tests (and callers) expect.
