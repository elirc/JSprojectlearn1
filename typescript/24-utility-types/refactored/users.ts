// The variations, DERIVED instead of copied. One source of truth
// (User); every shadow is a formula over it, so shadows update
// themselves when User changes — and each formula RECORDS THE
// INTENT the hand-copies lost.

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'member';
  createdAt: Date;
}

// "everything optional, for PATCH" — Partial says exactly that:
export type UserUpdate = Partial<User>;
// (createdAt is included automatically — the original's forgotten field)

// "just these fields, for the public API" — Pick names the intent:
export type PublicUser = Pick<User, 'id' | 'username' | 'role'>;
// (and 'rol' could never happen: Pick's keys are CHECKED against User)

// "everything except server-assigned fields, for creation" — Omit:
export type NewUser = Omit<User, 'id' | 'createdAt'>;
// (the hand-copy couldn't say WHY createdAt was absent; Omit does)

// "usernames by id" — Record, from ts#06, completing the set:
export type UserIndex = Record<number, string>;

// They compose, because they're just types:
export type PublicUserUpdate = Partial<Pick<User, 'username' | 'role'>>;

// ---- usage --------------------------------------------------------
export function applyUpdate(user: User, update: UserUpdate): User {
  return { ...user, ...update };
}

export function toPublic(user: User): PublicUser {
  return { id: user.id, username: user.username, role: user.role };
}

export function createUser(input: NewUser): User {
  return { ...input, id: Date.now(), createdAt: new Date() };
}

const ada: User = {
  id: 1, username: 'ada', email: 'ada@engine.dev',
  role: 'admin', createdAt: new Date('2026-01-01'),
};

export const patched = applyUpdate(ada, { username: 'ada_l' });
export const pub = toPublic(ada);

// ==== type tests ==================================================
// @ts-expect-error — Pick's keys are checked: the copy-typo can't exist
export type Typo = Pick<User, 'rol'>;

// @ts-expect-error — NewUser must not include server-assigned id
export const sneakyId: NewUser = { username: 'x', email: 'x@x', role: 'member', id: 99 };

// @ts-expect-error — PublicUser excludes email: leaks are compile errors
export const leak: PublicUser = { id: 1, username: 'ada', role: 'admin', email: 'a@b' };

// @ts-expect-error — updates may only touch real User fields
export const ghost: UserUpdate = { usrename: 'typo' };
