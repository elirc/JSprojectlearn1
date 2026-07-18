/**
 * JsonDb — a tiny file-backed store (a mini lowdb) that gets the
 * three hard parts right:
 *
 *   1. ATOMIC writes: write a temp file, then rename() it over the
 *      real one. Rename is atomic on the same filesystem — readers
 *      see the old complete file or the new complete file, never a
 *      half-written one.
 *   2. SERIALIZED writes: every update is chained onto a promise
 *      queue, so concurrent read-modify-writes can't interleave and
 *      silently drop each other's changes.
 *   3. An API worth using: db.update(fn) owns the load-modify-save
 *      cycle so callers can't get it wrong.
 *
 * All I/O is async (node:fs/promises) — nothing blocks the process.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

export class JsonDb {
  #file;
  #defaultData;
  #cache = null;          // in-memory copy once loaded
  #writeChain = Promise.resolve(); // the serialization queue

  constructor(file, { defaultData = {} } = {}) {
    this.#file = file;
    this.#defaultData = defaultData;
  }

  /** Read the current data (loads from disk once, then serves memory). */
  async read() {
    if (this.#cache === null) {
      try {
        this.#cache = JSON.parse(await fs.readFile(this.#file, 'utf8'));
      } catch (err) {
        if (err.code !== 'ENOENT') throw err; // real corruption should be LOUD
        // structuredClone so two dbs never share one default object
        this.#cache = structuredClone(this.#defaultData);
      }
    }
    return this.#cache;
  }

  /**
   * The whole API is here: hand your mutation to the db instead of
   * pulling data out of it. `updateFn` receives the data, mutates it
   * (or returns a replacement), and the db persists atomically.
   *
   * Every call is chained on #writeChain — if two callers update
   * "at the same time", the second one's fn runs AFTER the first
   * one's save completes, seeing its changes. Lost-update: gone.
   */
  async update(updateFn) {
    const run = async () => {
      const data = await this.read();
      const result = await updateFn(data);
      if (result !== undefined) this.#cache = result; // returned replacement
      await this.#atomicWrite(JSON.stringify(this.#cache, null, 2));
      return this.#cache;
    };
    // Chain even past failures: one bad update must not wedge the queue.
    const next = this.#writeChain.then(run, run);
    this.#writeChain = next.then(() => {}, () => {});
    return next;
  }

  /**
   * temp file + rename = atomicity. The temp file lives in the SAME
   * directory as the target: rename is only atomic within one
   * filesystem, and /tmp is often a different one.
   */
  async #atomicWrite(text) {
    const dir = path.dirname(this.#file);
    const tmp = path.join(dir, `.${path.basename(this.#file)}.${process.pid}.tmp`);
    await fs.writeFile(tmp, text, 'utf8');
    await fs.rename(tmp, this.#file);
  }
}
