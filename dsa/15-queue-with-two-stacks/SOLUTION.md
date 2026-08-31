# Solution — Queue with Two Stacks

## The naive approach and its cost

**One array, `shift()` to dequeue.** Correct, and the shortest code you
will ever write — but `shift()` has to slide every remaining element
down one slot, so each dequeue is **O(n)** and draining a queue of *n*
values costs O(n²). It also ignores the point of the exercise: build
FIFO out of LIFO only.

**Two stacks, transfer every time.** Push onto the inbox; to dequeue,
pour the inbox into the outbox, pop one, then pour everything *back*.
Correct, but each dequeue moves the whole queue twice — O(n) per
operation again, only slower. The instinct to restore the "normal"
arrangement after every operation is exactly what costs you.

## The insight

Popping stack A into stack B **reverses** the order:

```
inbox  [1, 2, 3]   (3 is on top, 1 is buried at the bottom)
                   pop 3 → push; pop 2 → push; pop 1 → push
outbox [3, 2, 1]   (1 is on top — the oldest value is now the cheap one)
```

That reversal turns "reach the bottom of a stack" (impossible in O(1))
into "reach the top of a stack" (free). But the second insight is the
one that buys the complexity: **don't pour back, and don't pour again
until you have to.** Values sitting in the outbox are already in
front-first order. Leave them. New values pile up in the inbox and wait
their turn. Refill only when the outbox is *empty* — at that moment
there is nothing left to jump ahead of, so the transfer is safe.

## The approach, step by step

1. Constructor: two arrays, `inbox` (newest, arrival order) and
   `outbox` (older, reversed so the front is on top).
2. `enqueue(v)`: `inbox.push(v)`. That is the whole method.
3. `refill()` helper: **if and only if** `outbox` is empty,
   `while (inbox.length) outbox.push(inbox.pop())`.
4. `dequeue()`: `refill()`, then `return outbox.pop()`. Popping an
   empty array already returns `undefined` — the empty case handles
   itself.
5. `peek()`: `refill()`, then return the last element of `outbox`
   (reading a missing index also gives `undefined`).
6. `isEmpty()`: true only when **both** arrays are empty. Checking one
   is the classic bug.

Trace the interleaved example (`a, b` in, one out, `c` in):

| op          | inbox   | outbox  | returns |
|-------------|---------|---------|---------|
| enqueue a   | [a]     | []      |         |
| enqueue b   | [a, b]  | []      |         |
| dequeue     | []      | [b]     | a       |
| enqueue c   | [c]     | [b]     |         |
| dequeue     | [c]     | []      | b       |
| dequeue     | []      | []      | c       |

Note the fourth row: `c` lands in the inbox and politely waits behind
`b`, which was already in the outbox.

## Complexity

- **Time: amortized O(1)** per operation. Any single `dequeue` can be
  O(n) — the one that triggers a refill — but each value is pushed and
  popped **exactly twice** in its whole life (once per stack). So *n*
  enqueues plus *n* dequeues do at most 4n array operations: O(n)
  total, O(1) each on average.
- **Worst case for one call: O(n)** — worth saying out loud, because
  it is the difference from `14-min-stack`, where every call was O(1)
  with no averaging.
- **Space: O(n)** — every value lives in exactly one of the two stacks.

## Common mistakes

- **Transferring back after every dequeue.** Correct output, O(n) per
  operation, and it throws away the entire point. Once a value is in
  the outbox, leave it there until it leaves the queue.
- **Refilling when the outbox is *not* empty.** Pouring newer values on
  top of older ones puts them in front — the interleaving test catches
  it immediately (`c` would come out before `b`).
- **`isEmpty()` checking only one stack.** After a refill the inbox is
  empty while the queue is full; before the first refill the outbox is
  empty while the queue is full. Both must be empty.
- **Forgetting to refill inside `peek()`.** `peek` looks harmless, but
  right after a burst of enqueues the front value is at the *bottom of
  the inbox*; without the refill you read `undefined` (or the wrong
  value) from an empty outbox.
- **Using `shift`/`unshift` anywhere.** They make it work and make it
  pointless — the exercise is "FIFO from LIFO parts".
