# 🏋️ Practice: Promise Pool

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Prove limit 1 is the original (warm-up)

The README claims the pool "contains both extremes as special cases". Pin the sequential end down with a test: build 5 tasks whose sleeps get *shorter* as the index grows (`sleep(10 - i)`), each recording the order it finished in and tracking how many were active at once. Run them with `limit: 1` and assert peak concurrency is exactly `1`, the completion order is `[0,1,2,3,4]`, and the results are `[0,1,2,3,4]`.

What it practices: instrumenting async code with an active/peak counter — the technique every other exercise here reuses.

Hint: the descending sleeps are the point. With any real concurrency task 4 would finish first, so `[0,1,2,3,4]` can only happen if nothing overlapped.

### ⭐⭐ 2. mapWithLimit (core)

`runWithLimit` takes zero-argument functions, but almost every call site really means "do this to each of these items". Write `mapWithLimit(items, limit, fn)` where `fn(item, index)` is async, returning results in item order. It should be a thin adapter — two lines, no new pool logic. Check offline: `mapWithLimit([1,2,3,4,5], 2, async (id, i) => \`${i}:user${id}\`)` gives `['0:user1', ..., '4:user5']`, and an empty item list gives `[]`.

What it practices: building the ergonomic API on top of the primitive instead of inside it.

Hint: `items.map((item, index) => () => fn(item, index))` — the extra `() =>` is essential. Without it you'd *call* every `fn` immediately and launch all of them at once, defeating the entire pool.

### ⭐⭐ 3. A progress callback (core)

Long batch jobs need a progress bar. Add an optional `onProgress` argument called after each task completes, with `{ completed, total, index }`. It must fire once per task, with `completed` counting `1, 2, 3...` in completion order, and it must not fire at all for an empty task list. Check offline: 5 tasks with *descending* sleeps at `limit: 2`, collecting `p.completed`, gives exactly `[1, 2, 3, 4, 5]`.

What it practices: adding an observation point inside a worker loop without changing what the loop does.

Hint: a `completed` counter next to `nextIndex`, incremented right after the `await`. Default the parameter to `() => {}` so existing callers pass nothing and nothing breaks.

### ⭐⭐ 4. The workers that don't stop (core)

Run 6 tasks at `limit: 2` where task 0 throws after a short sleep, and record which tasks *start*. `runWithLimit` rejects almost immediately — but wait 300ms afterwards and print the record: all 6 started anyway. The rejection told the caller to give up while the pool kept hammering the server. Write a test proving that, then add a `failed` flag so no worker claims a new task after any task has thrown. Check offline: the fixed version starts at most 3 of the 6, and normal (non-failing) runs still return all results in order.

What it practices: noticing that "the promise rejected" and "the work stopped" are two different things — and that `Promise.all` only promises the first.

Hint: `while (nextIndex < tasks.length && !failed)`, and wrap the `await` in a try/catch that sets `failed = true` before rethrowing. The rethrow is what still rejects the run.

### ⭐⭐⭐ 5. PoolQueue — add work while it's running (challenge)

`runWithLimit` needs the whole task list up front, but a crawler discovers new URLs as it goes. Write a `PoolQueue` class: `new PoolQueue(limit)`, `add(task)` returning a promise for *that task's* result, plus `active` and `pending` getters. Tasks added while the pool is busy queue up and start as slots free. One task rejecting must reject only its own promise — the pool keeps working. Check offline with `limit: 2`: adding 3 tasks gives `active === 2` and `pending === 1` immediately; adding 2 more mid-flight still yields results `[0,1,2,3,4]` with peak concurrency 2 and both counters back to 0 at the end.

What it practices: inverting control — instead of a loop that pulls tasks, a queue that starts them when capacity appears.

Hint: `add` returns `new Promise((resolve, reject) => { this.#queue.push({ task, resolve, reject }); this.#pump(); })`. `#pump` starts tasks while there's room, and each task's `.finally` decrements `active` and pumps again.

