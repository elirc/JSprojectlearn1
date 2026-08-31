# 📘 Learning Guide: Top K Frequent Elements

Keeping a shortlist is cheaper than ranking everything — and a heap is how you keep one.

## 1. The problem in plain words

You have a pile of values with repeats. Report the `k` values that appear
most often — the values themselves, not how many times they appeared.

The order of your answer doesn't matter; `[1, 2]` and `[2, 1]` both pass,
because the tests sort before comparing. And the inputs never have a
frequency tie straddling the k boundary, so you need no tie-breaking rule.

## 2. Concepts you need first

**Counting with a Map (dsa/07, dsa/08).** One pass, `counts.set(value,
(counts.get(value) ?? 0) + 1)`. Nothing new — but notice it turns your n
values into `m` distinct entries, and `m` is what matters after that.

**Why sorting is O(n log n) (dsa/21).** Merge sort earned that bound doing n
work across log n levels, and any comparison sort pays something like it. So
"sort the counts" is not free — and here you'd be paying for information you
will never read.

### The binary heap, from scratch

**A heap is a complete binary tree stored in a flat array.** No node objects,
no `left`/`right` pointers — nothing like dsa/24's trees. Just an array, plus
arithmetic that *pretends* the array is a tree. Here is one array drawn both
ways:

```
index:   0   1   2   3   4   5      parent(i) = (i - 1) >> 1
array: [ 2,  5,  4,  9,  7,  6 ]    left(i)   = 2 * i + 1
                                    right(i)  = 2 * i + 2
                2                 <- index 0
              /   \
             5     4              <- index 1, 2
            / \   /
           9   7 6                <- index 3, 4, 5
```

Check index 1: its children are at 3 and 4, holding 9 and 7; its parent is at
`(1 - 1) >> 1 = 0`, holding 2. The picture and the array are the same object.
*Complete* means every level is full except possibly the last, which fills
left to right — that's what keeps the index math gap-free.

**The heap property.** In a **min-heap**, every parent's key is `<=` both of
its children's. Check it above: 2 ≤ 5 and 2 ≤ 4; 5 ≤ 9 and 5 ≤ 7; 4 ≤ 6.

Be clear about what that does *not* give you. The array is **not sorted** —
`[2,5,4,9,7,6]` plainly isn't — and siblings are unordered (5 sits before 4).
The *only* guarantee is that **index 0 holds the minimum**. A heap is a
deliberately weak ordering, and being weak is why it stays cheap.

**push — append, then bubble up.** Put the new item at the end (the only slot
that keeps the tree complete), then walk it upward: while it is smaller than
its parent, swap. Pushing `3` above appends it at index 6, whose parent is
index 2 holding 4; 3 < 4 so they swap; the new parent is index 0 holding 2,
and 2 ≤ 3, so it stops:

```
[2, 5, 4, 9, 7, 6]  push 3  ->  [2, 5, 3, 9, 7, 6, 4]
```

At most one swap per level, and a complete tree of n nodes has about log₂ n
levels — so **O(log n)**.

**pop — take the root, promote the last item, sink down.** The answer is
index 0. Removing it leaves a hole, so move the **last** element into slot 0
and shrink the array. Why the last one and not a child? It is the only slot
you can vacate without punching a hole in the middle of a complete tree. Then
walk it downward: while either child is smaller, swap with the **smaller**.

```
[2, 5, 4, 9, 7, 6]  pop  ->  returns 2, leaving [4, 5, 6, 9, 7]
```

(6 was promoted to the root, then sank past 4.) Also **O(log n)**.

**Why not just a sorted array?** It gives you the minimum in O(1) — better
than a heap. But inserting costs O(n), because everything after the insertion
point shifts; a heap is O(log n) for *both*, and when you insert n times that
difference is the whole ballgame. dsa/14's min-stack kept a running minimum
cheaply for one access pattern; a heap generalises that trick.

## 3. How to think about it

Split the problem in two: **count**, then **select**. Counting is dsa/07;
selection is where the thinking is.

The reframe that cracks it: don't rank everything — **keep a shortlist of
size k**. Walk the counted entries and ask each one, "are you better than the
worst thing on my list?" That needs one capability from the shortlist: cheap
access to its weakest member, plus the ability to swap it out. That is a
min-heap — and it is why you use a *min*-heap to find the *maximum* items.
The item you touch constantly is the one about to be evicted, not the winner.

Here is the real trace for `[1, 1, 1, 2, 2, 3]` with `k = 2`. Counts come out
`1→3`, `2→2`, `3→1`; each heap is shown as `value:count`, index 0 first:

```
push 1:3          -> heap [1:3]                    size 1
push 2:2          -> heap [2:2, 1:3]               size 2
push 3:1          -> heap [3:1, 1:3, 2:2]          size 3
  size > 2, pop   -> evicts 3:1, heap [2:2, 1:3]
drain             -> [2, 1]
```

Watch index 0 in the third line: pushing `3:1` bubbled it straight to the
front, because count 1 is the smallest — so when the heap overflowed, the
thing to discard was already sitting exactly where `pop` looks.

