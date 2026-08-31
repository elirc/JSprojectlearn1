# 🏋️ Practice: Generic LRU Cache

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}`) and run `npm run typecheck` from the `typescript/` folder. Several exercises reuse the finished class: `import { LruCache } from './refactored/lru-cache.js';`.

## Exercises

### ⭐ 1. An undo stack that admits it can be empty (warm-up)

A drawing app needs `UndoStack<T>`: `push(item: T)`, `pop()` returning the most recent item, and a `depth` getter. Build it over a private `#items: T[]`. The whole point is `pop`'s return type — an empty stack has nothing to give back, so say so in the signature rather than letting callers find out at runtime.

**Practices:** declaring type parameters once on a class and sharing them across methods, plus the honest maybe-return.
**Hint:** `Array.prototype.pop()` is already typed `T | undefined` — let that type flow straight out of your method.
**Check:** `new UndoStack<Stroke>()` must reject `push('pen')`, and reading `.tool` off the result of `pop()` must error with roughly `'undone' is possibly 'undefined'`. Add a `@ts-expect-error` over each.

### ⭐⭐ 2. A cache whose storage is not what it hands back (core)

Build `TtlCache<K, V>` — entries expire instead of being evicted by recency. `set(key: K, value: V, expiresAt: number)` and `get(key: K, now: number): V | undefined`, where a `get` past the expiry deletes the entry and reports a miss. The twist: internally you must store a wrapper (`{ value, expiresAt }`), so the Map's value type is *not* `V`. Callers must never see that wrapper.

**Practices:** composing an internal type over a type parameter while keeping the public signature in terms of `V`.
**Hint:** declare `interface TtlEntry<V> { value: V; expiresAt: number }` and type the field `Map<K, TtlEntry<V>>`.
**Check:** on a `TtlCache<string, string>`, `set('session-2', 42, ...)` must error, and `const raw: string = tokens.get('session-1', 0)` must error with roughly `Type 'string | undefined' is not assignable to type 'string'`.

### ⭐⭐ 3. A method with a type parameter of its own (core)

Subclass the shipped cache: `class DefaultingCache<K, V> extends LruCache<K, V>` with one new method, `getOr<D>(key: K, fallback: D): V | D`. Note that `D` belongs to the *method*, not the class — each call picks it fresh from whatever fallback is passed. This is how a caller trades the `| undefined` for a default of their own choosing.

**Practices:** passing class type parameters through `extends`, and introducing a method-level parameter alongside them.
**Hint:** call `this.get(key)`, then `hit === undefined ? fallback : hit` — the narrowing does the rest.
**Check:** `users.getOr(7, anonymousUser)` must be plain `User`, so `.name` compiles with no narrowing; `users.getOr(999, null)` must be `User | null`, so `.name` on *that* errors. A `@ts-expect-error` on `users.getOr('7', anonymousUser)` must fire.

### ⭐⭐ 4. Type an untyped registry (core)

Here is a plugin registry someone wrote in plain JS. Retype it as `Registry<T>` so that one registry holds one kind of thing:

```js
class Registry {
  factories = new Map();
  register(name, factory) { this.factories.set(name, factory); }
  create(name) { const f = this.factories.get(name); return f ? f() : undefined; }
  get names() { return [...this.factories.keys()]; }
}
```

The stored values are not `T` — they are *functions returning* `T`, which is exactly the sort of detail `Map<any, any>` throws away.

**Practices:** reading an untyped container and recovering the type parameter it was always implicitly using.
**Hint:** the field is `Map<string, () => T>`; `create` still has to report the miss.
**Check:** on a `Registry<Shape>`, `register('broken', () => 'circle')` must error with roughly `Type 'string' is not assignable to type 'Shape'`, and calling `.area()` on the result of `create` without narrowing must error.

### ⭐⭐⭐ 5. Memoize, capped by the typed cache (challenge)

The README promises this one writes itself now. Build `memoize<A extends unknown[], R>(fn: (...args: A) => R, capacity?: number): (...args: A) => R`, backed by an `LruCache<string, R>` keyed on `JSON.stringify(args)`. The returned function must have *exactly* the signature of the one passed in — that is the whole test. You will need one contained `!`, justified the same way the class justifies its own.