### ⭐⭐⭐ 6. A property test for the pool (challenge)

Two promises define this function: results come back in *task* order, and concurrency never exceeds the limit. Assert both across 40 random trials — random task count 0–11, random limit 1–6, random sleep 0–5ms per task — with an active/peak counter as in exercise 1. Then sabotage the pool to see the test earn its keep: change `results[index] = await tasks[index]()` to `results.push(...)` and the order assertion must fail; start `limit + 1` workers and the concurrency assertion must fail. Restore both.

What it practices: property-based testing for concurrency, where the interesting bugs live in timing combinations nobody would write by hand.

Hint: include `count === 0` in the random range — an empty task list means `Math.min(limit, 0)` workers, i.e. none, and `Promise.all([])` resolving instantly is worth covering.

## Solutions

### 1. Limit 1 is the original

```js
test('limit 1 is exactly the sequential original', async () => {
  const order = [];
  let active = 0;
  let peak = 0;
  const tasks = Array.from({ length: 5 }, (_, i) => async () => {
    active++;
    peak = Math.max(peak, active);
    await sleep(10 - i); // later tasks are FASTER
    active--;
    order.push(i);
    return i;
  });

  assert.deepEqual(await runWithLimit(tasks, 1), [0, 1, 2, 3, 4]);
  assert.equal(peak, 1);
  assert.deepEqual(order, [0, 1, 2, 3, 4]); // finished in start order
});
```

WHY: the descending sleeps make this a real test instead of a tautology — if any two tasks overlapped, task 4 (1ms) would finish before task 0 (10ms) and `order` would come out scrambled. Getting `[0,1,2,3,4]` proves each task waited for the previous one, which is precisely the `await`-in-a-loop shape the README calls "serializing by accident". The pool didn't remove that behavior; it made it one value of a knob. Verified by running: peak 1, order `[0,1,2,3,4]`.

### 2. mapWithLimit

```js
export async function mapWithLimit(items, limit, fn) {
  return runWithLimit(
    items.map((item, index) => () => fn(item, index)), // wrap, don't call
    limit,
  );
}
```

WHY: the double arrow is the whole exercise. `items.map((item) => fn(item))` would invoke every `fn` during the `map`, launching all 500 requests before the pool ever sees them — the pool would then dutifully "limit" the awaiting of promises that are all already in flight. `() => fn(item, index)` hands the pool a *recipe* it can choose when to start, which is why `runWithLimit` takes zero-argument functions rather than promises in the first place. Passing `index` through costs nothing and callers often want it. Verified by running: `['0:user1','1:user2','2:user3','3:user4','4:user5']`, and `[]` for no items.

### 3. Progress callback

