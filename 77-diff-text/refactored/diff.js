/**
 * Line diff built on the LONGEST COMMON SUBSEQUENCE (LCS).
 *
 * A subsequence keeps order but may skip: the LCS of
 *   old = [apple, banana, cherry]
 *   new = [apple, blueberry, banana]
 * is [apple, banana] — the lines that SURVIVED. Everything in `old` that
 * isn't in the LCS was deleted; everything in `new` that isn't in it was
 * added. So "find the changes" becomes "find the longest thing that
 * didn't change", which is a question a table can answer.
 *
 * table[i][j] = length of the LCS of old[i..] and new[j..], filled in
 * from the bottom-right corner so that each cell only needs cells that
 * are already done. Cost: O(old x new) time and memory — fine for source
 * files, and the reason real tools switch algorithms on huge inputs.
 *
 * This module NEVER prints. It returns operations; format.js turns them
 * into text. That split is what lets the same diff drive a terminal, a
 * code-review UI, a patch file and a test.
 */

/**
 * Split text into lines. `\r\n` is normalised, and empty text is zero
 * lines — NOT the one empty line that `''.split('\n')` would hand you.
 */
export function toLines(text) {
  if (typeof text !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof text}`);
  }
  if (text === '') return [];
  return text.replace(/\r\n/g, '\n').split('\n');
}

/** Build the LCS length table. table[i][j] covers old[i..] and new[j..]. */
function lcsTable(oldLines, newLines) {
  const table = Array.from({ length: oldLines.length + 1 }, () =>
    new Array(newLines.length + 1).fill(0),
  );

  for (let i = oldLines.length - 1; i >= 0; i--) {
    for (let j = newLines.length - 1; j >= 0; j--) {
      table[i][j] =
        oldLines[i] === newLines[j]
          ? table[i + 1][j + 1] + 1 // matched: keep both, count it
          : Math.max(table[i + 1][j], table[i][j + 1]); // drop whichever loses less
    }
  }
  return table;
}

/**
 * Compare two texts and return operations in output order:
 *   { type: 'same' | 'add' | 'del', line }
 *
 * Reading only the `same` and `del` lines rebuilds the old text; reading
 * only `same` and `add` rebuilds the new one. There is a test for that.
 */
export function diffLines(oldText, newText) {
  const oldLines = toLines(oldText);
  const newLines = toLines(newText);
  const table = lcsTable(oldLines, newLines);

  const operations = [];
  let i = 0;
  let j = 0;

  while (i < oldLines.length && j < newLines.length) {
    if (oldLines[i] === newLines[j]) {
      operations.push({ type: 'same', line: oldLines[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      // Skipping this old line costs no more than skipping the new one,
      // so treat it as deleted. The >= makes deletions come first in a
      // replacement, which is the convention every diff tool uses.
      operations.push({ type: 'del', line: oldLines[i] });
      i++;
    } else {
      operations.push({ type: 'add', line: newLines[j] });
      j++;
    }
  }

  // One side ran out; whatever remains is a pure deletion or addition.
  while (i < oldLines.length) operations.push({ type: 'del', line: oldLines[i++] });
  while (j < newLines.length) operations.push({ type: 'add', line: newLines[j++] });

  return operations;
}

/** Counts, for "3 insertions(+), 1 deletion(-)" summaries. */
export function summarize(operations) {
  const totals = { same: 0, add: 0, del: 0 };
  for (const operation of operations) totals[operation.type]++;
  return {
    ...totals,
    changed: totals.add + totals.del,
    identical: totals.add === 0 && totals.del === 0,
  };
}
