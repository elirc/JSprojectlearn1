# 📘 Learning Guide: Custom Errors

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A user registration system that checks its inputs — username at least 3 characters, no spaces, age a whole number of at least 13, name not already taken — and *refuses loudly* when a check fails.

```
node refactored/cli.js grace 41   →  Welcome, grace!
node refactored/cli.js x 8        →  Sorry — Username must be at least 3 characters (username)
```

Running `node original.js` shows the "before": both validations fail... and registration *succeeds anyway*, creating a user literally named `"ERROR: too short"` with age `-1`. This project is about making that outcome impossible.

## 2. Concepts you need first

### Errors and `throw`

An **error** in JavaScript is an object describing a failure. **`throw`** hurls it up out of the current function immediately — nothing after the throw runs:

```js
function half(n) {
  if (typeof n !== "number") throw new Error("need a number");
  return n / 2;
}
half("x"); // program stops: Error: need a number
```

The crucial property: a thrown error *cannot be ignored*. It either gets caught, or it crashes the program. Compare that with returning `-1`: the caller can (and will) forget to check.

### `try` / `catch`

`try { ... } catch (err) { ... }` runs the try block; if anything inside throws, control jumps to catch with the error in `err`:

```js
try {
  half("x");
} catch (err) {
  console.log("caught:", err.message); // caught: need a number
}
```

Errors also **propagate**: if function A calls B calls C, and C throws, the error flies up through B and A until *someone* catches it (or the program dies). This is a feature — middle layers don't need any error code at all.

### Stack traces

Every error carries a **stack trace** (`err.stack`): a text listing of which function called which, down to the line that threw. It's the single most useful debugging artifact — and sentinel values like `-1` have none.

### Sentinel values (the anti-pattern)

A **sentinel** is a special in-band return value meaning "failure": `-1`, `null`, `"ERROR: ..."`. Three problems: the caller must *remember* to check, must remember *which* sentinel each function uses, and if they forget, the sentinel *keeps flowing as if it were data*. That's the original's entire disaster.

### Classes and `extends` — making your own error type

**`extends`** lets a class build on another. **`super(...)`** calls the parent's constructor. Extending `Error` gives you a custom error type that still has a message and a stack:

```js
class OutOfCookies extends Error {
  constructor() {
    super("no cookies left");   // sets .message via Error's constructor
    this.name = "OutOfCookies";
  }
}
throw new OutOfCookies(); // OutOfCookies: no cookies left
```

Because it's your own class, you can attach extra fields (like which form field failed) and — crucially — callers can *recognize* it.

### `instanceof` — recognizing error types

`x instanceof SomeClass` asks "was x built by this class (or one extending it)?"

```js
const err = new OutOfCookies();
console.log(err instanceof OutOfCookies); // true
console.log(err instanceof Error);        // true — it extends Error
```

This is how a catch block tells *expected* failures ("user typed a bad age" → friendly message) apart from *unexpected* ones ("we have a bug" → crash loudly).

### Rethrowing

Inside a catch, `throw err;` sends the error onward as if you never caught it. The pattern: catch, check the type, handle the ones you understand, **rethrow the rest**. Swallowing unknown errors disguises your own bugs as user mistakes.

### Number parsing: `Number()`, `isNaN`, `Number.isInteger`

`Number("41")` → `41`; `Number("abc")` → `NaN`. `Number.isInteger(x)` is true only for whole numbers — it's `false` for `NaN`, `41.5`, and strings, so one check covers several bad cases.

```js
console.log(Number("41"));            // 41
console.log(Number.isInteger(41.5));  // false
console.log(Number.isInteger(NaN));   // false
```

### Command-line arguments: `process.argv`

When you run `node cli.js grace 41`, Node puts the words into an array `process.argv`: `[node-path, script-path, "grace", "41"]`. `process.argv.slice(2)` drops the first two, leaving your actual arguments. `const [username, age] = ...` is **destructuring** — unpacking array items into named variables. `process.exitCode = 1` makes the program report failure to the shell (0 means success).

### `console.error`, `.some()`, and shorthand properties

