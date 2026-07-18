import { countBy, sortBy } from '../../26-array-utils/refactored/array-utils.js';

/**
 * Stage 1 — PARSE: text lines -> typed objects (or null for junk).
 *
 * The regex with NAMED GROUPS is the whole format spec in one place:
 * readable, anchored (^ $), and it either matches the WHOLE shape or
 * gives null — no half-parses from shifted columns.
 */
const LINE_PATTERN =
  /^(?<timestamp>\S+) \[(?<level>[A-Z]+)\] (?<path>\S+) (?<status>\d{3}) (?<durationMs>\d+)ms$/;

export function parseLine(line) {
  const match = LINE_PATTERN.exec(line);
  if (!match) return null; // junk in, null out — callers decide what to do

  const { timestamp, level, path, status, durationMs } = match.groups;
  return {
    timestamp,
    level,
    path,
    status: Number(status),       // typed on the way in,
    durationMs: Number(durationMs), // so analysis never re-parses
  };
}

export function parseLog(text) {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  const entries = [];
  const malformed = [];
  for (const line of lines) {
    const entry = parseLine(line);
    if (entry) entries.push(entry);
    else malformed.push(line); // counted, not silently skipped
  }
  return { entries, malformed };
}

/**
 * Stage 2 — ANALYZE: plain data-crunching over objects. Notice there
 * is no string surgery here at all; parsing already produced types.
 * (countBy / sortBy come from project 26 — the utilities earning rent.)
 */
export function analyze(entries) {
  return {
    total: entries.length,
    byLevel: countBy(entries, (e) => e.level),
    errorRate:
      entries.length === 0
        ? 0
        : entries.filter((e) => e.level === 'ERROR').length / entries.length,
    slowest: sortBy(entries, (e) => e.durationMs, { descending: true }).slice(0, 3),
  };
}
