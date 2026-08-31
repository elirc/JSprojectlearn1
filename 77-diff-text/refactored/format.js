/**
 * Turning diff operations into text. Nothing here knows how a diff is
 * COMPUTED; nothing in diff.js knows how one is DISPLAYED. That is the
 * whole point of the split — three presentations, one algorithm.
 */

/** The prefixes, defined ONCE. The original pasted these four times. */
const PREFIX = { same: '  ', add: '+ ', del: '- ' };

/** Classic full-context diff: every line, prefixed. */
export function formatDiff(operations) {
  return operations.map((operation) => PREFIX[operation.type] + operation.line).join('\n');
}

/** "3 insertions(+), 1 deletion(-)" — git's bottom line. */
export function formatSummary(operations) {
  const added = operations.filter((operation) => operation.type === 'add').length;
  const deleted = operations.filter((operation) => operation.type === 'del').length;
  if (added === 0 && deleted === 0) return 'no changes';
  const parts = [];
  if (added > 0) parts.push(`${added} insertion${added === 1 ? '' : 's'}(+)`);
  if (deleted > 0) parts.push(`${deleted} deletion${deleted === 1 ? '' : 's'}(-)`);
  return parts.join(', ');
}

/**
 * Compact view: only changes, plus `context` unchanged lines around each,
 * with a `...` marker where lines were skipped. This is what makes a diff
 * of a 5,000-line file readable — and it needs no knowledge of LCS at
 * all, because it works on the operations list.
 */
export function formatCompact(operations, { context = 2 } = {}) {
  if (!Number.isInteger(context) || context < 0) {
    throw new RangeError(`context must be a non-negative integer, got ${context}`);
  }

  const keep = new Set();
  operations.forEach((operation, index) => {
    if (operation.type === 'same') return;
    for (let at = index - context; at <= index + context; at++) {
      if (at >= 0 && at < operations.length) keep.add(at);
    }
  });

  const lines = [];
  let skipping = false;
  operations.forEach((operation, index) => {
    if (keep.has(index)) {
      lines.push(PREFIX[operation.type] + operation.line);
      skipping = false;
    } else if (!skipping) {
      lines.push('...');
      skipping = true;
    }
  });
  return lines.join('\n');
}