```js
export async function runWithLimit(tasks, limit, onProgress = () => {}) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be a positive integer, got ${limit}`);
  }

  const results = new Array(tasks.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
      completed++;
      onProgress({ completed, total: tasks.length, index });
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
```

WHY: `completed` is a separate counter from `nextIndex` because they answer different questions — `nextIndex` is how many have been *claimed*, `completed` is how many have *finished*, and with a limit of 5 those differ by up to 5 at any moment. Reporting the claimed count would make a progress bar that races ahead and then stalls. The default `() => {}` means the parameter is invisible to every existing caller and every existing test. Verified by running: `[1, 2, 3, 4, 5]` from descending-sleep tasks at limit 2, and no calls at all for an empty list.

### 4. Stopping after a failure

```js
test('today, workers keep starting tasks after a failure', async () => {
  const started = [];
  const tasks = Array.from({ length: 6 }, (_, i) => async () => {
    started.push(i);
    await sleep(5);
    if (i === 0) throw new Error('boom');
    return i;
  });

  await assert.rejects(() => runWithLimit(tasks, 2), /boom/);
  await sleep(300);                 // let the abandoned workers finish
  assert.equal(started.length, 6);  // all six ran anyway
});
```

```js
async function worker() {
  while (nextIndex < tasks.length && !failed) {
    const index = nextIndex++;
    try {
      results[index] = await tasks[index]();
    } catch (err) {
      failed = true; // no worker claims another task
      throw err;     // ...but the run still rejects, as before
    }
  }
}
```

WHY: `Promise.all` rejects as soon as one input rejects, but it has no power to stop the others — they are already-running async functions, and JavaScript cannot cancel those. So the caller sees a fast failure while the pool quietly finishes all 6 requests against a server that just told you it was unhappy. The `failed` flag closes the gap at the only place new work begins: the claim line. Notice the rethrow is still there, so the observable contract (`Promise.all` semantics) is unchanged; only the wasted work disappears. Verified by running: 6 of 6 started before the fix, 2 of 6 after, and normal runs still return `['a','b']`.

### 5. PoolQueue

```js
export class PoolQueue {
  #limit;
  #active = 0;
  #queue = [];

  constructor(limit) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError(`limit must be a positive integer, got ${limit}`);
    }
    this.#limit = limit;
  }

  get active() { return this.#active; }
  get pending() { return this.#queue.length; }

  add(task) {
    return new Promise((resolve, reject) => {
      this.#queue.push({ task, resolve, reject });
      this.#pump();
    });
  }

  #pump() {
    while (this.#active < this.#limit && this.#queue.length > 0) {
      const { task, resolve, reject } = this.#queue.shift();
      this.#active++;
      Promise.resolve()
        .then(task)                 // errors thrown synchronously land here too
        .then(resolve, reject)      // settle THIS task's promise only
        .finally(() => { this.#active--; this.#pump(); });
    }
  }
}
```

WHY: keeping each task's `resolve`/`reject` in the queue entry is what makes failures local — `add` returns a promise per task, so one rejection can't poison the others the way `Promise.all` does. `Promise.resolve().then(task)` rather than `task()` means a task that throws *synchronously* still becomes a rejected promise instead of blowing up inside `#pump`. And `#pump` in the `.finally` is the engine: every completion re-checks for free capacity, which is how a task added five seconds from now still gets started. Verified by running: `active` 2 / `pending` 1 immediately, results `[0,1,2,3,4]` including two tasks added mid-flight, peak concurrency 2, counters back to 0, and a rejecting task leaving the pool usable.

### 6. Property test

```js
test('PROPERTY: order is task order and concurrency never exceeds the limit', async () => {
  for (let trial = 0; trial < 40; trial++) {
    const count = Math.floor(Math.random() * 12);   // 0..11, empty included
    const limit = 1 + Math.floor(Math.random() * 6);
    let active = 0;
    let peak = 0;
    const expected = [];

    const tasks = Array.from({ length: count }, (_, i) => {
      const value = `t${i}`;
      expected.push(value);
      return async () => {
        active++;
        peak = Math.max(peak, active);
        await sleep(Math.floor(Math.random() * 6));
        active--;
        return value;
      };
    });

    assert.deepEqual(await runWithLimit(tasks, limit), expected, `trial ${trial}`);
    assert.ok(peak <= limit, `peak ${peak} exceeded limit ${limit}`);
  }
});
```

WHY: concurrency bugs are combinations — a particular limit, a particular set of durations, a particular interleaving — and hand-written examples cover a handful of points in that space. Randomizing all three dimensions and asserting the two *invariants* explores hundreds of interleavings per run, including the awkward ones (limit greater than task count, zero tasks, all tasks finishing in the same tick). The `active`/`peak` counter works because JavaScript is single-threaded: increments and decrements can't interleave mid-statement, so the count is always exact. Verified by running: 40 random trials pass; swapping the indexed write for `results.push` breaks the order assertion, and starting `limit + 1` workers breaks the concurrency one.
