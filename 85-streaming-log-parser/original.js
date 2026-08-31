import { appendFileSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Summarise a big log file. The obvious way: read it, split it, loop.

const LOG_PATH = path.join(os.tmpdir(), `js85-original-${process.pid}.log`);
const TARGET_BYTES = 50 * 1024 * 1024; // 50MB — a small log by production standards

// ---- make a log to work on (deleted at the end) --------------------
const LEVELS = ['INFO', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
const PATHS = ['/api/users', '/api/orders', '/', '/health', '/api/search'];

function makeLine(i) {
  const s = i % 86400;
  const time = `2024-03-01T${String(Math.floor(s / 3600)).padStart(2, '0')}:` +
    `${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}Z`;
  if (i % 50 === 49) return `${time} -- corrupted line --`;
  const status = i % 23 === 0 ? 500 : i % 7 === 0 ? 404 : 200;
  return `${time} [${LEVELS[i % LEVELS.length]}] ${PATHS[i % PATHS.length]} ` +
    `${status} ${(i * 37) % 1500}ms`;
}

writeFileSync(LOG_PATH, '');
let bytes = 0;
for (let i = 0; bytes < TARGET_BYTES; i += 2000) {
  let block = '';
  for (let j = 0; j < 2000; j++) block += `${makeLine(i + j)}\n`;
  appendFileSync(LOG_PATH, block); // sync writes, to match the sync reads below
  bytes += Buffer.byteLength(block);
}
console.log(`log file: ${(statSync(LOG_PATH).size / 1024 / 1024).toFixed(1)}MB at ${LOG_PATH}`);

try {
  // ---- the actual program ------------------------------------------
  const before = process.memoryUsage();
  const started = Date.now();

  const text = readFileSync(LOG_PATH, 'utf8'); // copy 1: the whole file, as a string
  const lines = text.split('\n');              // copy 2: ~1.1 million strings

  const counts = {};
  let total = 0;
  let slowest = 0;
  for (const line of lines) {
    const match = /\[([A-Z]+)\] \S+ (\d{3}) (\d+)ms$/.exec(line);
    if (!match) continue;
    counts[match[1]] = (counts[match[1]] ?? 0) + 1;
    total += Number(match[3]);
    if (Number(match[3]) > slowest) slowest = Number(match[3]);
  }

  const after = process.memoryUsage();
  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;

  console.log(`\n${lines.length} lines in ${Date.now() - started}ms`);
  console.log(`levels: ${JSON.stringify(counts)}`);
  console.log(`slowest: ${slowest}ms`);
  console.log(`\nmemory used to answer three small questions:`);
  console.log(`  heap:  ${mb(before.heapUsed)} -> ${mb(after.heapUsed)}  (+${mb(after.heapUsed - before.heapUsed)})`);
  console.log(`  rss:   ${mb(before.rss)} -> ${mb(after.rss)}  (+${mb(after.rss - before.rss)})`);

  // The answers are three numbers. Getting them cost us the entire file
  // in memory, twice over:
  //
  //   1. readFileSync    -> the whole file as one string
  //   2. split('\n')     -> an array of ~1.1 million strings, and the
  //                         original string stays alive behind them
  //
  // At 50MB that's merely wasteful. The failure modes come fast:
  //   - 500MB log on a 512MB container: the process is killed.
  //   - ~512MB+ log: V8 CANNOT make a string that long. It is not slow,
  //     it is impossible — `readFileSync(...,'utf8')` throws.
  //   - Nothing is printed until the last byte is read, so there is no
  //     progress, and a truncated file wastes the entire read.
  //
  // And the summarising logic is welded to the file reading, so testing
  // it means... writing another 50MB file.
} finally {
  rmSync(LOG_PATH, { force: true });
}
