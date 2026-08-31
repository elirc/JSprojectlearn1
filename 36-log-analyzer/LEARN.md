# 📘 Learning Guide: Log Analyzer

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tool that reads web-server **logs** (one line of text per request) and answers questions about them. A log line looks like:

```
2026-07-09T10:00:01Z [ERROR] /api/users 503 1240ms
```

(timestamp, level, path, HTTP status, how long the request took). The finished analyzer:

```js
const { entries, malformed } = parseLog(logText);
const report = analyze(entries);
// report.total        -> 5
// report.byLevel      -> Map { 'INFO' => 2, 'ERROR' => 2, 'WARN' => 1 }
// report.errorRate    -> 0.4
// report.slowest      -> the 3 slowest requests, as objects
```

Running `node original.js` shows the "before": counting errors by slicing characters out of each line at hardcoded positions. It works on the five sample lines — and would quietly compute nonsense on anything else.

## 2. Concepts you need first

### Logs, levels, and status codes

Servers write a **log line** per event. The **level** says how serious it is (`INFO` = routine, `WARN` = suspicious, `ERROR` = broken). The **status** is the HTTP response code (`200` OK, `429` too many requests, `503` server unavailable). `1240ms` is the duration in milliseconds.

### String surgery: `substring`, `indexOf`, `lastIndexOf`

The original's tools:

```js
const line = "2026-07-09T10:00:00Z [INFO] /home 200 12ms";
console.log(line.substring(21, 25)); // "INFO" — chars from position 21 up to 25
console.log(line.indexOf("]"));      // 26 — position of the first "]"
console.log(line.lastIndexOf(" "));  // 37 — position of the last space
```

`substring(start, end)` cuts by *position*. Position-based cutting silently assumes the format never varies by a single character — a **magic number** (unexplained constant like `21`) encoding that assumption.

### `parseInt` and its dangerous kindness

`parseInt(str)` reads a number from the *front* of a string and stops at the first non-digit:

```js
console.log(parseInt("1240ms"));  // 1240 — just stops at the 'm'. Handy!
console.log(parseInt("12abc40")); // 12   — also "handy"...
console.log(parseInt("abc"));     // NaN
```

The same leniency that strips `"ms"` for free also happily "parses" garbage from a mis-sliced string without complaint. `Number(str)` is the strict sibling: `Number("1240ms")` is `NaN` — all or nothing.

### Regular expressions with named groups

A **regex** is a text pattern (project 35 introduces the basics). New pieces here:

- `\S+` — one or more non-space characters. `\d+` — one or more digits. `\d{3}` — exactly three digits. `[A-Z]+` — one or more capital letters.
- `^` and `$` — **anchors**: the match must start at the beginning of the string and reach the very end. Anchored patterns are all-or-nothing: the *whole* line matches the *whole* shape, or nothing matches.
- `(?<level>[A-Z]+)` — a **named capture group**: like a capture group, but with a name you can read back.

```js
const m = /^(?<word>[a-z]+)-(?<num>\d+)$/.exec("cat-42");
console.log(m.groups.word, m.groups.num); // cat 42
console.log(/^(?<w>[a-z]+)$/.exec("cat!")); // null — the ! breaks the $ anchor
```

`pattern.exec(str)` returns a match object (with `.groups`) or `null`. Compare with numbered groups (`match[1]`, `match[2]`, `match[3]`...) where you count parentheses and pray — names document themselves.

### Parse, then analyze (the two-stage pipeline)

The project's big idea. **Stage 1 (parse):** turn each raw string into a **typed object** — `{ level: 'ERROR', status: 503, durationMs: 1240 }` — converting `"503"` to the number `503` exactly once, at the **boundary** (the edge where messy outside data enters your program). **Stage 2 (analyze):** answer questions with ordinary array operations over clean objects. Once parsed, every new question is a one-liner; the string-handling never gets repeated. This extract-then-aggregate shape is every data pipeline you'll ever meet, from spreadsheets on up.

### Reusing utilities: `countBy`, `sortBy`, `filter`

Project 26 built general array tools; this project *imports* them:

```js
countBy(entries, (e) => e.level)   // Map { 'INFO' => 2, 'ERROR' => 2, ... }
sortBy(entries, (e) => e.durationMs, { descending: true })  // slowest first
entries.filter((e) => e.level === 'ERROR')                  // just the errors
```

`countBy` returns a **Map** (project 26 explains why Maps beat plain objects for tallies) — read counts with `.get('ERROR')`. The `(e) => e.level` arguments are key-extractor functions: "measure each entry by this".

### Import paths

`import { countBy } from '../../26-array-utils/refactored/array-utils.js'` — the `../..` climbs two folders up, then back down into project 26. Code reuse across the repo, no copying.

### Counting your rejects

