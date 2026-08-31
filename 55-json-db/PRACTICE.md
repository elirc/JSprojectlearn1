# 🏋️ Practice: File-based JSON Database

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch folder: copy `refactored/jsondb.js` there when an exercise adds a method to the class, and use the `mkdtemp` trick from `jsondb.test.js` so every run gets a fresh directory. Everything runs offline with `node --test` or plain `node`.

## Exercises

### ⭐ 1. What does `update` resolve with? (warm-up)

The test suite never checks the *resolved value* of `db.update(...)`. Read `update` in `jsondb.js`, predict what `await db.update(d => { d.count = 7; })` evaluates to, then write a test proving it. Also check the return-a-replacement form: `await db.update(d => ({ fresh: true }))`.

What it practices: reading an API's contract from its code, and pinning it with a test.
Expected: both calls resolve with the complete new data (`{ count: 7 }`, then `{ fresh: true }`).
Hint: look at the last line of `run` inside `update`.

### ⭐⭐ 2. A `close()` that flushes the queue

Callers who fire updates without awaiting them (like the lost-update test does) need a way to say "wait until everything I queued is on disk" before the process exits. Add a `close()` method that resolves only after every previously queued update has finished.

What it practices: the promise chain as a *flush point*, not just a serializer.
Expected: fire 5 un-awaited increments, `await db.close()`, then a **brand-new** `JsonDb` on the same file reads `count: 5`.
Hint: the queue already exists — `#writeChain`. One line.

### ⭐⭐ 3. An atomic `backup()`

Add `backup(suffix = '.bak')`: writes the current data to `<file><suffix>` and returns that path. It must use the same torn-write protection as normal saves — temp file in the same directory, then `rename`.

What it practices: reusing the atomic-write recipe for a second purpose.
Expected: after an update, `await db.backup()` creates `db.json.bak`; a new `JsonDb` pointed at the `.bak` file reads the same data; no `.tmp` file remains in the folder.
Hint: mirror `#atomicWrite`, but aim at `this.#file + suffix`. Get the data with `await this.read()`.

### ⭐⭐ 4. Slow updates can't be overtaken

Write a test proving that an `async` update function holds its turn: a *slow* update (25 ms of awaited work inside `updateFn`) fired first, and a *fast* one fired immediately after, must still land in call order. This edge is uncovered: the existing concurrency test uses only synchronous mutators.

What it practices: trusting (and verifying) that the chain serializes the whole load-modify-save cycle, not just the save.
Expected: with each update pushing a label into `d.log`, the final file holds `['slow', 'fast']` — never `['fast', 'slow']`.
Hint: `await new Promise(r => setTimeout(r, 25))` inside the first updateFn. Fire both without awaiting, then `Promise.all`.

### ⭐⭐⭐ 5. Reject bad data — and roll the cache back

Add a constructor option `validate(data) -> boolean`. After `updateFn` runs (mutation or replacement), if the new data fails validation the update must **reject**, nothing may be written to disk, and — the hard part — the in-memory `#cache` must be restored to its pre-update state, because the updateFn already mutated it. Later updates must still work (no wedged queue).

What it practices: the update cycle as a transaction — validate before commit, roll back on failure.
Expected: with `validate: d => d.count >= 0`, an update setting `count = -5` rejects; `read()` still shows the old count; the file on disk never contains `-5`; a following valid update lands.
Hint: snapshot with `structuredClone(data)` *before* calling `updateFn`; on failure, put the snapshot back into `#cache` and `throw`.

## Solutions

### 1. `update` resolves with the new data

```js
test('update resolves with the freshly saved data', async () => {
  const dir = await freshDir();
  const db = new JsonDb(path.join(dir, 'db.json'), { defaultData: { count: 0 } });
  assert.deepEqual(await db.update((d) => { d.count = 7; }), { count: 7 });
  assert.deepEqual(await db.update(() => ({ fresh: true })), { fresh: true });
});
```

WHY: `run` ends with `return this.#cache`, so callers get the post-update truth without a second `read()`. Pinning this in a test turns an accidental convenience into a promised contract — if a refactor ever changes it, the suite says so.