- `console.error` prints to the error stream — same look, but scripts and pipes can separate it from normal output.
- `array.some(fn)` — "does at least one item pass this test?" `[1,2].some(n => n > 1)` → `true`.
- `{ username, age }` is shorthand for `{ username: username, age: age }`.

## 3. Walking through the original code

Three validators, three different failure languages. First, magic numbers:

```js
function parseAge(input) {
  var age = Number(input);
  if (isNaN(age)) return -1;          // convention 1: magic -1
  if (age < 13) return -1;            // (same -1 for a DIFFERENT problem)
  return age;
}
```

Two entirely different problems — "that's not a number" and "you're too young" — collapse into the same `-1`. Even a careful caller can't tell the user what went wrong.

Second, error strings:

```js
function checkUsername(name) {
  if (name.length < 3) return "ERROR: too short";  // convention 2: string
  if (name.indexOf(" ") >= 0) return "ERROR: no spaces";
  return name;
}
```

Failure is a string that *looks exactly like a valid return value* (it IS a string, and so are usernames).

Third, `null` from `findUser` — convention number three.

Then `register` calls all three and checks... almost nothing:

```js
var age = parseAge(input.age);
var username = checkUsername(input.username);
var existing = findUser(username, database);
if (existing) return "taken";
return { username: username, age: age };
```

The demo's second call, `register({ username: "x", age: "8" }, db)`, returns:

```
{ username: 'ERROR: too short', age: -1 }
```

Both checks failed. Both failure values sailed straight through and *became the account*. No throw, no log, no clue.

## 4. What's wrong with it (in beginner terms)

**Three conventions to memorize.** Every caller of these three functions must remember: negative one means bad age, strings starting with "ERROR:" mean bad name, null means not found. Add a fourth function next month with a fourth convention, and every call site is a quiz. Humans fail quizzes.

**Forgetting a check isn't loud — it's silent.** Here's the "bites you later" story: the corrupt user `{ username: "ERROR: too short", age: -1 }` is written to the database today. Three weeks later, a birthday-email job crashes on age `-1`, in a different file, in a different service. The stack trace points at the email code — which is innocent. You debug the wrong code for a day. Sentinels move the explosion far away from the mistake.

**One `-1`, two meanings.** Even the well-behaved caller who checks `age === -1` can only say "something about your age is wrong". The information about *which* rule failed was destroyed at the source, so the user gets a useless error message.

**Nothing is logged, ever.** A thrown error at minimum crashes with a stack trace someone will see. A sentinel produces no evidence at all.

## 5. Try it yourself first!

Try rewriting the original before peeking. Hints, vague → specific:

