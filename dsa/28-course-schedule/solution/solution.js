/**
 * Can every course be finished? Kahn's algorithm — a breadth-first
 * topological sort that doubles as a cycle detector.
 *
 * The story it tells is exactly how a student would plan a degree:
 *
 * 1. Work out, for every course, how many prerequisites it is waiting on.
 *    That number is the course's IN-DEGREE.
 * 2. Every course with in-degree 0 can be taken right now — queue them.
 * 3. Take one off the queue and count it as done. Every course that listed
 *    it as a prerequisite is now waiting on one fewer thing, so decrement
 *    those in-degrees; any that hit 0 have just become available, so queue
 *    them too.
 * 4. When the queue runs dry, compare how many courses you took with how
 *    many exist.
 *
 * Why that last comparison detects a cycle: the loop only ever stops when
 * nothing has in-degree 0. If courses are still outstanding at that moment,
 * every one of them is waiting on another outstanding course — follow those
 * "waiting on" links and, since the set is finite, you must eventually
 * revisit a course. That is a cycle, and nothing can break it.
 *
 * Time  O(V + E): V = numCourses, E = prereqPairs.length. Each course is
 *       queued and dequeued at most once; each pair is walked exactly once.
 * Space O(V + E): the adjacency lists, the in-degree array, the queue.
 *
 * @param {number} numCourses - courses are numbered 0 .. numCourses - 1
 * @param {number[][]} prereqPairs - [a, b] = "a requires b first" (edge b → a)
 * @returns {boolean} true if some order lets you finish every course
 */
export function canFinish(numCourses, prereqPairs) {
  // adjacency[b] = the courses that become closer to available once b is
  // done. Note the direction: we store the edge b → a, not the pair as given.
  const adjacency = Array.from({ length: numCourses }, () => []);

  // inDegree[a] = how many prerequisites course a is still waiting on.
  const inDegree = new Array(numCourses).fill(0);

  for (const [course, prerequisite] of prereqPairs) {
    adjacency[prerequisite].push(course);
    inDegree[course]++;
  }

  // Everything that can be taken immediately. A course appearing twice in
  // the pairs simply has in-degree 2 and gets decremented twice, which is
  // why duplicate rules need no special handling.
  const queue = [];
  for (let course = 0; course < numCourses; course++) {
    if (inDegree[course] === 0) queue.push(course);
  }

  // A moving head instead of shift(), which would re-index the whole array
  // on every removal — the dsa/15 lesson, and the same trick dsa/24 used
  // for level order.
  let head = 0;
  let taken = 0;

  while (head < queue.length) {
    const course = queue[head++];
    taken++;

    for (const dependent of adjacency[course]) {
      inDegree[dependent]--;

      // It was waiting only on courses we have now finished.
      if (inDegree[dependent] === 0) queue.push(dependent);
    }
  }

  // If anything is left over, it is stuck in a cycle. A self-loop [a, a]
  // gives course a an in-degree of 1 that only a itself could clear, so it
  // never enters the queue — caught by the same comparison.
  return taken === numCourses;
}
