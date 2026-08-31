// One place states the server's contract; every call site is checked
// against it. The endpoint map is the single source of truth — add a
// route there and it exists everywhere; change a shape there and every
// consumer that disagrees fails to compile.

export interface Todo {
  id: number;
  title: string;
  done: boolean;
}
export interface NewTodo {
  title: string;
}
export interface User {
  id: number;
  name: string;
}

// ---- the contract ------------------------------------------------
// Keys are `METHOD path` so the method can't drift from the route.
// `res` is what comes back; `body` (where present) is what goes out.
export interface Endpoints {
  'GET /todos': { res: Todo[] };
  'GET /me': { res: User };
  'POST /todos': { body: NewTodo; res: Todo };
  'PATCH /todos/done': { body: { id: number; done: boolean }; res: Todo };
}

export type Endpoint = keyof Endpoints;
type Res<K extends Endpoint> = Endpoints[K]['res'];

// Endpoints WITH a body take exactly one extra argument; endpoints
// without one take none. A conditional type (ts#27) over a labelled
// tuple gets both cases from a single signature:
type Args<K extends Endpoint> = Endpoints[K] extends { body: infer B } ? [body: B] : [];

// ---- the boundary: unknown in, validated out (ts#13, ts#34) ------
declare function transport(endpoint: string, body: unknown): Promise<unknown>;

const isTodo = (value: unknown): value is Todo =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Todo).id === 'number' &&
  typeof (value as Todo).title === 'string' &&
  typeof (value as Todo).done === 'boolean';

const isUser = (value: unknown): value is User =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as User).id === 'number' &&
  typeof (value as User).name === 'string';

// One guard per endpoint, keyed by the SAME map — forget one and this
// object literal doesn't compile (ts#12's Record-table idiom):
const guards: { [K in Endpoint]: (value: unknown) => value is Res<K> } = {
  'GET /todos': (value): value is Todo[] => Array.isArray(value) && value.every(isTodo),
  'GET /me': isUser,
  'POST /todos': isTodo,
  'PATCH /todos/done': isTodo,
};

export class ApiDriftError extends Error {
  constructor(endpoint: string, public readonly received: unknown) {
    super(`${endpoint} returned a shape the client does not accept — the API has drifted`);
    this.name = 'ApiDriftError';
  }
}

export async function api<K extends Endpoint>(endpoint: K, ...args: Args<K>): Promise<Res<K>> {
  const [body] = args as [unknown?];
  const raw: unknown = await transport(endpoint, body);
  // The one honest cast in the file: `guards` really is correlated
  // with `K`, but TypeScript can't verify a lookup through a generic
  // key. Sealed inside the wrapper; every PUBLIC signature is checked
  // (ts#20's same trade).
  const check = guards[endpoint] as (value: unknown) => value is Res<K>;
  if (!check(raw)) throw new ApiDriftError(endpoint, raw);
  return raw;
}

// ---- the four original call sites, now typed ---------------------
export async function todoTitles(): Promise<string[]> {
  const todos = await api('GET /todos'); // Todo[] — no cast, no guessing
  return todos.map((todo) => todo.title);
}

export async function openCount(): Promise<number> {
  const todos = await api('GET /todos');
  return todos.filter((todo) => !todo.done).length;
  // If the server renames `done`, the GUARD rejects the payload at the
  // boundary and throws ApiDriftError naming the endpoint — instead of
  // a badge that silently reads the wrong number forever.
}

export async function createTodo(title: string): Promise<number> {
  const created = await api('POST /todos', { title }); // body checked against NewTodo
  return created.id;
}

export async function greet(): Promise<string> {
  const me = await api('GET /me');
  return `hello, ${me.name}`;
}

// ==== type tests: every original fiction, now a compile error ======
export async function typeTests(): Promise<void> {
  // @ts-expect-error — the v2 rename: `completed` is not a field of Todo
  (await api('GET /todos'))[0]?.completed;

  // @ts-expect-error — GET /todos returns Todo[]; arrays have no .title
  (await api('GET /todos')).title;

  // @ts-expect-error — the POST body's field is `title`, not `name`
  await api('POST /todos', { name: 'read ts#49' });

  // @ts-expect-error — POST /todos cannot be called without a body
  await api('POST /todos');

  // @ts-expect-error — GET /todos takes no body
  await api('GET /todos', { title: 'x' });

  // @ts-expect-error — '/todo' (and every other typo) is not an endpoint
  await api('GET /todo');

  // @ts-expect-error — the method is part of the key: GET is not POST
  await api('POST /me');

  // @ts-expect-error — a User has no `done`
  (await api('GET /me')).done;

  // @ts-expect-error — PATCH's body is checked field by field
  await api('PATCH /todos/done', { id: 1, done: 'yes' });
}
