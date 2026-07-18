// Utility functions for "first element or null"... one per type.
// js#04 called this copy-paste generalization; here each copy also
// duplicates a TYPE.

export function firstString(items: string[]): string | null {
  return items.length > 0 ? items[0]! : null;
}

export function firstNumber(items: number[]): number | null {
  return items.length > 0 ? items[0]! : null;
}

interface User { name: string }

export function firstUser(items: User[]): User | null {
  return items.length > 0 ? items[0]! : null;
}

// The team's OTHER "fix": one function, any types. Now nothing is
// checked — the return is any, and the epidemic (ts#01) resumes:
export function firstAny(items: any[]): any {
  return items.length > 0 ? items[0] : null;
}

const names = ['ada', 'grace'];
export const upper = firstAny(names).toUpperCase(); // works today...
export const kaboom = firstAny([1, 2]).toUpperCase(); // ...compiles, crashes

// Same story for `pair`:
export function pairStrings(a: string, b: string): string[] { return [a, b]; }
export function pairNumbers(a: number, b: number): number[] { return [a, b]; }
// pairUsers, pairDates, pairAnything — the copies breed on demand.

// The dilemma (ts#14 had one too):
//   duplicate per type -> checked, but N copies that drift
//   any                -> one copy, nothing checked
// Generics are the third option: one copy, fully checked.
