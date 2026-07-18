// js#30 taught error classes and catch-at-the-boundary. This port
// kept the throws and fumbled the catches — because TypeScript
// changed one thing: the caught value isn't what you assume.

export class ValidationError extends Error {
  constructor(message: string, public readonly field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function parseAge(input: string): number {
  const age = Number(input);
  if (!Number.isInteger(age)) {
    throw new ValidationError('Age must be a whole number', 'age');
  }
  return age;
}

export function handleRequest(input: string): string {
  try {
    return `age is ${parseAge(input)}`;
  } catch (err: any) {
    // catch (err: any) — the reflex. And with any, ALL of this
    // compiles:
    return `${err.field}: ${err.message.toUpperCase()}`;
    // Looks fine for ValidationError. But ANYTHING can be thrown in
    // JS — a string, undefined, a DOMException from three libraries
    // down. If err is the string 'boom':
    //   err.field            -> undefined (rendered as "undefined:")
    //   err.message.toUpperCase() -> TypeError INSIDE the catch —
    //   the error handler crashes while handling an error (js#30's
    //   nightmare scenario, typed as any and waved through).
  }
}

// The other fumble: swallowing the unexpected. js#30 said rethrow
// what you can't handle; any-typed catches invite treating every
// error as the one you expected:
export function handleQuietly(input: string): string {
  try {
    return `age is ${parseAge(input)}`;
  } catch (err: any) {
    return 'invalid input'; // a TypeError from a bug in parseAge
  }                          // would ALSO become "invalid input" —
}                            // a real defect relabeled as user error
