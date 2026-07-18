// `extends` on a type parameter = requirements for T. The generic
// stays generic — any T qualifies — but only if it brings what the
// body actually uses. No casts; the constraint IS the permission.

/** T must have a length. Strings, arrays, anything measured — but
 *  measured is now the entry requirement: */
export function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b; // .length: allowed, because required
}

export const l1 = longest('hello', 'hi');   // 'hello', typed string
export const l2 = longest([1, 2, 3], [1]);  // number[], preserved

/** Entities must actually BE entities: */
export interface Entity {
  id: number;
  name: string;
}

export function describeEntity<T extends Entity>(entity: T): string {
  return `#${entity.id}: ${entity.name}`; // plain access — required, present
}

export const d1 = describeEntity({ id: 1, name: 'Ada' });

// WHY generic at all, instead of (entity: Entity)? Because T SURVIVES:
export function tagEntity<T extends Entity>(entity: T): T & { tagged: true } {
  return { ...entity, tagged: true };
}

const admin = { id: 1, name: 'Ada', role: 'admin' };
export const taggedAdmin = tagEntity(admin);
export const role = taggedAdmin.role; // 'role' SURVIVED — an Entity-typed
// parameter would have forgotten it. Constraint = requirement;
// generic = memory. You often want both.

// ==== type tests ==================================================
// @ts-expect-error — numbers have no length: the wrong-answer call now fails
longest(42, 7);

// @ts-expect-error — Dates aren't Entities: the "#undefined" call now fails
describeEntity(new Date());

// @ts-expect-error — the requirement is structural and real
describeEntity({ id: 1 }); // name missing
