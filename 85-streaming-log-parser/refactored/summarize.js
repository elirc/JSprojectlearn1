import readline from 'node:readline';
import { parseLine } from '../../36-log-analyzer/refactored/analyzer.js';

/**
 * Summarise a log of ANY size in constant memory.
 *
 * The trick is not the stream — it's that the summary never needs the
 * lines. Counters, sums, a maximum, a fixed histogram and the top few
 * offenders all fit in a few hundred bytes, so a line can be read,
 * folded in, and thrown away. Memory then depends on the QUESTIONS you
 * ask, not on the size of the file.
 *
 *   createAccumulator()      -> the running answer (small, fixed)
 *   addLine(acc, line)       -> fold one line in (project 39's reduce,
 *                               one event at a time)
 *   finish(acc)              -> the derived report
 *   summarizeStream(input)   -> the same fold, driven by a stream
 *
 * Parsing is project 36's `parseLine`, unchanged: what this project
 * replaces is how the lines ARRIVE, not what they mean.
 */

const DEFAULT_BUCKET_EDGES = [10, 100, 1000];

export function createAccumulator({ topCount = 3, bucketEdges = DEFAULT_BUCKET_EDGES } = {}) {
  if (!Number.isInteger(topCount) || topCount < 1) {
    throw new RangeError(`topCount must be a positive integer, got ${topCount}`);
  }
  const histogram = {};
  for (const edge of bucketEdges) histogram[`<${edge}ms`] = 0;
  histogram[`>=${bucketEdges.at(-1)}ms`] = 0;

  return {
    lines: 0,
    blank: 0,
    parsed: 0,
    malformed: 0,
    bytes: 0,
    byLevel: {},
    byStatusClass: {},
    totalDurationMs: 0,
    maxDurationMs: 0,
    histogram,
    top: [], // never longer than topCount — see addLine
    topCount,
    bucketEdges,
  };
}

/** Fold ONE line into the running answer. The line is not kept. */
export function addLine(acc, line) {
  acc.lines += 1;
  acc.bytes += Buffer.byteLength(line, 'utf8') + 1; // + the newline we consumed

  if (line.trim() === '') {
    acc.blank += 1; // blank is not malformed: files end with a newline
    return acc;
  }

  const entry = parseLine(line);
  if (entry === null) {
    acc.malformed += 1; // counted, never swallowed (project 36's rule)
    return acc;
  }

  acc.parsed += 1;
  acc.byLevel[entry.level] = (acc.byLevel[entry.level] ?? 0) + 1;
  const statusClass = `${Math.floor(entry.status / 100)}xx`;
  acc.byStatusClass[statusClass] = (acc.byStatusClass[statusClass] ?? 0) + 1;

  acc.totalDurationMs += entry.durationMs; // a sum, not a list of durations
  if (entry.durationMs > acc.maxDurationMs) acc.maxDurationMs = entry.durationMs;

  // A fixed histogram answers "how slow, roughly?" without keeping a
  // single measurement. (An exact median could not be done this way —
  // that's the real cost of streaming, and it is worth knowing.)
  const edge = acc.bucketEdges.find((limit) => entry.durationMs < limit);
  acc.histogram[edge === undefined ? `>=${acc.bucketEdges.at(-1)}ms` : `<${edge}ms`] += 1;

  // The ONLY lines retained, and never more than topCount of them.
  acc.top.push({
    timestamp: entry.timestamp,
    path: entry.path,
    status: entry.status,
    durationMs: entry.durationMs,
  });
  acc.top.sort((a, b) => b.durationMs - a.durationMs);
  if (acc.top.length > acc.topCount) acc.top.length = acc.topCount;

  return acc;
}

/** Derive the report. Rates are guarded so an empty log isn't NaN. */
export function finish(acc) {
  return {
    lines: acc.lines,
    blank: acc.blank,
    parsed: acc.parsed,
    malformed: acc.malformed,
    bytes: acc.bytes,
    byLevel: { ...acc.byLevel },
    byStatusClass: { ...acc.byStatusClass },
    errorRate: acc.parsed === 0 ? 0 : (acc.byLevel.ERROR ?? 0) / acc.parsed,
    malformedRate: acc.lines === 0 ? 0 : acc.malformed / acc.lines,
    meanDurationMs: acc.parsed === 0 ? 0 : acc.totalDurationMs / acc.parsed,
    maxDurationMs: acc.maxDurationMs,
    histogram: { ...acc.histogram },
    slowest: acc.top.map((row) => ({ ...row })),
  };
}

/** The same fold over an array — handy for tests and small inputs. */
export function summarizeLines(lines, options) {
  return finish(lines.reduce(addLine, createAccumulator(options)));
}

/**
 * The same fold, driven by a stream. `readline` handles the part that
 * everyone gets wrong by hand: a chunk boundary can fall in the middle
 * of a line, so it buffers the tail until the newline arrives.
 * `crlfDelay: Infinity` makes Windows CRLF line endings behave.
 */
export async function summarizeStream(input, options = {}) {
  const { onProgress, progressEvery = 100_000, ...accumulatorOptions } = options;
  const acc = createAccumulator(accumulatorOptions);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    addLine(acc, line);
    if (onProgress && acc.lines % progressEvery === 0) {
      onProgress({ lines: acc.lines, bytes: acc.bytes });
    }
  }

  return finish(acc);
}