**Practices:** using a generic class inside a generic function, and capturing a whole parameter list in one type parameter.
**Hint:** `if (cache.has(key)) return cache.get(key)!;` — the `has` check on the line above is what earns the `!`.
**Check:** `memoize((a: number, b: number) => a + b)` must produce something callable as `(2, 3)` and assignable to `number`; add a `@ts-expect-error` proving `fastAdd('2', 3)` is rejected.

### ⭐⭐⭐ 6. When is a bare `V` honest? (challenge)

Every read so far returned `V | undefined`. Build `ReadThroughCache<K, V>` whose `get(key: K)` returns plain `V` — no `undefined` — because the constructor takes a loader, `(key: K) => V`, and a miss simply loads and stores the value instead of reporting failure. Wrap an `LruCache<K, V>` in a private field rather than subclassing. The lesson is that `| undefined` is not a ritual: it belongs in the signature exactly when the miss is real, and disappears when the class genuinely removes it.

**Practices:** composing generic classes, and choosing a return type from what the implementation actually guarantees.
**Hint:** `const hit = this.#cache.get(key); if (hit !== undefined) return hit;` then load, store, and return.
**Check:** `profiles.get(7).handle.toUpperCase()` must compile with zero narrowing. Add `@ts-expect-error` tests for assigning a `ReadThroughCache<number, Profile>` to a `ReadThroughCache<string, Profile>`, and for a loader returning a string instead of a `Profile`.

## Solutions

### Solution 1

```ts
class UndoStack<T> {
  #items: T[] = [];
  push(item: T): void { this.#items.push(item); }
  pop(): T | undefined { return this.#items.pop(); }
  get depth(): number { return this.#items.length; }
}

interface Stroke { tool: 'pen' | 'eraser'; points: number[] }
const strokes = new UndoStack<Stroke>();
strokes.push({ tool: 'pen', points: [0, 0, 4, 9] });

// @ts-expect-error — this stack holds Strokes, not strings
strokes.push('pen');

const undone = strokes.pop(); // Stroke | undefined
// @ts-expect-error — the empty-stack case is in the type
export const careless = undone.tool;
export const safe = undone === undefined ? 'nothing to undo' : undone.tool;
```

WHY: `T` is declared once on the class and every method spends it — `push` accepts it, `pop` returns it, and the instance binds it at `new`. `pop(): T | undefined` is the same honesty `get` shows in the refactor: an empty stack is a real state, so it lives in the type rather than in a comment. Note `depth` is a getter, read as `strokes.depth` with no parentheses.

### Solution 2

```ts
interface TtlEntry<V> { value: V; expiresAt: number }

class TtlCache<K, V> {
  #entries = new Map<K, TtlEntry<V>>();
  set(key: K, value: V, expiresAt: number): void {
    this.#entries.set(key, { value, expiresAt });
  }
  get(key: K, now: number): V | undefined {
    const entry = this.#entries.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt <= now) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }
}

const tokens = new TtlCache<string, string>();
tokens.set('session-1', 'abc123', 1_700_000_000);

const token = tokens.get('session-1', 1_699_999_000); // string | undefined
export const header = token === undefined ? '' : `Bearer ${token.toUpperCase()}`;

// @ts-expect-error — a number is not a token string
tokens.set('session-2', 42, 1_700_000_000);

// @ts-expect-error — get can miss, so the result is not plainly a string
export const raw: string = tokens.get('session-1', 0);
```

WHY: the storage type and the interface type are allowed to differ, and generics let you say so precisely — `TtlEntry<V>` is built *from* the parameter without becoming part of the promise. Two independent miss reasons (absent, expired) collapse into the single honest `V | undefined`, so callers write one check instead of guessing. And because the wrapper never appears in a signature, you could switch to a two-Map layout tomorrow without touching a single call site.

### Solution 3

```ts
import { LruCache } from './refactored/lru-cache.js';

class DefaultingCache<K, V> extends LruCache<K, V> {
  getOr<D>(key: K, fallback: D): V | D {
    const hit = this.get(key);
    return hit === undefined ? fallback : hit;
  }
}

interface User { id: number; name: string }
const users = new DefaultingCache<number, User>(50);
users.set(7, { id: 7, name: 'Ada' });
const anonymous: User = { id: 0, name: 'anonymous' };
const who = users.getOr(7, anonymous); // User — D collapses into V
export const shout = who.name.toUpperCase();

const maybe = users.getOr(999, null); // User | null
// @ts-expect-error — null is still in the type; narrow first
export const oops = maybe.name;

// @ts-expect-error — string keys don't fit a number-keyed cache
users.getOr('7', anonymous);
```

