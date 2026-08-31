# Solution — Valid Parentheses

## The naive approach and its cost

Two tempting shortcuts, both wrong before we even discuss cost:

**Counting.** Keep a counter per bracket kind; check they end at zero.
`"([)]"` passes the count check and is invalid — counts ignore *order*.

**Repeated pair deletion.** While the string contains `"()"`, `"[]"`,
or `"{}"`, delete it; valid iff you end with `""`:

```js
let prev;
do {
  prev = s;
  s = s.replaceAll("()", "").replaceAll("[]", "").replaceAll("{}", "");
} while (s !== prev);
return s === "";
```

This one is actually *correct* — every balanced string has an innermost
pair you can delete — but each pass scans and rebuilds the string, and
deeply nested input like `"((((...))))"` needs a pass per layer:
**O(n²)** time and lots of string garbage. It also hides the idea
instead of teaching it.

## The insight

Read left to right and ask at each closer: *which bracket is allowed to
close right now?* Only the **most recently opened, not yet closed**
one. So the memory we need is the open brackets, in order, with access
to the newest — a **stack** (last in, first out). Every closer either
matches the top of the stack (pop, continue) or the string is invalid.

## The approach, step by step

1. Create an empty array `open` — used only with `push`/`pop`.
2. For each character:
   - **Opener** (`(`, `[`, `{`): push it.
   - **Closer**: pop, and compare against the required opener via a
     table `{ ")": "(", "]": "[", "}": "{" }`. Mismatch → `false`.
     Popping an empty stack yields `undefined`, which fails the
     comparison — the "closer with nothing open" case handles itself.
3. After the loop: `return open.length === 0` — leftover openers mean
   something never closed.

Trace `"([)]"`:

| char | action        | stack   | verdict |
|------|---------------|---------|---------|
| `(`  | push          | `(`     |         |
| `[`  | push          | `( [`   |         |
| `)`  | pop → `[`     | `(`     | `[` ≠ `(` → **false** |

Trace `"{[]}"`:

| char | action        | stack   | verdict |
|------|---------------|---------|---------|
| `{`  | push          | `{`     |         |
| `[`  | push          | `{ [`   |         |
| `]`  | pop → `[` ✓   | `{`     |         |
| `}`  | pop → `{` ✓   | (empty) | empty at end → **true** |

## Complexity

- **Time: O(n).** One pass; each character causes one O(1) push or pop.
- **Space: O(n).** Worst case is all openers (`"((((("`) — the stack
  holds them all. Balanced-ish input uses only nesting-depth space.

## Common mistakes

- **Forgetting the final emptiness check.** `"("` and `"()("` sail
  through the loop without a single mismatch; the leftovers on the
  stack are the only evidence. Returning `true` right after the loop
  is the classic bug.
- **Comparing against the wrong side of the table.** The table maps
  *closer → required opener*. Building it backwards (opener → closer)
  and then popping gives `undefined` lookups on closers.
- **Checking `open[open.length - 1]` but never popping** — matches
  succeed forever against the same stale top.
- **Special-casing the empty stack with a crash-prone peek** instead of
  letting `pop() === undefined` fail the comparison naturally.
- **Solving with counters.** It passes `"()[]{}"`-style tests and dies
  on `"([)]"` — if your tests never included an interleaved case, you'd
  ship the bug. (Notice the test file includes it. Always test order,
  not just counts.)
