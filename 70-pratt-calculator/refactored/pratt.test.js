import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calc, parse, CalcError } from './pratt.js';

test('precedence: the classics', () => {
  assert.equal(calc('1+2*3'), 7);
  assert.equal(calc('(1+2)*3'), 9);
  assert.equal(calc('10-4/2'), 8);
  assert.equal(calc('2*3^2'), 18); // ^ binds tighter than *
});

test("THE ORIGINAL'S BUG #1: ^ is right-associative", () => {
  assert.equal(calc('2^3^2'), 512); // 2^(3^2), not (2^3)^2 = 64
  assert.equal(calc('(2^3)^2'), 64); // parens still let you ask for the other one
});

test("THE ORIGINAL'S BUG #2: unary minus binds looser than ^", () => {
  assert.equal(calc('-2^2'), -4);   // -(2^2), not (-2)^2 = 4
  assert.equal(calc('(-2)^2'), 4);
  assert.equal(calc('3*-2'), -6);   // ...but tighter than * — so this works
  assert.equal(calc('--5'), 5);
});

test('left-associativity where it matters: subtraction and division chains', () => {
  assert.equal(calc('10-3-2'), 5);  // (10-3)-2, not 10-(3-2)=9
  assert.equal(calc('16/4/2'), 2);  // (16/4)/2, not 16/(4/2)=8
});

test('variables come from an environment', () => {
  assert.equal(calc('x^2 + y', { x: 3, y: 4 }), 13);
  assert.throws(() => calc('nope + 1'), /Unknown variable "nope"/);
});

test('function calls, including multi-argument', () => {
  assert.equal(calc('sqrt(16)'), 4);
  assert.equal(calc('max(1, 2+3, 4)'), 5);
  assert.equal(calc('min(3, 4) * max(5, 6)'), 18);
  assert.equal(calc('sqrt(abs(0 - 16))'), 4);
  assert.throws(() => calc('mystery(1)'), /Unknown function "mystery"/);
});

test('comparison sits below arithmetic', () => {
  assert.equal(calc('1 + 2 > 2'), 1);
  assert.equal(calc('1 > 2'), 0);
});

test('the AST is data you can inspect (parse without evaluating)', () => {
  assert.deepEqual(parse('1+2*x'), {
    type: 'binop', op: '+',
    left: { type: 'num', value: 1 },
    right: {
      type: 'binop', op: '*',
      left: { type: 'num', value: 2 },
      right: { type: 'var', name: 'x' },
    },
  });
});

test('errors are typed, positioned, and specific', () => {
  assert.throws(() => calc('1 + '), (e) => e instanceof CalcError && /Expected a value/.test(e.message));
  assert.throws(() => calc('(1 + 2'), /Expected "\)"/);
  assert.throws(() => calc('1 2'), /after the expression/);
  assert.throws(() => calc('1 + $'), /Unexpected character "\$"/);
  assert.throws(() => calc('1/0'), /Division by zero/);
});
