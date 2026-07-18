/**
 * One failure convention: THROW. A thrown error cannot be ignored,
 * cannot sail into the database as data, and carries a message,
 * a stack trace, and any fields we attach.
 *
 * ValidationError is our own error class so the boundary can tell
 * "the user typed something wrong" (show it to them) apart from
 * "our code is broken" (log it, alert, generic message).
 */
export class ValidationError extends Error {
  constructor(message, { field, value } = {}) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export function parseAge(input) {
  const age = Number(input);
  // Distinct problems get distinct messages (the original folded
  // both into the same -1):
  if (!Number.isInteger(age)) {
    throw new ValidationError('Age must be a whole number', { field: 'age', value: input });
  }
  if (age < 13) {
    throw new ValidationError('You must be at least 13', { field: 'age', value: age });
  }
  return age;
}

export function parseUsername(name) {
  if (typeof name !== 'string' || name.length < 3) {
    throw new ValidationError('Username must be at least 3 characters', { field: 'username', value: name });
  }
  if (name.includes(' ')) {
    throw new ValidationError('Username cannot contain spaces', { field: 'username', value: name });
  }
  return name;
}

/**
 * The happy path reads with NO error plumbing at all — any failure
 * below throws straight past this function to the boundary. Notice
 * register() contains zero try/catch: it has no way to HANDLE these
 * errors, so it doesn't touch them. Catch only where you can act.
 */
export function register(input, database) {
  const username = parseUsername(input.username);
  const age = parseAge(input.age);

  if (database.some((user) => user.username === username)) {
    throw new ValidationError('That username is taken', { field: 'username', value: username });
  }

  const user = { username, age };
  database.push(user);
  return user;
}
