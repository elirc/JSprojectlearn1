# 13 — Valid Parentheses

Given a string containing only the six bracket characters
`( ) [ ] { }`, decide whether it is **balanced**:

1. Every opener has a matching closer of the *same kind*.
2. Brackets close in the right order — the most recently opened
   bracket must close first (proper nesting, no interleaving).

## Signature

```js
/** @param {string} s @returns {boolean} */
export function isValidParentheses(s)
```

## Worked examples

**Example 1:** `isValidParentheses("()[]{}")` → `true`
Three pairs side by side. Each closes immediately: fine.

**Example 2:** `isValidParentheses("{[]}")` → `true`
`[]` nests inside `{}`. The `[` opened last, so it closes first — the
rule in action.

**Example 3:** `isValidParentheses("([)]")` → `false`
All four brackets have partners of the right kind, but they
*interleave*: when `)` arrives, the most recently opened bracket is
`[`, not `(`. Order matters, not just counts.

**Example 4:** `isValidParentheses("(")` → `false`
An opener that never closes. (Likewise `")"` — a closer with nothing
open — is `false`.)

## Constraints & edge cases

- Input contains only `()[]{}` — no other characters to worry about.
- Empty string → `true` (nothing is unbalanced).
- A closer arriving when nothing is open → `false` (e.g. `"]"`).
- Leftover openers at the end → `false` (e.g. `"((("`, `"()("`).
- Counting alone cannot solve this: `"([)]"` has matching counts and
  still fails. You need to remember *what* is open and in what order.

## Hints

Take them one at a time.

<details><summary>Hint 1 (nudge)</summary>

Read the string one character at a time. At any moment, which single
bracket is the *only* one allowed to close next? What does that tell
you about what you need to remember?
</details>

<details><summary>Hint 2 (direction)</summary>

You must remember the open brackets in order, and you only ever touch
the *most recent* one. Last in, first out. You built exactly this in
the RPN calculator (js track `10-rpn-calculator`): a stack — a plain
array used only with `push` and `pop`.
</details>

<details><summary>Hint 3 (the key insight)</summary>

Openers: push them. Closers: pop and compare — the popped opener must
be the matching kind. A lookup table like
`{ ")": "(", "]": "[", "}": "{" }` beats a six-way if/else.
</details>

<details><summary>Hint 4 (nearly the algorithm)</summary>

For each char: if it's an opener, push it. Otherwise pop; if the popped
value isn't the matching opener (note: popping an empty array gives
`undefined`, which conveniently fails the comparison), return `false`.
After the loop, return whether the stack is empty — leftovers mean
unclosed openers.
</details>

## Run

```
node --test dsa/13-valid-parentheses/attempt.test.js
```
