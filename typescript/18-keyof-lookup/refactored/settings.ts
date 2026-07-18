// keyof + indexed access: property-by-name, with the compiler
// tracking WHICH name and WHAT that name's value type is.

export interface Profile {
  username: string;
  fontSize: number;
  darkMode: boolean;
}

const profile: Profile = {
  username: 'ada',
  fontSize: 16,
  darkMode: true,
};

/**
 * K is not "a string" — it's ONE OF the keys of Profile
 * ('username' | 'fontSize' | 'darkMode'). And the return type
 * Profile[K] is an INDEXED ACCESS: "the type AT that key".
 * Ask for 'fontSize', get number. Ask for 'darkMode', get boolean.
 * The key and the value type are CORRELATED — that's the trick
 * `string` + `any` could never do.
 */
export function getSetting<K extends keyof Profile>(key: K): Profile[K] {
  return profile[key];
}

export function setSetting<K extends keyof Profile>(key: K, value: Profile[K]): void {
  profile[key] = value;
}

// hover these — each has its OWN correct type:
export const name = getSetting('username');  // string
export const size = getSetting('fontSize');  // number, actually
export const dark = getSetting('darkMode');  // boolean

setSetting('fontSize', 18);      // number into number: fine
setSetting('darkMode', false);   // boolean into boolean: fine

// The same idiom powers js#26's utilities — pluck a column:
export function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const users = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
];
export const ids = pluck(users, 'id');     // number[]
export const names = pluck(users, 'name'); // string[]

// ==== type tests: every gamble from the original, now rejected ====
// @ts-expect-error — 'usrname' is not a key of Profile
getSetting('usrname');

// @ts-expect-error — a string cannot enter the number field
setSetting('fontSize', 'sixteen');

// @ts-expect-error — typo'd keys can't create fields
setSetting('darkMod', true);

// @ts-expect-error — pluck only accepts keys that exist on the items
pluck(users, 'email');
