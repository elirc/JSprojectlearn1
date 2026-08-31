# 📘 Learning Guide: Build a Linked List

The first data structure you build out of nothing but objects and references — and the mental model that makes problems 17 and 18 easy.

## 1. The problem in plain words

An array is a row of numbered boxes sitting next to each other. To find
the 5th value the computer does one multiplication and reads the
memory — that is why `arr[5]` is instant, and also why inserting at the
front is slow: everything after it has to shuffle along.

A **linked list** gives up the numbering. Each value lives in its own
small object that also holds a reference to the next one:

```js
{ value: 1, next: { value: 2, next: { value: 3, next: null } } }
```

The list itself only remembers where the chain *starts* — the `head`.
`null` marks the end. There is no index, no length built in, no way to
jump: to reach the 5th value you follow four references.

Your job: implement the class that manages that chain — add at either
end, read it out as an array, build it from an array, and unlink the
first node with a given value.

## 2. Concepts you need first

- **Objects hold references** — the single most important idea here.
  `const a = { value: 1 }; const b = a;` copies nothing; `a` and `b`
  are two names for the same object. A linked list is that fact, used
  on purpose.
- **`null` vs `undefined`** — `null` means "deliberately nothing here,
  this is the end"; `undefined` means "nobody set this", which is a
  different (and here, buggy) statement.
- **Classes** — from `14-min-stack` and `15-queue-with-two-stacks`:
  `constructor`, methods, `this.` fields.
- **`static` methods** — a method on the class rather than on an
  instance. `LinkedList.fromArray([1,2])` needs no existing list, so it
  hangs off the class itself.
- **Loops with a moving cursor** — instead of `i++`, you will write
  `node = node.next`. Same rhythm, different vehicle.

## 3. How to think about it

Draw it. Genuinely, on paper — boxes with arrows. Every linked-list bug
you will ever have is a picture you did not draw.

```
head → [1|•] → [2|•] → [3|null]      ← null is the end
```

**Adding at the front.** Make a box, point it at the current head, call
it the new head — two moves, no walking, however long the list is. That
is a linked list's superpower.

**Adding at the back.** You need the last box. Following arrows to find
it is O(n) — wasteful, because the list could simply *remember* it. So
keep a second field, `tail`. Now `pushBack` is: point the old tail's
arrow at the new box, then move `tail` onto it.

The moment you keep `tail`, you have made a **promise**: *`tail` always
points at the last node*. Promises like this are called **invariants**,
and the art is noticing every place that could break one. Here there
are three: pushing onto an empty list (both ends become the new node),
pushing onto a non-empty list, and removing the last node.

**Removing.** To take box B out of `A → B → C`, you change *A's* arrow
to point at C. So the head is the one node you can't remove that way
(handle it separately), and to remove any other you must be standing on
the one *before* it. Hence the loop looks at `prev.next.value`, not
`node.value` — a one-step-ahead habit that returns in every list
problem.

**Walking.** Everything else is this — *start at the head; while there
is a node, do the work; step to the next*:

```js
for (let node = this.head; node !== null; node = node.next) { ... }
```

## 4. Common wrong turns

- **Secretly using an array.** `this.items = []` passes the tests and
  teaches nothing. The point is building a container out of objects
  that point at each other.
- **Ending with `undefined`.** `{ value }` leaves `next` undefined, and
  both your loop condition and the tests expect `null`. Write
  `next: null` every time you make a node.
- **Orphaning the rest of the chain.** `this.head = { value, next: null }`
  on a non-empty list throws everything else away — nothing points to
  it any more. Before overwriting a pointer, ask what it was holding.
- **The half-kept `tail` promise.** `removeFirstMatch` unlinks the last
  node but leaves `tail` pointing at it. The list still *reads*
  correctly — `toArray` uses `head` — and then the next `pushBack`
  attaches to a node that isn't in the list and the value silently
  disappears. The classic invariant bug: damage far from the mistake.
