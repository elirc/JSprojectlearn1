# 📘 Learning Guide: Reverse a Linked List

Pointer surgery: rewiring a structure while you are standing inside it, without losing your grip on the part you haven't reached yet.

## 1. The problem in plain words

You are handed the first node of a chain:

```
head → [1|•] → [2|•] → [3|null]
```

Turn every arrow around, so it becomes:

```
[1|null] ← [2|•] ← [3|•] ← newHead
```

which read left-to-right is `3 → 2 → 1 → null`. Return the node holding
`3`, because that is now the front.

You must do it with a loop, in one pass, using the same node objects —
no new nodes, no array of values on the side, no recursion. Just
arrows.

## 2. Concepts you need first

- **Node shape and traversal** — `16-build-linked-list`: nodes are
  `{ value, next }` with `null` at the end, and you walk them with
  `node = node.next`.
- **References, not copies** — assigning `a.next = b` does not copy
  `b`; it points at it. Overwriting `a.next` does not destroy anything
  either — it just stops pointing at the old thing.
- **Reachability** — the only way to reach a node is for something to
  point at it. If nothing does, it is gone (JavaScript's garbage
  collector takes it away). This is the whole hazard of today's
  problem.
- **Multiple cursors** — `10-valid-palindrome-two-pointers` and
  `11-container-most-water` used two pointers over an array. Same idea
  here, except the pointers are node references and one of them is a
  *saved* value rather than a position.

## 3. How to think about it

Look at one node in isolation. Node `2` currently points at `3`. After
the reversal it must point at `1`. Where is `1`? *Behind you* — you
walked past it a moment ago. A singly linked node has no arrow back,
so the only way to still have `1` is to have **kept it in a variable**.

That gives the shape of the loop: as you walk, carry the previous node
with you.

```js
let prev = null;      // nothing comes before the first node
let current = head;   // the node whose arrow we are about to flip
```

Now picture the list mid-reversal. It is two lists:

```
prev:    2 → 1 → null          (already reversed, grows leftward)
current: 3 → null              (untouched, shrinks)
```

Each turn of the loop moves exactly one node from the front of
`current` to the front of `prev`. When `current` runs out, `prev` is
the finished, reversed list — and its front is the node you return.

**Now the trap**, and it is the reason this problem is a rite of
passage. The obvious move is:

```js
current.next = prev; // flip the arrow
current = current.next; // step forward... to WHERE?
```

`current.next` is no longer the next node — you just overwrote it with
`prev`. You have walked backwards into the part you already reversed.
Worse, nothing points at the rest of the list any more; it is
unreachable, gone.

So: **save the way forward before you destroy it.**

```js
const nextNode = current.next; // 1. save
current.next = prev;           // 2. flip
prev = current;                // 3. advance prev
current = nextNode;            // 4. advance current
```

Four lines, one legal order. The habit generalises far beyond this
problem: *before overwriting a reference, ask what it was the only way
to reach.*

A useful physical image: you are crossing a stream on stepping stones
and you have to pick up each stone behind you as you go. You must have
your foot on the next stone before you lift the one you're standing on.

## 4. Common wrong turns

- **Flipping before saving.** The mistake above. Symptom: the result is
  one or two nodes long, or the test hangs. Cure: the temporary
  variable, every time.
- **Returning the wrong variable.** At the end `current` is `null` and
  `head` is the *last* node. The new head is `prev`. Say it aloud as
  you type the `return`.
- **`prev` starting as `head` (or `head.next`).** Then the old head's
  arrow points at itself and the list contains a cycle — the very thing
  problem 18 exists to detect. `prev` starts as `null`, which is also
  exactly what makes the old head become a proper end.
- **Looping on `current.next !== null`.** The last node never gets
  flipped, so the result loses its front node — and an empty list
  crashes with "cannot read properties of null". Loop while `current`
  itself is not null.
