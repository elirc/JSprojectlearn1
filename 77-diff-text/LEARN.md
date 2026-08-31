# 📘 Learning Guide: Text Diff

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The thing that shows you what changed between two versions of a file — `git diff`, the side-by-side view in a pull request, the "track changes" in a document.

```
  function greet(name) {          <- unchanged
+ // Say hello to somebody.       <- added
-   console.log('hi');            <- deleted
```

The obvious approach compares line 1 to line 1, line 2 to line 2. It falls apart on the most ordinary edit imaginable: insert a line at the top and *every* later line looks different, because they all shifted down one. The refactor gets it right by asking a question that sounds backwards — **what stayed the same?**

## 2. Concepts you need first

### Lines are just an array

```js
console.log('a\nb\nc'.split('\n')); // prints: [ 'a', 'b', 'c' ]
```

A "file diff" is really an array diff. Everything below works just as well on arrays of anything.

### The empty-string trap

`split` has a corner that will bite you:

```js
console.log(''.split('\n')); // prints: [ '' ]   <- ONE empty line, not zero!
```

An empty file has *no* lines, but `split` hands you an array containing one empty string. Left alone, a diff of two empty files reports a phantom matching line. That's why `toLines` special-cases `''` and returns `[]`. Real-world text handling is full of these; the fix is to name the rule once, in one function, and test it.

### Subsequence vs substring

This distinction is the whole project.

- A **substring** is contiguous: `bc` is a substring of `abcd`.
- A **subsequence** keeps *order* but may **skip**: `ad` is a subsequence of `abcd`, and so is `bd`.

```js
// old: [apple, banana, cherry]
// new: [apple, blueberry, banana]
// common subsequence: [apple, banana]   <- order kept, blueberry/cherry skipped
```

`banana` moved from position 1 to position 2 and is still *there*. A positional comparison cannot see that; a subsequence can, because it never promised anything about positions.

### The Longest Common Subsequence (LCS), and the inversion

Here is the idea worth taking away from this project:

> The lines that changed are exactly the lines **not** in the longest common subsequence.

So instead of hunting for differences (hard, ambiguous, many answers) you hunt for the biggest thing both files share (one well-defined answer). Everything in the old file outside the LCS was **deleted**; everything in the new file outside it was **added**. Inverting the question turned a vague problem into a computable one.

### Dynamic programming: build a table so nothing is computed twice

The naive recursive LCS re-solves the same sub-problems exponentially many times. Instead, fill a table where `table[i][j]` = the LCS length of `old[i..]` and `new[j..]`. Fill it from the **bottom-right**, so every cell only needs cells that are already done:

```js
table[i][j] = old[i] === new[j]
  ? table[i + 1][j + 1] + 1                  // matched: count it, move both on
  : Math.max(table[i + 1][j], table[i][j + 1]); // skip whichever loses less
```

### A tiny table, walked by hand

`old = [a, b, c]`, `new = [b, c, d]`. Rows are old indexes, columns new; the extra row and column of zeros mean "one side is empty, so the LCS is 0".

```
            j=0(b) j=1(c) j=2(d)  j=3
   i=0(a)     2      1      0      0
   i=1(b)     2      1      0      0
   i=2(c)     1      1      0      0
   i=3        0      0      0      0
```

Fill order is bottom-right to top-left. Check two cells yourself:

- `table[2][1]`: `old[2]='c'`, `new[1]='c'` — equal, so `table[3][2] + 1 = 0 + 1 = 1`. ✓
- `table[1][0]`: `old[1]='b'`, `new[0]='b'` — equal, so `table[2][1] + 1 = 1 + 1 = 2`. ✓
- `table[0][0]`: `'a'` vs `'b'` — not equal, so `max(table[1][0]=2, table[0][1]=1) = 2`. ✓

`table[0][0] = 2` — the LCS is 2 lines long (`b` and `c`).

### Walking the table to produce operations

Now start at `(0, 0)` and walk *forward*, letting the numbers choose:

| at | old[i] vs new[j] | decision | output |
|----|------------------|----------|--------|
| (0,0) | `a` vs `b` | not equal; `table[1][0]=2 >= table[0][1]=1` | `del a` |
| (1,0) | `b` vs `b` | equal | `same b` |
| (2,1) | `c` vs `c` | equal | `same c` |
| (3,2) | old exhausted | drain the rest of new | `add d` |

