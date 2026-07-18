// js#31's validator, ported with any everywhere — so the validator
// VALIDATES at runtime but PROMISES nothing at compile time, and its
// schemas can quietly disagree with the types they guard.

export const required = () => (value: any) =>
  value === undefined || value === null || value === '' ? 'is required' : null;

export const minLength = (n: number) => (value: any) =>
  typeof value === 'string' && value.length < n
    ? `must be at least ${n} characters`
    : null;

export function validate(data: any, schema: any): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const [field, rules] of Object.entries(schema)) {
    const fieldErrors = (rules as any[])
      .map((rule) => rule((data as any)[field]))
      .filter(Boolean);
    if (fieldErrors.length > 0) errors[field] = fieldErrors;
  }
  return errors;
}

interface Signup {
  username: string;
  email: string;
  password: string;
}

// The schema is supposed to mirror Signup. Nothing checks that:
export const signupSchema = {
  username: [required(), minLength(3)],
  emial: [required()],          // TYPO: validates a field Signup doesn't have,
                                // while the real `email` goes UNVALIDATED
  password: [required(), minLength(8)],
  favoriteColor: [required()],  // validates a field that doesn't exist at all
};

const form: Signup = { username: 'ada', email: 'not-an-email', password: 'pw' };
export const errors = validate(form, signupSchema);
// errors.emial: ['is required'] — an error about a field the form
// can't even have, while the real email sails through unchecked.
// The validator works; its CONNECTION to the type is vibes.

export const usernameErrors = errors.usrename; // typo'd read: undefined, silently
