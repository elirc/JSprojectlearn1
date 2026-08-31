# 📘 Learning Guide: Priority Queue

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **priority queue**: a to-do list that always hands you the most urgent item next, no matter what order things were added. A normal queue is fair (first in, first out). A priority queue is *triage* — the emergency room, not the coffee shop.

```
add email-receipt (p5)
add charge-card   (p1)     lower number = more urgent
add rebuild-index (p9)
add send-otp      (p1)

next() -> charge-card   (p1, arrived first)
next() -> send-otp      (p1, arrived second)
next() -> email-receipt (p5)
next() -> rebuild-index (p9)
```

The obvious way to build one is "keep the array sorted." That works, and it is slow enough to matter. The refactor uses a **binary heap**, which never sorts anything and still always knows the winner.

## 2. Concepts you need first

### Cost that grows: O(n), O(n log n), O(n²)

**Big-O** is shorthand for "how does the work grow as the data grows?" You met it in project 41 (Map's O(1) vs array `indexOf`'s O(n)).

- **O(1)** — constant. Reading `arr[5]` costs the same on 10 items or 10 million.
- **O(log n)** — halving. Each step throws away half the remaining work. For a million items, about 20 steps.
- **O(n)** — one pass. Scanning an array.
- **O(n log n)** — the price of a good sort.
- **O(n²)** — a loop inside a loop. Doubling the data quadruples the work.

The original does an O(n log n) sort inside a loop that runs n times. That is **O(n² log n)** — worse than quadratic. You do not need to compute the exponent to feel it: run `original.js` and watch it stall for three seconds on 3,000 items.

### Comparators: an ordering rule you can pass around

`Array#sort` doesn't know what "smaller" means for your objects, so you tell it with a **comparator** — a function of two items returning a number:

```js
const tasks = [{ p: 5 }, { p: 1 }, { p: 9 }];
tasks.sort((a, b) => a.p - b.p);
console.log(tasks.map(t => t.p)); // prints: [ 1, 5, 9 ]
```

The contract: **negative** means "a comes first", **positive** means "b comes first", **0** means "tied". `a.p - b.p` produces exactly that for numbers, for free.

### Tie-breaking with `||`

When the first rule ties, fall through to the second. `||` does this beautifully, because `0` is falsy:

```js
const byUrgency = (a, b) => a.priority - b.priority || a.seq - b.seq;
console.log(byUrgency({ priority: 2, seq: 0 }, { priority: 2, seq: 1 })); // prints: -1
```

Priorities equal → `0` → falsy → evaluate the right side → arrival order decides. That single line is the rule the original wrote twice and got wrong once.

### A tree stored in a flat array (the key idea)

A **binary tree** is nodes with up to two children. You'd normally build it with objects and pointers. A heap doesn't. It stores the tree in a **plain array**, using arithmetic instead of pointers:

```
index:  0    1    2    3    4    5
value: [1,   4,   3,   9,   5,   8]

            1 (index 0)
           /          \
      4 (1)            3 (2)
      /   \            /
  9 (3)   5 (4)    8 (5)
```

Three formulas, and they are the entire data structure:

```js
const parent = (i) => (i - 1) >> 1;   // >> 1 is "divide by 2, drop the remainder"
const left   = (i) => 2 * i + 1;
const right  = (i) => 2 * i + 2;
console.log(parent(4), left(1), right(1)); // prints: 1 3 4
```

Check it against the picture: index 4 (value 5) hangs under index 1 (value 4) ✓, and index 1's children are indexes 3 and 4 ✓. Try it in a scratch file until it stops feeling like magic — the array is just the tree read row by row, left to right.

### The heap property: a much weaker promise than "sorted"

A sorted array promises: *every* item is in its final position. A heap promises only:

> **every parent comes before its two children.**

That's it. Siblings are in no particular order. `[1, 4, 3, 9, 5, 8]` is a perfectly good heap and is *not* sorted. But it does guarantee the one thing a priority queue needs: **the winner is at index 0**, always, because nothing can beat the root without beating its parent chain first.

Weaker promise → cheaper to keep. That trade is the whole lesson.

### Sift up and sift down

Two little loops maintain the property:

