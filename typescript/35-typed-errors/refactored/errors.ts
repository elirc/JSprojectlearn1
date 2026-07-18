// catch (err: unknown) — the honest type for "anything can be
// thrown" — plus instanceof narrowing (ts#09) to handle exactly what
// you expected and rethrow the rest (js#30, now compiler-enforced).

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
  } catch (err: unknown) {
    // unknown demands narrowing before ANY use (the type tests
    // below prove the original's crash lines don't compile):
    if (err instanceof ValidationError) {
      return `${err.field}: ${err.message}`; // narrowed: field exists
    }
    throw err; // not ours -> rethrow (js#30's discipline, and the
  }            // compiler made skipping the check impossible)
}

// For logging arbitrary thrown things, ONE helper does the
// narrowing everyone otherwise hand-rolls wrong:
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return JSON.stringify(err);
}

export function handleWithLogging(input: string): string {
  try {
    return `age is ${parseAge(input)}`;
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return `invalid: ${err.field}`;
    }
    // the unexpected is LOGGED AS UNEXPECTED and rethrown — never
    // relabeled as user error (the original's second fumble):
    console.error(`unexpected failure: ${errorMessage(err)}`);
    throw err;
  }
}

export const ok = handleRequest('42');
export const invalid = handleRequest('nine');

// ==== type tests ==================================================
declare const caught: unknown;

// @ts-expect-error — no .field until narrowed (the "undefined:" render)
export const f = caught.field;

// @ts-expect-error — no .message either (the crash INSIDE the catch)
export const m = caught.message.toUpperCase();

// narrowed, both are fine:
export const safe = caught instanceof ValidationError ? caught.field : '(n/a)';
