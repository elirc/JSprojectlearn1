// REAL integration tests: the app listens on an OS-assigned port and
// the tests speak actual HTTP with fetch. No mocks — this is the
// payoff of buildApp() being importable instead of listening on load.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './server.js';

let server;
let base;

before(async () => {
  server = buildApp().listen(0); // port 0: the OS picks a free one
  await new Promise((r) => server.on('listening', r));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const post = (path, body) => fetch(base + path, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const put = (path, body) => fetch(base + path, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

test('the CRUD story: create, list, update, delete', async () => {
  const created = await post('/todos', { title: '  write tests  ' });
  assert.equal(created.status, 201);
  const todo = await created.json();
  assert.deepEqual(todo, { id: todo.id, title: 'write tests', done: false }); // trimmed

  const list = await (await fetch(`${base}/todos`)).json();
  assert.ok(list.some((t) => t.id === todo.id));

  const updated = await put(`/todos/${todo.id}`, { done: true });
  assert.equal((await updated.json()).done, true);

  const del = await fetch(`${base}/todos/${todo.id}`, { method: 'DELETE' });
  assert.equal(del.status, 204);
  const after404 = await put(`/todos/${todo.id}`, { done: false });
  assert.equal(after404.status, 404);
});

test('malformed JSON is a 400 for THAT client — not a process crash', async () => {
  const res = await post('/todos', '{oops');
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'Body must be valid JSON' });
  // and the server is still alive for everyone else:
  assert.equal((await fetch(`${base}/todos`)).status, 200);
});

test('validation: bad bodies are rejected with reasons', async () => {
  for (const [body, why] of [
    [{}, /title/],
    [{ title: '' }, /title/],
    [{ title: '   ' }, /title/],
    [{ title: 12345 }, /title/],
    [{ title: 'x'.repeat(201) }, /too long/],
  ]) {
    const res = await post('/todos', body);
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, why);
  }
});

test('errors have ONE consistent shape everywhere: { error }', async () => {
  const cases = [
    await fetch(`${base}/no/such/route`),
    await put('/todos/abc', { done: true }),   // bad id -> 400
    await put('/todos/99999', { done: true }), // missing -> 404
    await post('/todos', {}),                  // invalid -> 400
  ];
  for (const res of cases) {
    assert.ok(res.status >= 400);
    const body = await res.json();
    assert.deepEqual(Object.keys(body), ['error']); // never "nope", never HTML
  }
});

test('route params: /todos/:id parses via the same matcher as project 60', async () => {
  const res = await put('/todos/abc', { done: true });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Invalid id: "abc"/);
});

test('unknown update fields are ignored; typed wrong they are 400', async () => {
  const { id } = await (await post('/todos', { title: 'strict' })).json();
  const res = await put(`/todos/${id}`, { done: 'yes' });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /done must be a boolean/);
});
