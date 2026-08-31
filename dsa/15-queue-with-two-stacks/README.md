# 15 — Queue with Two Stacks

A stack is last-in-first-out. A queue is **first**-in-first-out. Build
the queue out of nothing but stacks, and keep every operation
**amortized O(1)**.

## Signature

```js
export class Queue {
  enqueue(value) {}  // add value at the BACK
  dequeue() {}       // remove AND return the FRONT value (undefined if empty)
  peek() {}          // return the FRONT value without removing it
  isEmpty() {}       // true when the queue holds nothing
}
```

The rule that makes this a puzzle: your internal arrays may only be
used as *stacks* — `push`, `pop`, and reading the last element. No
`shift`, no `unshift`, no `splice`, no reaching into the middle.
(`shift` would be O(n) anyway.)

## Worked examples

**Example 1 — plain FIFO.** `enqueue(1); enqueue(2); enqueue(3)`, then
three `dequeue()` calls return `1`, `2`, `3`: oldest leaves first.

**Example 2 — peek looks without taking.** After `enqueue("a");
enqueue("b")`: `peek()` → `"a"`, `peek()` again → `"a"` (still there),
`dequeue()` → `"a"`, `peek()` → `"b"`.

**Example 3 — interleaved; this is the one that breaks naive
attempts.** `enqueue("a"); enqueue("b"); dequeue()` → `"a"`. Now
`enqueue("c")` arrives while `"b"` is still waiting, so the next
`dequeue()` must be `"b"` — *not* `"c"` — and then `"c"`.

**Example 4 — empty queue.** `isEmpty()` → `true`, `dequeue()` →
`undefined`, `peek()` → `undefined`. Nothing throws.

## Constraints & edge cases

- Values can be anything (numbers, strings, objects).
- `dequeue`/`peek` on an empty queue return `undefined`.
- Amortized O(1): a single `dequeue` may do real work, but *n*
  operations together must cost O(n).
- Interleaving enqueues and dequeues must not scramble the order.

## Hints

Take them one at a time.

<details><summary>Hint 1 (nudge)</summary>

Pop a stack repeatedly and push each value onto a second stack. What
order do the values end up in? Try it on paper with 1, 2, 3.
</details>

<details><summary>Hint 2 (direction)</summary>

Reversal is the whole trick: the *bottom* of stack A becomes the *top*
of stack B, and the top of a stack is cheap to reach. Keep two stacks —
an **inbox** everything is pushed onto, and an **outbox** everything is
taken from.
</details>

<details><summary>Hint 3 (the key insight)</summary>

Do **not** transfer on every operation. Refill the outbox only when a
`dequeue`/`peek` finds it *empty*, then move the whole inbox across at
once. Values already in the outbox are older, so pouring new ones on
top of them would let newcomers cut the line.
</details>

<details><summary>Hint 4 (nearly the algorithm)</summary>

`enqueue(v)`: `inbox.push(v)`. A `refill()` helper: if `outbox` is
empty, `while (inbox.length) outbox.push(inbox.pop())`.
`dequeue()`: refill, then `return outbox.pop()`.
`peek()`: refill, then return the last element of `outbox`.
`isEmpty()`: **both** arrays empty.
</details>

## Run

```
node --test dsa/15-queue-with-two-stacks/attempt.test.js
```
