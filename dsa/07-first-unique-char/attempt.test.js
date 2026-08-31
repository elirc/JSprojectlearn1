import { test } from "node:test";
import assert from "node:assert/strict";
import { firstUniqChar } from "./attempt.js";

const todo = firstUniqChar.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("classic: leetcode", { skip }, () => {
  assert.equal(firstUniqChar("leetcode"), 0);
});

test("classic: loveleetcode", { skip }, () => {
  assert.equal(firstUniqChar("loveleetcode"), 2);
});

test("no unique character at all", { skip }, () => {
  assert.equal(firstUniqChar("aabb"), -1);
});

test("empty string", { skip }, () => {
  assert.equal(firstUniqChar(""), -1);
});

test("single character is always unique", { skip }, () => {
  assert.equal(firstUniqChar("z"), 0);
});

test("the unique character is the very last one", { skip }, () => {
  assert.equal(firstUniqChar("aabbc"), 4);
});

test("the unique character sits in the middle", { skip }, () => {
  assert.equal(firstUniqChar("abcabd"), 2);
});

test("leftmost wins, not the first one discovered while counting", { skip }, () => {
  // both 'x' and 'y' are unique; 'x' comes first
  assert.equal(firstUniqChar("zzxy"), 2);
});

test("case matters: 'A' and 'a' are different characters", { skip }, () => {
  assert.equal(firstUniqChar("Aa"), 0);
  assert.equal(firstUniqChar("aAa"), 1);
});

test("spaces are ordinary characters and can be the answer", { skip }, () => {
  assert.equal(firstUniqChar("a b a"), 2);
});

test("a space can also be the repeating one", { skip }, () => {
  assert.equal(firstUniqChar("  q"), 2);
});

test("digits and punctuation", { skip }, () => {
  assert.equal(firstUniqChar("112!2"), 3);
  assert.equal(firstUniqChar("!!??"), -1);
});

test("every character unique returns index 0", { skip }, () => {
  assert.equal(firstUniqChar("abcdef"), 0);
});

test("longer string: one singleton buried near the end", { skip }, () => {
  const s = "ab".repeat(500) + "q" + "cd".repeat(500);
  assert.equal(firstUniqChar(s), 1000);
});