### 2. `close()`

```js
async close() {
  await this.#writeChain;
}
```

Test:

```js
test('close() flushes every queued write to disk', async () => {
  const dir = await freshDir();
  const file = path.join(dir, 'db.json');
  const db = new JsonDb(file, { defaultData: { count: 0 } });
  for (let i = 0; i < 5; i++) db.update((d) => { d.count++; }); // NOT awaited
  await db.close();
  const db2 = new JsonDb(file);
  assert.equal((await db2.read()).count, 5);
});
```

WHY: `#writeChain` always points *after* the most recently queued update, so awaiting it is exactly "everything before now is on disk". It can never reject — the `.then(() => {}, () => {})` re-chaining swallows failures for the queue — so `close()` is safe even after a failed update.

### 3. `backup()`

```js
async backup(suffix = '.bak') {
  const data = await this.read();
  const target = this.#file + suffix;
  const dir = path.dirname(target);
  const tmp = path.join(dir, `.${path.basename(target)}.${process.pid}.tmp`);
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, target);
  return target;
}
```

WHY: a backup that can itself be torn by a crash is worse than none — you'd restore garbage. So the backup gets the same guarantee as the main file: temp in the *same directory*, then atomic `rename`. Readers of the `.bak` see the old complete backup or the new complete one, never a half-written mix.

### 4. Slow updates hold their turn

```js
test('a slow async updateFn is not overtaken by a fast one', async () => {
  const dir = await freshDir();
  const db = new JsonDb(path.join(dir, 'db.json'), { defaultData: { log: [] } });
  const slow = db.update(async (d) => {
    await new Promise((r) => setTimeout(r, 25));
    d.log.push('slow');
  });
  const fast = db.update((d) => { d.log.push('fast'); });
  await Promise.all([slow, fast]);
  assert.deepEqual((await db.read()).log, ['slow', 'fast']);
});
```

WHY: `update` does `await updateFn(data)` inside `run`, and `run` for the fast update is chained *after* the slow one's entire load-modify-save completes. So the queue serializes the whole cycle, including time spent inside your function — which is exactly what makes lost updates impossible even when mutators do async work.

### 5. `validate` with rollback

```js
// constructor gains: this.#validate = validate;  (declare  #validate;  as a field)
constructor(file, { defaultData = {}, validate } = {}) {
  this.#file = file;
  this.#defaultData = defaultData;
  this.#validate = validate;
}

async update(updateFn) {
  const run = async () => {
    const data = await this.read();
    const snapshot = this.#validate ? structuredClone(data) : null;
    const result = await updateFn(data);
    if (result !== undefined) this.#cache = result;
    if (this.#validate && !this.#validate(this.#cache)) {
      this.#cache = snapshot; // undo the mutation the updateFn already made
      throw new Error('update rejected: validation failed');
    }
    await this.#atomicWrite(JSON.stringify(this.#cache, null, 2));
    return this.#cache;
  };
  const next = this.#writeChain.then(run, run);
  this.#writeChain = next.then(() => {}, () => {});
  return next;
}
```

Test:

```js
test('invalid update rejects, rolls back, and does not wedge the queue', async () => {
  const dir = await freshDir();
  const file = path.join(dir, 'db.json');
  const db = new JsonDb(file, {
    defaultData: { count: 0 },
    validate: (d) => d.count >= 0,
  });
  await db.update((d) => { d.count = 3; });
  await assert.rejects(() => db.update((d) => { d.count = -5; }), /validation failed/);
  assert.equal((await db.read()).count, 3);                        // cache rolled back
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).count, 3); // disk untouched
  await db.update((d) => { d.count++; });                          // queue survived
  assert.equal((await db.read()).count, 4);
});
```

WHY: this turns `update` into a small transaction — validate before commit, roll back on failure. The snapshot must be a `structuredClone` (project 25's reference-vs-value lesson): the updateFn mutates the live cache object, so only a real deep copy can restore the pre-update state. Throwing *before* `#atomicWrite` keeps bad data off disk, and the existing `.then(run, run)` re-chaining means the rejection reaches this caller without jamming the queue for the next one.
