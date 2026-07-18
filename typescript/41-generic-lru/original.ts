// js#41's LRU cache, ported with <any, any> hardwired — one cache
// class, sure, but every cache INSTANCE forgets what it holds.

export class LruCache {
  private entries = new Map<any, any>();

  constructor(private capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(`Capacity must be a positive integer, got ${capacity}`);
    }
  }

  get(key: any): any {
    if (!this.entries.has(key)) return undefined;
    const value = this.entries.get(key);
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(key: any, value: any): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value;
      this.entries.delete(oldest);
    }
  }
}

// One instance caches user objects by numeric id:
interface User { id: number; name: string }
const userCache = new LruCache(100);

userCache.set(7, { id: 7, name: 'Ada' });
userCache.set('7', 'seven');
// ^ a STRING key and a STRING value in the same cache — any accepts
// both, and Map's key honesty (js#41 chose Maps for this!) is gone:
// get(7) and get('7') are now different entries, one holding a User,
// one holding a string.

export const user = userCache.get(7);
export const shout = user.name.toUpperCase(); // works today...
export const boom = userCache.get('7').name.toUpperCase();
// ...crashes: .name of 'seven' is undefined -> .toUpperCase explodes.
// And get() returning any means the miss case (undefined) ALSO hides:
export const missing = userCache.get(999);
export const alsoBoom = missing.name; // undefined.name -> crash. The
// runtime code is js#41's, correct. The types forgot everything the
// JS version's DISCIPLINE remembered.