WHY: `K` and `V` are fixed for the life of the instance, but `D` is chosen anew at each call — that is the difference between a class parameter and a method parameter. The return type `V | D` then tells the exact truth per call site: pass a `User` and the union collapses to `User` so no narrowing is needed; pass `null` and the compiler still makes you handle it. One method, two different contracts, both checked.

### Solution 4

```ts
class Registry<T> {
  #factories = new Map<string, () => T>();
  register(name: string, factory: () => T): void {
    this.#factories.set(name, factory);
  }
  create(name: string): T | undefined {
    const factory = this.#factories.get(name);
    return factory === undefined ? undefined : factory();
  }
  get names(): string[] { return [...this.#factories.keys()]; }
}

interface Shape { kind: string; area(): number }
const shapes = new Registry<Shape>();
shapes.register('circle', () => ({ kind: 'circle', area: () => Math.PI }));

// @ts-expect-error — the factory must produce a Shape, not a string
shapes.register('broken', () => 'circle');
const shape = shapes.create('circle');
// @ts-expect-error — create() can miss; narrow before use
export const area = shape.area();
```

WHY: the untyped version had a type parameter all along — nobody wrote it down. Naming it `T` lets one line, `Map<string, () => T>`, enforce the rule that mattered: registered factories must *produce* the registry's own element type, so `() => 'circle'` is caught at the `register` call rather than wherever `create` is eventually used. Note the keys stay plain `string` here; only the payload is generic, because only the payload varies per registry.

### Solution 5

```ts
import { LruCache } from './refactored/lru-cache.js';

function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  capacity = 100,
): (...args: A) => R {
  const cache = new LruCache<string, R>(capacity);
  return (...args: A): R => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!; // contained ! — guarded by has()
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

const fastAdd = memoize((a: number, b: number): number => a + b);
export const sum: number = fastAdd(2, 3);

// @ts-expect-error — the memoized function keeps the original signature
fastAdd('2', 3);
```

WHY: `A extends unknown[]` captures an entire parameter list as one type parameter, so `(...args: A) => R` in and `(...args: A) => R` out is a literal statement that memoizing changes nothing a caller can observe. Inside, `LruCache<string, R>` binds the cache to the function's own return type — an unbounded `Map` would have grown forever, and a `Map<any, any>` would have handed back `any`, quietly re-opening every hole this exercise closed. The `!` is legitimate for the same reason it is inside the class: the `has` check sits on the same line, auditable at a glance.

### Solution 6

```ts
import { LruCache } from './refactored/lru-cache.js';

class ReadThroughCache<K, V> {
  #cache: LruCache<K, V>;
  #load: (key: K) => V;
  constructor(capacity: number, load: (key: K) => V) {
    this.#cache = new LruCache<K, V>(capacity);
    this.#load = load;
  }
  get(key: K): V {
    const hit = this.#cache.get(key);
    if (hit !== undefined) return hit;
    const fresh = this.#load(key);
    this.#cache.set(key, fresh);
    return fresh;
  }
}

interface Profile { id: number; handle: string }
const profiles = new ReadThroughCache<number, Profile>(20, (id) => ({ id, handle: `user${id}` }));

export const handle = profiles.get(7).handle.toUpperCase(); // no narrowing needed

// @ts-expect-error — a number-keyed cache is not a string-keyed one
export const crossed: ReadThroughCache<string, Profile> = profiles;

// @ts-expect-error — the loader must return the value type the cache promises
export const broken = new ReadThroughCache<number, Profile>(5, (id) => `user${id}`);
```

WHY: `V | undefined` was never a rule about caches, it was a description of what `LruCache.get` can actually do. Here the class can always produce a value, so returning bare `V` is the honest signature — and callers are spared a check that could never fail. The `#load` field is typed `(key: K) => V`, which is what rejects the string-returning loader at construction, and the same `K` threading through both the wrapped cache and the loader is what makes the two instances incompatible.
