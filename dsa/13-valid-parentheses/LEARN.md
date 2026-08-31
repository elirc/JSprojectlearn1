# 📘 Learning Guide: Valid Parentheses

The stack — the data structure for anything that *nests* — introduced by the problem it was born for.

## 1. The problem in plain words

You get a string made only of `( ) [ ] { }`. Decide if it's balanced,
the way brackets in real code must be: every opener gets a same-kind
closer, and inner brackets close before outer ones. `"{[]}"` is fine.
`"([)]"` is not — the `(` and `[` are both open, and the `)` tries to
close `(` while `[` is still open *inside* it. That's the interleaving
your editor would flag instantly.

The output is just `true` or `false`.

## 2. Concepts you need first

- **A stack** is a pile you can only touch from the top: `push` adds,
  `pop` removes the newest item. "Last in, first out" (LIFO). In
  JavaScript, a plain array *used only with* `push()` and `pop()` is a
  perfectly good stack — both are O(1). You've already used one: the
  RPN calculator (js `10-rpn-calculator`) pushed numbers and popped two
  per operator, and the undo/redo project (js `39-undo-redo`) was two
  stacks facing each other.
- **Nesting.** Structures that open and close around other structures:
  brackets, HTML tags, function calls (the *call stack*!), directory
  trees. Whenever "the most recent unfinished thing must finish first,"
  a stack is the shape of the bookkeeping.
- **Lookup tables.** A tiny object like `{ ")": "(" }` replaces a
  six-branch if/else. You used computed keys in `08-group-anagrams`;
  this is the same instinct, smaller.

## 3. How to think about it

Read the string one character at a time and try to be the referee.
At `"{[" ` — nothing to decide yet, just remember what's open. Now a
`]` arrives. Is it legal? Only if the *most recently opened* bracket is
`[`. The `{` before it is irrelevant right now — it's waiting its turn
underneath.

Say that as a rule: **a closer may only close the newest open
bracket.** So the referee's memory must (a) hold all open brackets,
(b) in order, (c) with instant access to the newest, and (d) instant
removal of the newest when it closes. Read those four requirements
back — they *are* the definition of a stack. This problem isn't
"solvable with a stack"; it's the reason stacks exist.

Then check the three ways a string can fail, and where each is caught:

1. **Wrong kind** (`"(]"`): pop gives `(`, table says `]` needs `[` —
   mismatch, false.
2. **Closer with nothing open** (`"]"`): pop gives `undefined` —
   mismatch, false, no special case needed.
3. **Opener never closed** (`"()("`): the loop ends without complaint;
   the leftover `(` on the stack is the evidence. Final check:
   stack must be empty.

Three failure modes, three mechanisms. If your implementation misses a
failure mode, one of those three has no mechanism — that's a useful
self-review checklist before you run the tests.

## 4. Common wrong turns

- **Counting instead of stacking.** Three counters, check they end at
  zero (and never dip negative). Catches `"())"`, misses `"([)]"` —
  counts can't see *order*. One-bracket-kind versions of this problem
  can be solved with a counter; three kinds cannot.
- **Returning `true` right after the loop.** The silent failure mode:
  `"((("` never mismatches. The stack's leftover contents are part of
  the answer — `return open.length === 0`.
- **Peeking without popping** — comparing against the top but
  forgetting to remove it. Every closer after the first compares
  against the same stale bracket.
- **Using `shift()`/`unshift()`** — that's a queue end, it's O(n) per
  operation, and it checks the *oldest* bracket instead of the newest.
  Wrong end, wrong answer.
- **Regex adventures.** Regular expressions famously cannot count
  arbitrary nesting depth. `replaceAll("()", "")` in a loop works but
  is O(n²); a real regex one-liner does not exist. (This is a known
  theoretical limit, not a skill issue.)

## 5. The solution, step by step

```js
const MATCHING_OPENER = { ")": "(", "]": "[", "}": "{" };

export function isValidParentheses(s) {
  const open = []; // stack of unclosed openers, newest on top

  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") {
      open.push(ch);                       // remember: this is now open
    } else {
      if (open.pop() !== MATCHING_OPENER[ch]) {
        return false;                      // wrong kind, or nothing open
      }
    }
  }

  return open.length === 0;               // leftovers = unclosed openers
}
```

Step through `"([]{})"`:

| char | stack after | note                        |
|------|-------------|-----------------------------|
| `(`  | `(`         | push                        |
| `[`  | `( [`       | push                        |
| `]`  | `(`         | pop `[`, needs `[` ✓        |
| `{`  | `( {`       | push                        |
| `}`  | `(`         | pop `{`, needs `{` ✓        |
| `)`  | (empty)     | pop `(`, needs `(` ✓        |

Loop ends, stack empty → `true`. Notice how the stack's height traces
the nesting depth over time — that's a picture worth keeping in your
head, because "current depth" questions all reduce to stack height.

One line deserves a second look: `open.pop() !== MATCHING_OPENER[ch]`.
When the stack is empty, `pop()` returns `undefined`; `undefined` never
equals `"("`/`"["`/`"{"`, so the illegal-closer case fails the same
comparison as the wrong-kind case. One line, two failure modes.

## 6. Complexity, gently

Each of the n characters triggers exactly one push or one pop, each
O(1) on a JavaScript array. **Time O(n)** — and you can't beat it:
change just the last character of a balanced string (`"()"` → `"(("`)
and the answer flips, so every character must be read.

Space is the maximum stack height = maximum nesting depth. Worst case
`"((((("` — all n characters live on the stack: **O(n)**. Typical
balanced input uses far less.

## 7. Words you learned

- **Stack** — last-in-first-out collection; array + `push` + `pop`.
- **LIFO** — the access discipline itself; contrast FIFO (queues,
  coming in problem 15).
- **Nesting / nesting depth** — structures inside structures; depth =
  how many are currently open = current stack height.
- **Sentinel-free failure** — letting `undefined` from an empty `pop()`
  fail a comparison instead of writing a special case.
- **Matching table** — a small object mapping each input to its
  required partner; data instead of branching.

## 8. Variations to try

1. **Minimum removals:** given a bracket string, count the fewest
   characters you'd delete to balance it. (Failed pops + leftovers.)
2. **Longest valid prefix:** return the length of the longest prefix
   that is balanced-so-far-and-completable. Where in the loop do you
   detect the point of no return?
3. **Add angle brackets `<>`** — how many lines change? (If the answer
   is more than two, your matching table isn't pulling its weight.)
4. **Score nesting:** `"()"` = 1, `"AB"` = A+B, `"(A)"` = 2×A.
   Compute a string's score with a stack of running subtotals.
5. **Generate:** print every balanced string of n pairs of `()`.
   (A taste of backtracking — problem 23 will formalize it.)
