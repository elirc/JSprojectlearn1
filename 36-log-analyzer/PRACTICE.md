# 🏋️ Practice: Log Analyzer

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Pin down what the pattern *refuses* (warm-up)

`LINE_PATTERN` is the format spec, but the tests only prove three junk lines are rejected. Add a test to `analyzer.test.js` listing five *near-miss* lines that must each return `null`: a lowercase level `[info]`, a space before the unit (`12 ms`), a four-digit status (`2000`), a path containing a space (`/my page`), and a line with two leading spaces. Predict each answer before running.

What it practices: reading a regex character by character, and testing rejection as carefully as acceptance.
Hint: `[A-Z]+` has no lowercase, `\d{3}` means exactly three digits *in that position*, and `^` allows no leading whitespace.

### ⭐⭐ 2. averageDurationByPath (core)

Write `averageDurationByPath(entries)` in `analyzer.js`, returning a `Map` of path → mean `durationMs`. Import `groupBy` from project 26 alongside the `countBy`/`sortBy` already imported — one group per path, then average each group. Check offline against `SAMPLE`: `/api/users` → `1775` (the mean of 1240 and 2310), `/home` → `12`, and the Map has 4 entries. An empty entry list must give an empty Map, not a crash.

What it practices: stage-2 analysis — new question, new one-liner, because parsing already produced numbers.
Hint: `for (const [path, group] of groupBy(entries, (e) => e.path))`, then `group.reduce((sum, e) => sum + e.durationMs, 0) / group.length`.

### ⭐⭐ 3. Stage 3: a pure formatter (core)

The pipeline is parse → analyze → *nothing*: `analyze` returns an object and the README stops there. Add the third stage — `summarize(report)`, a pure function turning an `analyze` result into a multi-line string, with no `console.log` inside it. Show the total, one line per level (sorted so the output is stable), the error rate as a percentage, and the three slowest requests. Checkable: for `SAMPLE` the first line is `5 entries`, the levels appear in the order ERROR, INFO, WARN, and the error-rate line reads `error rate: 40.0%`.

What it practices: keeping formatting pure and separate from both parsing and analysis — three stages, three responsibilities.
Hint: build a `lines` array and `join('\n')` at the end. `sortBy([...report.byLevel], ([level]) => level)` sorts Map entries alphabetically; `(rate * 100).toFixed(1)` gives `40.0`.

### ⭐⭐ 4. Extend the format without breaking old lines (core)

The service starts appending an optional user id: `... 200 12ms user=u77`. Extend `LINE_PATTERN` with an optional non-capturing group so both shapes parse, and add `user` to the returned object (`null` when absent). Check offline: the `user=u77` line parses with `user: 'u77'`, every line in `SAMPLE` still parses with `user: null`, and the whole existing test file still passes untouched. A line ending in a bare `user=` (no value) must be `null` — half a field is still malformed.

What it practices: evolving a format spec in one place, and the difference between "optional" and "anything goes".
Hint: `(?: user=(?<user>\S+))?` — the outer `(?:...)` groups the space and the field together so *both* are optional, `\S+` requires at least one character, and the trailing `?` makes the whole thing skippable.

### ⭐⭐⭐ 5. Find the paths that are actually broken (challenge)

Write `problemPaths(entries, minErrorRate, minRequests = 1)` returning `[{ path, errorRate, requests }]` for every path whose ERROR share is at least `minErrorRate`, sorted worst-first, skipping paths with fewer than `minRequests` requests. That last parameter matters: one error out of one request is a 100% error rate and almost always noise. Check offline: `problemPaths(entries, 0.5)` on `SAMPLE` → exactly `[{ path: '/api/users', errorRate: 1, requests: 2 }]`; raise `minRequests` to 3 and you get `[]`; an empty entry list gives `[]`.

What it practices: turning a vague question ("what's broken?") into an explicit rule with the thresholds as parameters.
Hint: `groupBy` by path, then per group `group.filter((e) => e.level === 'ERROR').length / group.length`, then `sortBy(..., { descending: true })`.

### ⭐⭐⭐ 6. min / median / max durations (challenge)

Averages hide outliers — one 30-second request drags the mean up while most users saw 12ms. Write `durationStats(entries)` returning `{ min, median, max }`, or `null` for an empty list. The median is the tricky half: with an odd count it's the middle value, with an even count it's the mean of the two middle values. Check offline: `SAMPLE`'s five entries give `{ min: 12, median: 340, max: 2310 }`; drop the last line (four entries: 12, 1240, 87, 2310) and the median becomes `663.5`.

What it practices: an even/odd branch that's easy to get subtly wrong, and never mutating the caller's array while sorting.
Hint: `sortBy` already returns a *copy*. With `middle = Math.floor(sorted.length / 2)`, odd length uses `sorted[middle]` and even length uses `(sorted[middle - 1] + sorted[middle]) / 2`.

## Solutions

### 1. Near-miss rejections

```js
test('near-miss lines are rejected, not half-parsed', () => {
  assert.equal(parseLine('2026-07-09T10:00:00Z [info] /home 200 12ms'), null);   // lowercase level
  assert.equal(parseLine('2026-07-09T10:00:00Z [INFO] /home 200 12 ms'), null);  // space before unit
  assert.equal(parseLine('2026-07-09T10:00:00Z [INFO] /home 2000 12ms'), null);  // 4-digit status
  assert.equal(parseLine('2026-07-09T10:00:00Z [INFO] /my page 200 12ms'), null); // space in path
  assert.equal(parseLine('  2026-07-09T10:00:00Z [INFO] /home 200 12ms'), null);  // leading spaces
});
```

