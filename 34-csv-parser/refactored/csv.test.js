import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, csvToObjects } from './csv.js';

test('plain rows and fields', () => {
  assert.deepEqual(parseCsv('a,b\nc,d'), [['a', 'b'], ['c', 'd']]);
});

test('quoted fields keep their commas (what broke split)', () => {
  assert.deepEqual(
    parseCsv('name,motto\nada,"simple, but no simpler"'),
    [['name', 'motto'], ['ada', 'simple, but no simpler']],
  );
});

test('doubled quotes inside quoted fields become one quote', () => {
  assert.deepEqual(
    parseCsv('quote\n"she said ""later"""'),
    [['quote'], ['she said "later"']],
  );
});

test('newlines INSIDE quoted fields stay in the field', () => {
  assert.deepEqual(parseCsv('note\n"line one\nline two"'), [
    ['note'],
    ['line one\nline two'],
  ]);
});

test('Windows \\r\\n endings: no stowaway \\r, no phantom rows', () => {
  assert.deepEqual(parseCsv('a,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']]);
});

test('trailing newline does not create an empty row', () => {
  assert.deepEqual(parseCsv('a,b\n'), [['a', 'b']]);
});

test('empty fields survive', () => {
  assert.deepEqual(parseCsv('a,,c\n,,'), [['a', '', 'c'], ['', '', '']]);
});

test('empty input gives no rows', () => {
  assert.deepEqual(parseCsv(''), []);
});

test('csvToObjects uses the header row', () => {
  assert.deepEqual(csvToObjects('name,role\nada,engineer\ngrace,admiral'), [
    { name: 'ada', role: 'engineer' },
    { name: 'grace', role: 'admiral' },
  ]);
});

test('csvToObjects fills short rows with empty strings', () => {
  assert.deepEqual(csvToObjects('a,b\n1'), [{ a: '1', b: '' }]);
});
