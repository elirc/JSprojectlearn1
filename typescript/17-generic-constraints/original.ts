// Fresh from learning generics, the author makes EVERYTHING <T>...
// and discovers unconstrained T means "I know NOTHING about it".

// Attempt 1: doesn't compile without a cast — T has no .length:
export function longest<T>(a: T, b: T): T {
  return (a as any).length >= (b as any).length ? a : b;
  //      ^ the fix chosen: any-casts INSIDE the generic. The T on
  //        the outside is a costume; the body is unchecked (ts#01).
}

export const l1 = longest('hello', 'hi');       // 'hello' — works
export const l2 = longest([1, 2, 3], [1]);      // works
export const l3 = longest(42, 7);               // COMPILES. numbers have no
// .length — undefined >= undefined is false, so it returns... 7.
// Wrong answer, quietly, with a generic-looking signature.

// Attempt 2: label maker for entities — same disease:
export function describeEntity<T>(entity: T): string {
  return `#${(entity as any).id}: ${(entity as any).name}`;
}

export const d1 = describeEntity({ id: 1, name: 'Ada' }); // "#1: Ada"
export const d2 = describeEntity(new Date());
// "#undefined: undefined" — Dates have neither, nobody objected.

// The author's conclusion: "generics are just any with extra steps."
// The missing piece: constraints. T can have REQUIREMENTS.
