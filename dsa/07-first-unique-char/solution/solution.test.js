import { test } from "node:test";
import assert from "node:assert/strict";
import { firstUniqChar } from "./solution.js";

test("classic: leetcode", () => {
  assert.equal(firstUniqChar("leetcode"), 0);
});

test("classic: loveleetcode", () => {
  assert.equal(firstUniqChar("loveleetcode"), 2);
});

test("no unique character at all", () => {
  assert.equal(firstUniqChar("aabb"), -1);
});

test("empty string", () => {
  assert.equal(firstUniqChar(""), -1);
});

test("single character is always unique", () => {
  assert.equal(firstUniqChar("z"), 0);
});

test("the unique character is the very last one", () => {
  assert.equal(firstUniqChar("aabbc"), 4);
});

test("the unique character sits in the middle", () => {
  assert.equal(firstUniqChar("abcabd"), 2);
});

test("leftmost wins, not the first one discovered while counting", () => {
  // both 'x' and 'y' are unique; 'x' comes first
  assert.equal(firstUniqChar("zzxy"), 2);
});

test("case matters: 'A' and 'a' are different characters", () => {
  assert.equal(firstUniqChar("Aa"), 0);
  assert.equal(firstUniqChar("aAa"), 1);
});

test("spaces are ordinary characters and can be the answer", () => {
  assert.equal(firstUniqChar("a b a"), 2);
});

test("a space can also be the repeating one", () => {
  assert.equal(firstUniqChar("  q"), 2);
});

test("digits and punctuation", () => {
  assert.equal(firstUniqChar("112!2"), 3);
  assert.equal(firstUniqChar("!!??"), -1);
});

test("every character unique returns index 0", () => {
  assert.equal(firstUniqChar("abcdef"), 0);
});

test("longer string: one singleton buried near the end", () => {
  const s = "ab".repeat(500) + "q" + "cd".repeat(500);
  assert.equal(firstUniqChar(s), 1000);
});
