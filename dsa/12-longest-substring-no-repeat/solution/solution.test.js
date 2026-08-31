import test from "node:test";
import assert from "node:assert/strict";
import { lengthOfLongestSubstring } from "./solution.js";

test("classic examples", () => {
  assert.equal(lengthOfLongestSubstring("abcabcbb"), 3);
  assert.equal(lengthOfLongestSubstring("bbbbb"), 1);
  assert.equal(lengthOfLongestSubstring("pwwkew"), 3);
});

test("empty and single-character strings", () => {
  assert.equal(lengthOfLongestSubstring(""), 0);
  assert.equal(lengthOfLongestSubstring("a"), 1);
  assert.equal(lengthOfLongestSubstring(" "), 1);
});

test("no repeats at all: whole string counts", () => {
  assert.equal(lengthOfLongestSubstring("au"), 2);
  assert.equal(lengthOfLongestSubstring("abcdef"), 6);
});

test("repeat behind the window start (the abba trap)", () => {
  assert.equal(lengthOfLongestSubstring("abba"), 2);
  assert.equal(lengthOfLongestSubstring("tmmzuxt"), 5);
});

test("best run appears after a stumble", () => {
  assert.equal(lengthOfLongestSubstring("dvdf"), 3);
});

test("case-sensitive: 'a' and 'A' are different", () => {
  assert.equal(lengthOfLongestSubstring("aA"), 2);
});
