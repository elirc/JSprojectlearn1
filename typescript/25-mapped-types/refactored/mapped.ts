// Mapped types: `{ [K in keyof T]: ... }` is a LOOP over a type's
// keys. Once you can write the loop, you can build the stdlib's
// utilities yourself — and the variations it doesn't ship.

export interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  notifications: boolean;
}

// ==== the stdlib, demystified (write-your-own edition) ============
// Partial: loop over keys, add `?` to each:
export type MyPartial<T> = { [K in keyof T]?: T[K] };

// Readonly: loop, add the modifier:
export type MyReadonly<T> = { readonly [K in keyof T]: T[K] };

// Pick: loop over a SUBSET of keys:
export type MyPick<T, K extends keyof T> = { [P in K]: T[P] };

// Modifiers can also be REMOVED with `-`:
export type Editable<T> = { -readonly [K in keyof T]: T[K] };
export type Complete<T> = { [K in keyof T]-?: T[K] };

// ==== the variations the stdlib doesn't ship ======================
// "every value wrapped in a getter" — the loop makes it one line:
export type Getters<T> = { [K in keyof T]: () => T[K] };
export type SettingsGetters = Getters<Settings>;

// "a boolean per key" — the touched-tracker:
export type FlagsOf<T> = { [K in keyof T]: boolean };
export type SettingsTouched = FlagsOf<Settings>;

// "readonly and optional" — compose, don't hand-merge:
export type FrozenDraft = Readonly<Partial<Settings>>;

// ==== proof they work =============================================
export const getters: SettingsGetters = {
  theme: () => 'dark',
  fontSize: () => 16,
  notifications: () => true,
};

export const touched: SettingsTouched = {
  theme: true,
  fontSize: false,
  notifications: false,
};

// mapped types TRACK the source: add `language: string` to Settings
// and getters/touched will both refuse to compile until updated —
// the rot from the original is structurally over.

// ==== type tests ==================================================
// @ts-expect-error — Getters wraps values: a raw number is not () => number
export const rawValue: SettingsGetters = { theme: () => 'dark', fontSize: 16, notifications: () => true };

// @ts-expect-error — FlagsOf covers EVERY key; missing one fails
export const missingFlag: SettingsTouched = { theme: true, fontSize: false };

// @ts-expect-error — MyPartial matches Partial: unknown keys still rejected
export const ghost: MyPartial<Settings> = { fontSze: 12 };

declare const frozen: FrozenDraft;
// @ts-expect-error — FrozenDraft is readonly
frozen.theme = 'light';
