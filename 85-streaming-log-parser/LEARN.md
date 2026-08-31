# 📘 Learning Guide: Streaming Log Parser

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A program that reads a web server's log file and prints a summary:

```
levels:    {"INFO":620480,"WARN":155120,"ERROR":155120,"DEBUG":155120}
statuses:  {"2xx":890254,"4xx":148376,"5xx":47210}
durations: {"<10ms":7387,"<100ms":65004,"<1000ms":651511,">=1000ms":361938}
mean 749.7ms, max 1499ms, error rate 14.3%, malformed 2.0%
slowest:
  2024-03-01T00:08:47Z  / 200 1499ms
```

The log lines look like this (the same format as project 36):

```
2024-03-01T09:15:22Z [INFO] /api/users 200 42ms
```

Both versions produce the same numbers from the same 50MB file. The difference is
what it costs: the original needs about 90MB of memory to do it, and the refactor
needs about 10MB — and, more importantly, would need the same 10MB for a 50GB file.

Both scripts generate their own sample log in your temp directory and delete it when
they're done, so nothing needs downloading.

## 2. Concepts you need first

### Memory, and why a file in memory costs more than the file

`readFileSync(path, 'utf8')` returns the whole file as one **string**. Then
`.split('\n')` builds an **array** with one string per line. For a 50MB log that's
~1.1 million array slots, each pointing at a string object with its own bookkeeping —
and the original 50MB string usually stays alive behind them. Hence 50MB of file
costing ~90MB of heap.

### The hard ceiling

V8 (the JavaScript engine) has a maximum string length — around 512MB. A log bigger
than that cannot be read into a string *at all*: `readFileSync(..., 'utf8')` throws.
This is the difference worth internalising: the original isn't slow on big files, it
is **impossible** on them.

### Streams: data that arrives in pieces

A **stream** delivers data a chunk at a time instead of all at once.

```js
import { createReadStream } from 'node:fs';
const input = createReadStream('big.log'); // ~64KB at a time
input.on('data', (chunk) => console.log(chunk.length));
```

Only one chunk is in memory at a time; the rest is still on disk. A stream is
"where the data is going to come from", not "the data".

### Chunks don't respect lines

This is the trap. A 64KB chunk ends wherever 64KB ends — usually in the middle of a
line:

```
chunk 1: "...09:15:22Z [INFO] /api/us"
chunk 2: "ers 200 42ms\n2024-03-01T09..."
```

Splitting each chunk on `\n` yourself produces two broken half-lines. The fix is to
keep the tail of each chunk until its newline arrives — which is exactly what
`readline` does for you:

```js
import readline from 'node:readline';
const lines = readline.createInterface({ input, crlfDelay: Infinity });
for await (const line of lines) { /* always a whole line */ }
```

`crlfDelay: Infinity` makes Windows `\r\n` endings behave as one break.

### `for await ... of`

The asynchronous cousin of `for...of`: it waits for each value to arrive before
running the body. It's how you consume anything that produces values over time, and
it applies **backpressure** — while your body is busy, the source is asked to wait
instead of piling up in memory.

### Incremental aggregation (a fold, one item at a time)

You've met `reduce`: start with an accumulator, combine each item into it. Streaming
is `reduce` where the items arrive over time:

```js
const acc = createAccumulator();      // the running answer
for await (const line of lines) addLine(acc, line); // fold one in, drop the line
return finish(acc);                   // derive the report
```

The insight the whole project rests on: **the summary doesn't contain lines**. Counts,
sums, a maximum, a fixed histogram, and the top 3 rows all fit in a few hundred bytes.

### Bounded vs unbounded state

Some questions can be answered in constant memory (count, sum, mean, max, top-K,
bucketed histogram). Others cannot: an exact median, a full sort, "the set of distinct
user IDs" — those grow with the data. Recognising which kind you have *before* writing
the code is the skill.

### Backpressure, on the writing side too

`stream.write(text)` returns `false` when the buffer is full. Ignoring that is how a
"streaming" writer secretly buffers everything in memory:

```js
if (!out.write(block)) await once(out, 'drain'); // wait for it to catch up
```

### Small pieces used here