1. Pick ONE way to report failure, for all three functions. Which mechanism can't be accidentally ignored?
2. Replace every sentinel return with `throw new Error("specific message")` — one distinct message per distinct problem.
3. Now the caller: `register` shouldn't need any checking code at all. Why? Where do the errors go if `register` doesn't catch them?
4. Add exactly one `try/catch` — in the outermost place that talks to the user (the CLI script). Print `err.message` there.
5. Level up: define `class ValidationError extends Error` with a constructor that also stores `field` and `value`. Throw that instead.
6. In the catch: `if (err instanceof ValidationError)` → friendly message; `else` → `throw err;` (rethrow — it's *your* bug, let it crash loudly).

## 6. Understanding the refactored solution

**The custom error class** (`refactored/registration.js`):

```js
export class ValidationError extends Error {
  constructor(message, { field, value } = {}) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}
```

`super(message)` wires up the normal Error machinery (message + stack trace). Setting `name` makes printed errors say `ValidationError:` instead of `Error:`. The `field` and `value` payload gives whoever catches it the context to act — which field to highlight in a form, what the bad input was.

**The validators** now throw, with distinct messages for distinct problems:

```js
if (!Number.isInteger(age)) {
  throw new ValidationError('Age must be a whole number', { field: 'age', value: input });
}
if (age < 13) {
  throw new ValidationError('You must be at least 13', { field: 'age', value: age });
}
```

Note `Number.isInteger` quietly covers `NaN` (from `Number("abc")`) *and* fractions in one check.

**`register` — the clean middle layer:**

```js
export function register(input, database) {
  const username = parseUsername(input.username);
  const age = parseAge(input.age);
  if (database.some((user) => user.username === username)) {
    throw new ValidationError('That username is taken', ...);
  }
  const user = { username, age };
  database.push(user);
  return user;
}
```

Zero try/catch. If a validator throws, execution never reaches `database.push` — invalid data physically cannot become account data. `register` can't *do* anything useful with a bad age, so it doesn't touch the error; it flies past to the boundary. That's the rule: **catch only where you can act**.

**The boundary** (`refactored/cli.js`) is the one catch in the whole system:

```js
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(`Sorry — ${err.message} (${err.field})`);
    process.exitCode = 1;
  } else {
    throw err;   // our bug — crash loudly, keep the stack
  }
}
```

The `instanceof` split is the heart of it: *their* mistake gets a kind message and exit code 1; anything else is *our* bug and gets rethrown so it crashes with a full stack trace. Collapsing those two categories is how real bugs hide as "invalid input" for months.

**The tests** go beyond "it threw": one passes a checking *function* to `assert.throws` and asserts the error's class, `field`, and `value`; one pins that the two age problems produce different messages (matched with regular expressions like `/whole number/`); the headline test registers invalid input and then asserts `database.length` is 0 — invalid input can NEVER become account data, the exact opposite of the original's demo; and the last test confirms `ValidationError` is still a genuine `Error` with a working stack trace.

## 7. Words you learned (glossary)

- **Error (object)**: a value describing a failure, with `.message` and `.stack`.
- **`throw`**: eject an error up out of the function immediately.
- **`try`/`catch`**: run code; if it throws, jump to the catch block with the error.
- **Propagation**: an uncaught error flies up through every caller until caught.
- **Stack trace**: the who-called-whom listing attached to every error.
- **Sentinel value**: an in-band return like `-1`/`null`/`"ERROR:..."` signaling failure — ignorable, therefore dangerous.
- **Magic number**: an unexplained special value like `-1` whose meaning you must just know.
- **`extends` / `super`**: build a class on another / call the parent's constructor.
- **Custom error class**: your own `Error` subclass carrying extra fields.
- **`instanceof`**: "was this built by that class (or a subclass)?"
- **Rethrow**: `throw err` inside a catch — pass on what you can't handle.
- **Boundary**: the outermost layer that can actually respond (CLI, request handler) — the right home for catch.
- **Swallowing an error**: catching and ignoring it — hides bugs.
- **`NaN` / `Number.isInteger`**: not-a-number / true only for whole numbers (false for NaN).
- **`process.argv`**: array of command-line words given to a Node program.
- **Destructuring**: `const [a, b] = arr;` — unpack values into variables.
- **Exit code**: number a program reports on exit; 0 = success, nonzero = failure.
- **`.some(fn)`**: does at least one array item pass the test?
- **Happy path**: the code's flow when nothing goes wrong.

## 8. Experiments to try on the plane (no internet needed)

1. **Run all four commands** from the README's "Run it" and compare: the original prints a corrupt "success"; `cli.js x 8` prints a friendly one-line failure. Same inputs, opposite philosophies.
2. **Add a new rule end-to-end.** In `refactored/registration.js`, make `parseUsername` throw if the name is longer than 12 characters (message: "Username must be at most 12 characters"). Then run `node refactored/cli.js averyveryverylongname 30`. Expected: the friendly Sorry-message appears — you never touched `cli.js` or `register`; propagation delivered the error for free.
3. **See a bug crash loudly.** In `register`, temporarily change `database.some(...)` to `database.sum(...)` (a typo — no such method) and run `node refactored/cli.js grace 41`. Expected: a full `TypeError` crash with a stack trace, NOT the "Sorry —" message — the boundary rethrows what isn't a ValidationError. Undo the typo after.
4. **Swallow an error and feel the pain.** In `cli.js`, replace the `else { throw err; }` branch with `else { console.error('Sorry — something was invalid'); }`, keep the typo from experiment 3, and run again. Expected: your genuine bug now masquerades as user error, stack trace gone. Undo both edits — but remember the feeling.
5. **Assert the payload.** Add a test: call `parseUsername('a b')` inside `assert.throws` with a checker function, and assert `err.field === 'username'` and `err.value === 'a b'`. Expected: passes — the error carries everything a form-highlighting UI would need.
