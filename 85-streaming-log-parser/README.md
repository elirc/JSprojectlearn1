# 85 — Streaming log parser

**Lesson: don't hold the data to answer questions about it. Read it in pieces, fold
each piece into a running answer, and memory stops depending on the input size.**

## Run it

```
node 85-streaming-log-parser/original.js       (makes a 50MB temp log, then eats it)
node 85-streaming-log-parser/refactored/cli.js (same log, same answers, no spike)
node --test 85-streaming-log-parser/refactored/summarize.test.js
```

Both scripts write their sample log to your OS temp directory and delete it
afterwards. The tests touch no files at all.

## What's wrong with the original?

Three small questions — lines per level, mean duration, slowest request — answered
like this:

```js
const text = readFileSync(LOG_PATH, 'utf8'); // copy 1: the whole file, as a string
const lines = text.split('\n');              // copy 2: ~1.1 million strings
```

Measured on a 50MB log: `heap 18.5MB -> 107.7MB (+89.2MB)`, `rss +93.3MB`. Roughly
**twice the file, in memory, to produce four numbers.** At 50MB that's merely
wasteful. The failure modes arrive fast:

1. **A 500MB log in a 512MB container** — the process is killed, with no stack trace
   and no partial answer.
2. **A log over ~512MB — impossible, not slow.** V8 has a maximum string length;
   past it `readFileSync(..., 'utf8')` *throws*. No tuning saves you.
3. **Nothing happens until the last byte arrives.** No progress, no early findings,
   and a truncated file wastes the whole read.
4. **The logic is welded to the file.** Testing the summary means writing another
   50MB file.

## What changed in the refactor

- **`readline` over `createReadStream`.** The file arrives in ~64KB chunks and
  `readline` reassembles lines across chunk boundaries — the part everyone gets
  wrong when splitting chunks by hand. `crlfDelay: Infinity` handles CRLF.
- **Incremental aggregation.** `createAccumulator()` / `addLine(acc, line)` /
  `finish(acc)` — counters, sums, a maximum, a fixed histogram, and the top 3 rows.
  A line is folded in and dropped, so **memory depends on the questions, not the
  file**: heap +10–13MB and a flat RSS for the same 50MB log, with identical answers.
- **The same fold has two front doors** — `summarizeLines(array)` and
  `summarizeStream(readable)` — and a test asserts they agree. The brain is testable
  without a stream; the stream is testable with `Readable.from(['chunk', 'chunk'])`.
- **Parsing is project 36's `parseLine`, imported unchanged.** What this project
  replaces is how lines *arrive*, not what they mean — and malformed lines are still
  counted rather than swallowed.
- **Answers arrive during the read**: `onProgress` reports lines and bytes as they
  go, which is only possible because nothing waits for the end.
- **The honest cost, stated:** streaming means one pass and no going back. An exact
  median needs every value; the fixed histogram is the approximation you trade it
  for (PRACTICE exercise 4 measures the error: 55.0 vs an exact 49.5).

## Key takeaway

Before loading a file, a query result, or an API page into an array, ask what you
actually need from it. If the answer is counts, sums, extremes or a small top-N, you
never needed the data — only a running total. `readFileSync` and `.split()` are fine
for a config file and a trap for anything that grows; the streaming version costs a
few more lines and stops caring how big the input gets.