- `Buffer.byteLength(s, 'utf8')` — how many **bytes** a string takes (not characters).
- `Readable.from(['a', 'b'])` — a stream from values you choose: perfect for tests.
- `process.memoryUsage()` — `heapUsed` (JavaScript objects) and `rss` (total memory
  held by the process).
- `os.tmpdir()` — the OS scratch directory; `rmSync(path, { force: true })` cleans up.

## 3. Walking through the original code

After generating a sample log, the program does its real work in two lines:

```js
const text = readFileSync(LOG_PATH, 'utf8'); // copy 1
const lines = text.split('\n');              // copy 2
```

Then a loop that is perfectly reasonable in isolation:

```js
for (const line of lines) {
  const match = /\[([A-Z]+)\] \S+ (\d{3}) (\d+)ms$/.exec(line);
  if (!match) continue;
  counts[match[1]] = (counts[match[1]] ?? 0) + 1;
  total += Number(match[3]);
  if (Number(match[3]) > slowest) slowest = Number(match[3]);
}
```

Notice the shape of that loop: it only ever *adds to counters*. It never looks back at
a previous line. The data was never needed all at once — the code just happened to ask
for it that way. That observation is the entire refactor.

The memory report before and after makes the cost visible, and the file is deleted in
a `finally` so the demo cleans up after itself even if it crashes.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: it pays for the whole file to produce four numbers.** ~90MB of heap for a
50MB log — and the ratio holds as the log grows, until it doesn't fit.

**Flaw 2: the ceiling isn't a slowdown, it's a wall.** Past V8's maximum string
length, `readFileSync(..., 'utf8')` throws. Past your container's memory limit, the
process is killed outright — no error, no partial result, just gone. Both failures
happen at 3am, on the biggest log, which is the one you most wanted to read.

**Flaw 3: no answer until the end.** No progress, nothing printed early, and if the
file is truncated halfway you lose the entire read.

**Flaw 4: the logic can't be tested without a giant file.** Parsing and summarising
are welded to `readFileSync`, so a unit test would have to write 50MB to disk first.
Tests that need fixtures that big don't get written.

**Flaw 5 (subtle): the line count is wrong.** `split('\n')` on a file ending with a
newline gives a final empty string, so the original reports 1,108,001 lines where
there are 1,108,000. A small lie, but it's the kind that quietly infects a ratio.

## 5. Try it yourself first!

1. **Vague hint:** look at the loop. Does it ever need a line it has already seen?
2. **Warmer:** if not, why is the whole file in memory? What is the *smallest* thing
   you could keep that still answers all four questions?
3. **Warmer still:** write `createAccumulator()`, `addLine(acc, line)` and
   `finish(acc)` as plain functions over an array. No streams yet — just prove the
   summary can be built one line at a time.
4. **Now the pieces:** read the file with `createReadStream` and print each chunk's
   length. Notice the chunks are ~64KB and end mid-line. Try splitting them on `\n`
   yourself and watch a line get cut in half.
5. **Almost the answer:** replace your hand-rolled splitting with
   `readline.createInterface({ input, crlfDelay: Infinity })` and `for await`. Feed
   every line to `addLine`. The summary code doesn't change at all — that's the sign
   your fold was the right shape.
6. **Design question:** which of these can you compute in constant memory — mean, max,
   median, top-3 slowest, number of distinct paths? Write your answers down before
   reading `summarize.js`; two of them are traps.

## 6. Understanding the refactored solution

**The accumulator is the whole idea.** `createAccumulator()` returns counters
(`lines`, `parsed`, `malformed`, `blank`, `bytes`), tallies (`byLevel`,
`byStatusClass`), running numbers (`totalDurationMs`, `maxDurationMs`), a fixed
`histogram`, and `top` — the only place lines are retained, capped at `topCount`:

```js
acc.top.push({ ... });
acc.top.sort((a, b) => b.durationMs - a.durationMs);
if (acc.top.length > acc.topCount) acc.top.length = acc.topCount;
```

Setting `.length` truncates the array. Three rows, forever, whether the log has ten
lines or ten billion.

