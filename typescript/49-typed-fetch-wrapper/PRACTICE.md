# 🏋️ Practice: Typed Fetch Wrapper

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a COPY of `refactored/api.ts` (easiest — the map, `Args`, `Res` and `guards` are already there), or in a scratch `.ts` file inside the `typescript/` folder ending with `export {}`. Run `npm run typecheck` after each step.

## Exercises

### ⭐ 1. Grow the contract (warm-up)

Add `'DELETE /todos/all': { res: { deleted: number } }` to `Endpoints` — and **only** that. Run the typecheck before you do anything else, read the error, then follow it.

**Practices:** feeling the mapped-type guard table work as a compiler-guided checklist.
**Hint:** the error points at the `guards` object literal, not at any call site. That's the design working: adding a route can't silently skip its runtime validation.
**Check:** after adding the guard, `await api('DELETE /todos/all')` must compile and infer `{ deleted: number }`, and `api('DELETE /todos/all', { id: 1 })` must error with roughly "Expected 1 arguments, but got 2".

### ⭐⭐ 2. `Body<K>` and `HasBody<K>` (core)

The file has `Res<K>`. Write its two siblings: `Body<K>` (the request body type, or `never` when the endpoint declares none) and `HasBody<K>` (`true` / `false`). Then assert all four facts with annotated constants.

**Practices:** conditional types with `infer`, and using a type as a *question you can answer at compile time*.
**Hint:** `Body` is the same conditional `Args` already uses, minus the tuple wrapper. `HasBody` doesn't need `infer` at all — `extends { body: unknown }` is enough to ask the yes/no question.
**Check:** `const b: Body<'POST /todos'> = { title: 'x' };` must compile; `const h: HasBody<'GET /todos'> = false;` must compile; and assigning anything at all to `Body<'GET /todos'>` must error, because `never` accepts no values.

### ⭐⭐ 3. A typed mock store (core)

Tests need canned responses. Build `type Responses = { [K in Endpoint]?: Res<K> }` and `mock<K extends Endpoint>(store: Responses, endpoint: K, response: Res<K>): void`, so a mock for one endpoint can never be the shape of another.

**Practices:** reusing the endpoint map for test infrastructure — the same source of truth, a second consumer.
**Hint:** the *write* `store[endpoint] = response` won't compile: TypeScript can't verify an assignment through a generic key even when it is correct. Use one contained cast (`store as Record<Endpoint, unknown>`) with a comment, exactly as `api()` does for `guards`.
**Check:** `mock(store, 'GET /me', { id: 1, name: 'ada' })` compiles; `mock(store, 'GET /todos', { id: 1, name: 'ada' })` must error with roughly "not assignable to parameter of type 'Todo[]'".

### ⭐⭐ 4. A client object, generated from the map (core)

Instead of `api('GET /me')`, some teams prefer `client['GET /me']()`. Write `type Client = { [K in Endpoint]: (...args: Args<K>) => Promise<Res<K>> }` and check that every per-endpoint rule survives the transformation.

**Practices:** mapped types over *functions*, and seeing that one contract can generate several API styles.
**Hint:** you don't have to implement it to test the type — `declare const client: Client;` is enough to typecheck call sites.
**Check:** `await client['POST /todos']({ title: 'x' })` must infer `Todo`; `client['POST /todos']()` must error on argument count; `client['GET /todo']()` must error with roughly "Property 'GET /todo' does not exist".

### ⭐⭐⭐ 5. Route parameters from the path string (challenge)

