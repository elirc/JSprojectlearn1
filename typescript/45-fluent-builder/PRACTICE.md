# 🏋️ Practice: Fluent Builder

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a COPY of `refactored/query.ts` (so `Part`, `Query` and `query()` are already there), or in a scratch `.ts` file inside the `typescript/` folder ending in `export {}`. Then run `npm run typecheck` from the repo root.

## Exercises

### ⭐ 1. `count()` — a second terminal with a weaker gate (warm-up)

`SELECT COUNT(*) FROM users` needs a table but no columns. Add a `count()` method to `Query` that can be called as soon as `.from()` has run, whether or not `.select()` has.

**Practices:** `this` parameters as *per-method* requirements — two terminals on one class, each with its own gate.
**Hint:** `count(this: Query<'table'>): string`. Nothing else changes: a `Query<'table' | 'columns'>` is assignable to `Query<'table'>` (LEARN 2.6), so "more than enough" is automatically fine.
**Check:** `query().from('users').count()` compiles; `query().from('users').select('id').count()` also compiles; `query().select('id').count()` errors ("The 'this' context of type 'Query<\"columns\">' is not assignable to method's 'this' of type 'Query<\"table\">'"); `query().count()` errors.

### ⭐⭐ 2. A request builder, from scratch (core)

Build the same pattern in a new domain. `request()` should chain `.url(...)`, `.method(...)`, `.header(name, value)`, `.json(payload)` and `.send()`, where **url and method are required** and headers/body are optional.

**Practices:** the whole recipe once, without a reference to copy line-by-line — the phantom, the flag unions, the gate.
**Hint:** `type Piece = 'url' | 'method'`, `class RequestBuilder<Have extends Piece = never>`, phantom `declare private readonly have: Record<Have, true>`, required steps return `RequestBuilder<Have | 'url'>` etc., optional steps return `RequestBuilder<Have>`, and `send(this: RequestBuilder<'url' | 'method'>)`.
**Check:** both orders compile (`.url().method()` and `.method().url()`), optional steps can go anywhere, and all three of `request().url('/users').send()`, `request().method('GET').send()`, `request().send()` must error. If any of them compiles, you forgot the phantom — check LEARN 2.4.

### ⭐⭐ 3. `Ready` — the finished builder as a *parameter* type (core)

So far the gate has only appeared on a receiver. Write `type Ready = ...` for "a fully configured query" and a function `run(finished: Ready): string` that calls `.build()` on it. Then prove a half-built query can't be passed in.

**Practices:** the state type used as an ordinary parameter type — the same protection, away from the chain.
**Hint:** `type Ready = Query<'table' | 'columns'>`, and inside `run` the call `finished.build()` just works, because `finished` already satisfies `build`'s `this`.
**Check:** `run(query().from('users').select('id'))` compiles; `run(query().from('users'))` errors with "Argument of type 'Query<\"table\">' is not assignable to parameter of type 'Ready'. Types of property 'have' are incompatible. Property 'columns' is missing…" — that's the phantom talking, and it's worth reading the whole message once. `run(query())` errors too.

### ⭐⭐⭐ 4. Track the *columns*, not just "some columns" (challenge)

Real typed query builders (Kysely, Drizzle) tell you the shape of the rows you'll get back. Add a second type parameter that accumulates the selected column *names*, and make `build()` return `Record<Cols, unknown>[]` so `rows[0].id` compiles and `rows[0].email` doesn't.

**Practices:** two type parameters advancing independently; capturing literal arguments in a rest parameter.
**Hint:** `class Typed<Have extends Part = never, Cols extends string = never>` with a second phantom for `Cols`. The signature that does the work is `select<C extends string>(...columns: C[]): Typed<Have | 'columns', Cols | C>` — `C` is inferred as the union of the literals you passed. You'll need `as unknown as` on that return (two parameters changing at once is past what a plain `as` will accept).
**Check:** `Expect<Equal<typeof rows, Record<'id' | 'name', unknown>[]>>` compiles after `.select('id', 'name')`, `rows[0]!.id` compiles, and `rows[0]!.email` errors.