**`addLine` folds one line and forgets it.** Blank lines are counted as blank (a file
ending in a newline isn't corrupt); unparseable lines are counted as malformed rather
than swallowed, because "2% of our lines don't parse" is itself a finding.

**A sum, not a list.** `totalDurationMs += entry.durationMs` — the mean is derived in
`finish` as `total / parsed`. Keeping the durations to average them later would be the
whole file again in disguise.

**The histogram is the honest compromise.** Four counters answer "how slow, roughly?"
An exact median cannot be computed this way, and the comment says so. Knowing which
statistics survive streaming is the real expertise here.

**`finish` derives and guards.** `errorRate`, `malformedRate` and `meanDurationMs` are
all divisions, and all return `0` on an empty log rather than `NaN` — the same guard as
project 36's analyzer, for the same reason: a `NaN` propagates silently through every
chart downstream.

**Two front doors, one brain.** `summarizeLines(array)` and `summarizeStream(readable)`
both fold with `addLine`, and a test asserts they produce identical reports. That's why
the tests need no files: `Readable.from(['chunk one', 'chunk two'])` builds any stream
you can describe, including one that splits a line down the middle.

**The tests pin the streaming-specific promises:** a line cut across chunks is
reassembled; the same text delivered one character at a time gives the same answer;
CRLF works; a missing final newline still counts its line; the top-K stays at 3 after
1000 lines; and the accumulator's serialized size stops growing after 20,000 lines —
a direct, mechanical test of "constant memory".

**The CLI shows the payoff in numbers**: progress arrives *during* the read, and the
heap grows by ~10MB instead of ~90MB for the same file and the same answers.

## 7. Words you learned (glossary)

- **Stream** — data delivered in pieces over time rather than all at once.
- **Chunk** — one piece of a stream (~64KB for a file read).
- **`createReadStream` / `createWriteStream`** — read/write a file as a stream.
- **`readline`** — turns a stream of chunks into a stream of whole lines.
- **`crlfDelay`** — the setting that makes `\r\n` count as one line break.
- **`for await ... of`** — loop over values that arrive over time.
- **Backpressure** — telling a fast producer to wait for a slow consumer.
- **`drain`** — the event saying a write buffer has emptied.
- **Incremental aggregation / fold** — combining items into a running answer.
- **Accumulator** — the object holding that running answer.
- **Constant memory / O(1) space** — memory that doesn't grow with the input.
- **Top-K** — keeping only the K largest items seen so far.
- **Histogram / bucket** — counts per range, instead of individual values.
- **Cardinality** — how many *distinct* values a field has (a hidden memory cost).
- **`heapUsed` / `rss`** — memory in JavaScript objects / total held by the process.
- **`Buffer.byteLength`** — a string's size in bytes, not characters.
- **`Readable.from`** — build a stream from values, for testing.

## 8. Experiments to try on the plane (no internet needed)

1. **Watch the wall.** Change `TARGET_BYTES` in `original.js` to `600 * 1024 * 1024`
   and run it (it needs ~1.5GB of disk and a few minutes). Expected: a thrown error
   or a killed process — *not* a slow success. Then run `refactored/cli.js` with the
   same size. Expected: the same flat memory as at 50MB.
2. **Break the reassembly on purpose.** Write a version that does
   `input.on('data', (chunk) => chunk.toString().split('\n').forEach(...))`. Expected:
   the malformed count jumps, because every chunk boundary chops one line in half —
   which is precisely the bug `readline` exists to prevent.
3. **Count the phantom line.** Compare the two scripts' line counts: 1,108,001 vs
   1,108,000. Expected: the original's extra "line" is the empty string after the last
   newline. Decide which number you'd want in a report, then look at how `addLine`
   counts blanks separately.
4. **Prove memory is constant, with your own eyes.** In a scratch file, fold 10,000
   lines into an accumulator, print `JSON.stringify(acc).length`, then fold a million
   more and print it again. Expected: the same number, give or take the top-3 rows.
5. **Add an unbounded field and watch it grow.** Add `acc.byPath[entry.path] = ...`
   with no cap, and feed it lines with unique paths (`/users/1`, `/users/2`, …).
   Expected: the accumulator grows forever — the classic "constant memory" claim
   undone by high cardinality. PRACTICE exercise 2 fixes it properly.
6. **Feed it something that isn't a file.** `summarizeStream(process.stdin)` and then
   `node yourfile.js < some.log`, or pipe another program into it. Expected: it works
   unchanged, because the function never knew where its bytes came from.
