import { required, minLength, matches, isNumber, min, optional } from './validate.js';

/**
 * The signup form, described rather than coded. Compare this to the
 * original's 30-line if-chain — and note the login form below reuses
 * the same rules with zero new logic.
 */
export const signupSchema = {
  username: [required(), minLength(3)],
  email: [required(), matches(/^\S+@\S+\.\S+$/, 'be a valid email')],
  password: [required(), minLength(8)],
  age: [optional(isNumber(), min(13))],
};

export const loginSchema = {
  username: [required()],
  password: [required()],
};
