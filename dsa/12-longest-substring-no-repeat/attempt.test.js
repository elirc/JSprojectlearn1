import test from "node:test";
import assert from "node:assert/strict";
import { lengthOfLongestSubstring } from "./attempt.js";

const todo = lengthOfLongestSubstring.toString().includes("TODO");
const skip = todo && "unsolved — edit attempt.js (delete the TODO lines) to activate these tests";

test("classic examples", { skip }, () => {
  assert.equal(lengthOfLongestSubstring("abcabcbb"), 3);
  assert.equal(lengthOfLongestSubstring("bbbbb"), 1);
  assert.equal(lengthOfLongestSubstring("pwwkew"), 3);
});

test("empty and single-character strings", { skip }, () => {
  assert.equal(lengthOfLongestSubstring(""), 0);
  assert.equal(lengthOfLongestSubstring("a"), 1);
  assert.equal(lengthOfLongestSubstring(" "), 1);
});

test("no repeats at all: whole string counts", { skip }, () => {
  assert.equal(lengthOfLongestSubstring("au"), 2);
  assert.equal(lengthOfLongestSubstring("abcdef"), 6);
});

test("repeat behind the window start (the abba trap)", { skip }, () => {
  assert.equal(lengthOfLongestSubstring("abba"), 2);
  assert.equal(lengthOfLongestSubstring("tmmzuxt"), 5);
});

test("best run appears after a stumble", { skip }, () => {
  assert.equal(lengthOfLongestSubstring("dvdf"), 3);
});

test("case-sensitive: 'a' and 'A' are different", { skip }, () => {
  assert.equal(lengthOfLongestSubstring("aA"), 2);
});
