import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTree, walkTree, flattenTree, renderIndented } from './tree.js';

const ROWS = [
  { id: 1, parentId: null, text: 'First!' },
  { id: 2, parentId: 1, text: 'Actually...' },
  { id: 3, parentId: 2, text: 'Well, actually...' },
  { id: 4, parentId: null, text: 'Great post' },
  { id: 5, parentId: 4, text: 'Agreed' },
];

test('buildTree nests replies under their parents', () => {
  const tree = buildTree(ROWS);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].children[0].text, 'Actually...');
  assert.equal(tree[0].children[0].children[0].text, 'Well, actually...');
});

test('depth 4+ works — the reply the original silently dropped', () => {
  const deepRows = [...ROWS, { id: 6, parentId: 3, text: 'WELL, actually...' }];
  const tree = buildTree(deepRows);
  const level4 = tree[0].children[0].children[0].children[0];
  assert.equal(level4.text, 'WELL, actually...');
});

test('any depth at all (a 50-deep chain)', () => {
  const chain = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    parentId: i === 0 ? null : i,
    text: `level ${i}`,
  }));
  const flat = flattenTree(buildTree(chain));
  assert.equal(flat.at(-1).depth, 49);
});

test('an orphaned row is an error, not a disappearance', () => {
  const rows = [{ id: 1, parentId: 999, text: 'lost' }];
  assert.throws(() => buildTree(rows), /unknown parentId 999/);
});

test('walkTree visits depth-first with depths', () => {
  const visits = [...walkTree(buildTree(ROWS))]
    .map(({ node, depth }) => `${depth}:${node.id}`);
  assert.deepEqual(visits, ['0:1', '1:2', '2:3', '0:4', '1:5']);
});

test('flattenTree round-trips ids and parents', () => {
  const flat = flattenTree(buildTree(ROWS));
  assert.deepEqual(
    flat.map(({ id, parentId }) => ({ id, parentId })),
    ROWS.map(({ id, parentId }) => ({ id, parentId })),
  );
});

test('renderIndented replaces the original staircase', () => {
  assert.equal(
    renderIndented(buildTree(ROWS)),
    ['First!', '  Actually...', '    Well, actually...', 'Great post', '  Agreed'].join('\n'),
  );
});
