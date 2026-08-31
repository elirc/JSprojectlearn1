# 🏋️ Practice: Streaming Log Parser

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in `refactored/summarize.js`, add your checks to `refactored/summarize.test.js`, and run `node --test 85-streaming-log-parser/refactored/summarize.test.js`. No exercise here needs a big file: `Readable.from([...])` builds any stream you can describe.

## Exercises

### ⭐ 1. Time span and throughput (warm-up)

Add `firstTimestamp` and `lastTimestamp` to the accumulator, and derive `spanSeconds` and `linesPerSecond` in `finish`. Both must be `0` — never `NaN` or `Infinity` — for an empty log *and* for a log with exactly one line.

What it practices: the accumulate/derive split. `addLine` stores two scalars; `finish` does the arithmetic. Memory stays constant, and the guard against dividing by zero lives in exactly one place.

Hint: `firstTimestamp` is set only when it's still `null`; `lastTimestamp` is overwritten every parsed line. `Date.parse` turns an ISO string into a number.

Check (in node): for the six sample lines, span is 30 seconds and `linesPerSecond` is `4/30`; a single line gives span `0` and rate `0`.

### ⭐⭐ 2. Per-path counts, without the memory leak (core)

Add `byPath`. Then notice the trap: `byLevel` has four keys forever, but paths like `/users/8134/profile` are effectively unlimited — a "constant memory" summary that grows with your traffic. Cap it: count at most `maxPaths` distinct paths and add the rest to an `otherPaths` counter.

What it practices: **cardinality** — the hidden cost that turns a streaming aggregator back into a memory hog. Real metrics systems fall over on exactly this, usually via a user ID in a URL.

Hint: three branches — the path is already known (increment), there's room for a new key (add it), or there isn't (increment `otherPaths`). Never drop the count silently.

Check (in node): 100 distinct paths with `maxPaths: 3` gives exactly 3 keys, `otherPaths: 97`, and the counts still sum to 100.

### ⭐⭐ 3. Stop early with a limit (core)

Add a `limit` option to `summarizeStream`: stop after that many lines. The subtlety is *stopping properly* — `break` alone leaves the source running, so close the reader **and** destroy the input, or you leak a file handle and keep reading a file nobody is listening to.

What it practices: early termination and cleanup. This is what `head -1000 big.log` does, and it's how you sample a huge file in milliseconds.

Hint: `lines.close()` then `input.destroy?.()` before the `break`. Use `?.` because not every readable (a plain array-backed one) has `destroy`.

Check (in node): with an **async** source that counts what it yields, `{ limit: 3 }` reads 3 lines and pulls only 4 of 200 available chunks. (With a *synchronous* generator it may pull them all — a fast producer can outrun the consumer before the break lands.)

### ⭐⭐ 4. The median you can't have (core)

Write `exactMedian(durations)` (needs every value) and `approximateMedian(summary)`, which interpolates a straight line across whichever histogram bucket contains the halfway point. Compare them on a skewed dataset and measure the error.

What it practices: the actual price of streaming. Some statistics simply do not survive one pass in constant memory, and the professional move is to know which, and to choose the approximation deliberately.

Hint: walk the buckets accumulating counts until you pass `parsed / 2`, then `low + (high - low) * ((target - seen) / countInBucket)`. The last bucket is open-ended — use `maxDurationMs` as its top.

Check (in node): for 1000 requests skewed fast (900 under 90ms, 100 near a second), the histogram is `{'<10ms':100,'<100ms':800,'<1000ms':100,'>=1000ms':0}`, the exact median is `49.5` and the approximation is `55.0` — off by 5.5ms, computed from four counters instead of a thousand values.

### ⭐⭐⭐ 5. Mergeable summaries (challenge)

Write `mergeAccumulators(a, b)` so two partial summaries combine into one. Counts and sums add, `maxDurationMs` takes the larger, histograms add bucket by bucket, and the two top-K lists are concatenated, re-sorted and re-trimmed. Refuse to merge accumulators with different bucket edges.

What it practices: making a fold **associative** — the property that lets you split work up. Merge is what turns this project into project 84's worker pool: four threads summarise four slices of a log, and one merge produces the answer.

Hint: merging must be associative *and* have an identity: `merge(x, createAccumulator())` must equal `x`. Test all three of those properties, not just the happy path.

Check (in node): summarising the first three lines and the last three separately, then merging, deep-equals summarising all six — and so does merging three parts in either grouping.

### ⭐⭐⭐ 6. Fuzz the two promises (challenge)

Property test, 100 trials. For each random log (with blanks and junk mixed in): (a) chop the text at random byte positions and assert `summarizeStream` over those chunks equals `summarizeLines` over the array; (b) split the lines at a random index, accumulate each half, merge, and assert it equals summarising the whole.

