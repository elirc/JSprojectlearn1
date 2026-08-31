/**
 * Quick select: find the k-th smallest value without sorting the whole array.
 *
 * 1. Copy the input — we shuffle elements around, the caller's array must not move.
 * 2. Keep a live window [lo, hi] that is guaranteed to contain the answer.
 * 3. Partition that window around a pivot. The pivot lands at its FINAL
 *    sorted index p: everything left of p is smaller, everything right is not.
 * 4. Compare p with the target index k - 1:
 *      p === target  -> the pivot IS the answer, stop.
 *      target < p    -> answer is left of p,  shrink to [lo, p - 1].
 *      target > p    -> answer is right of p, shrink to [p + 1, hi].
 *    Only ONE side survives — that discarding is what makes this O(n) average.
 *
 * Time  O(n) average (n + n/2 + n/4 + ... ≈ 2n), O(n²) worst case.
 * Space O(n) for the defensive copy; O(1) beyond it (the loop replaces recursion).
 *
 * @param {number[]} arr - non-empty array of numbers
 * @param {number} k - 1-based rank: 1 is the minimum, arr.length is the maximum
 * @returns {number} the k-th smallest value in arr
 */
export function quickSelect(arr, k) {
  // Work on a copy: partitioning is destructive and the contract says
  // the caller's array survives untouched.
  const a = [...arr];

  // k is 1-based ("3rd smallest"); array indices are 0-based.
  const target = k - 1;

  let lo = 0;
  let hi = a.length - 1;

  // Loop instead of recursing: the recursive call would be the LAST thing we
  // do, so it is just "reset lo/hi and go again" — no stack needed.
  while (lo < hi) {
    const p = partition(a, lo, hi);

    if (p === target) return a[p]; // pivot sits exactly where we were looking
    if (target < p) hi = p - 1; // answer is in the smaller side
    else lo = p + 1; // answer is in the larger side
  }

  // Window narrowed to a single slot — that slot has to be the answer.
  return a[lo];
}

/**
 * Lomuto partition of a[lo..hi] around a pivot, in place.
 * Returns the index where the pivot ended up — its final sorted position.
 *
 * @param {number[]} a - array to partition in place
 * @param {number} lo - first index of the window
 * @param {number} hi - last index of the window
 * @returns {number} the pivot's resting index
 */
function partition(a, lo, hi) {
  // Pick the MIDDLE element, not the last one. On already-sorted input the
  // last element is the worst possible pivot (it splits off nothing), which
  // drags quick select down to O(n²). The middle is a cheap, deterministic
  // way to dodge that very common case.
  const mid = lo + Math.floor((hi - lo) / 2);
  swap(a, mid, hi);
  const pivot = a[hi];

  // `write` is dsa/05's write pointer: everything before it is already
  // known to be smaller than the pivot.
  let write = lo;
  for (let read = lo; read < hi; read++) {
    if (a[read] < pivot) {
      swap(a, read, write);
      write++;
    }
  }

  // Everything in [lo, write) is < pivot and everything in [write, hi) is
  // >= pivot, so dropping the pivot into `write` puts it exactly where a
  // full sort would have put it.
  swap(a, write, hi);
  return write;
}

/**
 * Swap two slots of an array in place.
 *
 * @param {number[]} a - array to modify
 * @param {number} i - first index
 * @param {number} j - second index
 * @returns {void}
 */
function swap(a, i, j) {
  const temp = a[i];
  a[i] = a[j];
  a[j] = temp;
}
