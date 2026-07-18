# 01 — FizzBuzz

**Lesson: separate *computing an answer* from *printing it*, and set up a test workflow.**

## Run it

```
node 01-fizzbuzz/original.js
node 01-fizzbuzz/refactored/cli.js
node --test 01-fizzbuzz/
```

## What's wrong with the original?

Nothing is *broken* — it prints the right output. But ask: **how would you test it?**
You can't. The only way to check it is to run it and read 100 lines with your eyes.
The logic (what to say for each number) and the output (`console.log`) are welded together.

Smaller issues that compound in bigger programs:

- `var` leaks out of the loop; `let` is block-scoped and what you want by default.
- `==` does type coercion (`"3" == 3` is true). Always use `===` so comparisons mean
  what they say.
- The `i % 3 == 0 && i % 5 == 0` branch **duplicates** the other two conditions. If the
  rules change ("also Bazz for 7"), you now edit an exploding number of combined branches:
  3 rules = 8 branches.

## What changed in the refactor

1. **`fizzbuzz(n)` is a pure function** — number in, string out, no printing. Pure
   functions are trivially testable: call them, assert on the return value. That's the
   whole test file.
2. **The "build up parts" pattern kills the combination explosion.** Each rule is one
   independent `if`. Adding "Bazz for 7" is one new line, not a rewrite of the branch tree.
3. **`cli.js` is the only file that touches the console**, and it's 2 lines. When the
   I/O layer is that thin, bugs have nowhere to hide.

## Key takeaway

The question "how would I test this?" is a design tool. If the answer is "I can't",
the computing and the doing are tangled, and the fix is to pull the decision-making
into a pure function. Every other project in this repo builds on that move.
