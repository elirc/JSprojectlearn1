import { createWriteStream } from 'node:fs';
import { once } from 'node:events';

/**
 * Write a sample log, streaming — the mirror image of reading one.
 *
 * The important line is the backpressure check. `stream.write()` returns
 * false when the OS buffer is full; ignoring that is how a "streaming"
 * writer quietly buffers the entire output in memory and becomes the
 * very thing it was avoiding.
 */

const LEVELS = ['INFO', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
const PATHS = ['/api/users', '/api/orders', '/', '/health', '/api/search'];

/** Deterministic, so two runs produce byte-identical files. */
export function makeLine(i) {
  const s = i % 86400;
  const time = `2024-03-01T${String(Math.floor(s / 3600)).padStart(2, '0')}:` +
    `${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}Z`;
  if (i % 50 === 49) return `${time} -- corrupted line --`; // 2% junk, as in real life
  const status = i % 23 === 0 ? 500 : i % 7 === 0 ? 404 : 200;
  return `${time} [${LEVELS[i % LEVELS.length]}] ${PATHS[i % PATHS.length]} ` +
    `${status} ${(i * 37) % 1500}ms`;
}

export async function writeSampleLog(filePath, targetBytes, { blockLines = 2000 } = {}) {
  const out = createWriteStream(filePath);
  let bytes = 0;
  let lines = 0;

  while (bytes < targetBytes) {
    let block = '';
    for (let j = 0; j < blockLines; j++) block += `${makeLine(lines + j)}\n`;
    lines += blockLines;
    bytes += Buffer.byteLength(block);

    if (!out.write(block)) await once(out, 'drain'); // wait for the buffer to empty
  }

  out.end();
  await once(out, 'finish');
  return { path: filePath, bytes, lines };
}
