# 18 — Detect a Cycle

A linked list is supposed to end. A bug can make some node's `next`
point back at an earlier node, and the chain becomes a loop that never
terminates. Detect that — in **O(1) extra space**.

## The node shape

Same plain nodes as problems 16 and 17; an empty list is `null`:

```js
{ value: 1, next: <the next node, or null if this is the last one> }
```

In a cyclic list *no* node has `next === null` — that is exactly the
problem.

## Signature

```js
/** @param {{value: *, next: object|null}|null} head @returns {boolean} */
export function hasCycle(head)
```

## Worked examples

**Example 1 — a clean list.** `1 → 2 → 3 → 4 → null` → `false`.

**Example 2 — the tail points back into the middle.**

```
3 → 2 → 0 → -4
    ↑         |
    └─────────┘      → true
```

Walking it goes `3, 2, 0, -4, 2, 0, -4, 2, ...` forever.

**Example 3 — a node pointing at itself.** With
`const node = { value: 1, next: null }; node.next = node;`,
`hasCycle(node)` → `true`.

**Example 4 — degenerate inputs.** `hasCycle(null)` → `false` (nothing
to loop), and a single node ending in `null` → `false`.

## Constraints & edge cases

- Return a **boolean**, not the looping node.
- **O(1) extra space** — no `Set` of visited nodes, no array, no
  marking nodes with an extra property. Two variables is the budget.
- O(n) time; must terminate on cyclic *and* clean input.
- Don't modify the list — a caller may still be using it.

## Hints

Take them one at a time.

<details><summary>Hint 1 (nudge)</summary>

The easy version stores every node you have seen in a `Set` and checks
before each step. It works, and it is O(n) memory. What could tell you
"I've been here before" *without* remembering anything?
</details>

<details><summary>Hint 2 (direction)</summary>

Two runners on a circular track, one faster, will meet again — the fast
one laps the slow one. On a straight track the fast one just reaches
the end and stops. That difference is the entire algorithm.
</details>

<details><summary>Hint 3 (the key insight)</summary>

Walk two cursors from the head: `slow` moves one node per step, `fast`
moves two. If `fast` (or `fast.next`) becomes `null`, the list ends —
no cycle. If `slow === fast`, they met inside a loop — cycle. Compare
the *nodes*, not their values; duplicate values are not a cycle.
</details>

<details><summary>Hint 4 (nearly the algorithm)</summary>

```
slow = head; fast = head
while fast !== null and fast.next !== null:
    slow = slow.next
    fast = fast.next.next
    if slow === fast: return true
return false
```

Both guards are needed, in that order: `fast.next.next` would throw
when `fast` is the last node.
</details>

## Run

```
node --test dsa/18-detect-cycle/attempt.test.js
```
