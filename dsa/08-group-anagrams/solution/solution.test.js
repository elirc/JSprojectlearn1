import { test } from "node:test";
import assert from "node:assert/strict";
import { groupAnagrams } from "./solution.js";

test("classic example", () => {
  assert.deepEqual(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]), [
    ["eat", "tea", "ate"],
    ["tan", "nat"],
    ["bat"],
  ]);
});

test("empty input", () => {
  assert.deepEqual(groupAnagrams([]), []);
});

test("single word", () => {
  assert.deepEqual(groupAnagrams(["a"]), [["a"]]);
});

test("the empty string is a valid word", () => {
  assert.deepEqual(groupAnagrams([""]), [[""]]);
  assert.deepEqual(groupAnagrams(["", ""]), [["", ""]]);
});

test("no anagrams: every word gets its own group", () => {
  assert.deepEqual(groupAnagrams(["abc", "def"]), [["abc"], ["def"]]);
});

test("everything is one group", () => {
  assert.deepEqual(groupAnagrams(["ab", "ba", "ab"]), [["ab", "ba", "ab"]]);
});

test("duplicate words are kept, not merged", () => {
  assert.deepEqual(groupAnagrams(["go", "og", "go"]), [["go", "og", "go"]]);
});

test("different lengths never group together", () => {
  assert.deepEqual(groupAnagrams(["a", "aa", "aaa"]), [["a"], ["aa"], ["aaa"]]);
});

test("case matters", () => {
  assert.deepEqual(groupAnagrams(["Ab", "ba", "ab"]), [["Ab"], ["ba", "ab"]]);
});

test("groups come back in first-appearance order", () => {
  assert.deepEqual(groupAnagrams(["zz", "aa", "zz", "aa"]), [
    ["zz", "zz"],
    ["aa", "aa"],
  ]);
});

test("repeated letters inside a word are counted, not just present", () => {
  // "aab" and "abb" use the same letters but different amounts
  assert.deepEqual(groupAnagrams(["aab", "aba", "abb"]), [["aab", "aba"], ["abb"]]);
});

test("does not mutate or reorder the input array", () => {
  const words = ["eat", "tea", "bat"];
  groupAnagrams(words);
  assert.deepEqual(words, ["eat", "tea", "bat"]);
});

test("every input word appears exactly once across all groups", () => {
  const words = ["listen", "silent", "enlist", "google", "elgoog", "banana"];
  const groups = groupAnagrams(words);
  assert.equal(groups.flat().length, words.length);
  assert.deepEqual(groups, [
    ["listen", "silent", "enlist"],
    ["google", "elgoog"],
    ["banana"],
  ]);
});

test("larger input groups correctly", () => {
  const words = [];
  for (let i = 0; i < 200; i++) words.push(i % 2 === 0 ? "abc" : "cab");
  const groups = groupAnagrams(words);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 200);
});
