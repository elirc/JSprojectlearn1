import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, required, minLength } from './validate.js';
import { signupSchema, loginSchema } from './signup-schema.js';

test('a valid form returns an empty object', () => {
  const errors = validate(
    { username: 'grace', email: 'g@navy.mil', password: 'longenough', age: '41' },
    signupSchema,
  );
  assert.deepEqual(errors, {});
});

test('ALL errors come back in one pass (the original stopped at the first)', () => {
  const errors = validate(
    { username: 'x', email: 'nope', password: '123' },
    signupSchema,
  );
  assert.deepEqual(Object.keys(errors), ['username', 'email', 'password']);
  assert.deepEqual(errors.username, ['must be at least 3 characters']);
  assert.deepEqual(errors.email, ['must be a valid email']);
});

test('a field can fail several rules at once', () => {
  const errors = validate({ username: '' }, { username: [required(), minLength(3)] });
  assert.deepEqual(errors.username, ['is required', 'must be at least 3 characters']);
});

test('optional fields: absent is fine, present-but-bad is not', () => {
  const base = { username: 'grace', email: 'g@navy.mil', password: 'longenough' };
  assert.deepEqual(validate(base, signupSchema), {}); // no age at all: ok
  assert.deepEqual(
    validate({ ...base, age: 'ten' }, signupSchema).age,
    ['must be a number'],
  );
  assert.deepEqual(
    validate({ ...base, age: '9' }, signupSchema).age,
    ['must be at least 13'],
  );
});

test('the same rules power a second form with no new logic', () => {
  assert.deepEqual(Object.keys(validate({}, loginSchema)), ['username', 'password']);
});

test('rules are just functions — a custom one drops right in', () => {
  const noProfanity = () => (value) =>
    typeof value === 'string' && value.includes('badword') ? 'must be polite' : null;
  const errors = validate(
    { comment: 'a badword here' },
    { comment: [noProfanity()] },
  );
  assert.deepEqual(errors.comment, ['must be polite']);
});