- **push**: put the new item at the end of the array, then **sift up** — while it beats its parent, swap with the parent. It climbs at most the height of the tree.
- **pop**: take index 0 (the answer), move the *last* item into the hole at index 0, then **sift down** — while a child beats it, swap with the better child. It sinks at most the height.

How tall is the tree? Each row holds twice as many nodes as the row above, so n items make a tree about **log2(n)** rows deep. 1,000 items → 10 rows. 1,000,000 items → 20 rows. That is why push and pop are O(log n) and why "20 swaps for a million items" is not a typo.

### Private fields and injected behaviour (recap)

`#items` is a **private field** (project 41): outside code cannot reach in and break the heap property. And the comparator arrives through the constructor rather than being hardcoded — **dependency injection**, the same idea as injecting a clock in project 46. The heap file ends up knowing nothing about tasks at all.

## 3. Walking through the original code

Two globals and a counter:

```js
var tasks = [];
var added = 0;
```

`addTask` pushes, then sorts everything:

```js
function addTask(name, priority) {
  added++;
  tasks.push({ name: name, priority: priority, seq: added });
  tasks.sort(function (a, b) { return a.priority - b.priority; });
  console.log("  added " + name + ...);   // and prints
}
```

Push is O(1). The sort is O(n log n) — and it re-examines every task, even though only the one you just pushed could possibly be out of place. Then the function prints, so the scheduling rule and the terminal are now the same function.

`showNextTask` previews the winner — with its own copy of the rule:

```js
var sorted = tasks.slice().sort(function (a, b) {
  return a.priority - b.priority || b.seq - a.seq;   // note: b.seq - a.seq
});
```

Look closely: `b.seq - a.seq`, not `a.seq - b.seq`. Ties break newest-first here and oldest-first in `addTask`. Run the file — the preview says `send-otp`, and `charge-card` runs. Two functions, two rules, one queue.

`runAll` drains with `shift()`, which re-indexes the whole array on every call (another O(n)), and prints as it goes.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: sorting to insert one item.** Imagine keeping your bookshelf alphabetical by taking every book off and re-shelving the entire collection each time you buy one. That is `sort()` inside `addTask`. The measured cost is in the output: 3,000 tasks, three-plus seconds. At 30,000 tasks it would be roughly a hundred times worse — the cost grows with the *square* of the task count, so this is the kind of code that passes every test on your laptop and takes down production on a busy day.

**Flaw 2: the same rule, written twice, already drifted.** Someone copied the comparator into `showNextTask` and "improved" the copy. Now the preview and the queue disagree about ties, and there is no way to tell which was intended — the code states both opinions with equal confidence. This is project 41's sync-rule disease in a new costume: duplicated *rules* rot exactly like duplicated *data*.

**Flaw 3: logic welded to I/O.** Every decision the scheduler makes escapes as `console.log`. You cannot write `assert.equal(scheduler.peek().name, 'charge-card')`, because `peek` doesn't return anything — it *prints*. You cannot show the queue in a web page, or write it to a log file, or count how many p1 tasks are waiting. Printing is not a side job here; it *is* the return value, and that makes every other use impossible.

## 5. Try it yourself first!

1. **Vague hint:** You never need the whole list in order. You need *one* item: the smallest. Is "put everything in order" really the question you're asking?
2. **Warmer:** What if you kept a shape where the smallest is always at index 0, and adding an item only had to fix the path between that item and the top?
3. **Warmer still:** Store a binary tree in a plain array: index 0 is the root, and the children of `i` live at `2i+1` and `2i+2`. Draw `[1, 4, 3, 9, 5, 8]` as a tree on paper.
4. **Almost the answer:** `push` = append to the end, then swap upward while you beat your parent. `pop` = remember index 0, move the last element into index 0, then swap downward with the better child while a child beats you.
5. **Design question:** should the heap know that "lower priority number is more urgent"? Or should that rule live somewhere else? Whichever you choose, write the reason as a comment — the refactor picks one on purpose.

## 6. Understanding the refactored solution

**Three formulas, no pointers:**

```js
const parent = (index - 1) >> 1;
const left = 2 * index + 1;
const right = left + 1;
```

The tree is a fiction the arithmetic maintains. There are no node objects to allocate and no links to keep consistent — the array *is* the tree.

**Sift up: climb while you outrank your parent.**

