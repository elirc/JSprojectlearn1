import { test } from "node:test";
import assert from "node:assert/strict";
import { reverseWords } from "./solution.js";

test("plain sentence reverses word order", () => {
  assert.equal(reverseWords("the sky is blue"), "blue is sky the");
});

test("leading and trailing spaces are dropped", () => {
  assert.equal(reverseWords("  hello world  "), "world hello");
});

test("runs of inner spaces collapse to one", () => {
  assert.equal(reverseWords("a good   example"), "example good a");
});

test("single word comes back unchanged", () => {
  assert.equal(reverseWords("solo"), "solo");
});

test("single word with messy spacing gets trimmed", () => {
  assert.equal(reverseWords("   solo   "), "solo");
});

test("empty string stays empty", () => {
  assert.equal(reverseWords(""), "");
});

test("all-spaces string becomes empty", () => {
  assert.equal(reverseWords("     "), "");
});

test("two words swap", () => {
  assert.equal(reverseWords("ab cd"), "cd ab");
});

test("letters inside words are NOT reversed", () => {
  assert.equal(reverseWords("abc def"), "def abc");
});

test("punctuation travels with its word", () => {
  assert.equal(reverseWords("hi, there!"), "there! hi,");
});

test("numbers and mixed tokens are words too", () => {
  assert.equal(reverseWords("1 2  3   4"), "4 3 2 1");
});

test("longer messy sentence", () => {
  assert.equal(
    reverseWords("  never   gonna give  you   up "),
    "up you give gonna never"
  );
});
