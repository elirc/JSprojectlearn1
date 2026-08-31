# 17 — Reverse a Linked List

The rite of passage. Given the head of a singly linked list, turn every
arrow around and return the **new head** — iteratively, in one pass,
re-using the nodes you were given.

## The node shape

Same plain nodes as `16-build-linked-list`; an empty list is `null`:

```js
{ value: 1, next: <the next node, or null if this is the last one> }
```

## Signature

```js
/** @param {{value: *, next: object|null}|null} head @returns {object|null} */
export function reverseList(head)
```

Return the node that is now first — the one that used to be last. The
caller's old `head` variable ends up pointing at the *last* node;
that's expected.

## Worked examples

**Example 1 — the standard case.** `1 → 2 → 3 → 4 → 5 → null` becomes
`5 → 4 → 3 → 2 → 1 → null`, and the call returns the node holding `5`.

**Example 2 — two nodes.** `1 → 2 → null` becomes `2 → 1 → null`.

**Example 3 — degenerate inputs.** `reverseList(null)` → `null`
(empty stays empty). A one-node list comes back as the same node,
unchanged.

**Example 4 — the old head is now the end.** With
`head = 1 → 2 → 3` and `newHead = reverseList(head)`: `newHead.value`
→ `3`, `head.value` → `1` (still that node) but `head.next` → `null`,
because it is now the last one.

## Constraints & edge cases

- **Iterative** — a loop, not recursion (recursion is variation 1).
- **One pass**, O(n) time, **O(1) extra space**.
- **Re-use the nodes.** Re-link the objects you were given; don't build
  new ones and don't copy values into an array. One test checks that
  the returned chain is made of the very same node objects.
- `null` in → `null` out.

## Hints

Take them one at a time.

<details><summary>Hint 1 (nudge)</summary>

For each node, `next` must end up pointing at the node that came
*before* it. Walking forward, you have already visited that node — so
the loop needs to hold on to it. What variable would that be?
</details>

<details><summary>Hint 2 (direction)</summary>

Keep two cursors: `prev` (the part already reversed, starting at
`null` — because the old head must end up pointing at nothing) and
`current` (the next node to flip).
</details>

<details><summary>Hint 3 (the key insight)</summary>

The moment you write `current.next = prev`, the rest of the list
becomes unreachable — you just overwrote your only way forward. So
**save `current.next` in a temporary variable first**. That one line is
the entire difficulty of this problem.
</details>

<details><summary>Hint 4 (nearly the algorithm)</summary>

```
prev = null; current = head
while current !== null:
    nextNode = current.next   // 1. save the way forward
    current.next = prev       // 2. flip the arrow
    prev = current            // 3. slide prev up
    current = nextNode        // 4. slide current up
return prev                   // current is null; prev is the new head
```

Four lines, always in that order.
</details>

## Run

```
node --test dsa/17-reverse-linked-list/attempt.test.js
```