### ⭐⭐⭐ 5. Flip it: track what's *left to do* (challenge)

Rewrite the tracker so the type parameter holds the steps **remaining** instead of the steps completed: `class Todo<Left extends Part = Part>`, `from()` returns `Todo<Exclude<Left, 'table'>>`, and `build(this: Todo<never>)`. Getting the transitions right takes a minute; getting the *phantom* right is the exercise.

**Practices:** variance — reasoning about which direction assignability must run, and choosing a phantom that produces it.
**Hint:** with `Record<Left, true>` as the phantom, `Todo<never>` has phantom `{}` and **everything** is assignable to `{}`, so `build` would accept a builder with steps outstanding — the protection runs backwards. You need `Todo<A>` assignable to `Todo<B>` only when `A` is a *subset* of `B`, so put the record in a **parameter** position, where contravariance flips the direction: `declare private readonly left: (probe: Record<Left, true>) => void`.
**Check:** both orders of `.from()`/`.select()` then `.build()` compile; each of `new Todo().from('users').build()`, `new Todo().select('id').build()` and `new Todo().build()` errors. Then swap the phantom back to `Record<Left, true>` and watch all three `@ts-expect-error` tests report "Unused" — that's variance, felt.

## Solutions

### 1. `count()`

```ts
count(this: Query<'table'>): string {
  const where = this.conditions.length > 0 ? ` WHERE ${this.conditions.join(' AND ')}` : '';
  return `SELECT COUNT(*) FROM ${this.table}${where}`;
}

query().from('users').count();
query().from('users').select('id').count(); // more than enough is still fine
// @ts-expect-error — count() still needs a table
query().select('id').count();
// @ts-expect-error — and a fresh builder has nothing to count
query().count();
```

**WHY:** a `this` parameter is per-method, so one class can expose several terminals with different requirements — which is exactly how real builders work (`.count()`, `.first()`, `.exists()` all need different amounts of setup). The second line is the interesting one: `Query<'table' | 'columns'>` is assignable to `Query<'table'>` because its phantom `{ table: true; columns: true }` has everything `{ table: true }` asks for. "At least this much" falls out of structural typing for free; you never write a subset check.

### 2. A request builder

```ts
type Piece = 'url' | 'method';

class RequestBuilder<Have extends Piece = never> {
  declare private readonly have: Record<Have, true>;
  private endpoint = '';
  private verb = 'GET';
  private headers: Record<string, string> = {};
  private body: string | null = null;

  url(endpoint: string): RequestBuilder<Have | 'url'> {
    this.endpoint = endpoint;
    return this as RequestBuilder<Have | 'url'>;
  }
  method(verb: string): RequestBuilder<Have | 'method'> {
    this.verb = verb;
    return this as RequestBuilder<Have | 'method'>;
  }
  header(name: string, value: string): RequestBuilder<Have> {
    this.headers[name] = value;
    return this;
  }
  json(payload: unknown): RequestBuilder<Have> {
    this.body = JSON.stringify(payload);
    return this;
  }
  send(this: RequestBuilder<'url' | 'method'>): string {
    return `${this.verb} ${this.endpoint} ${this.body ?? ''}`.trim();
  }
}
function request(): RequestBuilder { return new RequestBuilder(); }

request().url('/users').method('POST').json({ name: 'Ada' }).send();
request().method('GET').url('/users').header('accept', 'application/json').send();
// @ts-expect-error — no method
request().url('/users').send();
// @ts-expect-error — no url
request().method('GET').send();
// @ts-expect-error — nothing at all
request().send();
```

**WHY:** identical skeleton, different nouns — which is the point of doing it twice. Four things carry the whole pattern: the union of step names, the phantom that makes the parameter comparable, `Have | 'x'` on required steps versus bare `Have` on optional ones, and the `this` gate on the terminal. Note how naturally `.header()` and `.json()` slot in anywhere: because they return `RequestBuilder<Have>`, they're invisible to the state machine, which is exactly right for steps that gate nothing.

### 3. `Ready`

