# 14 — Min Stack

Build a stack that can also report its **smallest element** — and every
operation, including that one, must be **O(1)**. No scanning allowed.

## Signature

```js
export class MinStack {
  push(value) {}  // add value on top
  pop() {}        // remove AND return the top value (undefined if empty)
  top() {}        // return the top value without removing (undefined if empty)
  getMin() {}     // return the smallest value currently in the stack
                  // (undefined if empty) — in O(1), no loops!
}
```

Values are numbers. Duplicates are allowed and must be handled
correctly (pushing the minimum twice, then popping once, must NOT
lose the minimum).

## Worked examples

**Example 1 — the classic sequence:**

```js
const s = new MinStack();
s.push(-2); s.push(0); s.push(-3);
s.getMin(); // -3
s.pop();    // -3  (pop returns the removed value)
s.top();    // 0
s.getMin(); // -2  ← the old minimum "comes back" after the pop
```

**Example 2 — duplicated minimum:**

```js
const s = new MinStack();
s.push(3); s.push(1); s.push(1);
s.getMin(); // 1
s.pop();    // 1
s.getMin(); // 1  ← still there: only ONE copy of the min was removed
s.pop();    // 1
s.getMin(); // 3
```

**Example 3 — min rises and falls:**

```js
const s = new MinStack();
s.push(5);  s.getMin(); // 5
s.push(3);  s.getMin(); // 3
s.push(7);  s.getMin(); // 3   (7 changes nothing)
s.pop();    s.getMin(); // 3
s.pop();    s.getMin(); // 5   (the 3 left, 5 rules again)
```

## Constraints & edge cases

- All four methods O(1) — `getMin` may not loop over the stack.
- `pop`, `top`, `getMin` on an empty stack return `undefined` (don't throw).
- Duplicate minimums: popping one copy must not forget the others.
- Negative numbers are normal citizens.
- Extra memory IS allowed — that's the whole trick.

## Hints

Take them one at a time.

<details><summary>Hint 1 (nudge)</summary>

A single variable `this.min` fails at `pop`: when the minimum itself is
popped, what's the new minimum? To answer without scanning you'd need
the *previous* minimum... and the one before that... a history.
</details>

<details><summary>Hint 2 (direction)</summary>

A history where you only ever add to the end and un-do from the end —
that's a second stack. Keep it exactly in step with the main one.
</details>

<details><summary>Hint 3 (the key insight)</summary>

Store, for every element, "the minimum of everything from the bottom
up to and including me." Pushing: the new entry is
`Math.min(value, previous entry)`. Popping both stacks together makes
the old minimum reappear automatically — no recomputation ever.
</details>

<details><summary>Hint 4 (nearly the algorithm)</summary>

Two arrays: `values` and `mins`, always the same length.
`push(v)`: push `v` to values; push `mins.length ? Math.min(v, last of mins) : v` to mins.
`pop()`: pop both, return the popped value. `top()`: last of values.
`getMin()`: last of mins. Empty checks return `undefined`.
</details>

## Run

```
node --test dsa/14-min-stack/attempt.test.js
```
