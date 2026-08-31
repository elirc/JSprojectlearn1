import test from "node:test";
import assert from "node:assert/strict";
import { isValidParentheses } from "./attempt.js";

const todo = isValidParentheses.toString().includes("TODO");
const skip = todo && "unsolved — edit attempt.js (delete the TODO lines) to activate these tests";

test("simple balanced strings", { skip }, () => {
  assert.equal(isValidParentheses("()"), true);
  assert.equal(isValidParentheses("()[]{}"), true);
  assert.equal(isValidParentheses("{[]}"), true);
  assert.equal(isValidParentheses("([]{})"), true);
});

test("empty string is balanced", { skip }, () => {
  assert.equal(isValidParentheses(""), true);
});

test("wrong kind of closer", { skip }, () => {
  assert.equal(isValidParentheses("(]"), false);
});

test("interleaved pairs are not properly nested", { skip }, () => {
  assert.equal(isValidParentheses("([)]"), false);
});

test("closer with nothing open", { skip }, () => {
  assert.equal(isValidParentheses(")"), false);
  assert.equal(isValidParentheses("]"), false);
});

test("leftover openers at the end", { skip }, () => {
  assert.equal(isValidParentheses("("), false);
  assert.equal(isValidParentheses("((("), false);
  assert.equal(isValidParentheses("()("), false);
});

test("deep nesting works", { skip }, () => {
  assert.equal(isValidParentheses("({[({[]})]})"), true);
});
