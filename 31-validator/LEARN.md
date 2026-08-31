# 📘 Learning Guide: Input Validator

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A form checker. Give it the data a user typed into a signup form, and it reports what's wrong — *all* of it, at once:

```js
validate({ username: 'x', email: 'nope', password: '123' }, signupSchema)
// {
//   username: ['must be at least 3 characters'],
//   email:    ['must be a valid email'],
//   password: ['must be at least 8 characters'],
// }
validate({ username: 'grace', email: 'g@navy.mil', password: 'longenough' }, signupSchema)
// {}   <- empty object means "all good"
```

Running `node original.js` shows the "before": the same bad form only reports its FIRST mistake — the user would need five submits to discover five problems.

## 2. Concepts you need first

### Validation

**Validation** means checking that input follows the rules before you accept it — usernames long enough, emails shaped like emails, ages that are numbers. Forms are the classic home of validation.

### Functions that return functions (rule factories)

You've met higher-order functions. A **factory** is one that manufactures configured functions:

```js
const atLeast = (n) => (value) => value >= n;
const adult = atLeast(18);       // a checker with 18 baked in
console.log(adult(21));          // true
console.log(atLeast(13)(10));    // false
```

The `n` lives on inside the returned function — that's a **closure** (a function remembering variables from where it was made). `minLength(3)` in this project works exactly like this: call the factory once, get a reusable rule.

### One shared shape = composability

This project's core idea: every rule is a function with the *same signature* (shape): take a value, return an error message string if bad, or `null` if fine.

```js
const isEven = (value) => value % 2 !== 0 ? 'must be even' : null;
console.log(isEven(3)); // must be even
console.log(isEven(4)); // null
```

Because every rule looks alike, you can put rules in arrays, loop over them, and combine them freely. Things that share an interface **compose**.

### Code as data: schemas

A **schema** is a description of a form's shape written as plain data, not code:

```js
const schema = { username: [required(), minLength(3)] };
```

Read it aloud: "username is required and must be at least 3 characters." No `if` statements — the *engine* reads this data and applies the rules. Describing things with data instead of control flow is called being **declarative**.

### Regular expressions (just enough)

A **regular expression** (regex) is a pattern for matching text, written between slashes. `pattern.test(str)` returns true/false:

```js
const email = /^\S+@\S+\.\S+$/;
console.log(email.test("g@navy.mil")); // true
console.log(email.test("nope"));       // false
```

Decoder ring for that one: `^` start of string, `\S+` one or more non-space characters, `@` a literal @, `\.` a literal dot, `$` end of string. So: "something @ something . something, no spaces." (Real email validation is famously hairy; this is a sane approximation.)

### Array tools: `map`, `filter`, `find`, and `Boolean`

```js
const nums = [1, null, 2, null];
console.log(nums.map(x => x));          // [1, null, 2, null]
console.log(nums.filter(Boolean));      // [1, 2]     — keeps only truthy items
console.log(nums.find(Boolean));        // 1          — first truthy item
```

- `map(fn)` transforms each item.
- `filter(fn)` keeps items where fn is truthy; `filter(Boolean)` drops `null`/`undefined`/`''` etc.
- `find(fn)` returns the first match (or `undefined`).

In this project, running a field's rules is literally `rules.map(rule => rule(value)).filter(Boolean)` — run them all, keep the messages.

### `Object.entries` and loop destructuring

`Object.entries(obj)` turns an object into an array of `[key, value]` pairs, perfect for looping:

```js
const scores = { ana: 3, bo: 5 };
for (const [name, score] of Object.entries(scores)) {
  console.log(name, score);   // ana 3   then   bo 5
}
```

### `??`, `...rules`, and the ternary

- `x ?? null` — "x, unless x is undefined/null, then null" (**nullish coalescing**).
- `(...rules) =>` — **rest parameters**: accept any number of arguments as an array.
- `cond ? a : b` — the **ternary**: an if/else that is an expression. Most rules here are a single ternary.

### `NaN` checks: `isNaN` vs `Number.isNaN`

