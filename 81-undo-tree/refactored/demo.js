// The original's scenario, replayed on a history TREE.
// Run:  node 81-undo-tree/refactored/demo.js
//
// This file only prints. Every decision about what history MEANS lives in
// history-tree.js, where the tests can reach it.
import { HistoryTree } from './history-tree.js';

/** Draw the tree with indentation — recursion on self-similar data (project 37). */
function printTree(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const marker = node.current ? '►' : ' ';
  const label = node.state === '' ? '(empty)' : `"${node.state}"`;
  console.log(`${marker} ${indent}#${node.id} ${label}`);
  for (const child of node.children) printTree(child, depth + 1);
}

function show(title, history) {
  console.log(`\n--- ${title} ---`);
  printTree(history.toTree());
  console.log(`   present: "${history.present}"   versions kept: ${history.size}` +
    `   path: ${history.path().join(' → ')}`);
}

const history = new HistoryTree('');

// Two honest attempts, exactly as in original.js.
history.commit('Fast, safe, cheap');
const pickTwo = history.commit('Fast, safe, cheap — pick two');
show('two versions written', history);

// Back up and try a different angle.
history.undo();
history.commit('Fast, safe, cheap. Yes, all three.');
show('undo, then a NEW version — the linear model deleted "pick two" here', history);

// The original could not do this. There was nothing left to do it with.
console.log(`\nrecovering version #${pickTwo} with jumpTo...`);
console.log(`   -> "${history.jumpTo(pickTwo)}"`);
show('back on the first branch, with the other one still there', history);

// Branching off a branch: a third timeline, all three kept.
history.commit('Fast, safe, cheap — pick two. (Sorry.)');
history.undo();
history.undo();
history.commit('Cheap, fast, safe: choose your two.');
show('three timelines, nothing lost', history);

console.log('\nredo from here follows the branch you were most recently on:');
history.undo();
console.log(`   undo    -> "${history.present}"`);
console.log(`   redo    -> "${history.redo()}"`);
console.log(`   children of that version: ${JSON.stringify(history.children(1))}`);

console.log('\nEvery version ever typed is still reachable:');
for (let id = 0; id < history.size; id++) {
  const node = history.node(id);
  console.log(`   #${id} (parent ${node.parentId ?? '-'}) "${node.state}"`);
}
