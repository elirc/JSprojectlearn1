import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginate, findFirst, collectAll } from './paginate.js';

/** In-memory fake API that COUNTS its requests — the key instrument. */
function makeFakeApi(itemCount, pageSize) {
  const items = Array.from({ length: itemCount }, (_, i) => ({
    id: i + 1,
    name: `user${i + 1}`,
  }));
  let requests = 0;
  const getPage = async (cursor) => {
    requests++;
    const start = cursor ?? 0;
    return {
      items: items.slice(start, start + pageSize),
      nextCursor: start + pageSize < items.length ? start + pageSize : null,
    };
  };
  return { getPage, requests: () => requests };
}

test('streams every item across page boundaries, in order', async () => {
  const { getPage } = makeFakeApi(60, 25);
  const all = await collectAll(getPage);
  assert.equal(all.length, 60);
  assert.equal(all[0].name, 'user1');
  assert.equal(all[59].name, 'user60');
});

test('THE payoff: finding an early item fetches only the pages it needed', async () => {
  const { getPage, requests } = makeFakeApi(250, 25); // 10 pages total
  const found = await findFirst(getPage, (u) => u.name === 'user42');
  assert.equal(found.id, 42);       // user42 is on page 2...
  assert.equal(requests(), 2);      // ...so exactly 2 requests. Original: 10.
});

test('breaking out of for-await stops the fetching immediately', async () => {
  const { getPage, requests } = makeFakeApi(250, 25);
  let seen = 0;
  for await (const _ of paginate(getPage)) {
    seen++;
    if (seen === 3) break; // three items into page 1
  }
  assert.equal(requests(), 1); // only page 1 was ever fetched
});

test('no match: streams to the end and returns null', async () => {
  const { getPage, requests } = makeFakeApi(50, 25);
  assert.equal(await findFirst(getPage, () => false), null);
  assert.equal(requests(), 2);
});

test('a single-page collection works', async () => {
  const { getPage, requests } = makeFakeApi(5, 25);
  assert.equal((await collectAll(getPage)).length, 5);
  assert.equal(requests(), 1);
});

test('an empty collection works', async () => {
  const { getPage } = makeFakeApi(0, 25);
  assert.deepEqual(await collectAll(getPage), []);
});
