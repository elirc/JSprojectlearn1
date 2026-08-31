# Solution — Build a Linked List

## The naive approach and its cost

**Wrap an array.** `this.items = []`, `pushBack` is `push`, `toArray`
is `[...this.items]`. Every test passes and you have learned nothing —
the exercise is the pointers, not the behaviour. (It is also *worse*
for the operations lists are good at: `pushFront` on an array is
`unshift`, which slides every element one slot: O(n).)

**Nodes but no `tail`.** Honest nodes, `head` only. `pushBack` then has
to walk from `head` to the end every time — **O(n) per push**, so
`fromArray` on *n* values costs O(n²). Correct, and a fine first
version, but the fix is one extra field.

**Nodes with `tail`, promise not kept.** The real trap. `pushBack` and
`pushFront` set `tail`, but `removeFirstMatch` forgets to. Remove the
last node and `tail` still points at a node that is no longer in the
list; the next `pushBack` links onto a ghost and the value vanishes.
The list keeps *looking* fine until that exact sequence happens — which
is why one of the tests does exactly that sequence.

## The insight

A linked list has no index arithmetic. Everything is one loop:

```js
for (let node = this.head; node !== null; node = node.next) { ... }
```

`toArray` is that loop collecting values. `removeFirstMatch` is that
loop looking one step ahead. Learn the loop, and the structure has no
secrets left.

The one thing the loop cannot do is reach *backwards*. To unlink a node
you must change the `next` of the node **before** it, and a singly
linked node has no pointer back. So you either walk with a `prev`
pointer, or — the tidier trick — look at `prev.next` instead of at
`node`, and never need to look back at all.

## The approach, step by step

1. Constructor: `head = null`, `tail = null`. Empty means both null.
2. `pushFront(value)`: `this.head = { value, next: this.head }`. On an
   empty list `next` becomes `null` — correct for free. Then, if `tail`
   was null, the new node is also the tail.
3. `pushBack(value)`: make `{ value, next: null }`. If the list is
   empty, it becomes head *and* tail. Otherwise `tail.next = node`,
   then `tail = node`. Order matters — reassign `tail` last.
4. `toArray()`: the walking loop, pushing `node.value` into a local
   array.
5. `removeFirstMatch(value)`:
   - empty list → `false`.
   - head matches → `head = head.next`; if that leaves the list empty,
     `tail = null`; return `true`.
   - otherwise `let prev = this.head`, and while `prev.next !== null`:
     if `prev.next.value === value`, fix `tail` when the removed node
     *is* the tail, then `prev.next = prev.next.next`, return `true`;
     else `prev = prev.next`.
   - fell off the end → `false`.
6. `static fromArray(values)`: new list, `pushBack` each value. It is
   `static` because it builds a list rather than acting on one — call
   it as `LinkedList.fromArray([...])`, never `list.fromArray(...)`.

Splicing a node out, drawn:

```
before:  prev → [2] → [3] → [4] → null       (removing 3)
                  ^prev.next
after:   prev → [2] ------→ [4] → null       prev.next = prev.next.next
```

Nothing is deleted; the node just stops being reachable, and the
garbage collector does the rest.

## Complexity

- `pushFront`: **O(1)** — a list's headline advantage over an array.
- `pushBack`: **O(1)** with the `tail` pointer (**O(n)** without it).
- `toArray`: **O(n)** time, O(n) space for the result.
- `removeFirstMatch`: **O(n)** time — the *search* is linear; the
  unlink itself is O(1). No shifting, unlike deleting from an array.
- `fromArray`: **O(n)** with an O(1) `pushBack`; O(n²) without.
- **Space: O(n)** — and per value a linked list costs more than an
  array: an object header plus a pointer, versus one slot. You trade
  memory and cache locality for cheap insertion at the ends.

## Common mistakes

- **Losing the rest of the list.** Writing `this.head.value = value`
  or assigning `node.next` before you have saved the old value. When
  re-pointing anything, ask: *does something still hold the node I am
  about to orphan?*
- **`undefined` instead of `null` at the end.** `{ value }` with no
  `next` ends the list with `undefined`. A `while (node !== null)`
  loop then never terminates cleanly, and the tests check for `null`
  explicitly. Always write `next: null`.
- **Forgetting `tail` in `removeFirstMatch`.** The ghost-tail bug
  above. Either maintain the promise everywhere, or don't keep a tail
  at all — half-maintained is the only bad option.
- **Forgetting `tail` when pushing to an empty list.** `pushFront` on
  an empty list must set both ends; so must `pushBack`.
- **Removing every match instead of the first.** Return as soon as one
  node is unlinked. The name says *First*.
- **Making `fromArray` an instance method.** It has no list to act on
  yet — that's precisely what `static` means.
