import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register, parseAge, parseUsername, ValidationError } from './registration.js';

test('valid input registers and returns the user', () => {
  const database = [];
  const user = register({ username: 'grace', age: '41' }, database);
  assert.deepEqual(user, { username: 'grace', age: 41 });
  assert.equal(database.length, 1);
});

test('bad age throws a ValidationError naming the field', () => {
  assert.throws(
    () => parseAge('abc'),
    (err) => {
      // asserting the CLASS and the attached data, not just "it threw"
      assert.ok(err instanceof ValidationError);
      assert.equal(err.field, 'age');
      assert.equal(err.value, 'abc');
      return true;
    },
  );
});

test('distinct problems get distinct messages (the original had one -1 for both)', () => {
  assert.throws(() => parseAge('abc'), /whole number/);
  assert.throws(() => parseAge('8'), /at least 13/);
});

test('username rules', () => {
  assert.throws(() => parseUsername('x'), /at least 3/);
  assert.throws(() => parseUsername('a b'), /spaces/);
  assert.equal(parseUsername('ada_l'), 'ada_l');
});

test('invalid input can NEVER become account data', () => {
  const database = [];
  assert.throws(() => register({ username: 'x', age: '8' }, database));
  assert.equal(database.length, 0); // nothing snuck in — compare the original
});

test('duplicate usernames are rejected', () => {
  const database = [{ username: 'ada', age: 30 }];
  assert.throws(() => register({ username: 'ada', age: '30' }, database), /taken/);
});

test('ValidationError is still a real Error (stack, message, instanceof)', () => {
  const err = new ValidationError('nope', { field: 'x' });
  assert.ok(err instanceof Error);
  assert.ok(err.stack.includes('registration.test.js'));
  assert.equal(err.name, 'ValidationError');
});
