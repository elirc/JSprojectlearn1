/**
 * Floyd's cycle detection — the "tortoise and hare".
 *
 * Two cursors start at the head. `slow` takes one step per turn, `fast`
 * takes two. On a straight list the hare runs off the end and we stop.
 * Inside a loop the hare cannot escape, and since it gains exactly one
 * node on the tortoise per turn it must eventually land on it — the gap
 * shrinks by one every time and can never jump over zero.
 *
 * Time: O(n). Space: O(1) — two references, nothing recorded.
 *
 * @param {{ value: *, next: object|null }|null} head - first node, or null
 * @returns {boolean} true if following `next` never reaches null
 */
export function hasCycle(head) {
  let slow = head; // tortoise: one node per turn
  let fast = head; // hare: two nodes per turn

  // Both guards are needed: `fast` may be the last node (fast.next is
  // null, so fast.next.next would throw), or already past the end.
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true; // same NODE, not the same value
  }

  // The hare reached a null — the list ends, so there is no cycle.
  return false;
}
