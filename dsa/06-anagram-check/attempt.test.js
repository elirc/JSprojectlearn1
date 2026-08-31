import { test } from "node:test";
import assert from "node:assert/strict";
import { isAnagram } from "./attempt.js";

const todo = isAnagram.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("classic pair: listen / silent", { skip }, () => {
  assert.equal(isAnagram("listen", "silent"), true);
});

test("classic non-pair: rat / car", { skip }, () => {
  assert.equal(isAnagram("rat", "car"), false);
});

test("anagram / nagaram", { skip }, () => {
  assert.equal(isAnagram("anagram", "nagaram"), true);
});

test("different lengths are never anagrams", { skip }, () => {
  assert.equal(isAnagram("a", "ab"), false);
  assert.equal(isAnagram("abc", "ab"), false);
});

test("same letters, different counts", { skip }, () => {
  assert.equal(isAnagram("aab", "abb"), false);
  assert.equal(isAnagram("aacc", "ccac"), false);
});

test("both strings empty", { skip }, () => {
  assert.equal(isAnagram("", ""), true);
});

test("one string empty", { skip }, () => {
  assert.equal(isAnagram("", "a"), false);
  assert.equal(isAnagram("a", ""), false);
});

test("a string is an anagram of itself", { skip }, () => {
  assert.equal(isAnagram("hello", "hello"), true);
});

test("case matters", { skip }, () => {
  assert.equal(isAnagram("Ab", "ba"), false);
  assert.equal(isAnagram("Listen", "Silent"), false);
});

test("spaces are ordinary characters", { skip }, () => {
  assert.equal(isAnagram("a b", "b a"), true);
  assert.equal(isAnagram("ab", "a b"), false);
});

test("digits and punctuation count too", { skip }, () => {
  assert.equal(isAnagram("12!", "!21"), true);
  assert.equal(isAnagram("12!", "12?"), false);
});

test("single characters", { skip }, () => {
  assert.equal(isAnagram("x", "x"), true);
  assert.equal(isAnagram("x", "y"), false);
});

test("repeated characters throughout", { skip }, () => {
  assert.equal(isAnagram("aabbcc", "cbacba"), true);
  assert.equal(isAnagram("aabbcc", "aabbcd"), false);
});

test("longer strings still answer correctly", { skip }, () => {
  const base = "the quick brown fox jumps over the lazy dog";
  const shuffled = base.split("").reverse().join("");
  assert.equal(isAnagram(base, shuffled), true);
  assert.equal(isAnagram(base, shuffled.replace("q", "z")), false);
});