When a line doesn't parse, three options: crash, skip silently, or *collect it and report it*. The refactor collects: `parseLog` returns `{ entries, malformed }`. "3% of lines don't parse" is itself a finding — maybe a deploy changed the log format — and silent skipping would hide it.

## 3. Walking through the original code

The sample log is five well-formed lines joined with `\n`. Then the analyzer:

```js
var level = line.substring(21, line.indexOf("]"));     // magic 21!
if (level == "ERROR") errorCount++;
```

Position 21 is where the level starts... *if* the timestamp is exactly 20 characters, plus a space and a `[`. The level runs to the first `]`. On these lines, works.

```js
var msStart = line.lastIndexOf(" ") + 1;
var ms = parseInt(line.substring(msStart));            // "1240ms" -> 1240
if (ms > slowestMs) {
  slowestMs = ms;
  slowest = line.substring(21);
}
```

Find the last space; everything after it is `"1240ms"`; `parseInt` politely ignores the `ms`. Track the max. Then both answers are `console.log`ged — the function *prints* rather than *returns*, so no other code can use the results.

The closing comment is the confession: position 21 assumes the timestamp is always 20 characters. Add fractional seconds (`2026-07-09T10:00:00.123Z`), drop a field, corrupt a line — nothing errors; the slices just land on the wrong characters and the analysis computes nonsense with a straight face. And because the surgery is *inside* the loop, every new question means pasting the surgery again.

## 4. What's wrong with it (in beginner terms)

**Magic position 21.** Story: ops upgrades the server; timestamps now include milliseconds. Every timestamp grows by 4 characters. `substring(21, ...)` now slices out `:00.1` instead of `INFO`. Nothing crashes. `level == "ERROR"` is simply never true, so next morning the dashboard proudly reports **zero errors** — during an outage. A wrong number you *trust* is far worse than a crash: the crash gets fixed in an hour; the silent zero gets believed for a month.

**`parseInt`'s leniency cuts both ways.** `parseInt("1240ms") → 1240` feels like a feature. But feed it a shifted slice like `"users 503 1240ms"` and you get `NaN`; feed it `"503 1240ms"` and you get `503` — a *plausible-looking wrong number*. No error, ever. Lenient parsing means garbage flows through arithmetic and comes out looking like data.

**Parsing fused with analyzing.** Boss asks: "counts per level, please." With this design you write another loop *with the same substring surgery pasted in*. Now the magic 21 lives in two places. The format changes; you fix one copy; the other keeps lying. Every new question multiplies the fragile part.

**Printing instead of returning.** `analyze` writes to the console, so its answers can't be tested, reused, or fed to another tool. Return data; let the caller decide what to do with it.

## 5. Try it yourself first!

Try the rewrite before reading on. Hints, vague → specific:

1. Split the job in two: one function that understands the line *format*, another that answers *questions*. They should meet at an array of plain objects.
2. For the format: one regex can describe the whole line. Sketch the shape in words first: "non-spaces, space, `[CAPITALS]`, space, non-spaces, space, 3 digits, space, digits + `ms`".
3. Use named groups — `(?<level>[A-Z]+)` — and anchor with `^...$` so partial matches are impossible.
4. In `parseLine`: `exec` the pattern; if `null`, return `null`. Otherwise build an object from `match.groups`, converting `status` and `durationMs` with `Number(...)` right there.
5. In `parseLog`: split on `\n`, skip blank lines, and keep TWO arrays — parsed entries and malformed lines. Return both.
6. In `analyze`: no strings allowed! `filter` for the error rate, project 26's `countBy` for levels, `sortBy(..., { descending: true }).slice(0, 3)` for the slowest.
7. Guard the division: an empty log's error rate should be `0`, not `0/0 = NaN`.

## 6. Understanding the refactored solution

**The format spec, in one place:**

```js
const LINE_PATTERN =
  /^(?<timestamp>\S+) \[(?<level>[A-Z]+)\] (?<path>\S+) (?<status>\d{3}) (?<durationMs>\d+)ms$/;
```

Read it left to right and you can *see* the line format: timestamp, `[LEVEL]`, path, 3-digit status, duration ending in `ms`. The `^`/`$` anchors make matching all-or-nothing — a line with a longer timestamp doesn't shift columns; it simply fails to match. Half-parses are impossible *by construction*.

**Stage 1 — parse at the boundary:**

```js
export function parseLine(line) {
  const match = LINE_PATTERN.exec(line);
  if (!match) return null; // junk in, null out — callers decide what to do

  const { timestamp, level, path, status, durationMs } = match.groups;
  return {
    timestamp, level, path,
    status: Number(status),
    durationMs: Number(durationMs),
  };
}
```

