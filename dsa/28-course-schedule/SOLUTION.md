# Solution walkthrough — Course Schedule

## The naive approach and its cost

The honest first idea is to *try orderings*. Pick a course you're allowed to
take, take it, recurse; if you get stuck, back up and try a different pick.
That's dsa/23's backtracking applied to scheduling, and it does answer the
question — after examining up to **n!** orderings. Twelve courses is already
half a billion permutations. Unusable, and worse, it's answering a much
harder question ("find me an order") in order to answer an easy one ("does
one exist?").

The second idea is closer: "a cycle means someone is their own ancestor, so
for each course, search forward from it and see if you come back to it."
That's n searches over the whole graph — O(V × (V + E)). Correct, and merely
wasteful rather than catastrophic, but it re-walks the same subgraph over and
over, exactly the smell dsa/26 taught you to distrust.

Neither is needed. There's a linear answer.

## The insight

**Stop looking for cycles. Take courses greedily and count how many you
manage.**

Ask what unblocks a schedule: a course with **no outstanding prerequisites**.
Take it. That can only *help* — finishing a course never makes another course
harder — so there is no risk in taking every available course as soon as it
becomes available, and no need to backtrack. Some other courses were waiting
on it; they're now waiting on one fewer thing, and any that reach zero become
available in turn.

Run that to exhaustion and one of two things happens:

- you take all `numCourses` of them — the schedule works, and the order you
  took them in is a **topological order**;
- you stall with courses left over. And here's the punchline: **stalling
  is the cycle**. If courses remain but none has in-degree 0, every leftover
  course is waiting on another leftover course. Follow those "waiting on"
  links from any leftover course — you can always take another step, and the
  set is finite, so you must eventually return somewhere you've been. A
  closed loop of mutual prerequisites. No ordering can ever break it.

So you never search for a cycle. You just count, and let the count tell you.

## The approach, step by step

1. **Build the adjacency list, flipped.** For each `[a, b]`,
   `adjacency[b].push(a)`. You store "who is waiting on `b`", because that's
   the question you'll ask when `b` is finished — never "what does `a` need",
   which you'd have to scan for.
2. **Build the in-degree array.** For the same pair, `inDegree[a]++`. This is
   the count of prerequisites `a` still owes. Duplicate pairs raise it twice
   and get decremented twice, which is why they need no special handling.
3. **Seed the queue** with every course whose in-degree is 0. There may be
   several, or none — none, with courses remaining, means the answer is
   already `false` and the loop below will simply never start.
4. **Drain the queue.** Take the front course, `taken++`, and for each
   `dependent` in `adjacency[course]`, decrement `inDegree[dependent]`; if it
   hits exactly 0, push it. "Exactly 0" matters — `<= 0` would re-queue a
   course whose in-degree went negative through a bug, and hide the bug.
5. **Use a moving `head` index**, not `shift()`. Same reason as dsa/24's
   level order: `shift()` re-indexes the array each call, turning an O(V)
   drain into O(V²).
6. **Return `taken === numCourses`.**

Trace the failing case `canFinish(2, [[1,0],[0,1]])`: `inDegree` is `[1, 1]`,
so nothing seeds the queue, the loop never runs, `taken` is 0, and 0 ≠ 2 →
`false`. The self-loop `[[0,0]]` is the same story with one course:
`inDegree[0]` is 1, and only course 0 could ever clear it.

## Complexity

- **Time O(V + E)**, where `V = numCourses` and `E = prereqPairs.length`.
  Building the two structures walks the pairs once. Each course enters the
  queue at most once (it's pushed only at the instant its in-degree becomes
  0, which happens once) and is dequeued at most once. Each dequeue walks
  that course's outgoing edges, and across the whole run every edge is walked
  exactly once. For the 500-course chain in the tests: about 1,000
  operations.
- **Space O(V + E)**: the adjacency lists hold one entry per pair, the
  in-degree array and the queue hold one entry per course.
- Compare the naive alternatives: O(n!) for "try every order", O(V × (V + E))
  for "search forward from every course". Linear is not a small win here, it
  is the difference between a build system that resolves 50,000 packages
  instantly and one that never finishes.

## Common mistakes

- **Reading the pair backwards.** `[a, b]` is "a requires b", so the edge is
  `b → a` and the in-degree belongs to `a`. Build it the other way and you
  compute the answer for the reversed graph. It has the same *cyclicity*, so
  most tests still pass — which is exactly what makes this bug survive.
- **`if (inDegree[d] <= 0)` instead of `=== 0`.** With `<=`, any course whose
  count goes negative gets re-queued, `taken` overshoots, and a cyclic graph
  can report `true`.
- **Using `shift()` for the queue.** Correct, quadratic.
- **Only seeding the queue with course 0**, or assuming the graph is
  connected. Disconnected components are normal; seed with *every* zero.
- **Returning `queue.length === numCourses`** instead of counting. It happens
  to work with a moving-head queue (nothing is ever removed) and breaks the
  moment you switch to `shift()`. Count what you take.
- **Trying to reuse dsa/18's tortoise and hare.** Floyd's cycle detection
  needs *one* next-pointer per node so two runners can race along a single
  path. A course can unlock many others, so there is no single path — the
  trick simply doesn't generalise. Different structure, different tool.
- **Forgetting `numCourses = 0`.** Empty arrays, empty queue, `taken` 0, and
  `0 === 0` is `true`. It falls out for free — but only if you don't add a
  special case that gets it wrong.