What it practices: the two properties this design lives or dies by — *chunk boundaries are invisible* and *merging is associative*. Both are exactly the kind of thing that works on your three-line fixture and fails on the real file.

Hint: build the chunks by sorting four random cut positions; skip empty slices. Include blank lines and unparseable lines in the generator, or you're only fuzzing the happy path.

Check (in node): 100 trials pass. Then remove `crlfDelay: Infinity` and rerun with `\r\n` text — the chunking property fails immediately.

## Solutions

### 1. Time span and throughput

```js
// createAccumulator: firstTimestamp: null, lastTimestamp: null
// addLine, after a successful parse:
if (acc.firstTimestamp === null) acc.firstTimestamp = entry.timestamp;
acc.lastTimestamp = entry.timestamp;

// finish:
const spanSeconds = acc.firstTimestamp === null ? 0
  : (Date.parse(acc.lastTimestamp) - Date.parse(acc.firstTimestamp)) / 1000;
return {
  ...,
  firstTimestamp: acc.firstTimestamp,
  lastTimestamp: acc.lastTimestamp,
  spanSeconds,
  linesPerSecond: spanSeconds === 0 ? 0 : acc.parsed / spanSeconds,
};
```

WHY: two scalars, not a list of timestamps — the same discipline as `totalDurationMs`. The single-line case is the interesting one: a span of zero would make the rate `Infinity`, which is arguably "correct" and definitely useless on a dashboard, so it's pinned to `0` and tested. Note that `firstTimestamp` assumes the log is in chronological order, which is true of files appended to over time and *not* true of merged logs — worth a comment in real code, and something exercise 5 has to handle by taking the earlier of two. Verified by running: span 30s, rate 4/30, and zeros for both the empty and single-line cases.

### 2. Per-path counts, without the memory leak

```js
// createAccumulator({ maxPaths = 20 } = {}):  byPath: {}, otherPaths: 0, maxPaths
// addLine, after a successful parse:
if (acc.byPath[entry.path] !== undefined) acc.byPath[entry.path] += 1;
else if (Object.keys(acc.byPath).length < acc.maxPaths) acc.byPath[entry.path] = 1;
else acc.otherPaths += 1;
```