`match.groups` destructures into real names — no `match[3]` counting. Types are assigned once, here: downstream code does math on `durationMs` as a number and never re-parses a string. (Note `Number`, the strict converter — `parseInt`'s leniency is no longer needed because the regex already stripped `ms` via its group boundary.)

**Rejects are data too:**

```js
const entry = parseLine(line);
if (entry) entries.push(entry);
else malformed.push(line); // counted, not silently skipped
```

`parseLog` returns `{ entries, malformed }`. The test feeds it `'???corrupted???'` and asserts the junk shows up in `malformed` — surfaced, not swallowed.

**Stage 2 — analysis becomes trivial:**

```js
export function analyze(entries) {
  return {
    total: entries.length,
    byLevel: countBy(entries, (e) => e.level),
    errorRate: entries.length === 0 ? 0
      : entries.filter((e) => e.level === 'ERROR').length / entries.length,
    slowest: sortBy(entries, (e) => e.durationMs, { descending: true }).slice(0, 3),
  };
}
```

Zero string surgery. Each question is a line or three of plain data-crunching over objects, with `countBy`/`sortBy` imported from project 26 — the utilities finally earning rent. The `entries.length === 0 ? 0 : ...` ternary dodges the `0/0 = NaN` trap. And `analyze` *returns* a report object instead of printing, so tests (and future dashboards) can consume it.

**The tests** put the rigor where the danger lives: `parseLine` produces exactly the typed object (status `503` the *number*); garbage, truncated lines, and empty strings all yield `null` — never a half-parse; `parseLog` separates the corrupted line into `malformed`; and the analysis answers (counts per level via `report.byLevel.get('ERROR')`, the slowest three in order, the 0.4 error rate, and the empty-log case) are pinned. Notice how *short* the analysis tests are — analysis over clean objects barely needs testing; parsing is where the tests concentrate.

## 7. Words you learned (glossary)

- **Log / log line**: a server's one-line-per-event text record.
- **Level**: severity tag — INFO / WARN / ERROR.
- **HTTP status**: response code — 200 OK, 429 rate-limited, 503 unavailable.
- **String surgery**: extracting data by character positions (`substring` + magic numbers).
- **Magic number**: an unexplained constant (like 21) encoding a hidden assumption.
- **`parseInt` vs `Number`**: lenient front-of-string parsing vs strict all-or-nothing conversion.
- **Regex**: text-matching pattern; `\S+` non-spaces, `\d{3}` exactly 3 digits, `[A-Z]+` capitals.
- **Anchors (`^`, `$`)**: force the match to cover the whole string — all-or-nothing.
- **Named capture group `(?<name>...)`**: a captured piece with a readable name in `match.groups`.
- **`exec`**: run a regex against a string; match object or `null`.
- **Typed object**: parsed data with real types (numbers as numbers), not raw strings.
- **Boundary / edge**: where outside data enters — the one place conversion and validation belong.
- **Parse, then analyze**: stage 1 makes clean objects; stage 2 asks questions of them.
- **Pipeline**: data flowing through stages (extract → aggregate).
- **Malformed**: input that doesn't fit the expected format.
- **Silent skip vs surfaced rejects**: hiding junk vs returning it as a finding.
- **`Map.get`**: read a value from a Map (what `countBy` returns).
- **Ternary guard**: `x === 0 ? 0 : ...` — sidestepping division by zero.

## 8. Experiments to try on the plane (no internet needed)

1. **Reproduce the silent-nonsense bug.** In a scratch copy of `original.js`, change one log line's timestamp to `2026-07-09T10:00:00.123Z` (fractional seconds) and run it. Expected: no crash — the error count silently drops or the "slowest" line prints with mangled text. Then feed the same line to the refactored `parseLine` in the test file: it returns a correct object, because `\S+` matches the longer timestamp just fine.
2. **See anchors earn their keep.** Remove the `$` from the end of `LINE_PATTERN` and run `node --test 36-log-analyzer/`. Expected: the malformed-lines test still passes (those fail earlier parts of the pattern)... so add your own test: `parseLine('2026-07-09T10:00:00Z [INFO] /home 200 12msEXTRA-GARBAGE')`. Without `$` it parses "successfully"; with `$` it's `null`. All-or-nothing is the anchor's job.
3. **Ask a brand-new question in three lines.** Add to `analyze`: `byPath: countBy(entries, (e) => e.path)` and a test asserting `/api/users` occurred twice. Expected: passes — no string surgery needed anywhere, because parsing already happened. That's the payoff of the two-stage design, felt directly.
4. **Watch `parseInt` lie.** Scratch file: `console.log(parseInt("503 1240ms"), Number("503 1240ms"));` Expected: `503` and `NaN`. One of these is a plausible wrong answer; the other refuses. Which would you rather have in an error-rate calculation?
5. **Make malformed lines louder.** Change `parseLog`'s callers' view: in a test, compute `malformed.length / (entries.length + malformed.length)` for `SAMPLE + '\n???corrupted???\n'`. Expected: `1/6 ≈ 0.1667` — a "reject rate" metric you got for free because the rejects were counted instead of swallowed.
