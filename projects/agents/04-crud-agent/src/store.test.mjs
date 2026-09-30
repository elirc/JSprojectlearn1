import test from "node:test";
import assert from "node:assert/strict";
import { validateInput } from "./store.mjs";

test("accepts a valid session", () => {
  assert.equal(validateInput({ topic: "Effect", minutes: 25 }), null);
});

test("rejects blank topics", () => {
  assert.match(validateInput({ topic: "  ", minutes: 25 }), /topic/);
});

test("rejects non-integer and non-positive minutes", () => {
  assert.match(validateInput({ topic: "Effect", minutes: 2.5 }), /minutes/);
  assert.match(validateInput({ topic: "Effect", minutes: 0 }), /minutes/);
  assert.match(validateInput({ topic: "Effect", minutes: -5 }), /minutes/);
});
