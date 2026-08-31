/**
 * All permutations of an array of distinct values, by backtracking.
 *
 * 1. Keep one shared `current` array — the ordering being built right now.
 * 2. Keep a `used` flag per input index so a value is never picked twice.
 * 3. At each level, try every unused value in turn:
 *      CHOOSE   mark it used, push it onto `current`
 *      EXPLORE  recurse to fill the next slot
 *      UNCHOOSE pop it back off, clear the flag  <- this is the "backtracking"
 * 4. Base case: `current` is as long as the input, so it is a complete
 *    permutation — save a COPY of it.
 *
 * Time  O(n * n!): n! permutations, each costing O(n) to copy out.
 * Space O(n) of working state (current + used + call stack), plus the
 *       O(n * n!) output that the caller asked for.
 *
 * @param {Array} arr - array of DISTINCT values
 * @returns {Array[]} every ordering of arr, in an unspecified outer order
 */
export function permutations(arr) {
  const out = [];
  const current = []; // the partial ordering under construction
  const used = new Array(arr.length).fill(false); // used[i]: arr[i] already placed?

  function backtrack() {
    // Base case: every slot filled, so `current` is one complete answer.
    if (current.length === arr.length) {
      // Copy is mandatory. `current` is a single array that is about to be
      // popped back down to empty and refilled; pushing it directly would
      // put n! references to the SAME array in `out`, and they would all
      // read as [] by the time we return.
      out.push([...current]);
      return;
    }

    for (let i = 0; i < arr.length; i++) {
      if (used[i]) continue; // already placed further up this branch

      // CHOOSE
      used[i] = true;
      current.push(arr[i]);

      // EXPLORE — trust it to finish every ordering that starts this way
      backtrack();

      // UNCHOOSE — restore the exact state we had before choosing, so the
      // next value in this loop starts from a clean slate.
      current.pop();
      used[i] = false;
    }
  }

  backtrack();
  return out;
}
