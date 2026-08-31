# 📘 Learning Guide: Form Validation

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A sign-up form: three inputs (username, email, password) and a "create
account" button. The rules: username at least 3 characters, email must
look like an email, password at least 8 characters.

- **Original:** fill everything in wrong and click submit. A gray popup
  (an `alert`) scolds you about ONE problem. Fix it, submit again, get
  the NEXT popup. Three submits to learn three things.
- **Refactored:** each field shows its own red error message right
  under it, live as you type — but politely: a field only complains
  after you've actually interacted with it. One submit reveals every
  remaining problem at once.

## 2. Concepts you need first

### Controlled inputs (quick recap)

A **controlled input** is one whose value lives in React state: you
pass `value={state}` and update state in `onChange`. React state is
the single source of truth for what's in the box. Project 07's
LEARN.md covers this fully.

```jsx
const [name, setName] = useState('');
<input value={name} onChange={(e) => setName(e.target.value)} />
```

### Form submission and preventDefault

A `<form>` fires a **submit** event when its button is clicked (or
Enter is pressed). By default the browser then *reloads the page* to
send the data somewhere — which would destroy your React app's state.
`e.preventDefault()` cancels that, so your JavaScript handles it
instead.

```jsx
function handleSubmit(e) {
  e.preventDefault(); // stay on the page
  // ...check the data, decide what to do...
}
```

### window.alert (and why apps avoid it)

`window.alert('message')` pops up a browser dialog and **freezes the
whole page** until the user clicks OK. It can't be styled, can't point
at a field, and shows only one message. Fine for quick debugging;
hostile as a UI.

### Validation as a schema (rules as data)

Instead of writing `if` checks inline, you can describe rules as
**data**. Two ingredients:

**Rule factories** — functions that *return* rule functions. A rule
takes a value and returns an error message, or `null` if the value is
fine:

```js
const minLength = (n) => (v) =>
  v.length < n ? `must be at least ${n} characters` : null;

const atLeast3 = minLength(3); // atLeast3 is now a rule
atLeast3('ab');   // -> 'must be at least 3 characters'
atLeast3('abcd'); // -> null (passes)
```

(A function returning a function is a **higher-order function** —
the outer call bakes in the setting, like `n = 3`.)

**A schema** — a plain object mapping each field name to its list of
rules:

```js
const schema = { username: [required(), minLength(3)] };
```

Then ONE generic `validate(data, schema)` function runs every rule on
every field and collects **all** the failures into an object like
`{ username: ['is required'], password: ['must be at least 8 characters'] }`.
Rules become reusable Lego bricks; the next form is just a new schema.

### Regular expressions (for the email rule)

A **regular expression** (regex) is a pattern for matching text,
written between slashes. `pattern.test(str)` returns true/false.
The email pattern `/^\S+@\S+\.\S+$/` reads as: start (`^`), some
non-space characters (`\S+`), an `@`, more non-space, a literal dot
(`\.`), more non-space, end (`$`). So "a@b.c" passes, "abc" fails.

### Derived state (compute, don't store)

Project 09's big rule: if a value can be **computed** from existing
state, don't store it in its own `useState` — just compute it during
render. Errors are the perfect example: they are always exactly
"what's wrong with the current form values". Store them and you must
remember to re-check at the right moments; derive them and they can
*never* be stale:

```js
const errors = validate(form, schema); // fresh every render
const isValid = Object.keys(errors).length === 0;
```

### Touched state (validity vs politeness)

Here's a subtlety: an empty form is *invalid from the very first
render* — `''` fails the `required` rule. But showing "username is
required" before the user has typed anything is rude; they haven't
done anything wrong yet!

So the refactor tracks a second, separate thing: `touched` — an object
recording which fields the user has interacted with. An error is only
*displayed* if its field is touched. Submitting marks everything
touched (you asked to proceed; now everything gets checked out loud).
**Whether a field is invalid** and **whether to say so** are different
questions with different state.

### Syntax you'll meet

