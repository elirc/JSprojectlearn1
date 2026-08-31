import { createReadStream, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeSampleLog } from './make-log.js';
import { summarizeStream } from './summarize.js';

// The same 50MB log as original.js, summarised without ever holding it.

const LOG_PATH = path.join(os.tmpdir(), `js85-refactored-${process.pid}.log`);
const TARGET_BYTES = 50 * 1024 * 1024;
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;

await writeSampleLog(LOG_PATH, TARGET_BYTES);
console.log(`log file: ${mb(statSync(LOG_PATH).size)} at ${LOG_PATH}`);

try {
  const before = process.memoryUsage();
  const started = Date.now();
  let peakRss = before.rss;

  const summary = await summarizeStream(createReadStream(LOG_PATH), {
    topCount: 3,
    progressEvery: 200_000,
    onProgress({ lines, bytes }) {
      // Answers arrive DURING the read, not after it — and we can watch
      // the memory while it happens.
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
      process.stdout.write(`\r  ${lines.toLocaleString()} lines, ${mb(bytes)} read...`);
    },
  });

  const after = process.memoryUsage();
  console.log(`\r  ${summary.lines.toLocaleString()} lines in ${Date.now() - started}ms          `);

  console.log(`\nlevels:    ${JSON.stringify(summary.byLevel)}`);
  console.log(`statuses:  ${JSON.stringify(summary.byStatusClass)}`);
  console.log(`durations: ${JSON.stringify(summary.histogram)}`);
  console.log(`mean ${summary.meanDurationMs.toFixed(1)}ms, max ${summary.maxDurationMs}ms, ` +
    `error rate ${(summary.errorRate * 100).toFixed(1)}%, ` +
    `malformed ${(summary.malformedRate * 100).toFixed(1)}%`);
  console.log('slowest:');
  for (const row of summary.slowest) {
    console.log(`  ${row.timestamp}  ${row.path} ${row.status} ${row.durationMs}ms`);
  }

  console.log(`\nmemory used to answer the same questions:`);
  console.log(`  heap:  ${mb(before.heapUsed)} -> ${mb(after.heapUsed)}  (+${mb(after.heapUsed - before.heapUsed)})`);
  console.log(`  rss:   ${mb(before.rss)} -> ${mb(after.rss)}  (peak during the read: ${mb(peakRss)})`);
  console.log(`  file:  ${mb(summary.bytes)} read, and never more than ~64KB of it held at once`);

  // original.js needed ~90MB to summarise a 50MB file, and would need
  // ~900MB for a 500MB one. This version's memory doesn't depend on the
  // file size at all — it depends on the QUESTIONS: counters, sums, a
  // fixed histogram, and the top 3 rows.
  //
  // What streaming costs you: no going back. Anything needing the whole
  // dataset at once — an exact median, a sort, a second pass — either
  // needs a second read or an approximation (the histogram above IS the
  // approximation).
} finally {
  rmSync(LOG_PATH, { force: true }); // temp files are the caller's mess to clean
}