`Number("ten")` is `NaN`. The old global `isNaN(x)` first converts x to a number (so `isNaN("abc")` is true, but so is `isNaN(undefined)` — surprising). `Number.isNaN(x)` is strict: true only when x is literally the value `NaN`. The refactor converts explicitly (`Number(value)`) and then uses the strict check.

## 3. Walking through the original code

One giant function, one if per rule, `return` on the first failure:

```js
if (form.username == undefined || form.username == "") {
  return "username is required";
}
if (form.username.length < 3) {
  return "username must be at least 3 characters";
}
```

Then the same required-check again for email, plus a shape check:

```js
if (form.email.indexOf("@") == -1) {
  return "email must contain @";
}
```

(`indexOf` returns the position of `"@"` in the string, or `-1` if absent.) Then required + length for password — "required" hand-typed a third time, "at least N characters" a second time.

Age is different — it's optional, expressed as a nested if:

```js
if (form.age != undefined) {
  if (isNaN(Number(form.age))) {
    return "age must be a number";
  }
  if (Number(form.age) < 13) {
    return "age must be at least 13";
  }
}
```

"If age was provided at all, it must be a number of at least 13." A real design decision — buried where you'd never notice it was one.

Finally, `return null` means OK. The demo call passes a form where *three* fields are wrong, and prints only `"username must be at least 3 characters"`.

## 4. What's wrong with it (in beginner terms)

**One error per submit.** Walk through the user's evening: they fill in the form, click Submit. "Username too short." Fix, submit. "Email must contain @." Fix, submit. "Password too short." Fix, submit — finally in, four round trips later, mildly furious. Nobody *designed* that experience; it fell out of an implementation detail — early `return` throws away every check it hasn't run yet.

**Re-typed micro-rules.** "Required" appears three times; "at least N characters" twice. Now the login form needs validation. The realistic move: copy this whole function, delete the email part, rename it. Two months later you fix a bug in signup's required-check... and forget login's copy. The cost of this style grows as forms × fields × rules — every new form multiplies everything.

**The form's shape is trapped in prose.** Question: "which fields does signup have, and which are optional?" To answer, you must *read the if-chain top to bottom*. No other code can use the answer — nothing can auto-render the form, generate docs, or reuse the field list, because the shape exists only as control flow, not as data.

## 5. Try it yourself first!

Try building your own tiny validator before reading on. Hints, vague → specific:

1. Instead of one function returning early, could you collect problems in an array and return them all?
2. Decide a shared shape for a single rule. Suggestion: `value => message-or-null`.
3. "At least 3 characters" and "at least 8 characters" are the same rule with a different number. Write ONE factory: `minLength(n)` returns a rule with `n` closed over.
4. Describe the form as data: an object mapping each field name to an array of rules.
5. Write the engine: loop over the schema's entries; for each field, run every rule on `data[field]`, keep the non-null messages, store them under the field name.
6. Return an object of `field → [messages]`; an empty object means valid.
7. For optional age: write `optional(...rules)` — a rule that returns `null` when the value is absent, and otherwise runs the inner rules.

## 6. Understanding the refactored solution

**The rule factories** (`refactored/validate.js`) are each two or three lines:

```js
export const minLength = (n) => (value) =>
  typeof value === 'string' && value.length < n
    ? `must be at least ${n} characters`
    : null;
```

Two arrows: the first call (`minLength(3)`) configures; the result is the rule. Messages deliberately omit the field name ("must be at least 3 characters") — the engine knows the field, so rules stay reusable anywhere. Note the `typeof value === 'string'` guard: if the value is missing, `minLength` stays quiet and lets `required()` do the complaining — each rule minds one job.

**The combinator** — a rule built out of rules:

```js
export const optional = (...rules) => (value) =>
  value === undefined || value === null || value === ''
    ? null
    : rules.map((rule) => rule(value)).find(Boolean) ?? null;
```

Absent → fine (`null`). Present → run the inner rules and report the first failure (`find(Boolean)` grabs the first non-null message; `?? null` normalizes "no failures" from `undefined` to `null`). The original buried this exact decision in a nested if; here it has a name.

