/**
 * Reverse a singly linked list in place — the classic three-pointer walk.
 *
 * Think of the list as two parts that trade nodes one at a time:
 *   prev    — the already-reversed part (grows), starts as null
 *   current — the not-yet-reversed part (shrinks), starts as head
 *
 * Each turn of the loop moves exactly one node across the border, and
 * the order of the four lines matters: save the way forward BEFORE
 * overwriting the pointer that provides it.
 *
 * Time: O(n) — one pass. Space: O(1) — three variables, whatever n is.
 *
 * @param {{ value: *, next: object|null }|null} head - first node, or null
 * @returns {{ value: *, next: object|null }|null} the new head (the old last node)
 */
export function reverseList(head) {
  let prev = null; // the old head must end up pointing at nothing
  let current = head;

  while (current !== null) {
    const nextNode = current.next; // 1. save the way forward (or lose the rest)
    current.next = prev; // 2. flip this node's arrow backwards
    prev = current; // 3. this node is now the front of the reversed part
    current = nextNode; // 4. carry on with the saved rest
  }

  // The loop ends with current === null, so prev is the last node we
  // flipped — which is the old tail, i.e. the new head.
  return prev;
}
