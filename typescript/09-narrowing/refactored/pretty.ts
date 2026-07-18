// Zero casts. Control-flow narrowing: each RUNTIME check teaches the
// compiler something, and the type shrinks branch by branch. The
// checks that make the code SAFE are the same ones that make it
// TYPE-CHECK — that alignment is the whole point.

export function prettyValue(value: string | number | string[] | null): string {
  // narrowing tool #1: === for null/undefined/literals
  if (value === null) {
    return '(none)';
    // below this line: string | number | string[]
  }

  // narrowing tool #2: typeof for primitives
  if (typeof value === 'string') {
    return value.toUpperCase(); // value: string — plain access
  }
  // below: number | string[]

  if (typeof value === 'number') {
    return value < 0 ? `(${Math.abs(value).toFixed(2)})` : value.toFixed(2);
    // negative numbers get a real answer now — the original's crash
    // case was actually a missing FEATURE (js#05 déjà vu: the
    // "can't happen" input was a requirement in disguise)
  }
  // below: string[] — by elimination. The compiler did the sudoku:
  return value.join(', ');
}

// narrowing tool #3: instanceof, for class instances
export function describeError(err: Error | string): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  return err; // string, by elimination
}

// narrowing tool #4: the `in` operator, for shape unions
interface Cat { meow: () => string }
interface Dog { bark: () => string }

export function speak(pet: Cat | Dog): string {
  if ('meow' in pet) {
    return pet.meow(); // Cat
  }
  return pet.bark(); // Dog
}
// (`in` works, but if you CONTROL these types, a discriminant field
// is sturdier — that's project 10.)

export const shown = [
  prettyValue('hello'),
  prettyValue(3.14159),
  prettyValue(['a', 'b']),
  prettyValue(null), // '(none)' — not a crash
  prettyValue(-5),   // '(5.00)' — not a crash
];

// ==== type tests ==================================================
declare const mixed: string | number;

// @ts-expect-error — no narrowing has happened yet; string methods unavailable
mixed.toUpperCase();
