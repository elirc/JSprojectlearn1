# 📘 Learning Guide: Min Stack

Augmenting a data structure: pay a little memory at every update, and expensive questions become instant.

## 1. The problem in plain words

A normal stack answers three questions instantly: *what's on top?*
(`top`), *give it to me* (`pop`), *take this* (`push`). We want a
fourth instant answer: *what's the smallest thing anywhere inside?*
(`getMin`) — without ever walking through the contents.

The catch is `pop`. Any cached "current minimum" can be *removed* by a
pop, and then you need the minimum of what remains — information a
single cached number doesn't carry. Solving that cleanly is the whole
problem.

## 2. Concepts you need first

- **Stacks** — from `13-valid-parentheses`: array + `push`/`pop`,
  last-in-first-out. Here you'll run *two* of them in lockstep.
- **Classes** — you've built classes in the js track (`29-bank-account`,
  `41-lru-cache`): `constructor`, methods, `this.` fields. `MinStack`
  is a small one.
- **The memory-for-speed trade** — `01-two-sum` spent a hashmap to
  turn O(n²) into O(n). Today we spend one extra array to turn an O(n)
  query into O(1). Same deal, new shape.
- **Invariants** — from `12-longest-substring-no-repeat`: a property
  kept true after every operation. Ours: *the two internal stacks
  always have equal length, and the top of the second is always the
  minimum of the first.*

## 3. How to think about it

Start by letting the obvious ideas fail — each failure is a clue.

**Idea 1: scan when asked.** `getMin()` loops over the array. Works,
O(n), forbidden. The clue: the answer must be *precomputed* before the
question arrives.

**Idea 2: cache one minimum.** `this.min`, updated on push. Fails on
`pop`: pop the minimum itself and the cache is stale, and the
pre-pop history that would fix it is gone. The clue is sharper now:
*we need the minimum of every prefix of the stack, kept as long as
that prefix might come back.* When does a prefix "come back"? Every
time a pop shrinks the stack. What discipline do those prefixes
follow? The most recently created snapshot is the first one needed
again. Last in, first out. **The history of minimums is itself a
stack.**

That realization is the entire solution. Alongside `values`, keep
`mins`, where `mins[i]` = the smallest of `values[0..i]`:

```
push 5:  values [5]      mins [5]
push 3:  values [5,3]    mins [5,3]     3 beats 5
push 7:  values [5,3,7]  mins [5,3,3]   7 loses; 3 carries forward
```

- `getMin()` = top of `mins`. Instant.
- `push(v)` = push `v`, and push `min(v, top of mins)`. Instant.
- `pop()` = pop both. The previous snapshot is now on top of `mins` —
  the "restored" minimum was sitting there all along. Instant.

Notice nothing is ever *recomputed*. That's the signature of the
technique — called **augmenting** a data structure: attach a little
derived data to every element at write time, keep it consistent, and
reads become free.

## 4. Common wrong turns

- **One cached min, no history.** The most common wrong submission.
  It passes any test that never pops the minimum — write the test
  that pops it (our first test does) and it collapses.
- **Recomputing on pop.** `if (popped === this.min) this.min =
  Math.min(...this.values)` — correct, but that's an O(n) scan hiding
  inside pop. The complexity requirement is part of the spec; a right
  answer at the wrong speed is a wrong answer here.
- **Letting the stacks drift.** Pushing to `mins` sometimes-but-not-
  always (or forgetting to pop it) breaks the equal-length invariant,
  and `getMin` starts describing a stack that no longer exists. If
  you choose the lockstep design, *every* push pushes both and *every*
  pop pops both — no exceptions.
- **The sparse variant, half-done.** Storing only *new* minimums in
  `mins` saves memory but obligates `pop()` to compare and
  conditionally pop `mins`, and duplicates (`push(1); push(1)`) must
  both be recorded (push when `value <= top`, not `<`). Miss either
  detail and the duplicate-min test fails. Fine variant — for later.
- **Throwing on empty.** Our contract returns `undefined` for
  `pop`/`top`/`getMin` on an empty stack. Conveniently, popping an
  empty array already returns `undefined` — don't fight the language.

## 5. The solution, step by step

```js
export class MinStack {
  constructor() {
    this.values = []; // the real stack
    this.mins = [];   // mins[i] = min of values[0..i]
  }

  push(value) {
    this.values.push(value);
    const currentMin = this.mins.length === 0
      ? value                                        // first element
      : Math.min(value, this.mins[this.mins.length - 1]);
    this.mins.push(currentMin);
  }

  pop() {
    this.mins.pop();            // rewind the snapshot history...
    return this.values.pop();   // ...and the data, together
  }

  top() {
    return this.values.length === 0
      ? undefined
      : this.values[this.values.length - 1];
  }

  getMin() {
    return this.mins.length === 0
      ? undefined
      : this.mins[this.mins.length - 1];
  }
}
```

Walk the classic sequence and watch both arrays:

| op        | values      | mins        | returns |
|-----------|-------------|-------------|---------|
| push(-2)  | [-2]        | [-2]        |         |
| push(0)   | [-2, 0]     | [-2, -2]    |         |
| push(-3)  | [-2, 0, -3] | [-2, -2, -3]|         |
| getMin()  | —           | —           | -3      |
| pop()     | [-2, 0]     | [-2, -2]    | -3      |
| top()     | —           | —           | 0       |
| getMin()  | —           | —           | -2      |

The last row is the magic moment: nobody *computed* -2. It was written
down back when 0 was pushed, waited underneath, and surfaced when the
pop rewound the history.

## 6. Complexity, gently

Every method executes a fixed handful of array-end operations —
`push`, `pop`, or reading the last index. No loops, no scans. **All
four operations are O(1)**, not amortized, not average — every single
call.

Space: `mins` mirrors `values` one-for-one, so the structure uses
about **2× the memory** of a plain stack — O(n) extra. That is the
price, paid in full, for making `getMin` free. Say the trade out loud:
*one number of storage per push buys an O(n) scan never happening.*

## 7. Words you learned

- **Augmented data structure** — a standard structure carrying extra
  derived data per element so a chosen query becomes O(1).
- **Lockstep / shadow stack** — a second stack mirroring the first's
  length, holding metadata about prefixes.
- **Prefix minimum** — the min of the first i elements; `mins` is a
  stack of prefix minimums.
- **Snapshot history** — saving "the state of an answer" at each
  update so undoing an update restores the answer for free.
- **O(1) worst case vs amortized** — these methods are constant-time
  on *every* call; compare problem 15, where only the *average* is.

## 8. Variations to try

1. **MaxStack** — same structure, `Math.max`. Should take you two
   minutes; if it takes ten, re-read section 3.
2. **The sparse min stack** — push to `mins` only when
   `value <= current min`; pop `mins` only when the popped value
   equals its top. Make the duplicate-min test pass. Compare memory.
3. **MinQueue (hard, great)** — same O(1) `getMin` but FIFO. Hint:
   after problem 15 you'll own a queue made of two stacks... and you
   now own a min-stack. Compose them.
4. **`getMin2()`** — return the *second*-smallest in O(1). What extra
   snapshot does each element need to carry?
