# 📘 Learning Guide: Typed Fetch Wrapper

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Almost every app has a small helper wrapping `fetch` — something like `api('/todos')` — so nobody has to write headers and `.json()` fifty times. The helper usually returns `Promise<any>`, because "it depends on the path" felt impossible to type.

That `any` is the most expensive one in the codebase. It sits at the exact point where *your* code meets *someone else's* code, which is the one place your compiler genuinely knows nothing. Every call site then writes `as Todo[]` — a promise about a server it has never checked — and those promises drift apart from the server, from each other, and from reality.

The fix in this exercise is to write the server's contract down **as a type**: an *endpoint map* from `'GET /todos'` to `{ res: Todo[] }`, from `'POST /todos'` to `{ body: NewTodo; res: Todo }`. One generic function then reads that map, so the call site `api('POST /todos', { title })` type-checks its body *and* knows its result, with no cast anywhere.

## 2. Concepts you need first

### 2.1 `keyof` and indexed access (ts#18, refresher)

```ts
interface Endpoints {
  'GET /todos': { res: Todo[] };
  'POST /todos': { body: NewTodo; res: Todo };
}
type Endpoint = keyof Endpoints;             // 'GET /todos' | 'POST /todos'
type TodosResponse = Endpoints['GET /todos']['res']; // Todo[]
```

`keyof T` is the union of `T`'s keys; `T[K]` looks a property type up. Chain them and you can walk a whole configuration object at the type level. Note that keys can be *any* string, including ones with spaces and slashes — which is why `'GET /todos'` works as a key and reads like the route it describes.

### 2.2 Generic key parameters — correlating input and output

```ts
declare function get<K extends Endpoint>(endpoint: K): Promise<Endpoints[K]['res']>;
const a = get('GET /todos'); // Promise<Todo[]>
const b = get('POST /todos'); // Promise<Todo>
```

