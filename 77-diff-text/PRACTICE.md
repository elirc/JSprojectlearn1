# 🏋️ Practice: Text Diff

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Every exercise here builds *on top of* `diffLines` — none of them requires editing it, which is itself the point: an algorithm that returns data can be extended without being touched.

A shorthand the solutions use:

```js
const text = (...lines) => lines.join('\n');
const rebuild = (ops, keep) => ops.filter((o) => keep.includes(o.type)).map((o) => o.line);
```

## Exercises

### ⭐ 1. Read the operations (warm-up)

No new code. Call `diffLines` on `['apple','banana','cherry']` versus `['apple','blueberry','banana']` (joined with `\n`) and — *before running* — write down the exact operations list you expect, in order. Then check it, and check `summarize` and `formatSummary` too. Explain in one sentence why `banana` is a `same` even though it sits at index 1 in one file and index 2 in the other.

What it practices: reading a diff as *data*, and seeing the exact case the original got wrong.

Hint: expected is 4 operations and `{ same: 2, add: 1, del: 1, changed: 2, identical: false }`. The original called this four changes; the LCS calls it two.

### ⭐⭐ 2. applyDiff — turn a diff back into a patch (core)

A diff you can't apply is just a picture. Write `applyDiff(oldText, operations)` returning the new text: walk the operations, keeping `same` lines, skipping `del` lines, and inserting `add` lines. Crucially it must **verify as it goes** — if a `same` or `del` operation doesn't match the line actually sitting there, throw an error naming the line number, exactly like `patch` refusing to apply to a modified file. Check offline: `applyDiff(a, diffLines(a, b))` must equal `b` for every pair you try, including empty files and identical files; applying a patch to a *modified* old file must throw. Then fuzz it 300 times on random files.

What it practices: the round-trip property as executable code — and a validating apply, which is the difference between a patch tool and a corruption tool.

Hint: keep an index into the old lines; advance it on `same` and `del`, leave it alone on `add`. If it doesn't finish exactly at `oldLines.length`, the patch didn't cover the file.

### ⭐⭐ 3. formatSideBySide (core)

Add a third view to `format.js`: two columns, old on the left and new on the right, with a blank cell where a line only exists on one side. Signature `formatSideBySide(operations, { width = 12 })`; pad and truncate each cell to `width` so the divider stays aligned. Check offline with `['a','b']` vs `['a','B']` at `width: 3` — you should get exactly three rows: `a` beside `a`, `b` beside nothing, nothing beside `B`.

What it practices: proving the compute/display split actually pays. A whole new presentation, and `diff.js` is not opened.

Hint: `str.padEnd(width).slice(0, width)` both pads short strings and truncates long ones in one expression.

### ⭐⭐ 4. diffWords — the same algorithm, different atoms (core)

"Changed" is too coarse for prose: a one-word edit shouldn't highlight the whole paragraph. Write `diffWords(oldText, newText)` that runs the identical LCS machinery over **words** instead of lines. Split with `text.split(/(\s+)/)` — the capturing group keeps the whitespace as its own token, which is what lets you rebuild the text exactly. Check offline: `diffWords('the quick brown fox', 'the quick red fox')` must report exactly one deletion (`brown`) and one addition (`red`), with everything else `same`. Then fuzz the round-trip: joining `same`+`del` with `''` must give the old text back, and `same`+`add` the new one.

What it practices: noticing that `diffLines` never actually cared about lines — it compares elements of an array with `===`. Change what an element *is* and you get a new tool for free.

Hint: joining with `''` rather than `'\n'` is what makes the whitespace tokens do their job.

### ⭐⭐⭐ 5. LCS length in two rows instead of a full table (challenge)

The table is O(n × m) memory — 4 million numbers for two 2,000-line files. But look at the recurrence: `table[i][j]` only ever reads row `i` and row `i + 1`. So you only need **two rows**, and the memory drops to O(m). Write `lcsLength(a, b)` using two rolling arrays that you swap each iteration. Verify against a brute-force recursive LCS on 300 random pairs, and against `summarize(diffLines(...)).same` on 200 more. Cover `[]` versus `['a']` in both directions.

What it practices: reading a recurrence to discover what state is genuinely live — and meeting the real limitation of the two-row trick, which you should write down in a comment.

Hint: the limitation is the point. Two rows give you the LCS *length* but not the *path*, so you cannot backtrack to produce operations — the full table is the price of reconstructing the answer, not of computing its size. (Hirschberg's algorithm gets both; look it up when you're near a library.)

### ⭐⭐⭐ 6. Trim the common head and tail — and discover what "correct" means (challenge)

Real diff tools never build the full table for a one-line edit in a 5,000-line file. They first strip the identical leading lines and identical trailing lines, then run LCS on the small middle. Write `diffLinesTrimmed(oldText, newText)` that does this, emitting the trimmed head and tail as `same` operations around the inner diff.