```
- a
  b
  c
+ d
```

Two lines survived, one was deleted, one added. The table did the thinking; the walk just reads its answers.

The `>=` in that comparison is a **tie-break** decision: when deleting and adding cost the same, we emit the deletion first. That's why a changed line shows as `- old` then `+ new`, matching every diff tool you've used.

### Cost, honestly

The table is `old.length × new.length` cells — **O(n × m)** time *and* memory. For two 2,000-line source files that's 4 million cells: fine. For two 500,000-line logs it is not, which is why real tools use cleverer algorithms (Myers') for big inputs. Knowing *when* your algorithm stops being appropriate is part of knowing the algorithm.

### Operations as data, and separating compute from display

`diffLines` returns a list like `[{ type: 'del', line: 'a' }, { type: 'same', line: 'b' }]`. It never prints. A separate `format.js` turns operations into text. This is the repo's one big idea (decide vs do) in its clearest form: **one algorithm, three views** — full output, a `git`-style summary, and a compact view that collapses untouched stretches. Adding a fourth view touches no diff logic at all.

## 3. Walking through the original code

```js
function diff(a, b) {
  var oldLines = a.split("\n");
  var newLines = b.split("\n");

  if (oldLines.length !== newLines.length) {
    for (var i = 0; i < oldLines.length; i++) console.log("- " + oldLines[i]);
    for (var j = 0; j < newLines.length; j++) console.log("+" + newLines[j]);
    return;
  }
  ...
}
```

Different lengths? Print the entire old file as deleted and the entire new file as added. That branch handles the single most common edit there is — adding a line — by declaring total war. (Note `"+"` with no space, one of four pasted prefixes that already drifted.)

The equal-length branch is no better in principle:

```js
if (oldLines[k] === newLines[k]) console.log("  " + oldLines[k]);
else { console.log("- " + oldLines[k]); console.log("+ " + newLines[k]); }
```

It compares **by position**, so a line that merely moved reads as changed. Run the file: `banana` shifts down one row and is reported as two separate changes.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: a one-line change produces a total rewrite.** Add a comment to the top of a 3-line file and you get 3 deletions and 4 additions — seven changed lines out of a one-line edit. In a code review that means the reviewer sees the entire file highlighted and has no idea what to look at. A diff whose output is "everything changed" carries no information at all; you may as well print the file.

**Flaw 2: position is the wrong thing to compare.** Files aren't grids where line 5 has an identity. Lines *move*. Comparing index to index means the code is answering a question ("is line 5 the same text as before?") that nobody asked, instead of the one they did ("which lines survived?").

**Flaw 3: the prefixes were pasted four times and drifted.** Three of them are `"+ "` and one is `"+"`. It's a cosmetic bug precisely because nothing returns a value to test — the fourth copy could have been `"?"` and no test would have noticed.

**Flaw 4: logic welded to I/O.** `diff` prints and returns `undefined`. So there is no way to count changes for a commit message, collapse unchanged regions, colourise, generate a patch file, render in a browser, or write a test. Every one of those needs the *answer*, and the answer was converted straight to terminal output and thrown away.

## 5. Try it yourself first!

1. **Vague hint:** Comparing line-to-line by position fails because lines shift. What if you never assumed a line's position at all?
2. **Warmer:** Turn the question around. Instead of "which lines differ?", ask "what is the longest sequence of lines, in order, that appears in *both* files?"
3. **Warmer still:** Everything in the old file that isn't in that sequence was deleted. Everything in the new file that isn't in it was added. That's the whole diff.
4. **Almost the answer:** Build a table where `table[i][j]` is the LCS length of `old[i..]` and `new[j..]`. Equal lines: `table[i+1][j+1] + 1`. Unequal: `Math.max(table[i+1][j], table[i][j+1])`. Fill from the bottom-right, then walk from `(0,0)` emitting `same` / `del` / `add`.
5. **Do the table by hand first.** `old = [a,b,c]`, `new = [b,c,d]`, on paper. If your numbers match the table above, your code will work.
6. **Design question:** should `diffLines` return operations or a formatted string? Write down what each choice makes easy and what it makes impossible. (Then notice the original chose a third, worst option: neither.)

