// A settings panel that reads/writes object properties by NAME —
// with the names typed as `string`, so every access is a gamble.

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

// property access by string key — (as any) to make it compile:
export function getSetting(key: string): any {
  return (profile as any)[key];
}

export function setSetting(key: string, value: any): void {
  (profile as any)[key] = value;
}

// The gambles, all compiling:
export const a = getSetting('username');   // 'ada' — typed any though
export const b = getSetting('usrname');    // undefined — typo, no error
setSetting('fontSize', 'sixteen');          // a STRING into a number field
setSetting('darkMod', true);                // typo CREATES a new field;
                                            // the real darkMode unchanged

export const size: number = getSetting('fontSize');
// after the corruption above, size is the string 'sixteen', typed
// number. Every downstream calculation inherits it (fontSize + 2 =
// 'sixteen2'). The pattern is fine — settings panels, form builders,
// and column pickers all need key-based access. The TYPES are what's
// missing: which keys exist, and which value type each key has.
