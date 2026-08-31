import { test } from "node:test";
import assert from "node:assert/strict";
import { isPalindrome } from "./solution.js";

test("classic example with punctuation and case", () => {
  assert.equal(isPalindrome("A man, a plan, a canal: Panama"), true);
});

test("classic non-palindrome", () => {
  assert.equal(isPalindrome("race a car"), false);
});

test("empty string", () => {
  assert.equal(isPalindrome(""), true);
});

test("only non-alphanumeric characters", () => {
  assert.equal(isPalindrome(" "), true);
  assert.equal(isPalindrome(".,;!"), true);
});

test("single character", () => {
  assert.equal(isPalindrome("a"), true);
  assert.equal(isPalindrome("7"), true);
});

test("two characters", () => {
  assert.equal(isPalindrome("aa"), true);
  assert.equal(isPalindrome("ab"), false);
});

test("case is ignored", () => {
  assert.equal(isPalindrome("Aa"), true);
  assert.equal(isPalindrome("AbBa"), true);
});

test("digits participate", () => {
  assert.equal(isPalindrome("12321"), true);
  assert.equal(isPalindrome("12345"), false);
});

test("digit vs letter must not be case-folded together", () => {
  // "0".toLowerCase() is "0" and "P".toLowerCase() is "p" — never equal
  assert.equal(isPalindrome("0P"), false);
});

test("underscore is not alphanumeric", () => {
  assert.equal(isPalindrome("ab_a"), true);
  assert.equal(isPalindrome("_ab_"), false);
});

test("punctuation only in the middle", () => {
  assert.equal(isPalindrome("a.b.a"), true);
  assert.equal(isPalindrome("Was it a car or a cat I saw?"), true);
});

test("odd and even length cleaned strings", () => {
  assert.equal(isPalindrome("aba"), true);
  assert.equal(isPalindrome("abba"), true);
  assert.equal(isPalindrome("abca"), false);
});

test("mismatch only at the very ends", () => {
  assert.equal(isPalindrome("abcbb"), false);
  assert.equal(isPalindrome("No 'x' in Nixon"), true);
});

test("long input still answers correctly", () => {
  const half = "ab, cd! ".repeat(200);
  const mirrored = half + [...half].reverse().join("");
  assert.equal(isPalindrome(mirrored), true);
  assert.equal(isPalindrome(mirrored + "z"), false);
});