Then write the property test — and this is the real exercise. Assert on 1,000 random pairs that the trimmed version produces **the same output as `diffLines`**. It will fail. Investigate before changing anything: are the failures *wrong*, or merely *different*? Then fix the test to assert the property that actually matters.

What it practices: the most valuable habit in this repo — when an optimisation "fails" a test, working out whether the test was asserting the contract or just the current implementation's habits.

Hint: compare `summarize()` counts and the round-trip, not the raw arrays. Then ask yourself which of the two outputs a human would rather read.

## Solutions

### 1. Read the operations

```js
const operations = diffLines(text('apple', 'banana', 'cherry'), text('apple', 'blueberry', 'banana'));
assert.deepEqual(operations, [
  { type: 'same', line: 'apple' },
  { type: 'add',  line: 'blueberry' },
  { type: 'same', line: 'banana' },
  { type: 'del',  line: 'cherry' },
]);
assert.deepEqual(summarize(operations), { same: 2, add: 1, del: 1, changed: 2, identical: false });
assert.equal(formatSummary(operations), '1 insertion(+), 1 deletion(-)');
```

WHY: `banana` is a `same` because the LCS never made a promise about *positions* — only about *order*. It appears after `apple` in both files, so it can sit in the common subsequence regardless of how many lines were inserted above it. That single property is the entire difference between this and the original, which compared index 1 to index 1, saw `banana` versus `blueberry`, and reported a change that never happened. Notice also that the answer is a plain array of plain objects: that's what makes the next five exercises possible without touching `diff.js` at all. Verified by running.

### 2. applyDiff

```js
export function applyDiff(oldText, operations) {
  const oldLines = toLines(oldText);
  const rebuilt = [];
  let i = 0;

  for (const operation of operations) {
    if (operation.type === 'add') {
      rebuilt.push(operation.line);
      continue;
    }
    if (oldLines[i] !== operation.line) {
      throw new Error(
        `patch does not apply at line ${i + 1}: expected ${JSON.stringify(operation.line)}, ` +
          `found ${JSON.stringify(oldLines[i])}`,
      );
    }
    if (operation.type === 'same') rebuilt.push(operation.line);
    i++; // 'same' and 'del' both consume an old line
  }

  if (i !== oldLines.length) throw new Error('patch does not cover the whole file');
  return rebuilt.join('\n');
}
```

WHY: this is the round-trip property from the test suite, promoted into a feature — and it explains why `del` operations carry the deleted line at all. They could have carried just an index; storing the *text* is what lets `applyDiff` verify that the file it's patching is the file the diff was computed against. That check is the whole difference between `patch` and data loss: applying a stale patch to an edited file silently produces a corrupt result unless something notices the mismatch. The final `i !== oldLines.length` guard catches a truncated operations list, the one failure mode the per-line check can't see. Verified by running: exact round-trips including empty and identical files, a thrown error on a modified base, and 300 random fuzz pairs.

### 3. formatSideBySide

```js
export function formatSideBySide(operations, { width = 12 } = {}) {
  const cell = (line) => line.padEnd(width).slice(0, width); // pad AND truncate
  return operations
    .map((operation) => {
      if (operation.type === 'same') return `${cell(operation.line)} | ${cell(operation.line)}`;
      if (operation.type === 'del') return `${cell(operation.line)} | ${cell('')}`;
      return `${cell('')} | ${cell(operation.line)}`;
    })
    .join('\n');
}
```

```
a   | a
b   |
    | B
```

WHY: nine lines for a completely different presentation, and `diff.js` was never opened — which is the concrete payoff for the compute/display split the README claims. Compare the effort of adding this view to the original, where the only way to get side-by-side output would be to write a second diff function with different `console.log` calls in it, complete with its own copy of the comparison logic and its own opportunity to drift. `padEnd().slice()` is the small trick worth keeping: it makes short and long lines both produce exactly `width` characters, so the `|` divider stays in one column no matter what the content is. Verified by running at `width: 3`.

### 4. diffWords

```js
export function diffWords(oldText, newText) {
  const tokenize = (t) => (t === '' ? [] : t.split(/(\s+)/).filter((part) => part !== ''));
  // ...identical table + walk as diffLines, over tokens instead of lines...
}
```

```js
const operations = diffWords('the quick brown fox', 'the quick red fox');
assert.deepEqual(
  operations.filter((o) => o.type !== 'same').map((o) => `${o.type}:${o.line}`),
  ['del:brown', 'add:red'],
);
```

