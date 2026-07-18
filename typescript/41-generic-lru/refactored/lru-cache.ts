// LruCache<K, V> — js#41's class made generic (ts#16 applied to a
// CLASS): each instance declares what it holds, and the compiler
// holds it to that. Runtime body: byte-for-byte js#41.

export class LruCache<K, V> {
  #entries = new Map<K, V>();
  #capacity: number;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(`Capacity must be a positive integer, got ${capacity}`);
    }
    this.#capacity = capacity;
  }

  /** Read AND refresh recency. `V | undefined` keeps the miss honest. */
  get(key: K): V | undefined {
    if (!this.#entries.has(key)) return undefined;
    const value = this.#entries.get(key)!; // one contained ! — guarded by has()
    this.#entries.delete(key);
    this.#entries.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    this.#entries.delete(key);
    this.#entries.set(key, value);
    if (this.#entries.size > this.#capacity) {
      const oldest = this.#entries.keys().next().value as K;
      this.#entries.delete(oldest);
    }
  }

  has(key: K): boolean {
    return this.#entries.has(key);
  }

  get size(): number {
    return this.#entries.size;
  }
}

// ==== usage: each instance knows its own types =====================
interface User { id: number; name: string }

const userCache = new LruCache<number, User>(100);
userCache.set(7, { id: 7, name: 'Ada' });

const user = userCache.get(7); // User | undefined — the miss is in the type
export const shout = user === undefined ? '(miss)' : user.name.toUpperCase();

// a second instance, differently typed, same class:
const slugCache = new LruCache<string, string>(50);
slugCache.set('hello-world', 'Hello World!');

// ==== type tests: the original's confusions, now rejected =========
// @ts-expect-error — string keys can't enter a number-keyed cache
userCache.set('7', 'seven');

// @ts-expect-error — values must be Users, not strings
userCache.set(8, 'eight');

// @ts-expect-error — the miss case must be handled before .name (ts#05)
export const careless = userCache.get(999).name;

// @ts-expect-error — instances don't cross: a slug cache is not a user cache
export const crossed: LruCache<number, User> = slugCache;
