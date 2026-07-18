/**
 * A tiny validation library from three ideas:
 *
 *   1. A RULE is a function: value -> error message, or null if fine.
 *   2. Rule FACTORIES (minLength, inRange...) build configured rules —
 *      closures again, carrying their configuration.
 *   3. A SCHEMA is data: { field: [rules...] } — describing a form
 *      instead of hand-coding its if-chain.
 *
 * validate() collects ALL errors, so the user learns everything
 * wrong with the form in ONE submit, not one error per round trip.
 */

// ---- rule factories ----
export const required = () => (value) =>
  value === undefined || value === null || value === ''
    ? 'is required'
    : null;

export const minLength = (n) => (value) =>
  typeof value === 'string' && value.length < n
    ? `must be at least ${n} characters`
    : null;

export const matches = (pattern, description) => (value) =>
  typeof value === 'string' && !pattern.test(value)
    ? `must ${description}`
    : null;

export const isNumber = () => (value) =>
  value !== undefined && Number.isNaN(Number(value))
    ? 'must be a number'
    : null;

export const min = (limit) => (value) =>
  value !== undefined && Number(value) < limit
    ? `must be at least ${limit}`
    : null;

/** Wrap rules so they only run when the value is present. */
export const optional = (...rules) => (value) =>
  value === undefined || value === null || value === ''
    ? null
    : rules.map((rule) => rule(value)).find(Boolean) ?? null;

// ---- the engine: ~10 lines, works for every form ever ----
export function validate(data, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const fieldErrors = rules
      .map((rule) => rule(data[field]))
      .filter(Boolean);
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }
  return errors; // {} means valid — Object.keys(errors).length === 0
}
