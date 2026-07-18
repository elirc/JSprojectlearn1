// A typed storage layer: one REGISTRY of keys (name -> shape),
// generic accessors correlated to it (ts#18/20), and validation on
// every load — because storage is a message from the past, and the
// past ran different code (ts#13 with a time dimension).

import type { Schema } from '../../34-api-boundary/refactored/api.js';
import { objectSchema, isNumber, isString } from '../../34-api-boundary/refactored/api.js';

const memoryStore = new Map<string, string>(); // stand-in for localStorage

// ==== the key registry: every stored shape, declared once ==========
export interface Settings {
  theme: string;
  fontSize: number;
}

export interface LaunchStats {
  count: number;
}

const STORAGE_SCHEMAS = {
  settings: objectSchema<Settings>('Settings', {
    theme: isString,
    fontSize: isNumber,
  }),
  launchStats: objectSchema<LaunchStats>('LaunchStats', {
    count: isNumber,
  }),
} as const;

type StorageKey = keyof typeof STORAGE_SCHEMAS;

// the shape stored under key K, derived from the registry:
type StoredShape<K extends StorageKey> =
  (typeof STORAGE_SCHEMAS)[K] extends Schema<infer T> ? T : never;

// ==== accessors: key-correlated, validated on the way out ==========
export function save<K extends StorageKey>(key: K, value: StoredShape<K>): void {
  memoryStore.set(key, JSON.stringify(value));
}

export function load<K extends StorageKey>(key: K): StoredShape<K> | null {
  const raw = memoryStore.get(key);
  if (raw === undefined) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return null; // corrupted entry: absent, not explosive (react#23)
  }
  // the registry's schema validates what the PAST actually stored:
  return STORAGE_SCHEMAS[key].check(data) ? (data as StoredShape<K>) : null;
}

// ==== usage ========================================================
save('settings', { theme: 'dark', fontSize: 16 });

const settings = load('settings'); // Settings | null — honest
export const size = settings === null ? 16 : settings.fontSize + 2; // 18, real

// v1-stored bare number under a v2 key? The schema check returns
// null instead of serving "launched undefined times":
memoryStore.set('launchStats', '5'); // simulate v1's write
export const stats = load('launchStats'); // null — v1 data fails v2's schema
export const message =
  stats === null ? 'first launch (or old data)' : `launched ${stats.count} times`;

// ==== type tests ==================================================
// @ts-expect-error — unregistered keys don't exist ("settings2" typo included)
load('setings');

// @ts-expect-error — the value must match the KEY's shape (feature B's overwrite)
save('settings', { volume: 0.8 });

// @ts-expect-error — load returns the shape OR null; unchecked access fails
export const careless = load('settings').fontSize;
