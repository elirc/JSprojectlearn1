# 📘 Learning Guide: Detect a Cycle

Two cursors moving at different speeds — the trick that answers "does this ever end?" without remembering anything.

## 1. The problem in plain words

Every linked list you have built so far ends with `null`. But a node's
`next` is just a reference, and nothing stops it pointing *backwards*:

```
1 → 2 → 3 → 4
    ↑       |
    └───────┘
```

Walk that with the usual loop and you get `1, 2, 3, 4, 2, 3, 4, 2, ...`
forever. Your program doesn't crash; it hangs, which is worse.

The question is simply: **following `next` from the head, do you ever
reach `null`?** Return `false` if you do (a proper list), `true` if you
never would (a loop).

The catch is the budget: **two variables**. No set of visited nodes, no
counter, no scribbling on the nodes themselves.

## 2. Concepts you need first

- **Node shape and traversal** — `16-build-linked-list` and
  `17-reverse-linked-list`: `{ value, next }`, walk with
  `node = node.next`.
- **Identity vs equality** — `a === b` on objects asks *"the same
  object?"*, not *"the same contents?"*. `{v:1} === {v:1}` is `false`.
  Today that distinction is the difference between a correct answer and
  reporting a cycle for the list `[1, 1, 1]`.
- **Short-circuit `&&`** — `a !== null && a.next !== null` only
  evaluates the right side if the left is true. That is what stops the
  guard from crashing on the thing it is guarding against.
- **Space complexity** — how much *extra* memory an algorithm uses as
  the input grows. O(n) means "proportional to the input"; O(1) means
  "a fixed handful of variables, forever".

## 3. How to think about it

The honest first idea is right, and you should write it out: keep a
`Set` of nodes you've visited, and if you meet one twice, it's a cycle.
That is O(n) memory. Fine — but now ask the interesting question:

> Can I tell that I have been somewhere before, *without remembering
> where I have been?*

That sounds impossible until you change what you're looking for.
Instead of comparing against a memory, compare against **another
walker**.

Picture a running track and two runners starting together, one twice as
fast as the other.

- On a **straight** track, the fast runner reaches the far end and
  stops. Nothing dramatic happens; there is simply an end.
- On a **circular** track, the fast runner can never leave. And because
  it gains ground steadily, it eventually comes up behind the slow
  runner and lands on the same spot — it *laps* them.

So: "did the fast one reach the end?" means no cycle. "Did they meet?"
means cycle. Neither question needs a memory.

Now the natural worry: *are you sure they land on exactly the same
node, rather than stepping over each other?* Yes, and the reason is
neat. Once both are inside the loop, measure the gap from `slow`
forward to `fast`. Each turn, `fast` advances 2 and `slow` advances 1,
so that gap shrinks by exactly **1** per turn:

```
gap: 5 → 4 → 3 → 2 → 1 → 0        it lands on zero, it can't skip it
```

A number that decreases by one at a time hits zero. That is the whole
argument, and it also explains the choice of speeds: a hare moving 3
would close the gap by 2 each turn, and could hop over zero.

Two details that trip everyone up once:

- **Check after moving, not before.** Both cursors start on the head,
  so an up-front `slow === fast` would call every list cyclic.
- **Guard both hops.** `fast.next.next` reads two references. Before
  taking it, you must know `fast` exists *and* `fast.next` exists.
  Hence `while (fast !== null && fast.next !== null)`.

## 4. Common wrong turns

- **Comparing `slow.value === fast.value`.** The list `[1, 1, 1, 1]` is
  perfectly acyclic; only node identity means "the same place". One of
  the tests is exactly this.
- **Half a guard.** With only `fast !== null`, an odd-length clean list
  crashes at the last node. With only `fast.next !== null`, an
  even-length one (and `null`) crashes. Write both, in the right order,
  and let `&&` short-circuit.
- **Testing for the meeting before the first step.** Instant false
  positive on everything.
- **Same speed for both.** They stay glued together and the function
  becomes an elaborate way to return `false`.
- **A visited-set (when the problem forbids it).** Right answer, wrong
  space budget. Know it, name it, then do better.
- **Marking nodes** with `node.seen = true`. You've mutated data you
  don't own, and the second call to your function is wrong.
- **Bounding the walk by a big number.** A guess is not an algorithm.

## 5. The solution, step by step

```js
export function hasCycle(head) {
  let slow = head; // tortoise: one node per turn
  let fast = head; // hare: two nodes per turn

  while (fast !== null && fast.next !== null) {
    slow = slow.next;        // 1 step
    fast = fast.next.next;   // 2 steps
    if (slow === fast) return true; // same NODE — they met inside a loop
  }

  return false; // the hare found a null: the list really ends
}
```

Trace the cyclic list `3 → 2 → 0 → -4 → (back to 2)`:

| turn | slow | fast | met? |
|------|------|------|------|
| init | 3    | 3    | (not checked yet) |
| 1    | 2    | 0    | no   |
| 2    | 0    | 2    | no   |
| 3    | -4   | -4   | **yes** |

And the clean list `1 → 2 → 3 → 4`:

| turn | slow | fast          |
|------|------|---------------|
| init | 1    | 1             |
| 1    | 2    | 3             |
| 2    | 3    | null → loop ends, return false |

Both degenerate inputs need no special handling: `head === null` fails
the first guard immediately, and a single node fails the second.

## 6. Complexity, gently

**Time: O(n).** Two phases. First, the tortoise walks to the entrance
of the loop — at most n steps. Then the gap between them closes by one
per turn, and the gap starts smaller than the loop, which is at most n.
So at most 2n turns: O(n).

**Space: O(1).** Two references, whatever the list's length. Compare
the set-based version, which stores one entry per node — on a
ten-million-node list that is the difference between two words of
memory and hundreds of megabytes.

That contrast is the reason this algorithm has a name. It is worth
being able to say in one breath: *"Floyd's tortoise and hare: O(n)
time, O(1) space, because a fast pointer either finds the end or laps
the slow one."*

## 7. Words you learned

- **Cycle** — a path through a structure that returns to a node it
  already visited.
- **Floyd's cycle detection / tortoise and hare** — the two-speed
  pointer technique.
- **Fast and slow pointers** — the general pattern; also finds a list's
  middle, its k-th-from-last node, and more.
- **Node identity (`===` on objects)** — same object, not same
  contents.
- **Short-circuit evaluation** — `&&` skipping its right side, which is
  what makes the null guards safe.
- **In-place / non-destructive** — the algorithm neither allocates per
  node nor writes to the list.

## 8. Variations to try

1. **Where does the loop start?** After the meeting, move one cursor
   back to the head and step *both* one node at a time; they meet again
   exactly at the loop's entrance. Prove it with a little algebra on
   the distances — genuinely satisfying.
2. **How long is the loop?** From the meeting point, walk one cursor
   around until it returns. Count the steps.
3. **Find the middle node in one pass.** Same two speeds; when `fast`
   runs off the end, `slow` is at the middle. (`17`'s variation 5.)
4. **The k-th node from the end.** Start `fast` k nodes ahead, then move
   both by one until `fast` hits the end.
5. **The set-based version, timed.** Write it, then race both on a
   list of a few million nodes and watch the memory. Numbers make
   complexity real in a way tables don't.
6. **Cycle detection outside lists.** The same trick finds loops in
   `x → f(x)` sequences (random-number generators, hash chains).
   Anywhere "next" is a function, the hare works.