- **Copying values into an array and rebuilding.** It produces the
  right sequence with the wrong objects and O(n) extra space. One test
  checks node identity precisely because this shortcut is so tempting.
- **Reaching for recursion first.** It works and it is pretty, but the
  iterative version is the one you want in your fingers — it is O(1)
  space and it never blows the stack on a million-node list.

## 5. The solution, step by step

```js
export function reverseList(head) {
  let prev = null;      // the reversed part (starts empty)
  let current = head;   // the untouched part

  while (current !== null) {
    const nextNode = current.next; // 1. save the way forward
    current.next = prev;           // 2. flip this arrow
    prev = current;                // 3. reversed part grew by one
    current = nextNode;            // 4. move on
  }

  return prev; // current is null; prev is the old tail = the new head
}
```

Trace `1 → 2 → 3`, watching the two halves:

| step | prev             | current      | nextNode |
|------|------------------|--------------|----------|
| init | null             | 1 → 2 → 3    | —        |
| 1    | 1 → null         | 2 → 3        | 2        |
| 2    | 2 → 1 → null     | 3            | 3        |
| 3    | 3 → 2 → 1 → null | null         | null     |

Check the edge cases against the code rather than trusting them:

- `head === null`: the `while` condition is false immediately, and it
  returns `prev`, which is `null`. Correct, with no special case.
- one node: one iteration sets its `next` to `null` (already true),
  `prev` becomes that node, `current` becomes `null`. Returns the same
  node. Correct, with no special case.

Good algorithms usually earn their edge cases like this instead of
bolting on `if` statements. If yours needs three guards at the top, look
for the version that doesn't.

## 6. Complexity, gently

**Time: O(n).** The loop runs once per node, and each iteration is four
assignments — a fixed cost. Ten nodes, ten iterations; a million nodes,
a million.

**Space: O(1).** This is the part worth noticing. However long the list
is, you use exactly three variables: `prev`, `current`, `nextNode`.
Nothing accumulates. Compare:

| approach          | time | extra space | same nodes? |
|-------------------|------|-------------|-------------|
| three-pointer loop| O(n) | **O(1)**    | yes         |
| array + rebuild   | O(n) | O(n)        | no          |
| recursion         | O(n) | O(n) stack  | yes         |

"In place, O(1) space" is a phrase interviewers listen for, and this is
the cleanest example of it you will meet.

## 7. Words you learned

- **In place** — transforming a structure using only a constant amount
  of extra memory, rather than building a copy.
- **Three-pointer walk** — the `prev`/`current`/`next` idiom; the
  standard tool for rewiring singly linked lists.
- **Pointer surgery** — reassigning references to restructure data
  without moving the data itself.
- **Losing the tail** — overwriting the only reference to the rest of a
  structure, making it unreachable.
- **Sentinel `null`** — using `null` as the "nothing here" marker that
  both starts `prev` and terminates the list.

## 8. Variations to try

1. **Recursive reversal.** `reverseList(head.next)` reverses everything
   behind the first node; then `head.next.next = head; head.next = null`
   attaches it. Base case: `head === null || head.next === null`.
   Compare the space cost with the loop.
2. **`reverseBetween(head, m, n)`** — reverse only positions m..n and
   stitch the piece back in. The same four lines, plus careful
   bookkeeping at the seams.
3. **Reverse in groups of k** — reverse each block of k nodes, leave a
   short final block alone. Builds directly on variation 2.
4. **Palindrome check on a list** — find the middle (variation 5),
   reverse the second half, compare the halves. O(1) space, and it
   reuses everything here.
5. **Find the middle in one pass** — one pointer stepping one node at a
   time, another stepping two. When the fast one falls off the end, the
   slow one is at the middle. Keep that trick warm: problem 18 is
   entirely about it.
6. **Add a `LinkedList#reverse()`** to your class from problem 16 — and
   remember to swap `head` and `tail` while you are at it.