- **Removing all matches.** Return `true` the moment one node is
  unlinked — the name says *First*.

## 5. The solution, step by step

```js
export class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null; // the promise: always the LAST node
  }

  pushFront(value) {
    this.head = { value, next: this.head }; // old head hangs off the new one
    if (this.tail === null) this.tail = this.head; // was empty
  }

  pushBack(value) {
    const node = { value, next: null };
    if (this.head === null) {
      this.head = node;
      this.tail = node; // empty list: one node is both ends
    } else {
      this.tail.next = node; // link...
      this.tail = node;      // ...then move the promise
    }
  }

  toArray() {
    const values = [];
    for (let node = this.head; node !== null; node = node.next) {
      values.push(node.value);
    }
    return values;
  }

  removeFirstMatch(value) {
    if (this.head === null) return false;

    if (this.head.value === value) {        // the head is special:
      this.head = this.head.next;           // nothing points at it
      if (this.head === null) this.tail = null;
      return true;
    }

    let prev = this.head;                   // stand one step BEFORE
    while (prev.next !== null) {
      if (prev.next.value === value) {
        if (prev.next === this.tail) this.tail = prev; // keep the promise
        prev.next = prev.next.next;         // splice it out
        return true;
      }
      prev = prev.next;
    }
    return false;
  }

  static fromArray(values) {
    const list = new LinkedList();
    for (const value of values) list.pushBack(value);
    return list;
  }
}
```

The splice, drawn — removing `3` from `[2,3,4]`:

```
before:  prev=[2|•] → [3|•] → [4|null]
after:   prev=[2|•] ───────→ [4|null]
```

Nobody deletes the `[3]` object; it just becomes unreachable and the
garbage collector cleans it up — "removing" from a linked list means
*stopping anything from pointing at it*.

## 6. Complexity, gently

| operation          | linked list | array (for comparison) |
|--------------------|-------------|------------------------|
| add at front       | **O(1)**    | O(n) (`unshift` shifts everything) |
| add at back        | **O(1)** with `tail` | O(1) (`push`) |
| read the i-th      | O(n) (walk) | **O(1)** (`arr[i]`)   |
| remove a found node| **O(1)** (unlink) | O(n) (`splice` shifts) |
| find a value       | O(n)        | O(n)                   |

Neither structure wins outright — that is the actual lesson. Lists are
for cheap insertion and removal when you are *already standing at the
spot*; arrays are for indexing and fast scanning (their values sit
together in memory, which real hardware loves). Space is O(n) for both,
but a list costs more per value: an object header plus a reference,
versus one array slot.

## 7. Words you learned

- **Node** — one `{ value, next }` box.
- **Head / tail** — the first and last nodes; `null` for both when the
  list is empty.
- **Singly linked** — each node points forward only. (Doubly linked
  nodes also carry `prev`.)
- **Traversal** — walking the chain with `node = node.next`.
- **Splice / unlink** — bypassing a node by re-pointing the previous
  node's `next`.
- **Invariant** — a promise the structure keeps after every operation,
  like "`tail` is always the last node".
- **Dangling / stale pointer** — a reference to something no longer in
  the structure. The half-kept `tail` is one.

## 8. Variations to try

1. **`size` in O(1)** — a counter field; same invariant discipline as
   `tail`. Which methods must update it?
2. **`get(i)`** — return the i-th value, or `undefined`. Feel the O(n)
   that arrays give you for free.
3. **`insertAfter(target, value)`** — find the first `target` node and
   splice a new node in behind it.
4. **`removeAll(value)`** — remove *every* match in one pass. Don't
   advance `prev` after a removal, and consecutive matches take care
   of themselves.
5. **Doubly linked** — add `prev` to every node: removal needs no
   trailing pointer, but every operation now has two arrows to keep
   honest. (The structure behind the js track's `41-lru-cache`.)
6. **Make it iterable** — implement `[Symbol.iterator]()` so
   `for (const v of list)` works and `[...list]` replaces `toArray`.