WHY: each of these is a line the original's `substring(21, ...)` would happily slice into plausible nonsense. The regex refuses them because every piece is *specified*: `[A-Z]+` excludes lowercase, `\d{3}` pins the status to exactly three digits, `\S+` for the path stops at the first space, and `^`/`$` forbid anything before or after. Verified by running: all five return `null`.

### 2. averageDurationByPath

```js
import { countBy, groupBy, sortBy } from '../../26-array-utils/refactored/array-utils.js';

export function averageDurationByPath(entries) {
  const averages = new Map();
  for (const [path, group] of groupBy(entries, (e) => e.path)) {
    const total = group.reduce((sum, e) => sum + e.durationMs, 0);
    averages.set(path, total / group.length);
  }
  return averages;
}
```

WHY: there is no string handling in this function at all — `e.durationMs` is already a number because `parseLine` converted it at the boundary. That is exactly the payoff the README promises: analysis questions become small loops over clean objects. The empty case needs no special code, because a `groupBy` of nothing is an empty Map and the loop body never runs. Verified by running: `/api/users` → 1775, `/home` → 12, 4 entries, `[]` → empty Map.

### 3. summarize

```js
export function summarize(report) {
  const lines = [`${report.total} entries`];
  for (const [level, count] of sortBy([...report.byLevel], ([level]) => level)) {
    lines.push(`  ${level}: ${count}`);
  }
  lines.push(`error rate: ${(report.errorRate * 100).toFixed(1)}%`);
  lines.push('slowest:');
  for (const entry of report.slowest) {
    lines.push(`  ${entry.durationMs}ms ${entry.path}`);
  }
  return lines.join('\n');
}
```

Verified output for `SAMPLE`:

```
5 entries
  ERROR: 2
  INFO: 2
  WARN: 1
error rate: 40.0%
slowest:
  2310ms /api/users
  1240ms /api/users
  340ms /checkout
```

WHY: returning a string instead of printing one is what makes this testable — `assert.ok(summarize(report).startsWith('5 entries'))` needs no captured stdout. Sorting the levels is not cosmetic: `countBy` returns keys in *first-seen* order, so without the sort the output changes when the log's first line changes, and a test pinning it would be flaky. Printing stays in the caller, one `console.log(summarize(analyze(entries)))` at the very edge.

### 4. The optional user field

```js
const LINE_PATTERN =
  /^(?<timestamp>\S+) \[(?<level>[A-Z]+)\] (?<path>\S+) (?<status>\d{3}) (?<durationMs>\d+)ms(?: user=(?<user>\S+))?$/;

export function parseLine(line) {
  const match = LINE_PATTERN.exec(line);
  if (!match) return null;

  const { timestamp, level, path, status, durationMs, user } = match.groups;
  return {
    timestamp,
    level,
    path,
    status: Number(status),
    durationMs: Number(durationMs),
    user: user ?? null, // absent group is undefined; normalize it
  };
}
```

WHY: `(?: ... )?` is a *non-capturing* group made optional as a unit, so the leading space disappears along with the field — writing ` (user=(?<user>\S+))?` instead would demand a trailing space on old lines and break every one of them. An unmatched named group comes back as `undefined`, so `?? null` keeps one consistent shape for downstream code (project 30's "one shape, always" rule). Verified by running: the `user=u77` line parses with the id, plain lines give `user: null`, and a bare `user=` returns `null` because `\S+` needs at least one character.

### 5. problemPaths

```js
export function problemPaths(entries, minErrorRate, minRequests = 1) {
  const problems = [];
  for (const [path, group] of groupBy(entries, (e) => e.path)) {
    if (group.length < minRequests) continue;
    const errors = group.filter((e) => e.level === 'ERROR').length;
    const errorRate = errors / group.length;
    if (errorRate >= minErrorRate) {
      problems.push({ path, errorRate, requests: group.length });
    }
  }
  return sortBy(problems, (p) => p.errorRate, { descending: true });
}
```

WHY: `minRequests` is the statistical guard that turns a toy into something you'd page an on-call engineer with — a single failed request on a path nobody uses is a 100% error rate and means nothing. Returning `requests` alongside the rate lets the reader judge for themselves rather than trusting a bare percentage. Verified by running: `SAMPLE` with `0.5` gives exactly `/api/users` at rate 1 with 2 requests, and `minRequests: 3` filters it out.

### 6. durationStats

```js
export function durationStats(entries) {
  if (entries.length === 0) return null;

  const sorted = sortBy(entries, (e) => e.durationMs).map((e) => e.durationMs);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;

  return { min: sorted[0], median, max: sorted.at(-1) };
}
```

WHY: once the array is sorted, `min` and `max` are free at the two ends — no second pass. The even/odd branch is the whole exercise: with four values the "middle" is *between* indices 1 and 2, so you average them; forgetting that gives an answer that's right half the time, which is the worst kind of bug. `sortBy` returns a copy, so the caller's array is never reordered behind their back — project 26's no-mutation house rule paying off. Verified by running: five entries → `{ min: 12, median: 340, max: 2310 }`, four entries → median `663.5`, empty → `null`.
