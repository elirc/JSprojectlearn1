# 📘 Learning Guide: Course Schedule

Detecting a cycle by never looking for one — just take courses and count.

## 1. The problem in plain words

There are `numCourses` courses, numbered `0` upwards, and a list of rules of
the form `[a, b]` meaning **"before you can take course `a`, you must have
finished course `b`."** Return `true` if some order lets you take every
single course, `false` if none does.

There's only one way to make it impossible: a group of courses that all wait
on each other. `1` needs `0`, `0` needs `1` — nobody can be first, so nobody
ever goes. So the real question is: **does the prerequisite graph contain a
cycle?**

## 2. Concepts you need first

**A directed graph.** dsa/27 gave you an *undirected* graph: if cell A
touches cell B then B touches A. Here edges have a direction — "0 must come
before 1" says nothing about 1 coming before 0, and in fact forbids it.
Notation: `0 → 1`.

**Reading the pair.** This is where people lose an hour. `[a, b]` is
*(course, prerequisite)*: the prerequisite comes first in time and second in
the pair, so the edge points **`b → a`**, from the thing you do first to the
thing it unlocks.

**An adjacency list.** How you store a graph: an array where slot `v` holds
the list of vertices `v` points *at*. From `[[1,0], [2,0], [3,1]]`:

```js
adjacency[0] = [1, 2]   // finishing 0 unlocks progress on 1 and 2
adjacency[1] = [3]
adjacency[2] = []
adjacency[3] = []
```

It's built from the *prerequisite's* point of view, because "I just finished
`b` — who was waiting on me?" is the question you'll ask.

**In-degree.** How many edges point *at* a vertex: for a course, how many
prerequisites it still owes. In-degree 0 means available right now.

**DAG** — *directed acyclic graph*, a directed graph with no cycles: exactly
the shape a workable course catalogue has.

**Topological order.** A listing of a DAG's vertices where every edge points
forwards — i.e. a legal order to take the courses in. A DAG always has one;
a graph with a cycle has none. Your build tool, your package manager, and
your spreadsheet's recalculation all compute one every time you use them.

**Queue (dsa/15), moving head (dsa/24).** You'll keep a waiting line of
available courses: an array with an index you only increment, never
`shift()`.

## 3. How to think about it

Don't hunt for a cycle. **Schedule greedily and count.**

Take this catalogue:

```
[[1,0], [2,0], [3,1], [3,2], [4,3]]

      0          0 unlocks 1 and 2
     / \         3 needs BOTH 1 and 2
    1   2        4 needs 3
     \ /
      3
      |
      4
```

In-degrees to start: `0→0, 1→1, 2→1, 3→2, 4→1`. Only course 0 is available.

| step | queue (head marked ▸) | take | in-degrees after | taken |
|------|----------------------|------|------------------|-------|
| seed | `[▸0]` | — | `0,1,1,2,1` | 0 |
| 1 | `[0, ▸1, 2]` | 0 | `0,0,0,2,1` | 1 |
| 2 | `[0, 1, ▸2]` | 1 | `0,0,0,1,1` | 2 |
| 3 | `[0, 1, 2, ▸3]` | 2 | `0,0,0,0,1` | 3 |
| 4 | `[0, 1, 2, 3, ▸4]` | 3 | `0,0,0,0,0` | 4 |
| 5 | `[0, 1, 2, 3, 4]▸` | 4 | — | 5 |

`taken === 5 === numCourses` → **true**, and the queue itself,
`0, 1, 2, 3, 4`, is a valid order. Look at step 2: taking course 1 drops
course 3's count from 2 to 1, and 3 does *not* become available — it's still
waiting on 2. Only when 2 is taken does 3 hit zero.

Now the broken catalogue `[[1,0], [2,1], [0,2]]` — 0 needs 2, 1 needs 0, 2
needs 1. In-degrees are `1, 1, 1`. **Nothing** has in-degree 0, so the queue
starts empty, the loop never runs, `taken` is 0, and `0 !== 3` → **false**.

That's the trick worth keeping: *the algorithm stalling is the cycle
detection.* You never wrote a cycle check. If courses are left over when
nothing is available, each leftover is waiting on another leftover — keep
following "waiting on" and, since the pool is finite, you must eventually
land somewhere you've already been. A loop.

## 4. Common wrong turns

- **Reading `[a, b]` backwards.** Building `adjacency[a].push(b)` and
  `inDegree[b]++` computes the answer for the *reversed* graph. Nasty,
  because reversing a graph doesn't change whether it has a cycle — so most
  tests still pass and the bug hides until you try to return the order.
- **Trying to reuse dsa/18's tortoise and hare.** Floyd's algorithm needs one
  `next` per node so two runners can race along a single path. A course can
  unlock several others, so there is no single path. Different structure,
  different tool.
