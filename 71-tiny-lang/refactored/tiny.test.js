import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from './interpreter.js';
import { TinyError } from './lexer.js';

test('the program the original could not represent: blocks, else, nesting', () => {
  const out = run(`
    let x = 3;
    if (x > 2) {
      print "big";
      print x * 10;
    } else {
      print "small";
    }
  `);
  assert.deepEqual(out, ['big', '30']);
});

test('fibonacci — a real loop with a multi-statement body', () => {
  const out = run(`
    let a = 0;
    let b = 1;
    let n = 0;
    while (n < 8) {
      print a;
      let next = a + b;
      a = b;
      b = next;
      n = n + 1;
    }
  `);
  assert.deepEqual(out, ['0', '1', '1', '2', '3', '5', '8', '13']);
});

test('SCOPING: a block-local let is dropped when the block ends', () => {
  assert.throws(
    () => run(`
      if (true) { let secret = 42; }
      print secret;
    `),
    /Unknown variable "secret"/,
  );
});

test('SCOPING: shadowing hides but never destroys the outer variable', () => {
  const out = run(`
    let x = 1;
    if (true) {
      let x = 99;
      print x;
    }
    print x;
  `);
  assert.deepEqual(out, ['99', '1']); // the original printed 99 twice (one flat scope)
});

test('SCOPING: assignment (no let) reaches OUT to the declaring scope', () => {
  const out = run(`
    let count = 0;
    while (count < 3) { count = count + 1; }
    print count;
  `);
  assert.deepEqual(out, ['3']);
});

test('else-if chains work', () => {
  const grade = (n) => run(`
    let score = ${n};
    if (score >= 90) { print "A"; }
    else if (score >= 80) { print "B"; }
    else { print "F"; }
  `);
  assert.deepEqual(grade(95), ['A']);
  assert.deepEqual(grade(85), ['B']);
  assert.deepEqual(grade(40), ['F']);
});

test('strings, booleans, comparisons, comments', () => {
  const out = run(`
    # a comment
    let name = "ada";
    print name + "!";
    print 2 + 3 * 4 == 14;
    print !(1 > 2);
  `);
  assert.deepEqual(out, ['ada!', 'true', 'true']);
});

test('runtime type errors are positioned and specific — no JS coercion', () => {
  assert.throws(() => run('print 1 + "x";'), /Cannot add number and string/);
  assert.throws(() => run('print -true;'), /unary minus needs a number/);
  assert.throws(() => run('if (5) { print 1; }'), /if condition needs a boolean/);
  assert.throws(() => run('let x = 1 / 0;'), /Division by zero/);
});

test('declare/assign discipline: helpful errors, with line numbers', () => {
  try {
    run('let a = 1;\nb = 2;');
    assert.fail('should throw');
  } catch (err) {
    assert.ok(err instanceof TinyError);
    assert.match(err.message, /undeclared variable "b"/);
    assert.match(err.message, /did you mean "let"/);
    assert.equal(err.line, 2);
  }
  assert.throws(() => run('let a = 1; let a = 2;'), /already declared/);
});

test('parse errors carry positions too', () => {
  try {
    run('let x = ;');
    assert.fail('should throw');
  } catch (err) {
    assert.ok(err instanceof TinyError);
    assert.match(err.message, /Expected an expression/);
  }
});

test('the infinite-loop guard: a hung program becomes an error', () => {
  assert.throws(() => run('while (true) { let x = 1; }'), /ran too long/);
});

test('SECURITY (project 69 remembered): host powers simply do not exist', () => {
  // there is no eval path — "process" is just an unknown variable
  assert.throws(() => run('print process;'), /Unknown variable "process"/);
});
