# 28 — Course Schedule

You are handed a course catalogue and a list of prerequisites. Can you finish
every course, or has someone written a rule that makes it impossible?

`[a, b]` means **"to take course `a` you must first finish course `b`"**.
Read that twice — the pair is *(the course, its prerequisite)*, so the arrow
of "must come first" points **from `b` to `a`**. Getting this backwards is
the single most common mistake in this problem.

## Signature

```js
/**
 * @param {number} numCourses - courses are numbered 0 .. numCourses - 1
 * @param {number[][]} prereqPairs - [a, b] = "a requires b first" (edge b → a)
 * @returns {boolean} true if some order lets you finish every course
 */
export function canFinish(numCourses, prereqPairs) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `canFinish(2, [[1, 0]])` | `true` | take 0, then 1 |
| `canFinish(2, [[1, 0], [0, 1]])` | `false` | 1 needs 0, 0 needs 1 — neither can go first |
| `canFinish(4, [[1,0],[2,0],[3,1],[3,2]])` | `true` | 0, then 1 and 2 in either order, then 3 |
| `canFinish(1, [[0, 0]])` | `false` | course 0 is its own prerequisite |

The answer is `true` exactly when the prerequisite graph contains **no
cycle** — a cycle is a group of courses all waiting on each other, and no
ordering can ever unblock them.

## Constraints & edge cases

- Courses are `0 .. numCourses - 1`. `canFinish(0, [])` is `true` — there is
  nothing to fail at.
- No prerequisites at all is always `true`, however many courses there are.
- A self-loop `[a, a]` is always `false`.
- Duplicate pairs are allowed and harmless: `[[1,0],[1,0]]` still just means
  "1 needs 0".
- The graph may be disconnected. A cycle *anywhere* makes the whole answer
  `false`, even if most courses are fine.
- `prereqPairs` must not be modified.
- Target complexity: O(numCourses + prereqPairs.length) time and space —
  every course and every rule looked at a constant number of times.

## Hints (take them one at a time!)

1. Forget graphs for a second and think like a student. Which course can you
   take *first*? One with no prerequisites. And after you've taken it, some
   other course might now have all of its prerequisites satisfied. What
   happens if you keep going until nothing new becomes available?
2. Track, for each course, **how many prerequisites it is still waiting on**
   — call it the course's *in-degree*. Start a queue with every course whose
   count is 0. Take one, mark it done, and decrement the count of every
   course that listed it as a prerequisite; any that drop to 0 join the
   queue. Count how many courses you managed to take.
3. Build two things up front from the pairs: `adjacency[b]` = the list of
   courses that require `b`, and `inDegree[a]` = how many prerequisites `a`
   has. Then run the queue loop above and return `taken === numCourses`. If
   the loop stops early, every remaining course is waiting on another
   remaining course — that *is* a cycle.

## Run it

```
node --test dsa/28-course-schedule/attempt.test.js
```
