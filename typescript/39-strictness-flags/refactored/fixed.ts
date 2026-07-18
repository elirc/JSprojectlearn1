// The same four functions, written to satisfy the stricter flags —
// and notice: every "appeasement" is a real bug fix, not ceremony.
// This file compiles under BOTH configs; original.ts fails the
// stricter one with exactly four errors. Try it:
//   npx tsc -p typescript/39-strictness-flags/refactored/tsconfig.stricter.json

// ---- 1: indexes have edges ----------------------------------------
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

export function weekdayName(index: number): string {
  const day = WEEKDAYS[index]; // string | undefined under the flag
  if (day === undefined) {
    throw new RangeError(`no weekday at index ${index}`); // js#30: loud
  }
  return day.toUpperCase();
}

// ---- 2: absent and present-undefined are different claims ---------
interface Prefs {
  nickname?: string;
}

export function setNickname(prefs: Prefs, value: string | undefined): Prefs {
  if (value === undefined) {
    const { nickname, ...rest } = prefs; // ACTUALLY absent
    void nickname;
    return rest;
  }
  return { ...prefs, nickname: value };
  // js#25's missing-vs-undefined distinction, now enforced: clearing
  // a pref means REMOVING the key, not writing undefined into it.
}

// ---- 3: every path returns ----------------------------------------
export function gradeFor(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'F'; // the forgotten else was a real case: half the class
}

// ---- 4: fallthrough is explicit or absent --------------------------
export function describeKey(key: string): string {
  switch (key) {
    case 'Enter':
      return 'submit'; // return-per-case: no break to forget
    case 'Escape':
      return 'cancel';
    default:
      return 'other';
  }
}

export const fine = describeKey('Enter'); // 'submit', as intended

// ---- adopting stricter flags on an EXISTING codebase ---------------
// Turning these on in a big project yields hundreds of errors — the
// playbook: enable one flag at a time; fix the genuinely-buggy hits
// first (they're the payoff); for the long tail, fix mechanically or
// scope the flag to new code via project references. The errors are
// a backlog of latent bugs, prioritized for free.