Because `K` is inferred from the *literal* you pass, the return type is computed per call. This is the whole engine of the exercise: one signature, a different result type at every call site. (ts#20's typed emitter is the same trick, applied to event names.)

### 2.3 Conditional types + `infer` (ts#27, ts#28)

Some endpoints take a request body, some don't. A conditional type asks the question:

```ts
type Args<K extends Endpoint> = Endpoints[K] extends { body: infer B } ? [body: B] : [];
```

Read it as: *if this endpoint's entry has a `body` property, capture its type as `B` and the extra arguments are exactly `[body: B]`; otherwise there are no extra arguments.*

### 2.4 Rest parameters typed by a tuple

```ts
async function api<K extends Endpoint>(endpoint: K, ...args: Args<K>): Promise<Res<K>> { ... }
```

A rest parameter whose type is a *tuple* means "these exact arguments, in this order". `Args<K>` resolves to `[body: NewTodo]` for POST (one required argument) and to `[]` for GET (none allowed). One signature covers both, and `api('POST /todos')` fails with "Expected 2 arguments, but got 1".

```ts
// ❌ the old way: two functions, or an optional body nobody enforces
declare function api(path: string, body?: any): Promise<any>;
// ✅ the tuple way: the map decides, per endpoint
declare function api<K extends Endpoint>(e: K, ...args: Args<K>): Promise<Res<K>>;
```

The `body:` label inside `[body: B]` is a *tuple element name* — purely for editor tooltips and error messages, but free, so use it.

### 2.5 A guard table keyed by the same map (ts#12 + ts#13)

```ts
const guards: { [K in Endpoint]: (value: unknown) => value is Res<K> } = { ... };
```

This is a **mapped type** (ts#25): for every endpoint key, a type guard for that endpoint's response. Because the object literal is annotated with it, forgetting an endpoint is a compile error and writing the *wrong* guard for one is too. Add a route to `Endpoints` and the compiler walks you to every place that must grow.

### 2.6 Why `unknown` and a runtime check are still required

Types are erased at runtime. Nothing in `Endpoints` reaches out and checks the server. So the boundary looks like this:

```ts
const raw: unknown = await transport(endpoint, body); // honest: we don't know
if (!check(raw)) throw new ApiDriftError(endpoint, raw); // one check, at the door
return raw; // narrowed — everything downstream is genuinely typed
```

That's ts#13's boundary pattern: `unknown` says "unverified", the guard converts it into knowledge, and the whole app inside the boundary gets to be simply, truthfully typed.

## 3. Walking through the original code

The wrapper:

```ts
export async function api(path: string, init?: { method: string; body: string }): Promise<any> {
  return transport(path, init);
}
```

`path: string` accepts any string, including typos. `Promise<any>` means the result infects whatever it touches (ts#01).

Call site 1 looks fine, and is:

```ts
const todos = (await api('/todos')) as Todo[];
return todos.map((todo) => todo.title);
```

Call site 2 is identical — and broken, because the server changed underneath it:

```ts
return todos.filter((todo) => !todo.done).length;
```

`transport` now returns `{ id, title, completed }`. `todo.done` is `undefined`, `!undefined` is `true`, so *every* todo counts as open. The badge shows "2 open" on a day when everything is finished.

Call site 3 sends the wrong field name:

```ts
body: JSON.stringify({ name: title }), // server wants `title`
```

Nothing type-checks a `string` produced by `JSON.stringify`, so `{ name }` sails out and untitled todos come back.

Call site 4 typos the path:

```ts
const todos = (await api('/todo')) as Todo[];
return todos[0].title;
```

The 404 body `{ error, status }` is not an array, so `todos[0]` is `undefined` and the crash lands far from the typo that caused it.

## 4. What's wrong with it (in beginner terms)

**Bug story — the badge that lied for three sprints.** The "open todos" counter is the app's most-looked-at number, and after the v2 deploy it stopped moving. No error, no alert, no failing test (the tests mock `api`, and the mocks were written against v1). Support eventually noticed. Total time from deploy to diagnosis: three weeks. Total size of the fix: one word, `done` → `completed`. Total number of places the compiler *could* have caught it: zero, because `as Todo[]` told it to stop looking.

**Why `as` is the villain again (ts#14).** `as` doesn't check anything — it overrides. Written at a boundary, it converts "I have no idea what this is" into "this is definitely a `Todo[]`", and everything downstream reasons confidently from a false premise. The bigger the app, the further the falsehood travels.

**Why four call sites is the real problem.** Even if you fix `openCount`, the other three casts still encode v1. The knowledge is *duplicated* — that's the actual defect. There should be exactly one place that says what `GET /todos` returns.

## 5. Try it yourself first!

1. **Vague hint:** the type of the response depends on the path. That means the path must be more specific than `string` — what kind of type describes "one of these exact strings"? (ts#06.)
2. **Warmer:** write an `interface Endpoints` whose keys are `'GET /todos'`, `'GET /me'`, `'POST /todos'`, `'PATCH /todos/done'` and whose values are `{ res: ... }` objects, plus `body:` where a request body is required.
3. **Warmer still:** give `api` a type parameter `K extends keyof Endpoints`, take the endpoint as the first argument, and return `Promise<Endpoints[K]['res']>`. Check that `api('GET /todos')` now infers `Todo[]` with no cast.
4. **The body:** make the second argument required for `POST`/`PATCH` and forbidden for `GET`. You need a conditional type producing a tuple — `Endpoints[K] extends { body: infer B } ? [body: B] : []` — used as a rest parameter.
5. **The boundary:** have your fake transport return `unknown`, then add a `guards` table typed `{ [K in Endpoint]: (value: unknown) => value is Res<K> }` and throw a named error when the check fails. Now `openCount`'s bug becomes a loud `ApiDriftError` instead of a wrong number.
6. **Prove it:** write `@ts-expect-error` tests for the typo'd path, the `{ name }` body, the missing body, and reading `.completed` off a `Todo`.

## 6. Understanding the refactored solution

The contract, once:

```ts
export interface Endpoints {
  'GET /todos': { res: Todo[] };
  'GET /me': { res: User };
  'POST /todos': { body: NewTodo; res: Todo };
  'PATCH /todos/done': { body: { id: number; done: boolean }; res: Todo };
}
```

Putting the method *in the key* is a small decision with a big payoff: `'POST /me'` doesn't exist, so calling it is a compile error rather than a 405 at runtime.

The one function:

```ts
export async function api<K extends Endpoint>(endpoint: K, ...args: Args<K>): Promise<Res<K>> {
  const [body] = args as [unknown?];
  const raw: unknown = await transport(endpoint, body);
  const check = guards[endpoint] as (value: unknown) => value is Res<K>;
  if (!check(raw)) throw new ApiDriftError(endpoint, raw);
  return raw;
}
```

Two casts, both contained and both explained in the file's comments. `args as [unknown?]` unpacks a tuple the compiler already validated at the call site. `guards[endpoint] as ...` exists because TypeScript can't prove a lookup through a generic key stays correlated with `K` — the correlation is real, it just isn't checkable. This is the same honest trade ts#20 makes inside its emitter: unsafety **sealed inside** a wrapper whose every public signature is fully checked.

The call sites shed their casts entirely:

```ts
const todos = await api('GET /todos'); // Todo[]
const created = await api('POST /todos', { title }); // body checked, result Todo
```

And the failure mode changed shape. If the server renames `done` again, the guard rejects the payload *at the boundary* and throws `ApiDriftError` naming the endpoint and attaching the received value — a bug report that writes itself, delivered at the moment of the deploy rather than three sprints later.

The nine type tests are the regression suite. They're not decoration: `tsc` errors on an *unused* `@ts-expect-error`, so if a future edit accidentally makes `api('GET /todo')` legal again, the build fails.

## 7. Words you learned (glossary)

- **Endpoint map** — an interface mapping `'METHOD /path'` keys to `{ body, res }` shapes; the client's copy of the server contract.
- **Indexed access type (`T[K]`)** — the type of a property, looked up by key.
- **Generic key parameter (`K extends keyof T`)** — a type parameter inferred from the literal key passed in, letting the return type vary per call.
- **Conditional type (`A extends B ? X : Y`)** — a type-level `if` (ts#27).
- **`infer`** — captures a piece of a matched type inside a conditional (ts#28).
- **Tuple rest parameter (`...args: Args<K>`)** — types the remaining arguments exactly, including how many there are.
- **Labelled tuple element (`[body: B]`)** — a name shown in tooltips and errors; no runtime meaning.
- **Mapped type (`{ [K in Endpoint]: ... }`)** — builds an object type by walking a union of keys (ts#25).
- **Type guard (`value is T`)** — a function whose `true` result narrows a value's type (ts#11).
- **Boundary validation** — checking data once where it enters the program, so everything inside can be typed honestly (ts#13, ts#34).
- **API drift** — the server's shape changing while the client's types stay put.
- **Source of truth** — the single definition every other place derives from, instead of duplicating.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the repo root after each change, then undo it.

1. Add `'DELETE /todos/:id': { res: { deleted: boolean } };` to `Endpoints` and nothing else. **Expected:** ❌ error on the `guards` object — "Property `'DELETE /todos/:id'` is missing". The mapped type turned "remember to add a validator" into a compiler-guided checklist.
2. Change `Todo`'s `done` to `completed` in the refactored file. **Expected:** ❌ errors in `openCount` *and* in the `PATCH` body type *and* an unused-`@ts-expect-error` on the `.completed` test — the model change propagates everywhere the contract is used, immediately.
3. Replace the conditional `Args<K>` with a plain `[body?: unknown]`. **Expected:** the "POST without a body" and "GET with a body" type tests both report "Unused '@ts-expect-error'". The conditional tuple was doing real work.
4. Change `api`'s first parameter from `endpoint: K` to `endpoint: string`. **Expected:** several errors at once, since `K` can no longer be inferred — a good demonstration that the *literal* argument is what powers the whole design.
5. Remove the `if (!check(raw)) throw ...` line and return `raw as Res<K>`. **Expected:** ✅ still compiles — and you're back to the original's fiction with extra steps. Proof that the *types* and the *runtime check* are two separate guarantees and you need both.
6. Hover `api('POST /todos', { title: 'x' })` in your editor and read the inferred type; then hover `api('GET /me')`. **Expected:** `Promise<Todo>` and `Promise<User>` from one function. Try adding a third argument to either call to see the tuple arity error.
