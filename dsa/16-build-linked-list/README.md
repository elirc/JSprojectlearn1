# 16 — Build a Linked List

Arrays store values in one numbered block of memory. A **linked list**
stores each value in its own little object that points at the next one.
Build the whole structure by hand — no arrays inside.

## The node shape

Every node in this track is a plain object, and `null` — not
`undefined` — marks the end:

```js
{ value: 3, next: <the next node, or null if this is the last one> }
```

The list keeps a `head` field: the first node, or `null` when empty.
Problems 17 and 18 use exactly this shape.

## Signature

```js
export class LinkedList {
  head;                       // first node, or null
  pushBack(value) {}          // add at the END
  pushFront(value) {}         // add at the FRONT
  toArray() {}                // → plain array of the values, front to back
  removeFirstMatch(value) {}  // unlink the first node whose value === value
                              // → true if one was removed, false if not found
  static fromArray(values) {} // → a new LinkedList holding those values in order
}
```

**The rule:** no arrays inside the list. `toArray` builds one on the
way out and `fromArray` reads one on the way in — everywhere else,
nodes and pointers only.

## Worked examples

**Example 1 — pushing both ends.** `pushBack(2); pushBack(3);
pushFront(1)` gives `toArray()` → `[1, 2, 3]`, with `head.value` → `1`
and `head.next.value` → `2`.

**Example 2 — round trip.**
`LinkedList.fromArray([10, 20, 30]).toArray()` → `[10, 20, 30]`. A new
empty list gives `toArray()` → `[]` and `head` → `null`.

**Example 3 — the *first* match only.** On `[1, 2, 3, 2]`,
`removeFirstMatch(2)` → `true` and `toArray()` → `[1, 3, 2]` (the
second `2` stays). Then `removeFirstMatch(9)` → `false`, list
unchanged.

**Example 4 — removing the head.** On `[1, 2, 3]`,
`removeFirstMatch(1)` → `true`, `toArray()` → `[2, 3]`, and `head` now
holds `2`.

## Constraints & edge cases

- Values compare with `===` (numbers and strings in the tests).
- Every method must survive an empty list without throwing.
- Removing the head must move `head`; removing the last node must
  leave the list usable for `pushBack`.
- Aim for O(1) `pushFront`. O(1) `pushBack` is possible too — hint 3.

## Hints

Take them one at a time.

<details><summary>Hint 1 (nudge)</summary>

`pushFront` is the easy one: make a node whose `next` is the old head,
then make it the new head. It works even when the old head is `null` —
the new node's `next` becomes `null`, which is correct.
</details>

<details><summary>Hint 2 (direction)</summary>

To walk a list: `let node = this.head; while (node !== null) { ...;
node = node.next; }`. That loop *is* `toArray`, and a variation of it
is every other method here. Write it once and you own the structure.
</details>

<details><summary>Hint 3 (the key insight)</summary>

`pushBack` needs the *last* node. Walking there is O(n); instead keep a
second field, `this.tail`, always pointing at the last node (`null`
when empty). Then `pushBack` links `tail.next` to the new node and
moves `tail`. Remember: pushing onto an empty list sets **both** ends.
</details>

<details><summary>Hint 4 (nearly the algorithm)</summary>

`removeFirstMatch`: if `head` matches, `head = head.next` (and clear
`tail` if the list is now empty). Otherwise walk with a `prev` pointer;
when `prev.next.value === value`, splice it out with
`prev.next = prev.next.next` — and if you just removed the tail, set
`tail = prev`. Return `true`; if the walk ends, return `false`.
</details>

## Run

```
node --test dsa/16-build-linked-list/attempt.test.js
```
