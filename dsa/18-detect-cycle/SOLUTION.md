# Solution — Detect a Cycle

## The naive approach and its cost

**Remember every node you've seen.**

```js
const seen = new Set();
for (let node = head; node !== null; node = node.next) {
  if (seen.has(node)) return true;
  seen.add(node);
}
return false;
```

Correct, O(n) time — and **O(n) space**. It is a perfectly good answer
in real code, and you should be able to write it in fifteen seconds.
But the problem asks for O(1) space, and the technique that gets you
there is worth far more than this one problem.

**Count the steps.** "If I've walked more than a million nodes, it must
loop." Needs a bound you usually don't have, and is wrong for any list
longer than the guess.

**Mark the nodes.** `node.visited = true`. O(1) space in some sense,
but it *mutates the caller's data* — a rude and bug-prone move, and
useless if you have to run the check twice.

**Reverse the list and see if you come back to the head.** Cute, works,
destroys the list. Same objection.

## The insight

Forget lists for a second and think about a running track.

Two runners start together; one runs twice as fast. On a **straight**
track the fast runner reaches the end, and that's that. On a **circular**
track the fast runner cannot leave — and being faster, it eventually
laps the slow one, which means they are at the same place at the same
time.

Translate: `slow` steps one node, `fast` steps two. `fast` hitting
`null` proves the list ends. `slow === fast` proves they are both
inside a loop.

**Why they must meet, exactly.** Once both cursors are inside the loop,
look at the gap between them measured *forwards* along the loop. Every
turn, `fast` advances 2 and `slow` advances 1, so the gap shrinks by
exactly 1. A quantity that decreases by exactly one each turn cannot
skip zero — it lands on it. That is the whole proof, and it is why the
step sizes are 1 and 2: any gap-shrink of exactly 1 guarantees a
landing, whereas 1-and-3 shrinks by 2 and *could* step over zero on an
odd-sized loop.

## The approach, step by step

1. `let slow = head; let fast = head;` — both start at the front.
2. Loop while `fast !== null && fast.next !== null`. Two guards:
   - `fast !== null` — the hare already ran off a list of even length;
   - `fast.next !== null` — the hare is on the last node, so
     `fast.next.next` would throw.
   Together they say "the hare has two more nodes to move through".
3. Inside: `slow = slow.next; fast = fast.next.next;`
4. Then `if (slow === fast) return true;` — **node identity**, not
   value equality. Two different nodes holding `1` are not a meeting.
5. If the loop exits, the list ended: `return false`.

Trace the cyclic example `3 → 2 → 0 → -4 → (back to 2)`:

| turn | slow | fast | met? |
|------|------|------|------|
| init | 3    | 3    | (start together — not checked) |
| 1    | 2    | 0    | no   |
| 2    | 0    | 2    | no   |
| 3    | -4   | -4   | **yes** |

And the clean list `1 → 2 → 3 → 4`: after one turn `slow`=2, `fast`=3;
after two, `fast` is `null` — loop ends, `false`.

Note that the check happens *after* both cursors move. Checking before
the first move would compare `head` with `head` and report a cycle on
every list.

## Complexity

- **Time: O(n).** Before the loop, `slow` walks at most n nodes to
  enter it. Inside, the gap closes by one per turn and the loop is at
  most n long, so at most n more turns. Total O(n).
- **Space: O(1).** Two references. Not two per node — two, total. That
  is the entire reason this algorithm is famous.
- Nothing is written to the list, so the check is safe to run on data
  someone else owns.

## Common mistakes

- **One missing guard.** `while (fast !== null)` alone throws
  "cannot read properties of null (reading 'next')" on odd-length
  lists; `while (fast.next !== null)` alone throws on even-length ones
  and on `null`. You need both, in that order — `&&` short-circuits, so
  the order matters.
- **Comparing values.** `slow.value === fast.value` reports a cycle for
  `[1, 1, 1, 1]`. Compare the node objects.
- **Checking `slow === fast` before moving.** They start equal; every
  list would be a cycle.
- **Advancing both by one.** They stay level forever and never meet;
  the function only ever returns `false`. The *difference* in speed is
  the mechanism.
- **Advancing `fast` with `fast.next` twice in a row** as two separate
  statements without re-checking `null` in between — same crash as the
  missing guard.
- **Returning the meeting node instead of `true`.** Read the signature;
  finding *where* the loop starts is a different (excellent) problem —
  see the LEARN.md variations.
