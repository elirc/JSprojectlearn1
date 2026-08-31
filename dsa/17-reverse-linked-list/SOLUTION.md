# Solution — Reverse a Linked List

## The naive approach and its cost

**Dump to an array, rebuild.** Walk the list collecting values, reverse
the array, build a fresh chain:

```js
const values = [];
for (let n = head; n; n = n.next) values.push(n.value);
let out = null;
for (const v of values) out = { value: v, next: out };
return out;
```

O(n) time — but **O(n) extra space**, and it returns *different node
objects*. Anything else holding a reference into the old list (very
common in real code, and checked by one of the tests) still sees the
old order. The exercise is pointer surgery; this politely avoids it.

**Swap the values instead of the pointers.** Two-pointer swap like
`10-valid-palindrome-two-pointers` — except a singly linked list has no
way to walk *backwards*, so you cannot bring a pointer in from the
right. You would have to walk from the head every time: O(n²).

**Recursion.** Genuinely elegant (variation 1 below) but it uses O(n)
stack frames, and this problem is here to teach the iterative pointer
dance.

## The insight

Reversal is local. Each node just needs its arrow to point at whatever
came before it — and walking forward, *you have already seen* what came
before it. So carry it in a variable:

```
prev = null        current = 1 → 2 → 3 → null
prev = 1 → null    current = 2 → 3 → null
prev = 2 → 1 → null    current = 3 → null
prev = 3 → 2 → 1 → null    current = null      ← done, return prev
```

Two lists, one growing and one shrinking, handing over one node per
step. `prev` starts as `null` because the old head must finish pointing
at nothing.

And the trap that makes this famous: the instant you execute
`current.next = prev`, the reference to the rest of the list is *gone*.
You overwrote the only arrow that led forward. Hence the temporary
variable, and hence the fixed order of the four statements.

## The approach, step by step

1. `let prev = null; let current = head;`
2. While `current !== null`:
   1. `const nextNode = current.next;` — **save the way forward first.**
   2. `current.next = prev;` — flip this node's arrow.
   3. `prev = current;` — the reversed part just grew by one.
   4. `current = nextNode;` — continue with the saved remainder.
3. Return `prev`. When the loop ends `current` is `null`, so `prev` is
   the last node processed — the old tail, the new head.

Trace `1 → 2 → 3`:

| step | prev            | current | nextNode |
|------|-----------------|---------|----------|
| init | null            | 1       | —        |
| 1    | 1 → null        | 2       | 2        |
| 2    | 2 → 1 → null    | 3       | 3        |
| 3    | 3 → 2 → 1 → null| null    | null     |

Return `prev` = the node holding 3.

Both edge cases fall out for free: `head === null` never enters the
loop and returns `null`; a single node runs one iteration, sets its
`next` to `null` (it was already), and comes back as its own head.

## Complexity

- **Time: O(n)** — each node is visited exactly once and does a fixed
  amount of work.
- **Space: O(1)** — three variables (`prev`, `current`, `nextNode`),
  no matter how long the list is. This is the payoff over the
  dump-to-array version, and over recursion's O(n) call stack.

## Common mistakes

- **Flipping before saving.** `current.next = prev; current = current.next;`
  — now `current` is `prev`, you are walking *backwards* through the
  part you already reversed, and the loop either spins or ends
  instantly. The four lines have exactly one correct order.
- **Returning `head`.** `head` still refers to the old first node,
  which is now the *last*. The reversed list would look one node long.
  Return `prev`.
- **Returning `current`.** It is `null` at the end, always. (Easy to
  mix up under interview pressure — say "prev is the new head" out
  loud as you write the return.)
- **Starting `prev` as `head`.** Then the old head points at itself:
  an infinite loop the next time anything walks the list. `prev` must
  start as `null`.
- **`while (current.next !== null)`.** Stops one node early — the last
  node never gets flipped — and throws on an empty list. The condition
  is about `current` itself.
- **Building new nodes.** Correct output, wrong exercise: anything
  still pointing into the original chain is left behind.