```ts
type Ready = Query<'table' | 'columns'>;

function run(finished: Ready): string {
  return finished.build();
}
run(query().from('users').select('id'));
// @ts-expect-error — a half-built query is not Ready
run(query().from('users'));
// @ts-expect-error — nor is a fresh one
run(query());
```

**WHY:** the state isn't a property of the *chain*, it's a property of the *value* — so it travels. A builder can be returned from a factory, stored in a variable, passed to another module, and its type still says how far along it is. That's what makes this pattern useful beyond one-expression chains: `function makeBase(): Query<'columns'>` documents in its signature that the caller still owes a `.from()`, and the compiler holds them to it. Naming the finished state (`Ready`) is worth doing as soon as it appears in more than one signature.

### 4. Tracking the columns

```ts
class Typed<Have extends Part = never, Cols extends string = never> {
  declare private readonly have: Record<Have, true>;
  declare private readonly cols: Record<Cols, true>;
  private table = '';
  private columns: string[] = [];

  from(table: string): Typed<Have | 'table', Cols> {
    this.table = table;
    return this as Typed<Have | 'table', Cols>;
  }
  select<C extends string>(...columns: C[]): Typed<Have | 'columns', Cols | C> {
    this.columns.push(...columns);
    return this as unknown as Typed<Have | 'columns', Cols | C>;
  }
  build(this: Typed<'table' | 'columns', Cols>): Record<Cols, unknown>[] {
    return [];
  }
}

const rows = new Typed().from('users').select('id', 'name').build();
type _c1 = Expect<Equal<typeof rows, Record<'id' | 'name', unknown>[]>>;
const first = rows[0]!;
first.id;
first.name;
// @ts-expect-error — 'email' was never selected
first.email;
```

**WHY:** `select<C extends string>(...columns: C[])` is the load-bearing line. Because `C` is a constrained type parameter rather than an annotation, the literals `'id'` and `'name'` survive instead of widening to `string` (ts#31), and a rest parameter infers `C` as the *union* of everything passed. From there it's the same union-accumulation as `Have`, in a second slot. Note `build`'s `this: Typed<'table' | 'columns', Cols>` — it pins the flags but leaves `Cols` free, so the gate doesn't accidentally demand particular columns. This is a small version of what a real typed SQL builder does; the next step (mapping column names to their *types* from a table schema) is ts#43's `Infer` living in the same class.

### 5. Steps remaining

```ts
class Todo<Left extends Part = Part> {
  declare private readonly left: (probe: Record<Left, true>) => void;
  private table = '';
  private columns: string[] = [];

  from(table: string): Todo<Exclude<Left, 'table'>> {
    this.table = table;
    return this as unknown as Todo<Exclude<Left, 'table'>>;
  }
  select(...columns: string[]): Todo<Exclude<Left, 'columns'>> {
    this.columns.push(...columns);
    return this as unknown as Todo<Exclude<Left, 'columns'>>;
  }
  build(this: Todo<never>): string {
    return `SELECT ${this.columns.join(', ')} FROM ${this.table}`;
  }
}

new Todo().from('users').select('id').build();
new Todo().select('id').from('users').build();
// @ts-expect-error — 'columns' is still on the to-do list
new Todo().from('users').build();
// @ts-expect-error — 'table' is still on the to-do list
new Todo().select('id').build();
// @ts-expect-error — everything is still on the to-do list
new Todo().build();
```

**WHY:** the transitions are the easy half — start with everything (`Left = Part`), `Exclude` each step as it's done, finish at `never`. The phantom is the lesson. "Completed" and "remaining" need *opposite* assignability: with completed flags we want "has at least these", which `Record<Have, true>` in a normal (covariant) property gives; with remaining steps we want "has at most these", and no covariant property produces that — `Record<never, true>` is `{}`, and everything is assignable to `{}`, so `build` would accept anything. Moving the record into a **parameter** position makes the comparison run backwards (function parameters are contravariant under `strictFunctionTypes`), which is precisely the flip needed. Same class, same tests, one phantom rewritten: variance is not trivia, it's the thing that decides whether your gate points at the door or at the wall.