```js
#siftUp(index) {
  while (index > 0) {
    const parent = (index - 1) >> 1;
    if (this.#compare(this.#items[index], this.#items[parent]) >= 0) break;
    this.#swap(index, parent);
    index = parent;
  }
}
```

The `break` is the efficiency: the moment you're in a legal spot, you stop. Most pushes stop after a swap or two.

**Sift down: sink while a child outranks you.**

```js
let best = index;
if (left < count && this.#compare(this.#items[left], this.#items[best]) < 0) best = left;
if (right < count && this.#compare(this.#items[right], this.#items[best]) < 0) best = right;
if (best === index) return;
```

You must swap with the *better* of the two children, not just any child that beats you — swapping with the worse one would put it above its own sibling and break the property one level down. Hence "find `best` first, then swap."

**The comparator is injected**, so `heap.js` never mentions tasks. `new BinaryHeap((a, b) => b - a)` is a max-heap; the same class, zero new code. One of the tests does exactly that.

**One rule, one place:**

```js
export function byUrgency(a, b) {
  return a.priority - b.priority || a.seq - b.seq;
}
```

`peek()` and `next()` both consult the same heap, built with this one comparator. The original's disagreement isn't fixed so much as made impossible.

**The scheduler returns; `cli.js` prints.** `drain()` hands back an array of tasks. That's why the tests can say `assert.deepEqual(order.map(t => t.name), ['a', 'b'])` — the decisions are values now, not terminal output.

**The stress test earns its place.** 10,000 random numbers in, 10,000 out, asserting each is `>= ` the previous. Hand-written examples check the cases you thought of; a stress test checks the tree shapes you never imagined, at a depth of 14 levels, where sift-down bugs actually live.

## 7. Words you learned (glossary)

- **Priority queue** — a collection that always yields the most urgent item next.
- **Binary heap** — a priority queue stored as a flat array using index arithmetic.
- **Heap property** — every parent comes before both of its children.
- **Sift up / sift down** — the swap loops that restore the heap property after a push / pop.
- **Root** — index 0; always the winner.
- **Leaf** — a node with no children (the back half of the array).
- **Comparator** — a function returning negative / 0 / positive to express an ordering.
- **Tie-break** — a second rule applied when the first returns 0.
- **FIFO** — first in, first out; here, the tie-break that prevents starvation.
- **Starvation** — a task that keeps being overtaken and never runs.
- **O(log n)** — cost that grows by one step each time the data doubles.
- **O(n² log n)** — the original's cost: a sort inside a loop.
- **Dependency injection** — passing behaviour in (the comparator) instead of hardcoding it.
- **Max-heap / min-heap** — largest-first / smallest-first; the same code, different comparator.
- **Stress test** — a test that runs many random operations to find cases you'd never write by hand.

## 8. Experiments to try on the plane (no internet needed)

1. **Feel the O(n² log n).** Change the `3000` in `original.js` to `6000` and rerun. Expected: roughly four times slower, not two — doubling the input more than doubled the work. Put it back.
2. **Print the heap after each push.** In a scratch file, push `5, 3, 8, 1` into a `BinaryHeap((a,b) => a-b)`, calling `heap.toArray()` after each. Expected: `[5]`, `[3,5]`, `[3,5,8]`, `[1,3,8,5]` — and every one of them satisfies "parent ≤ children" while none of them is sorted.
3. **Make a max-heap.** `new BinaryHeap((a, b) => b - a)`, push `5,3,8,1`, pop twice. Expected: `8` then `5`. Note that you changed zero lines of `heap.js`.
4. **Break sift-down on purpose.** In your own copy, delete the `right` check so it only ever compares against the left child. Rerun the stress test. Expected: it fails with an "out of order" message — the small hand-written tests may still pass, which is precisely why the 10,000-item test exists.
5. **Sort with a heap.** Push an array of numbers into a min-heap, then pop until empty and collect the results. Expected: a sorted array. Congratulations — you implemented heapsort, an O(n log n) sort, out of parts you already had.
6. **Break the tie-break.** Change `byUrgency` to `a.priority - b.priority` only, and rerun the tests. Expected: the FIFO test fails (or passes by luck) — the `seq` field exists so that "no task gets starved" is a promise a test can hold you to.