WHY: this is the exercise that stops "streaming = constant memory" from being a slogan. The stream bounded the *lines*; nothing bounded the *keys*, and one `/users/:id` path in the URL turns a four-key tally into a million-key one — a leak that only appears in production, because your test log has five paths. Counting the overflow instead of dropping it keeps the totals honest: `sum(byPath) + otherPaths === parsed`, an invariant worth asserting. (The grown-up version keeps the *top* N by count, which needs a sketch algorithm like Count-Min or Space-Saving; first-N-seen is the honest beginner's version, and its bias — early paths win — is worth knowing about.) Verified by running: 3 keys, `otherPaths` 97, totals still 100.

### 3. Stop early with a limit

```js
export async function summarizeStream(input, options = {}) {
  const { onProgress, progressEvery = 100_000, limit, ...accumulatorOptions } = options;
  const acc = createAccumulator(accumulatorOptions);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    addLine(acc, line);
    if (onProgress && acc.lines % progressEvery === 0) { ... }
    if (limit !== undefined && acc.lines >= limit) {
      lines.close();
      input.destroy?.(); // stop the SOURCE, not just the reader
      break;
    }
  }
  return finish(acc);
}
```

WHY: `break` on its own ends *your* loop, and `for await` politely closes the readline interface — but the file descriptor underneath can stay open, and a socket would keep receiving. `input.destroy?.()` is the line that actually says "I'm done, stop sending." The optional-call `?.` matters because a `Readable.from([...])` in a test may not have `destroy`, and a cleanup step that throws is worse than the leak. The check also teaches something about streams: with a *synchronous* generator the producer can run to completion before your `break` ever executes, so early exit only saves work against a producer that yields — which every real file or socket does. Verified by running: 3 lines summarised, 4 of 200 chunks pulled.

### 4. The median you can't have

```js
export function exactMedian(durations) {
  if (durations.length === 0) return 0;
  const sorted = [...durations].sort((a, b) => a - b); // needs EVERY value
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function approximateMedian(summary, bucketEdges = [10, 100, 1000]) {
  if (summary.parsed === 0) return 0;
  const target = summary.parsed / 2;
  const labels = Object.keys(summary.histogram);
  const lowerBounds = [0, ...bucketEdges];
  let seen = 0;
  for (let i = 0; i < labels.length; i++) {
    const count = summary.histogram[labels[i]];
    if (seen + count >= target) {
      const low = lowerBounds[i];
      const high = i < bucketEdges.length ? bucketEdges[i] : summary.maxDurationMs;
      return low + (high - low) * (count === 0 ? 0 : (target - seen) / count);
    }
    seen += count;
  }
  return summary.maxDurationMs;
}
```

WHY: put the two functions side by side and the trade-off is impossible to miss — one sorts a million numbers it had to keep, the other reads four counters. The interpolation assumes values are spread evenly inside their bucket, which is exactly the assumption that fails on skewed data: our 800 values in the 10–100ms bucket cluster low, so the estimate lands at 55.0 against a true 49.5. That 11% error is the *price list* for constant memory, and quoting it is what separates an engineering decision from a guess. This is also why real monitoring systems ship histograms with many narrow buckets rather than raw samples — same maths, tighter buckets, smaller error. Verified by running: exact 49.5, approximate 55.0, from a 4-key histogram.

### 5. Mergeable summaries

```js
const addCounts = (into, from) => {
  for (const [key, value] of Object.entries(from)) into[key] = (into[key] ?? 0) + value;
};

export function mergeAccumulators(a, b) {
  if (a.bucketEdges.join() !== b.bucketEdges.join()) {
    throw new TypeError('cannot merge accumulators with different bucket edges');
  }
  const merged = createAccumulator({
    topCount: Math.max(a.topCount, b.topCount), bucketEdges: a.bucketEdges,
  });

  for (const key of ['lines', 'blank', 'parsed', 'malformed', 'bytes', 'totalDurationMs']) {
    merged[key] = a[key] + b[key];
  }
  merged.maxDurationMs = Math.max(a.maxDurationMs, b.maxDurationMs);

  addCounts(merged.byLevel, a.byLevel);       addCounts(merged.byLevel, b.byLevel);
  addCounts(merged.byStatusClass, a.byStatusClass); addCounts(merged.byStatusClass, b.byStatusClass);
  addCounts(merged.histogram, a.histogram);   addCounts(merged.histogram, b.histogram);

  merged.top = [...a.top, ...b.top]
    .sort((x, y) => y.durationMs - x.durationMs)
    .slice(0, merged.topCount);

  // if you did exercise 1: the earlier first, the later last
  const firsts = [a.firstTimestamp, b.firstTimestamp].filter(Boolean);
  merged.firstTimestamp = firsts.length === 0 ? null
    : firsts.reduce((x, y) => (Date.parse(x) <= Date.parse(y) ? x : y));
  return merged;
}
```

WHY: every field merges by the rule that matches what it *means* — counts add, maxima take the larger, top-K concatenates and re-trims, timestamps take the extreme. Get one wrong (averaging two means, say, when the halves have different sizes) and the merged answer is subtly wrong in a way no type checker catches; that's why the check tests associativity in both groupings and an identity element rather than one happy path. The bucket-edge guard exists because adding `{'<50ms': 3}` into `{'<10ms': 0}` would silently invent a fifth bucket — nonsense arriving quietly. And this is the door to project 84: a mergeable fold is a fold you can hand to four worker threads, one slice each. Verified by running: split at 3 equals the whole, both three-way groupings equal the whole, and merging with an empty accumulator changes nothing.

### 6. Fuzz the two promises

```js
test('FUZZ: chunk boundaries and merge points never change the answer', async () => {
  for (let trial = 0; trial < 100; trial++) {
    const lines = Array.from({ length: 1 + Math.floor(Math.random() * 60) }, (_, i) => randomLine(i));
    const expected = summarizeLines(lines);
    const text = `${lines.join('\n')}\n`;

    const cuts = Array.from({ length: 4 }, () => Math.floor(Math.random() * text.length))
      .sort((a, b) => a - b);
    const chunks = [];
    let previous = 0;
    for (const cut of [...cuts, text.length]) {
      if (cut > previous) chunks.push(text.slice(previous, cut));
      previous = cut;
    }
    assert.deepEqual(await summarizeStream(Readable.from(chunks)), expected);

    const at = Math.floor(Math.random() * (lines.length + 1));
    assert.deepEqual(finish(mergeAccumulators(
      accumulateLines(lines.slice(0, at)),
      accumulateLines(lines.slice(at)),
    )), expected);
  }
});
```

WHY: the two assertions are the design's load-bearing claims, written as properties instead of examples. "Chunk boundaries are invisible" is the one that bites hardest in practice — a hand-rolled splitter passes every fixture you'd think to write, then mangles one line per 64KB in production, and the only symptom is a slightly wrong malformed count that nobody investigates. Randomising the cut positions tries a hundred boundaries you'd never have picked, including inside a timestamp and immediately after a newline. Generating blank and junk lines matters as much as the cuts: without them the fuzzer only ever exercises the happy path, and the interesting bugs live in the branches you forgot. Verified by running: 100 trials pass; dropping `crlfDelay: Infinity` and feeding CRLF text breaks it on the first trial.