**The engine** — the entire library core:

```js
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
  return errors;
}
```

For each field: run all rules, keep the messages, record them if any. No early return anywhere — that's why all errors arrive in one pass. `{}` means valid.

**The schema** (`refactored/signup-schema.js`) reads like the form spec:

```js
export const signupSchema = {
  username: [required(), minLength(3)],
  email: [required(), matches(/^\S+@\S+\.\S+$/, 'be a valid email')],
  password: [required(), minLength(8)],
  age: [optional(isNumber(), min(13))],
};
```

And the payoff line — the login form, zero new logic:

```js
export const loginSchema = { username: [required()], password: [required()] };
```

**The tests** pin each promise: a valid form returns `{}`; the original's bad form now yields all three fields' errors at once; an empty username fails *two* rules and both messages appear; the optional-age decision is spelled out in three asserts (absent OK, `'ten'` rejected, `'9'` rejected); the login schema works with no new code; and the finale — a made-up `noProfanity` rule defined *inside the test* drops straight into a schema. No registration, no base class: matching the one-line interface is the entire price of admission.

## 7. Words you learned (glossary)

- **Validation**: checking input against rules before accepting it.
- **Rule**: here, any function `value → error-message-or-null`.
- **Signature / interface**: the agreed shape of a function (inputs and output).
- **Factory**: a function that manufactures configured functions (`minLength(3)`).
- **Closure**: a returned function remembering the variables it was created with.
- **Combinator**: a function that builds a new rule out of other rules (`optional`).
- **Schema**: a form's shape written as plain data (`{ field: [rules] }`).
- **Declarative**: saying *what* you want as data, letting an engine do the *how*.
- **Engine**: the generic loop that applies a schema to data.
- **Composability**: pieces with one shared shape combining freely.
- **Regular expression (regex)**: a text-matching pattern like `/^\S+@\S+\.\S+$/`.
- **`.test(str)`**: does this string match the regex? true/false.
- **`map` / `filter` / `find`**: transform each item / keep matching items / first match.
- **`filter(Boolean)`**: drop all falsy items (a common idiom for "remove nulls").
- **`Object.entries`**: object → array of `[key, value]` pairs.
- **Rest parameters (`...rules`)**: accept any number of arguments as an array.
- **Nullish coalescing (`??`)**: fallback only for `null`/`undefined`.
- **Ternary (`a ? b : c`)**: if/else as an expression.
- **`Number.isNaN`**: strict "is this literally NaN?" (the global `isNaN` coerces first).
- **Round trip**: one submit-and-response cycle between user and program.

## 8. Experiments to try on the plane (no internet needed)

1. **Feel the difference.** Run `node original.js` (one error), then `node --test 31-validator/` and look at the second test — the same form data yields three fields of errors in one pass.
2. **Write a rule of your own.** In the test file, add a `maxLength` factory (mirror `minLength`, flip the comparison to `value.length > n`, message `must be at most ${n} characters`) and a test using `{ username: [maxLength(5)] }` with `'toolongname'`. Expected: `['must be at most 5 characters']`.
3. **Build a whole new form in one line.** Add `const settingsSchema = { nickname: [optional(minLength(2))] };` and test: `{}` validates to `{}`, and `{ nickname: 'x' }` yields `['must be at least 2 characters']`. Expected: both pass — no new logic, only declarations.
4. **Break the guard, learn why it's there.** In `validate.js`, remove `typeof value === 'string' && ` from `minLength` and run the tests. Expected: the "field can fail several rules" test still passes (an empty string has `.length`), but try validating `{ username: undefined }` against `[required(), minLength(3)]` in a new test — now `minLength` crashes reading `.length` of undefined. The guard keeps each rule safe on its own.
5. **Regex play.** In a scratch file, test the email pattern against `'a@b.c'`, `'a b@c.d'`, `'@.'`, `'g@navy.mil'`. Predict each before running. Expected: true, false (space breaks `\S`), false (`\S+` needs at least one character in each part), true.