- `Object.entries(obj)` → array of `[key, value]` pairs, so you can
  loop over an object.
- `.filter(Boolean)` → drop `null`/empty items from an array.
- `{ ...f, [name]: value }` → copy an object, setting one property
  whose *name is in a variable* (**computed property name**).
- `errors[name] ?? []` → "use the left side unless it's
  null/undefined, then use `[]`" (**nullish coalescing**).
- `useState({})` + updater functions like `setForm((f) => ...)` —
  building the new object from the latest previous one.

## 3. Walking through the original code

Three separate states for three fields, plus a success flag:

```js
const [username, setUsername] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [submitted, setSubmitted] = useState(false);
```

Each input is controlled in the usual way. All the "validation" lives
in the submit handler:

```js
function handleSubmit(e) {
  e.preventDefault();
  if (username.length < 3) {
    window.alert('Username must be at least 3 characters!');
    return;
  }
  if (!email.includes('@')) {
    window.alert('Invalid email!');
    return;
  }
  ...
```

Read it as a chain of tollbooths: the first failed check pops an alert
and `return`s — the later checks never even run. Only if all three
pass does `setSubmitted(true)` show "✅ account created".

Note the email check is also weak: `email.includes('@')` accepts
`"@@@"` as an email.

## 4. What's wrong with it (in beginner terms)

**One error per submit.** You leave all three fields wrong and click
submit. Alert: "Username must be at least 3 characters!" OK. You fix
the username, submit. Alert: "Invalid email!" OK. Fix it, submit
again. "Password too short!" Three full round trips to learn what one
glance could have told you. That's because each `if` does `return` —
the chain stops at the first failure.

**The messenger is terrible.** The alert freezes the entire page until
dismissed. It's a system dialog — no styling, no red border on the
guilty field. Worse, the message and the field are disconnected: you
must *memorize* "username must be at least 3 characters", click OK,
then go hunting for the username box.

**The rules are welded into the handler.** The min-length numbers, the
email check, the messages — all buried inside `handleSubmit` of this
one component. When you build the login form next week, you'll
copy-paste the chain and the two versions will drift apart. Rules that
could be shared, tested, and reused are trapped in UI code.

## 5. Try it yourself first!

1. **Vague:** could the form show *all* the problems at once, next to
   the fields, instead of one popup at a time?
2. **Warmer:** write a function that checks ALL fields and returns an
   object of errors (e.g. `{ email: ['must be a valid email'] }`)
   instead of alerting and returning early. Render those messages
   under each input.
3. **Warmer still:** don't store errors in state. Call your validation
   function directly in the component body every render — derived
   state (project 09). Can errors ever be stale now?
4. **Make the rules data.** Write tiny rule functions (`required`,
   `minLength(n)`) and a schema object mapping field names to rule
   lists, plus one generic `validate(data, schema)`. The next form
   should need only a new schema.
5. **The politeness problem:** with live validation, the empty form
   shows three errors before the user types anything. Track which
   fields have been interacted with, and only show errors for those.
   What should happen to that tracking when the user clicks submit?

## 6. Understanding the refactored solution

**Layer 1 — pure rules (no React anywhere).** Three rule factories:

```js
const required = () => (v) =>
  v === undefined || v === null || v === '' ? 'is required' : null;
const minLength = (n) => (v) =>
  typeof v === 'string' && v.length < n ? `must be at least ${n} characters` : null;
```

...plus `matches(pattern, description)` for the regex email rule. The
generic collector runs every rule and keeps every failure:

```js
function validate(data, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const fieldErrors = rules.map((rule) => rule(data[field])).filter(Boolean);
    if (fieldErrors.length > 0) errors[field] = fieldErrors;
  }
  return errors;
}
```

No early return — that's the one-error-per-submit disease cured at the
root. This code is copied verbatim from the JS track's project 31,
already unit-tested there. The quiet headline: pure functions don't
care what framework calls them.

**Layer 2 — derivation in the component:**

```js
const errors = validate(form, signupSchema);
const isValid = Object.keys(errors).length === 0;
```

