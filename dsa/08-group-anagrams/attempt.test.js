import { test } from "node:test";
import assert from "node:assert/strict";
import { groupAnagrams } from "./attempt.js";

const todo = groupAnagrams.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("classic example", { skip }, () => {
  assert.deepEqual(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]), [
    ["eat", "tea", "ate"],
    ["tan", "nat"],
    ["bat"],
  ]);
});

test("empty input", { skip }, () => {
  assert.deepEqual(groupAnagrams([]), []);
});

test("single word", { skip }, () => {
  assert.deepEqual(groupAnagrams(["a"]), [["a"]]);
});

test("the empty string is a valid word", { skip }, () => {
  assert.deepEqual(groupAnagrams([""]), [[""]]);
  assert.deepEqual(groupAnagrams(["", ""]), [["", ""]]);
});

test("no anagrams: every word gets its own group", { skip }, () => {
  assert.deepEqual(groupAnagrams(["abc", "def"]), [["abc"], ["def"]]);
});

test("everything is one group", { skip }, () => {
  assert.deepEqual(groupAnagrams(["ab", "ba", "ab"]), [["ab", "ba", "ab"]]);
});

test("duplicate words are kept, not merged", { skip }, () => {
  assert.deepEqual(groupAnagrams(["go", "og", "go"]), [["go", "og", "go"]]);
});

test("different lengths never group together", { skip }, () => {
  assert.deepEqual(groupAnagrams(["a", "aa", "aaa"]), [["a"], ["aa"], ["aaa"]]);
});

test("case matters", { skip }, () => {
  assert.deepEqual(groupAnagrams(["Ab", "ba", "ab"]), [["Ab"], ["ba", "ab"]]);
});

test("groups come back in first-appearance order", { skip }, () => {
  assert.deepEqual(groupAnagrams(["zz", "aa", "zz", "aa"]), [
    ["zz", "zz"],
    ["aa", "aa"],
  ]);
});

test("repeated letters inside a word are counted, not just present", { skip }, () => {
  // "aab" and "abb" use the same letters but different amounts
  assert.deepEqual(groupAnagrams(["aab", "aba", "abb"]), [["aab", "aba"], ["abb"]]);
});

test("does not mutate or reorder the input array", { skip }, () => {
  const words = ["eat", "tea", "bat"];
  groupAnagrams(words);
  assert.deepEqual(words, ["eat", "tea", "bat"]);
});

test("every input word appears exactly once across all groups", { skip }, () => {
  const words = ["listen", "silent", "enlist", "google", "elgoog", "banana"];
  const groups = groupAnagrams(words);
  assert.equal(groups.flat().length, words.length);
  assert.deepEqual(groups, [
    ["listen", "silent", "enlist"],
    ["google", "elgoog"],
    ["banana"],
  ]);
});

test("larger input groups correctly", { skip }, () => {
  const words = [];
  for (let i = 0; i < 200; i++) words.push(i % 2 === 0 ? "abc" : "cab");
  const groups = groupAnagrams(words);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 200);
});