WHY: the LCS code contains not one line that knows what a "line" is — it compares array elements with `===` and reports which survived. Feed it words and you have a prose diff; feed it characters and you have the highlighting inside a changed line that GitHub shows; feed it AST nodes and you have a structural code diff. Recognising that an algorithm's *atoms* are a parameter, not a fact, is how one implementation becomes three tools. The capturing group in `split(/(\s+)/)` is the detail that makes it exact: without it the whitespace is discarded and you can only approximate the original text when rebuilding; with it, whitespace runs are ordinary tokens that participate in the diff, so joining with `''` reproduces the input byte for byte. Verified by running, including a 200-trial round-trip fuzz.

### 5. LCS length in two rows

```js
export function lcsLength(a, b) {
  let next = new Array(b.length + 1).fill(0);    // row i + 1
  let current = new Array(b.length + 1).fill(0); // row i

  for (let i = a.length - 1; i >= 0; i--) {
    current[b.length] = 0;
    for (let j = b.length - 1; j >= 0; j--) {
      current[j] = a[i] === b[j] ? next[j + 1] + 1 : Math.max(next[j], current[j + 1]);
    }
    [next, current] = [current, next]; // the finished row becomes "next"
  }
  return next[0];
}
```

WHY: the recurrence only ever mentions `table[i + 1][...]` and `table[i][j + 1]`, so rows `0..i-1` are dead the moment row `i` is finished — 4,000,000 numbers collapse to 4,002. Swapping the two arrays rather than allocating a fresh one each iteration is what keeps it O(m) rather than O(m) *per row*. But note what you gave up, and write it in a comment: you have the LCS **length** and no way to reconstruct the LCS itself, because backtracking needs the whole table to walk back through. That is the honest trade — the full table isn't the cost of *computing* the answer, it's the cost of *remembering how you got there* — and it's why `diffLines` keeps the table while a "how similar are these two files?" scorer wouldn't. Verified by running against a brute-force recursive LCS on 300 random pairs and against `summarize(diffLines(...)).same` on 200 more.

### 6. Trim the common head and tail

```js
export function diffLinesTrimmed(oldText, newText) {
  const oldLines = toLines(oldText);
  const newLines = toLines(newText);

  let head = 0;
  while (head < oldLines.length && head < newLines.length && oldLines[head] === newLines[head]) head++;

  let tail = 0;
  while (
    tail < oldLines.length - head &&
    tail < newLines.length - head &&
    oldLines[oldLines.length - 1 - tail] === newLines[newLines.length - 1 - tail]
  ) {
    tail++;
  }

  return [
    ...oldLines.slice(0, head).map((line) => ({ type: 'same', line })),
    ...diffLines(
      oldLines.slice(head, oldLines.length - tail).join('\n'),
      newLines.slice(head, newLines.length - tail).join('\n'),
    ),
    ...oldLines.slice(oldLines.length - tail).map((line) => ({ type: 'same', line })),
  ];
}
```

The property test, after the investigation:

```js
test('trimming changes the table size, not the answer', () => {
  for (let trial = 0; trial < 1000; trial++) {
    const make = () => Array.from(
      { length: Math.floor(Math.random() * 9) },
      () => 'abc'[Math.floor(Math.random() * 3)],
    ).join('\n');
    const oldText = make();
    const newText = make();
    const trimmed = diffLinesTrimmed(oldText, newText);
    const plain = diffLines(oldText, newText);

    // NOT assert.deepEqual(trimmed, plain) — see WHY.
    const a = summarize(plain);
    const b = summarize(trimmed);
    assert.equal(b.same, a.same, `less minimal: ${oldText} / ${newText}`);
    assert.equal(b.add, a.add);
    assert.equal(b.del, a.del);
    assert.deepEqual(rebuild(trimmed, ['same', 'del']), toLines(oldText));
    assert.deepEqual(rebuild(trimmed, ['same', 'add']), toLines(newText));
  }
});
```

WHY: the naive assertion fails on about **131 of 1,000** random pairs — and every one of those failures is *correct output*. Across the same 1,000 pairs there were **zero** minimality mismatches and **zero** round-trip failures. What changed is only *which* equally-minimal diff you get: when several answers share the same number of changes, trimming anchors the shared lines at the ends of the file while the plain table anchors them wherever its `>=` tie-break happened to land. `assert.deepEqual(trimmed, plain)` was never testing correctness — it was testing "does the new code have the old code's arbitrary habits?", which is exactly the assertion that makes a suite fight every improvement. The right property is the one the module actually promises: **same minimality, same round trip**. (For what it's worth, the trimmed answer is usually the one a human prefers, because anchoring unchanged lines at the edges keeps the change in one contiguous block.) And the payoff is real: for a one-line edit in a 500-line file, `head` is 250 and `tail` is 249, so the table shrinks from 500×500 to **1×1** — 250,000 cells down to one. Verified by running all of the above.