Run on every render. No `errors` state, no "remember to re-validate",
no stale messages — the errors always describe the current keystrokes.

**Layer 3 — politeness.** State is one form object (project 12's
lesson) plus `touched`:

```js
function handleChange(e) {
  const { name, value } = e.target;
  setForm((f) => ({ ...f, [name]: value }));
  setTouched((t) => ({ ...t, [name]: true }));
}
```

One generic handler serves all fields, keyed by the input's `name`.
Typing in a field also marks it touched. And on submit:

```js
setTouched({ username: true, email: true, password: true });
if (isValid) setSubmitted(true);
```

Submit means "I think I'm done" — so everything becomes touched, and
one click reveals the full picture at once.

**The reusable `Field` component** owns its own display logic:

```js
const show = touched && errors.length > 0;
```

Red border (`className={show ? 'invalid' : ''}`) and messages appear
only when the field is both touched *and* invalid. Any future form can
reuse `Field` as-is.

**Small print:** `noValidate` on the `<form>` turns off the browser's
own validation bubbles (we render nicer ones); the submit button
disables only once the user has started touching fields — a pristine
form keeps an enabled button so the first click can reveal everything.

## 7. Words you learned (glossary)

- **Controlled input:** input whose value is driven by React state.
- **Submit event:** the event a form fires on button-click/Enter.
- **preventDefault():** cancel the browser's default action (here, the
  page reload on submit).
- **window.alert:** a blocking, unstylable browser popup.
- **Validation:** checking user input against rules before accepting it.
- **Rule:** a function `value -> errorMessage | null`.
- **Rule factory:** a function that returns a rule with settings baked
  in (e.g. `minLength(8)`).
- **Higher-order function:** a function that takes or returns functions.
- **Schema:** a data object mapping field names to their rule lists.
- **Regular expression (regex):** a text-matching pattern like
  `/^\S+@\S+\.\S+$/`; `.test(str)` checks a string against it.
- **Derived state:** a value computed from existing state during
  render instead of stored separately.
- **Stale:** out of date — showing information about a previous state.
- **touched:** per-field record of "has the user interacted with this
  yet", used to gate error display.
- **Pristine:** a field/form the user hasn't interacted with yet.
- **Computed property name:** `{ [name]: value }` — a key taken from a
  variable.
- **Nullish coalescing (`??`):** fallback used only when the left side
  is null/undefined.
- **noValidate:** form attribute that disables the browser's built-in
  validation popups.

## 8. Experiments to try on the plane (no internet needed)

You can edit and reason offline; note the pages load React from a CDN
(shared library servers), so running them in a browser needs internet
on first load.

1. **Add a rule to one field.** In the schema, add `minLength(5)` to
   `username`. Expected: type "abcd" and BOTH messages logic stays
   correct — only the min-5 message shows (the required rule passes).
   You changed one line of data, zero component code.
2. **Add a whole new field.** Add a `confirm` input: extend the form
   state object, the schema (`confirm: [required()]`), and the
   `['username', 'email', 'password']` array. Expected: full
   validation and politeness for free — the generic handler, `Field`,
   and `validate` all just work.
3. **Break the politeness.** Change `Field`'s line to
   `const show = errors.length > 0;` (ignore `touched`). Expected: the
   page loads already covered in red — every field yelling "is
   required" at a user who hasn't done anything. Feel why `touched`
   exists.
4. **Re-create the disease.** In `validate`, change the loop to
   `return errors;` immediately after the first field with errors.
   Expected: submit with everything wrong and only the username error
   shows — the original's one-at-a-time behavior, back again.
5. **Test the rules on paper (or in Node, fully offline).** Predict:
   `required()('')`, `minLength(8)('secret')`,
   `matches(/^\S+@\S+\.\S+$/, 'be a valid email')('a@b.c')`. Answers:
   `'is required'`, `'must be at least 8 characters'`, `null`. If you
   have Node installed, paste the rules into a file and check — no
   browser, no React, no internet.
