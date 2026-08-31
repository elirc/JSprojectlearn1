import test from "node:test";
import assert from "node:assert/strict";
import { isValidParentheses } from "./solution.js";

test("simple balanced strings", () => {
  assert.equal(isValidParentheses("()"), true);
  assert.equal(isValidParentheses("()[]{}"), true);
  assert.equal(isValidParentheses("{[]}"), true);
  assert.equal(isValidParentheses("([]{})"), true);
});

test("empty string is balanced", () => {
  assert.equal(isValidParentheses(""), true);
});

test("wrong kind of closer", () => {
  assert.equal(isValidParentheses("(]"), false);
});

test("interleaved pairs are not properly nested", () => {
  assert.equal(isValidParentheses("([)]"), false);
});

test("closer with nothing open", () => {
  assert.equal(isValidParentheses(")"), false);
  assert.equal(isValidParentheses("]"), false);
});

test("leftover openers at the end", () => {
  assert.equal(isValidParentheses("("), false);
  assert.equal(isValidParentheses("((("), false);
  assert.equal(isValidParentheses("()("), false);
});

test("deep nesting works", () => {
  assert.equal(isValidParentheses("({[({[]})]})"), true);
});
