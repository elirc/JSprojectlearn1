// Find a user, show their last login. strictNullChecks is ON —
// and every one of its warnings was silenced with `!`.

export interface Account {
  username: string;
  lastLogin: Date | null; // null = has never logged in
}

const ACCOUNTS: Account[] = [
  { username: 'ada', lastLogin: new Date('2026-07-01') },
  { username: 'grace', lastLogin: null },
];

export function findAccount(username: string): Account | undefined {
  return ACCOUNTS.find((a) => a.username === username);
}

export function lastLoginReport(username: string): string {
  const account = findAccount(username)!;
  //                                    ^ "it'll be there" — famous last words.
  // lastLoginReport('bob') crashes here at runtime.

  const when = account.lastLogin!.toISOString();
  //                            ^ "they'll have logged in" — grace hasn't.
  // lastLoginReport('grace') crashes HERE instead.

  return `${account.username} last seen ${when}`;
}

// Both ! marks are load-bearing lies. The compiler asked, twice,
// "what if this is missing?" — and was told, twice, "it won't be."
// It will be. The 'billion-dollar mistake' (null) isn't null's
// existence — it's APIs that let you skip the question.

export const ok = lastLoginReport('ada'); // works, breeding false confidence
// export const boom1 = lastLoginReport('bob');   // TypeError: undefined
// export const boom2 = lastLoginReport('grace'); // TypeError: null
