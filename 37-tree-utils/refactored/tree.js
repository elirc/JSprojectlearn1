/**
 * Flat rows <-> nested tree, at ANY depth.
 *
 * The recursion insight (same as projects 07/21): a tree isn't
 * "levels" — it's nodes whose children are themselves trees. Code
 * that mirrors that definition handles depth 3 and depth 300 alike.
 */

/**
 * Rows { id, parentId, ... } -> nested nodes with `children` arrays.
 * One pass to create nodes, one pass to link them: O(n), any depth.
 */
export function buildTree(rows) {
  const nodeById = new Map(
    rows.map((row) => [row.id, { ...row, children: [] }]),
  );

  const roots = [];
  for (const node of nodeById.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = nodeById.get(node.parentId);
      if (!parent) {
        throw new Error(
          `Row ${node.id} has unknown parentId ${node.parentId}`,
        );
      }
      parent.children.push(node);
    }
  }
  return roots;
}

/**
 * Walk a tree depth-first, yielding { node, depth } — project 22's
 * generator idea, recursive this time. `yield*` hands off to the
 * child walk and resumes when it finishes. Consumers decide what a
 * visit MEANS: render it, count it, search it, flatten it.
 */
export function* walkTree(nodes, depth = 0) {
  for (const node of nodes) {
    yield { node, depth };
    yield* walkTree(node.children, depth + 1);
  }
}

/** Tree -> flat rows again (with depth), via the walker. */
export function flattenTree(nodes) {
  return [...walkTree(nodes)].map(({ node, depth }) => ({
    id: node.id,
    parentId: node.parentId,
    text: node.text,
    depth,
  }));
}

/** The original's render staircase, as three lines on the walker. */
export function renderIndented(nodes, indent = '  ') {
  return [...walkTree(nodes)]
    .map(({ node, depth }) => indent.repeat(depth) + node.text)
    .join('\n');
}