- **Enumerating orderings.** dsa/23's backtracking will find an order if one
  exists — after up to n! attempts. You were only asked whether one exists.
- **`if (inDegree[d] <= 0)` rather than `=== 0`.** With `<=`, a course whose
  count somehow goes negative gets queued repeatedly, `taken` overshoots, and
  a cyclic graph reports `true`.
- **Seeding the queue from course 0 only**, or assuming the graph is
  connected. Disconnected pieces are normal; seed every zero.
- **`queue.shift()`.** Correct and quadratic — dsa/15's whole point.
- **Special-casing `numCourses === 0`.** Unnecessary: empty arrays, empty
  queue, `taken` 0, and `0 === 0` is `true`. Adding the case is how you get
  it wrong.

## 5. The solution, step by step

**Step 1 — two structures, one pass over the pairs.**

```js
const adjacency = Array.from({ length: numCourses }, () => []);
const inDegree = new Array(numCourses).fill(0);

for (const [course, prerequisite] of prereqPairs) {
  adjacency[prerequisite].push(course);
  inDegree[course]++;
}
```

Say it aloud as you type: *"finishing the prerequisite unlocks the course, so
the prerequisite points at the course, and the course owes one more."*

**Step 2 — seed the queue with everything already available:**
`const queue = [];` then
`for (let c = 0; c < numCourses; c++) if (inDegree[c] === 0) queue.push(c);`

**Step 3 — drain it with a moving head.**

```js
let head = 0;
let taken = 0;
while (head < queue.length) {
  const course = queue[head++];
  taken++;
  for (const dependent of adjacency[course]) {
    inDegree[dependent]--;
    if (inDegree[dependent] === 0) queue.push(dependent);
  }
}
```

**Step 4 — the verdict.** `return taken === numCourses;` — no cycle check
anywhere, because the count already is one.

Run the tests: `node --test dsa/28-course-schedule/attempt.test.js`.

## 6. Complexity, gently

Write `V` for the number of courses and `E` for the number of rules.

**Time O(V + E).** Three linear passes: one over the pairs to build
`adjacency` and `inDegree` (O(E)); one over the courses to seed the queue
(O(V)); and the drain, where each course is queued at most once — it's pushed
at the single instant its count hits 0 — and each edge is walked exactly
once, when its source is taken (O(V + E)).

For the 500-course chain that's about a thousand operations; for a package
manager resolving 50,000 dependencies with 200,000 constraints, a quarter of
a million. Instant. The naive "search forward from every course" alternative
is O(V × (V + E)) — twelve billion on the same input.

**Space O(V + E)** — the adjacency lists total exactly `E` entries, and
`inDegree` and `queue` are `V` each.

And note the freebie: the `queue` array, read front to back, *is* a valid
course order. Answering "yes" and answering "in what order" cost the same.

## 7. Words you learned

- **Directed graph** — edges with a direction; `a → b` says nothing about
  `b → a`. The generalisation of dsa/27's undirected grid.
- **Adjacency list** — an array where slot `v` holds everything `v` points
  at. The standard way to store a sparse graph.
- **In-degree** — how many edges point at a vertex; here, how many
  prerequisites a course still owes.
- **DAG (directed acyclic graph)** — a directed graph with no cycles; the
  shape of any workable dependency system.
- **Topological order / topological sort** — an order in which every edge
  points forwards. Exists if and only if the graph is a DAG.
- **Kahn's algorithm** — the BFS topological sort you just wrote.
- **Greedy** — taking the locally obvious step without backtracking, safe
  here because finishing a course never makes another course harder.

## 8. Variations to try

1. **Return the order, not a boolean.** The `queue` array already holds it —
   return `queue` when `taken === numCourses` and `[]` otherwise. That's
   `findOrder`, the standard follow-up.
2. **Re-solve with three-colour DFS.** Mark each course white (untouched),
   grey (currently on the recursion stack), or black (fully explored). Walk
   depth-first; reaching a **grey** course means a cycle, because grey means
   "an ancestor of where I am now". Same O(V + E), completely different feel.
3. **Report *which* courses are stuck.** After the drain, every course with a
   non-zero in-degree is in or downstream of a cycle — two lines that turn a
   useless `false` into an actual error message.
4. **Count semesters.** Take every currently-available course each round and
   count rounds — that's the minimum number of semesters, and it falls out of
   the same queue processed one *level* at a time, exactly like dsa/24's
   array-of-levels variation.
5. **Detect a cycle in an *undirected* graph** instead, e.g. dsa/27's grid.
   The rule changes: an already-visited neighbour is a cycle *only* if it
   isn't the one you just came from. Work out why that caveat doesn't exist
   in the directed case.
