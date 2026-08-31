// The wrapper everyone writes on day one: hide the boilerplate behind
// `api(path)`. It hides the TYPES too — `Promise<any>` at the network
// boundary means every call site gets to invent its own idea of what
// came back, and no two call sites have to agree.

export interface Todo {
  id: number;
  title: string;
  done: boolean;
}

// No real network in this repo — this stands in for `fetch`. It
// returns what the CURRENT server returns, which is not what the
// client was written against: v2 renamed `done` to `completed`.
async function transport(path: string, init?: { method: string; body: string }): Promise<any> {
  if (path === '/todos' && !init) {
    return [
      { id: 1, title: 'read ts#48', completed: true },
      { id: 2, title: 'read ts#49', completed: false },
    ];
  }
  if (path === '/todos' && init?.method === 'POST') {
    return { id: 3, title: JSON.parse(init.body).title, completed: false };
  }
  return { error: 'not found', status: 404 };
}

export async function api(path: string, init?: { method: string; body: string }): Promise<any> {
  return transport(path, init);
}

// ---- call site 1: the cast that used to be true -------------------
export async function todoTitles(): Promise<string[]> {
  const todos = (await api('/todos')) as Todo[];
  return todos.map((todo) => todo.title);
}

// ---- call site 2: the same cast, quietly lying --------------------
export async function openCount(): Promise<number> {
  const todos = (await api('/todos')) as Todo[];
  return todos.filter((todo) => !todo.done).length;
  // RUNTIME: `done` no longer exists, so every `todo.done` is
  // undefined, `!undefined` is true, and the badge reads "2 open"
  // forever — including the day everything is finished. No crash,
  // no stack trace, just a number that is always wrong.
}

// ---- call site 3: a body nobody checks ----------------------------
export async function createTodo(title: string): Promise<number> {
  const created = (await api('/todos', {
    method: 'POST',
    body: JSON.stringify({ name: title }), // server wants `title`, not `name`
  })) as Todo;
  return created.id;
  // RUNTIME: the server stores an untitled todo. `created.id` happens
  // to work, so nothing looks broken until a user opens their list.
}

// ---- call site 4: a path that doesn't exist -----------------------
export async function firstTitle(): Promise<string> {
  const todos = (await api('/todo')) as Todo[]; // typo: no trailing 's'
  return todos[0].title;
  // RUNTIME: the 404 body `{ error, status }` is not an array.
  // "todos[0] is undefined" — three layers from the typo that caused it.
}

// Four call sites, four different fictions, one root cause: `any`
// crossing the boundary. The server's contract exists — it's just
// written in a wiki page instead of in the type system.
