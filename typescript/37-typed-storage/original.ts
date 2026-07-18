// react#23 built usePersistentState; here's its non-React cousin — a
// storage wrapper — typed the lazy way: T in, any out, keys freehand.

const memoryStore = new Map<string, string>(); // stand-in for localStorage

export function save(key: string, value: unknown): void {
  memoryStore.set(key, JSON.stringify(value));
}

export function load(key: string): any {
  const raw = memoryStore.get(key);
  return raw === undefined ? null : JSON.parse(raw);
  // any out: whatever was stored — or whatever was stored by an
  // OLDER VERSION of the app, or by a different feature using the
  // same key. The type is a shrug.
}

// Feature A saves settings:
save('settings', { theme: 'dark', fontSize: 16 });

// Feature B, months later, uses "settings" for ITS settings:
save('settings', { volume: 0.8 });
// same key, different shape — last write wins, silently

// Feature A loads:
export const settings = load('settings');
export const size = settings.fontSize + 2;
// NaN — fontSize is gone (feature B overwrote it). load() said any,
// any said yes, and the corruption travels as a number-typed NaN.

// And the version-drift classic: v1 stored a bare number,
save('launchCount', 5);
// v2 expects an object:
export const launches: { count: number } = load('launchCount');
export const message = `launched ${launches.count} times`;
// "launched undefined times" — v1's data, v2's assumptions, any's
// blessing. Storage is a message from the PAST (or another feature);
// trusting it blindly is ts#13's sin with a time dimension.