The invariant: **after every iteration the heap holds the k biggest counts
seen so far.** True vacuously before the first push, preserved by each
push-then-maybe-pop, and when the loop ends "so far" means "overall."

## 4. Common wrong turns

- **Reaching for a max-heap.** It puts your *best* item at index 0 — the one
  you'd never evict — and finding the worst survivor becomes a linear scan.
  You want the chopping block at your fingertips, not the trophy.
- **Returning counts instead of values.** `pop()` gives `{ value, count }`.
- **`if (size >= k) pop()`.** One eviction too eager: you return `k - 1`
  values. It must be `>`, checked *after* the push.
- **Sinking toward the larger child.** `_sinkDown` must swap with the
  **smaller** child; the larger one re-breaks the property a level down, and
  it hides until an input has three levels.
- **Forgetting to shrink the array in `pop`,** leaving the last item twice.
- **Assuming the heap array is sorted.** It isn't, ever. Reading `items[1]`
  expecting the second-smallest is not a promise a heap makes.

## 5. The solution, step by step

**Step 1 — guard.** `if (k <= 0) return [];` — otherwise the `size() > k`
check pops from an empty heap.

**Step 2 — count.** One pass into a `Map`:

```js
const counts = new Map();
for (const value of nums) counts.set(value, (counts.get(value) ?? 0) + 1);
```

**Step 3 — write the `MinHeap`.** A class holding `this.items = []`, ordered
by `item.count`, with `size()`, `peek()`, `push()`, `pop()`, and the two
walkers `_bubbleUp(i)` and `_sinkDown(i)` from section 2. Test it by hand on
five numbers before you trust it with anything.

**Step 4 — the shortlist loop.**

```js
for (const [value, count] of counts) {
  heap.push({ value, count });
  if (heap.size() > k) heap.pop();
}
```

**Step 5 — drain.** `while (heap.size() > 0) out.push(heap.pop().value);`
Order is unspecified, so you're done. (Values happen to emerge in ascending
count order — a side effect, not a contract.)

Run the tests: `node --test dsa/29-top-k-frequent/attempt.test.js`.

## 6. Complexity, gently

Counting is O(n) and nobody can avoid it. The interesting part is the
selection over `m` distinct values. Take n = 1,000,000 log lines with k = 10:

| approach | cost | rough operations |
|----------|------|------------------|
| sort every distinct count | O(n log n) | 1e6 × 19.9 ≈ **20,000,000** |
| min-heap capped at k | O(n log k) | 1e6 × 3.3 ≈ **3,300,000** |
| bucket by frequency | O(n) | **1,000,000** |

The heap's `log k` is a *constant* 3.3 no matter how much data arrives, while
sorting's `log n` grows with the pile. The honest caveat: if `k` were 500,000
instead of 10, `log k` and `log n` would be nearly equal and the heap would
win nothing. The heap is for **small k, large data**.

**Space:** O(m) for the `Map` — worst case O(n) if every value is distinct —
plus O(k) for the heap. The `Map` dominates.

The heap has one advantage bucketing can't match: it never needs the whole
dataset at once. Feed it a stream of a billion events and it still holds just
`k` items — which is why "top k with a heap" is the answer interviewers
listen for even though bucketing is asymptotically faster.

## 7. Words you learned

- **Binary heap** — a complete binary tree kept in a flat array, maintaining
  a weak ordering cheaply.
- **Complete binary tree** — every level full except the last, which fills
  left to right; what makes the index arithmetic gap-free.
- **Heap property** — every parent ≤ both children (min-heap). Guarantees
  only that index 0 is the minimum; says nothing about siblings.
- **Bubble up / sink down** — the O(log n) repairs after a push and a pop.
- **Priority queue** — the interface a heap implements: "give me the most
  important item next," for whatever "important" means.
- **Streaming** — data arriving over time that can't be held all at once;
  where bounded-memory tricks stop being optional.
- **O(n log k)** — linear work with a *fixed* logarithmic factor set by how
  many answers you want, not by how much data you have.

## 8. Variations to try

1. **The bucket method.** A count can never exceed `nums.length`, so make an
   array `buckets` of that length + 1 and put each value at
   `buckets[itsCount]`. Walk it from the back until you have `k`. O(n), no
   heap, no comparisons — and the answer many interviewers are hoping for.
2. **Quick-select instead.** Put the `[value, count]` pairs in an array and
   use dsa/22's partition to find the k-th largest count, then take
   everything on its good side. O(m) average, reusing machinery you own.
3. **Export the `MinHeap` and unit-test it alone** — push 20 numbers
   scrambled, pop them all, assert they come out ascending. That's heap-sort,
   and it proves your two walkers in isolation.
4. **Turn it into a max-heap.** Exactly one comparison flips. Which line?
   Then convince yourself why it's the *wrong* tool for this problem.
5. **Return `[value, count]` pairs sorted by count descending.** A different
   contract, forcing the tie-breaking question this problem lets you dodge.