Real routes have holes: `'/todos/:id'`. Write `PathParams<S>` (ts#26, ts#28) extracting the union of parameter names from a route string, then `buildPath<S extends string>(route: S, params: Record<PathParams<S>, string>): string` that substitutes them.

**Practices:** recursive template-literal types — reading structure out of a *string*.
**Hint:** two conditional cases. `` S extends `${string}:${infer P}/${infer Rest}` `` peels one parameter followed by more path (recurse on `Rest`); `` S extends `${string}:${infer P}` `` handles the last one. Anything else is `never`.
**Check:** `PathParams<'GET /todos/:id'>` must be `'id'`; `PathParams<'GET /users/:userId/todos/:todoId'>` must accept both names; `PathParams<'GET /todos'>` must be `never` (assert with `` const t: [PathParams<'GET /todos'>] extends [never] ? true : false = true; ``); and `buildPath('/todos/:id', {})` must error for the missing key.

### ⭐⭐⭐ 6. A GET-only helper (challenge)

Some call sites should be physically unable to mutate anything — a cache warmer, a prefetcher, an SSR loader. Write ``type GetEndpoint = Extract<Endpoint, `GET ${string}`>`` and a `get<K extends GetEndpoint>(endpoint: K): Promise<Res<K>>` that accepts only read routes.

**Practices:** filtering a union of keys with a template-literal pattern — the payoff for putting the method *in* the key.
**Hint:** `Extract<Union, Pattern>` keeps the members assignable to `Pattern`; `` `GET ${string}` `` matches exactly the keys that start with `GET `.
**Check:** `get('GET /me')` must compile and infer `User`; `get('POST /todos')` must error with roughly "'POST /todos' is not assignable to parameter of type 'GET /me' | 'GET /todos'". Note that this only works because the method lives in the key — with `path` and `method` as separate arguments, no type could express "read-only routes".

## Solutions

### 1. Grow the contract

```ts
interface Endpoints {
  // ...existing entries...
  'DELETE /todos/all': { res: { deleted: number } };
}
const guards: { [K in Endpoint]: (value: unknown) => value is Res<K> } = {
  // ...existing guards...
  'DELETE /todos/all': (v): v is { deleted: number } =>
    typeof v === 'object' && v !== null &&
    typeof (v as { deleted: number }).deleted === 'number',
};
const result = await api('DELETE /todos/all'); // { deleted: number }
// @ts-expect-error — DELETE /todos/all takes no body
await api('DELETE /todos/all', { id: 1 });
```

**WHY:** `{ [K in Endpoint]: ... }` is a *total* mapping — every key of the union must be present — so the moment `Endpoints` grows, the guard table is incomplete and the build fails with the missing key named. This is ts#12's exhaustiveness lesson applied to a table instead of a switch: you don't need to *remember* to add the validator, because the code can't compile until you do. Meanwhile `Args<'DELETE /todos/all'>` resolves to `[]` automatically, since the entry has no `body`.

### 2. `Body<K>` and `HasBody<K>`

```ts
type Body<K extends Endpoint> = Endpoints[K] extends { body: infer B } ? B : never;
type HasBody<K extends Endpoint> = Endpoints[K] extends { body: unknown } ? true : false;

const b1: Body<'POST /todos'> = { title: 'x' }; // ✅ NewTodo
const h1: HasBody<'POST /todos'> = true;        // ✅
const h2: HasBody<'GET /todos'> = false;        // ✅
// @ts-expect-error — GET /todos declares no body, so Body is never
const b2: Body<'GET /todos'> = { title: 'x' };
```

**WHY:** `infer B` captures the body type when the pattern matches; the `never` branch is what makes the failing test fail, because `never` is the type with no values — nothing at all can be assigned to it, which is exactly the right answer to "what body does a GET take?". `HasBody` shows the other half of the idea: a conditional type doesn't have to *extract* anything, it can just return a `true`/`false` fact you can assert against, which is how ts#42 builds its whole testing vocabulary.

### 3. A typed mock store

```ts
type Responses = { [K in Endpoint]?: Res<K> };

function mock<K extends Endpoint>(store: Responses, endpoint: K, response: Res<K>): void {
  // one contained cast: the correlation between key and value is real,
  // but TypeScript can't verify a WRITE through a generic key
  (store as Record<Endpoint, unknown>)[endpoint] = response;
}

const store: Responses = {};
mock(store, 'GET /me', { id: 1, name: 'ada' });
mock(store, 'GET /todos', [{ id: 1, title: 't', done: false }]);
// @ts-expect-error — a User is not a Todo[]
mock(store, 'GET /todos', { id: 1, name: 'ada' });
// @ts-expect-error — the response must match the endpoint's res
mock(store, 'GET /me', [{ id: 1, title: 't', done: false }]);
```

**WHY:** the *public* signature is fully checked — `endpoint` and `response` are locked together by `K`, so a mock can never be the wrong shape — while the single unverifiable line is one cast, inside one function, with a comment. That's the pattern to internalize: push unsafety into the smallest possible box and check everything around it. The bigger win is that your mocks now drift with the contract: change `Todo` and every stale test fixture fails to compile.

### 4. A client object, generated from the map

```ts
type Client = { [K in Endpoint]: (...args: Args<K>) => Promise<Res<K>> };
declare const client: Client;

const me = await client['GET /me']();                  // User
const created = await client['POST /todos']({ title: 'x' }); // Todo
// @ts-expect-error — the POST method still demands its body
await client['POST /todos']();
// @ts-expect-error — no such method on the client
await client['GET /todo']();
```

**WHY:** the mapped type carries `Args<K>` and `Res<K>` into each generated method, so every guarantee survives the change of call style — the map is the contract, and the function shape is just packaging. This is worth noticing as an architectural point: because the truth lives in *data* (a type describing routes) rather than in *code* (hand-written functions), you can generate an RPC client, a mock server, a set of React hooks, or documentation from the same declaration without any of them drifting.

### 5. Route parameters from the path string

```ts
type PathParams<S extends string> = S extends `${string}:${infer P}/${infer Rest}`
  ? P | PathParams<Rest>
  : S extends `${string}:${infer P}`
    ? P
    : never;

type P1 = PathParams<'GET /todos/:id'>;                        // 'id'
type P2 = PathParams<'GET /users/:userId/todos/:todoId'>;      // 'userId' | 'todoId'
const noParams: [PathParams<'GET /todos'>] extends [never] ? true : false = true;
// @ts-expect-error — 'name' is not a parameter of that route
const wrong: P1 = 'name';

function buildPath<S extends string>(route: S, params: Record<PathParams<S>, string>): string {
  return Object.entries<string>(params).reduce<string>(
    (path, [key, value]) => path.replace(`:${key}`, value),
    route,
  );
}
const built = buildPath('/todos/:id', { id: '7' }); // '/todos/7'
// @ts-expect-error — the route declares :id, so it must be supplied
buildPath('/todos/:id', {});
```

**WHY:** the recursion is the interesting part — the first branch peels off *one* parameter and hands the remaining path back to `PathParams`, so a union accumulates across the whole string. `Record<PathParams<S>, string>` then converts that union into a required-keys object, which is why the empty literal fails. Note the `[X] extends [never]` wrapping in the assertion: bare `never` in a conditional type distributes to `never`, and the brackets stop that, which is a stumbling block worth meeting once deliberately.

### 6. A GET-only helper

```ts
type GetEndpoint = Extract<Endpoint, `GET ${string}`>; // 'GET /todos' | 'GET /me'
declare function get<K extends GetEndpoint>(endpoint: K): Promise<Res<K>>;

const me = await get('GET /me'); // User
// @ts-expect-error — get() only accepts GET routes
await get('POST /todos');
```

**WHY:** `Extract<U, P>` keeps the members of union `U` assignable to `P`, and a template-literal pattern like `` `GET ${string}` `` is a perfectly good `P`. The result is a *capability-restricted* API: a prefetcher handed only `get` is structurally incapable of writing to your server, and that guarantee is checked, not documented. It works solely because the HTTP method is part of the key — a design decision made two exercises' worth of code earlier that quietly pays off here. That's the usual shape of good type modelling: encode the distinction early, harvest it later.