## 6. Understanding the refactored solution

**`toLines` names the empty-file rule once:**

```js
if (text === '') return [];
return text.replace(/\r\n/g, '\n').split('\n');
```

Zero lines for empty text, and Windows line endings normalised so a file edited on another OS doesn't read as 100% changed.

**The table is eight lines** and is filled bottom-right to top-left so each cell reads only finished neighbours. The `+ 1` branch is "this line survives"; the `Math.max` branch is "skip whichever side loses less."

**The walk turns numbers into operations:**

```js
} else if (table[i + 1][j] >= table[i][j + 1]) {
  operations.push({ type: 'del', line: oldLines[i] });
  i++;
}
```

It asks the table which skip is cheaper and follows the advice. After the loop, two little `while`s drain whichever side has lines left over — that's how "3 lines added at the end" costs three operations instead of a special case.

**`format.js` holds the prefixes once:**

```js
const PREFIX = { same: '  ', add: '+ ', del: '- ' };
```

One table, three formatters. `formatCompact` is worth reading closely: it collapses untouched stretches behind `...` and knows *nothing* about LCS — it just walks the operations. That is the dividend of returning data.

**The tests are unusually strong, in a way worth copying.** Alongside the examples (insert, delete, change, empty, CRLF) there are two *property* tests:

- **Round trip:** filtering to `same`+`del` must rebuild the old file exactly, and `same`+`add` the new one — checked on 200 random pairs. This catches any operation list that lies about its inputs.
- **Minimality:** the number of `same` operations must equal a brute-force recursive LCS length. A diff can be *correct* (round-trips fine) yet **wasteful** — deleting and re-adding an identical line round-trips perfectly and is still a bad diff. Only this test pins down that the answer is the *smallest* one.

## 7. Words you learned (glossary)

- **Diff** — a description of the changes between two versions.
- **Hunk / operation** — a chunk of change / here, one `{ type, line }` record.
- **Substring vs subsequence** — contiguous / order kept but skipping allowed.
- **LCS** — Longest Common Subsequence: the lines that survived, in order.
- **Dynamic programming** — solving sub-problems once into a table, then reusing them.
- **Memoisation table** — the grid of already-computed answers.
- **Backtracking the table** — walking the finished table to reconstruct the answer.
- **Tie-break** — the `>=` that makes deletions print before additions.
- **O(n × m)** — cost proportional to the two lengths multiplied; the table's size.
- **Round-trip property** — "rebuild the input from the output" as a test.
- **Minimal diff** — one with no unnecessary add/delete pairs.
- **Context lines** — unchanged lines kept around a change for readability.
- **CRLF / LF** — Windows / Unix line endings.
- **Pure function** — same input, same output, no side effects; `diffLines` is one.

## 8. Experiments to try on the plane (no internet needed)

1. **See the phantom line.** In a scratch file: `console.log(''.split('\n'), toLines(''))`. Expected: `[ '' ]` and `[]` — one imaginary line versus none, the difference `toLines` exists to erase.
2. **Diff the table by hand.** Take `old = [a,b,c]`, `new = [b,c,d]`, fill the 4×4 table on paper, then check it against `diffLines('a\nb\nc', 'b\nc\nd')`. Expected: `del a, same b, same c, add d`, and your `table[0][0]` should be 2.
3. **Flip the tie-break.** In your copy, change `table[i + 1][j] >= table[i][j + 1]` to `>`. Rerun the tests. Expected: the "changed line" test fails because additions now print before deletions. Same *number* of changes, different convention — a display decision hiding inside the algorithm.
4. **Diffs are not symmetric.** Compare `diffLines('a\nb', 'a\nB')` with `diffLines('a\nB', 'a\nb')`. Expected: mirror images (`del b, add B` versus `del B, add b`) — "changed" always has a direction.
5. **Break minimality on purpose.** Make the walk emit `del` then `add` for *every* unequal pair, ignoring the table. Expected: the round-trip test still passes (!) while the minimality test fails. That's the clearest possible demonstration of why one property test is not enough.
6. **Diff something that isn't text.** `diffLines` only uses `===` on strings, so feed it two lists of words, or filenames, joined with `\n`. Expected: it works unchanged — the algorithm was never about text, only about sequences.
