# 📘 Learning Guide: Queue with Two Stacks

Building one data structure out of another — and meeting *amortized* cost, the idea that an occasional expensive step can still be cheap on average.

## 1. The problem in plain words

Two ways to hold a line of waiting things:

- A **stack** is a pile of plates. You add on top, you take from the
  top. The last thing in is the first thing out — **LIFO**.
- A **queue** is a line at a shop. You join at the back, you're served
  from the front. First in, first out — **FIFO**.

You have stacks. You need a queue. The only operations you may use on
your storage are `push` (add on top), `pop` (take from the top), and
"look at the top". Reaching the *bottom* of a stack — which is exactly
where the front of the queue lives — is not something a stack can do.

So the job is: get at the bottom of a pile without being allowed to
reach into it.

## 2. Concepts you need first

- **Stacks** — `13-valid-parentheses` and `14-min-stack`: a plain array
  used only with `push`/`pop`. That is all a stack is.
- **Classes** — `14-min-stack` again: `constructor`, methods, `this.`
  fields to hold state between calls.
- **Two structures in cooperation** — `14-min-stack` ran two stacks in
  *lockstep* (same length, always). Today's two stacks are the
  opposite: they take turns, and are almost never both busy.
- **Amortized cost** (new today) — the average cost per operation over
  a long run, when individual operations differ wildly. Section 6
  unpacks it.

## 3. How to think about it

Start with the physical picture. Plates 1, 2, 3 are stacked with 3 on
top. You want plate 1. You are only allowed to lift the top plate. So
you lift them off one at a time and set them down in a new pile:

```
pile A: 1 2 3  (3 on top)      pile B: (empty)
lift 3 → put on B              pile B: 3
lift 2 → put on B              pile B: 3 2
lift 1 → put on B              pile B: 3 2 1   (1 on top!)
```

Moving a pile plate-by-plate **turns it upside down**. The oldest item
was buried; now it is on top, where a stack can actually reach it.
That is the whole mechanism, and it is worth doing with real objects
once if it does not click.

Now the design question: *when* do you flip? The tempting answer —
"whenever I need to dequeue, flip, take one, flip back" — works and is
slow, because you move the entire queue twice for one value.

The better answer comes from noticing what pile B already is: **a queue
in serving order**. Everything in it is ready to leave, oldest on top.
So don't flip back. Serve straight from B until B is empty; only then
flip A across again.

And that gives the safety rule, which is the real insight: **refill B
only when B is empty**. If B still holds values, they are older than
anything in A, and pouring A on top would let newcomers cut the line.
The emptiness of B is precisely the moment when nothing can be cut in
front of.

Two names make this easy to hold in your head: `inbox` (where arrivals
pile up) and `outbox` (where departures are served from).

## 4. Common wrong turns

- **Flipping back after every dequeue.** The instinct to "tidy up" —
  to keep everything in one canonical place — is what makes this O(n)
  per operation. Letting the structure stay temporarily split *is* the
  optimization.
- **Refilling too eagerly.** Any refill that happens while the outbox
  is non-empty reorders the queue. Guard it with
  `if (this.outbox.length === 0)` and nothing else.
- **`isEmpty()` looking at one stack.** Right after a refill, `inbox`
  is empty and the queue is full. Before the first refill, `outbox` is
  empty and the queue is full. Only *both* empty means empty.
- **Forgetting the refill in `peek()`.** `peek` feels read-only, but it
  may be the first call after a burst of enqueues, when the front
  value is still buried at the bottom of the inbox.
- **Reaching for `shift()`.** It solves the problem and dissolves the
  lesson — and it is O(n) per call, so it isn't even a good cheat.

## 5. The solution, step by step

```js
export class Queue {
  constructor() {
    this.inbox = [];  // arrivals pile up here (top = newest)
    this.outbox = []; // departures served from here (top = oldest)
  }

  enqueue(value) {
    this.inbox.push(value); // always O(1)
  }

  refill() {
    // ONLY when the outbox is empty — otherwise newcomers cut the line
    if (this.outbox.length === 0) {
      while (this.inbox.length > 0) {
        this.outbox.push(this.inbox.pop()); // pouring reverses the order
      }
    }
  }

  dequeue() {
    this.refill();
    return this.outbox.pop(); // empty array pops to undefined — free edge case
  }

  peek() {
    this.refill();
    return this.outbox[this.outbox.length - 1]; // missing index → undefined
  }

  isEmpty() {
    return this.inbox.length === 0 && this.outbox.length === 0;
  }
}
```

Watch the interleaved case, the one that catches sloppy versions:

| op          | inbox   | outbox  | returns |
|-------------|---------|---------|---------|
| enqueue a   | [a]     | []      |         |
| enqueue b   | [a, b]  | []      |         |
| dequeue     | []      | [b]     | a       |
| enqueue c   | [c]     | [b]     |         |
| dequeue     | [c]     | []      | b       |
| dequeue     | []      | []      | c       |

Row 4 is the interesting one: the queue is "split in half" across two
stacks and that is completely fine. Row 5 serves `b` from the outbox
without touching `c` at all.

## 6. Complexity, gently

`enqueue` is obviously O(1) — one array push. `dequeue` looks scarier:
sometimes it does nothing but a pop, and sometimes it moves 200 values
across. Is that O(1) or O(n)?

Both, depending on the question. **A single call can be O(n)** (the one
that triggers a refill). But ask instead: how much work does one
*value* cause over its whole lifetime?

1. pushed onto the inbox (1 operation)
2. popped off the inbox (1)
3. pushed onto the outbox (1)
4. popped off the outbox (1)

Four operations. Ever. No value is transferred twice, because once it
reaches the outbox it never goes back. So *n* values cost at most 4n
operations total — O(n) for the whole run, which is **O(1) per
operation on average**. That average-over-a-run guarantee is called
**amortized O(1)**.

The honest way to say it: *"amortized O(1); worst case O(n) for a
single dequeue."* Compare `14-min-stack`, where every single call was
O(1) with no averaging — a strictly stronger promise. Knowing which
kind of guarantee you have is the point.

Space is O(n): each value sits in exactly one of the two stacks.

## 7. Words you learned

- **FIFO / LIFO** — first-in-first-out (queue) versus
  last-in-first-out (stack).
- **Enqueue / dequeue** — the queue's words for add and remove.
- **Amortized complexity** — the average cost per operation across a
  sequence, when the cost of individual operations varies.
- **Worst case vs amortized** — one call may be slow even when the
  average is fast; say which one you mean.
- **Lazy evaluation** — postponing work until it is unavoidable (here:
  refilling only when the outbox runs dry). The same instinct behind
  caches and memoization.

## 8. Variations to try

1. **`size()` in O(1)** — return how many values are queued, without
   looping. What must `enqueue` and `dequeue` maintain?
2. **Stack from two queues** — the mirror puzzle. One of `push` or
   `pop` becomes O(n); decide which and defend the choice.
3. **`toArray()` in front-to-back order** — read `outbox` from the top
   down, then `inbox` from the bottom up, without disturbing either.
4. **MinQueue** — combine this with `14-min-stack`: two *min* stacks
   give a queue whose minimum is amortized O(1). (`14`'s variation 3
   pointed here.)
5. **Ring buffer** — a fixed-size array with `head`/`tail` indices that
   wrap around, giving true O(1) worst case. Compare the trade-offs.
