import { test } from "node:test";
import assert from "node:assert/strict";
import { reverseWords } from "./attempt.js";

const todo = reverseWords.toString().includes("TODO");
const skip =
  todo && "unsolved — edit attempt.js (delete the TODO line) to activate these tests";

test("plain sentence reverses word order", { skip }, () => {
  assert.equal(reverseWords("the sky is blue"), "blue is sky the");
});

test("leading and trailing spaces are dropped", { skip }, () => {
  assert.equal(reverseWords("  hello world  "), "world hello");
});

test("runs of inner spaces collapse to one", { skip }, () => {
  assert.equal(reverseWords("a good   example"), "example good a");
});

test("single word comes back unchanged", { skip }, () => {
  assert.equal(reverseWords("solo"), "solo");
});

test("single word with messy spacing gets trimmed", { skip }, () => {
  assert.equal(reverseWords("   solo   "), "solo");
});

test("empty string stays empty", { skip }, () => {
  assert.equal(reverseWords(""), "");
});

test("all-spaces string becomes empty", { skip }, () => {
  assert.equal(reverseWords("     "), "");
});

test("two words swap", { skip }, () => {
  assert.equal(reverseWords("ab cd"), "cd ab");
});

test("letters inside words are NOT reversed", { skip }, () => {
  assert.equal(reverseWords("abc def"), "def abc");
});

test("punctuation travels with its word", { skip }, () => {
  assert.equal(reverseWords("hi, there!"), "there! hi,");
});

test("numbers and mixed tokens are words too", { skip }, () => {
  assert.equal(reverseWords("1 2  3   4"), "4 3 2 1");
});

test("longer messy sentence", { skip }, () => {
  assert.equal(
    reverseWords("  never   gonna give  you   up "),
    "up you give gonna never"
  );
});
