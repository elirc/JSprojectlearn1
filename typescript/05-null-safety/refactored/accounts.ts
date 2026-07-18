// Same API — but every "what if it's missing?" gets ANSWERED instead
// of asserted away. Narrowing is the mechanism: inside a checked
// branch, the compiler REMOVES null/undefined from the type.

export interface Account {
  username: string;
  lastLogin: Date | null;
}

const ACCOUNTS: Account[] = [
  { username: 'ada', lastLogin: new Date('2026-07-01') },
  { username: 'grace', lastLogin: null },
];

export function findAccount(username: string): Account | undefined {
  return ACCOUNTS.find((a) => a.username === username);
}

export function lastLoginReport(username: string): string {
  const account = findAccount(username);

  // Answer #1: the guard clause (js#08). After this line, `account`
  // is narrowed from `Account | undefined` to `Account` — hover it.
  if (account === undefined) {
    return `no such user: ${username}`;
  }

  // Answer #2: the two null cases MEAN different things, so they get
  // different messages — the branch the ! was skipping was a real
  // product decision, not ceremony:
  if (account.lastLogin === null) {
    return `${account.username} has never logged in`;
  }

  // Here, account.lastLogin is Date. Plain access, no assertions:
  return `${account.username} last seen ${account.lastLogin.toISOString()}`;
}

// The compact tools for lighter cases (know all three):
export function lastLoginBadge(username: string): string {
  const account = findAccount(username);
  // ?. — optional chaining: undefined-safe access
  // ?? — nullish coalescing: default for null/undefined ONLY
  //      (|| would also override 0 and '' — js#27's falsy trap)
  return account?.lastLogin?.toISOString() ?? 'never';
}

export const reports = [
  lastLoginReport('ada'),
  lastLoginReport('grace'), // "has never logged in" — not a crash
  lastLoginReport('bob'),   // "no such user" — not a crash
];

// ==== type tests ==================================================
declare const maybe: Account | undefined;

// @ts-expect-error — unchecked access doesn't compile (the ! crash, prevented)
export const nope: string = maybe.username;

// @ts-expect-error — even a found account's lastLogin may be null
export const nope2: string = findAccount('ada')?.lastLogin.toISOString() ?? '';
