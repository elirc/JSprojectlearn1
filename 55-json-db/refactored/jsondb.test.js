import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonDb } from './jsondb.js';

async function freshDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'jsondb-'));
}

test('missing file -> defaultData, no crash on first run', async () => {
  const dir = await freshDir();
  const db = new JsonDb(path.join(dir, 'db.json'), { defaultData: { users: [] } });
  assert.deepEqual(await db.read(), { users: [] });
});

test('update persists: a NEW JsonDb instance reads it back from disk', async () => {
  const dir = await freshDir();
  const file = path.join(dir, 'db.json');

  const db1 = new JsonDb(file, { defaultData: { users: [] } });
  await db1.update((data) => { data.users.push({ id: 1, name: 'Ada' }); });

  const db2 = new JsonDb(file); // no shared memory — must come from the file
  assert.deepEqual(await db2.read(), { users: [{ id: 1, name: 'Ada' }] });
});

test('update can return a replacement instead of mutating', async () => {
  const dir = await freshDir();
  const db = new JsonDb(path.join(dir, 'db.json'), { defaultData: { count: 0 } });
  await db.update((data) => ({ count: data.count + 1 }));
  assert.deepEqual(await db.read(), { count: 1 });
});

test('THE LOST-UPDATE TEST: 20 concurrent increments all land', async () => {
  const dir = await freshDir();
  const db = new JsonDb(path.join(dir, 'db.json'), { defaultData: { count: 0 } });
  // Fire 20 updates WITHOUT awaiting in between — the original's
  // load/modify/save pattern loses most of these.
  await Promise.all(
    Array.from({ length: 20 }, () => db.update((d) => { d.count++; })),
  );
  assert.equal((await db.read()).count, 20);
});

test('a throwing update rejects but does NOT wedge the queue', async () => {
  const dir = await freshDir();
  const db = new JsonDb(path.join(dir, 'db.json'), { defaultData: { ok: 0 } });
  await assert.rejects(
    () => db.update(() => { throw new Error('validation failed'); }),
    /validation failed/,
  );
  await db.update((d) => { d.ok = 1; }); // queue still alive
  assert.equal((await db.read()).ok, 1);
});

test('a corrupt file is a LOUD error, not silent data loss', async () => {
  const dir = await freshDir();
  const file = path.join(dir, 'db.json');
  await fs.writeFile(file, '{"users": [half a wri', 'utf8'); // the original's crash artifact
  const db = new JsonDb(file, { defaultData: { users: [] } });
  await assert.rejects(() => db.read(), SyntaxError);
});

test('writes are atomic: no temp file remains, target is whole JSON', async () => {
  const dir = await freshDir();
  const file = path.join(dir, 'db.json');
  const db = new JsonDb(file, { defaultData: {} });
  await db.update((d) => { d.big = 'x'.repeat(10_000); });

  const leftovers = (await fs.readdir(dir)).filter((f) => f.includes('.tmp'));
  assert.deepEqual(leftovers, []);
  JSON.parse(await fs.readFile(file, 'utf8')); // parses = complete
});

test('two dbs with the same defaultData object do not share state', async () => {
  const shared = { list: [] };
  const dir = await freshDir();
  const a = new JsonDb(path.join(dir, 'a.json'), { defaultData: shared });
  const b = new JsonDb(path.join(dir, 'b.json'), { defaultData: shared });
  await a.update((d) => { d.list.push('only in a'); });
  assert.deepEqual((await b.read()).list, []);
});
