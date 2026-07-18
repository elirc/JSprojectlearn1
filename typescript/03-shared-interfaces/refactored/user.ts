// ONE named type per concept. Every function signs against the same
// definition, so shapes cannot drift and renames are one edit (plus
// the compiler pointing at every usage that needs updating).

export interface User {
  name: string;
  email: string;
  plan: 'free' | 'pro'; // a literal union, not string — project 06
}

export function greet(user: User): string {
  return `Hi ${user.name} <${user.email}>`;
}

export function initials(user: User): string {
  return user.name
    .split(' ')
    .map((word) => word[0] ?? '')
    .join('');
}

export function canExport(user: User): boolean {
  return user.plan === 'pro';
}

export function mailtoLink(user: User): string {
  return `mailto:${user.email}`;
  // the original's `emial` typo can't happen: the interface is the
  // single spelling authority, and typos against it are errors HERE,
  // in the function — not at some caller's object literal.
}

const ada: User = { name: 'Ada Lovelace', email: 'ada@engine.dev', plan: 'pro' };

export const greeting = greet(ada);
export const canAdaExport = canExport(ada); // no invented call-site data
export const link = mailtoLink(ada);

// ==== type tests ==================================================
// @ts-expect-error — a User without a plan is not a User (no drift)
export const notAUser: User = { name: 'X', email: 'x@x.dev' };

// @ts-expect-error — the typo'd field is rejected at the source
export const typoUser: User = { name: 'X', emial: 'x@x.dev', plan: 'free' };
