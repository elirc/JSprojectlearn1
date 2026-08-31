# 🏋️ Practice: Form Validation

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (The rule functions are pure, so exercises 1 and 5 can be checked in Node with no browser at all; the pages themselves load React from a CDN, so save those for when you're online.)

Unless an exercise says otherwise, you are editing `refactored/index.html`.

## Exercises

### ⭐ 1. A rule factory of your own (warm-up)

The validator ships with `required`, `minLength(n)`, and `matches(pattern, description)`. Write a fourth factory, `maxLength(n)`, that returns `'must be at most N characters'` when a string is too long and `null` otherwise — then cap `username` at 12 characters by adding it to the schema. Copy the shape of `minLength` exactly, including its `typeof v === 'string'` guard.

**Practices:** rule factories as data — extending a validator without touching a single component.

**Hint:** `minLength` fails when `v.length < n`; yours fails when `v.length > n`. A 12-character username must still pass.

**Expected:** typing 13 characters into username shows "username must be at most 12 characters" under the box; exactly 12 is silent. `Field`, `validate`, and `App` are untouched — you changed one factory and one line of schema.

### ⭐⭐ 2. Politeness on blur, not on keystroke (core)

Right now `handleChange` marks a field touched, so the *first* letter you type into the empty username box makes "must be at least 3 characters" appear — the form starts nagging mid-word. Move the touch to `onBlur`: a field becomes touched when the user leaves it, and stays touched afterwards. `Field` needs to accept and attach an `onBlur`; `handleChange` should no longer touch anything.

**Practices:** separating "the user changed this" from "the user is done with this" — the standard blur-based touched semantics.

**Hint:** blur events carry the same `e.target.name` that change events do, so `handleBlur` looks almost exactly like the touching half of `handleChange`.

**Expected:** type "ad" into username — no red anywhere while you're still in the box. Tab out: the box goes red with the min-length message. Click back in and type a third letter: the message disappears *live*, because `touched.username` is still true. Submit still reveals everything at once.

### ⭐⭐ 3. Predict the empty submit (core)

Using the schema exactly as it ships in `refactored/index.html` (no changes from exercise 1), a user loads the page and immediately clicks "create account" without typing anything. Write down: how many red messages appear in total and what each one says; whether "✅ account created" appears; and what happens to the submit button itself — before the click and after it. Then say why the button ends up that way.

**Practices:** reading `validate`'s collect-everything loop and the button's two-part `disabled` condition as one story.

**Hint:** every field runs *all* of its rules — `''` fails `required` and it also fails `minLength`. And check both halves of `disabled={!isValid && Object.keys(touched).length > 0}` before the click and after.

**Expected:** your prediction matches the solution's count, message list, and the button's before/after state — including the fact that the button changes state as a *result* of the click that did nothing else.

### ⭐⭐ 4. Fix the one-keystroke-late errors (core)

A teammate decided that "running `validate` on every render is wasteful" and cached it in state instead. Their version:

```jsx
const [errors, setErrors] = useState({});

function handleChange(e) {
  const { name, value } = e.target;
  setForm((f) => ({ ...f, [name]: value }));
  setTouched((t) => ({ ...t, [name]: true }));
  setErrors(validate(form, signupSchema)); // "cache it once per keystroke"
}
```

The form now lies by exactly one keystroke. Explain precisely what a user sees when they type `a`, `b`, `c` into username, then fix it.

**Practices:** why derived state can't go stale and stored state can — plus what `form` actually refers to inside an event handler.

**Hint:** the handler running the third keystroke was created during the render where `form.username` was `'ab'`. `setForm` doesn't retroactively change that variable.

**Expected:** you can describe the lag concretely ("the box says `abc`, the message still complains about a 2-character name"), and after your fix the message vanishes on the exact keystroke that makes the name valid.

### ⭐⭐⭐ 5. A rule that can see the other fields (challenge)

Add a `confirm` field whose rule is "must match the password". This is harder than it looks: `validate` calls `rule(data[field])`, so a rule only ever sees *its own* value — it has no way to compare against `password`. Extend the validator so rules receive the whole `data` object as a second argument, write a `sameAs(otherField, description)` factory on top of it, and confirm your change doesn't disturb the three existing rules.

**Practices:** evolving a pure API without breaking its callers — extra arguments are free in JavaScript.

**Hint:** `rules.map((rule) => rule(data[field], data))`. A function declared as `(v) => ...` cheerfully ignores a second argument.

**Expected:** password "hunter22" with confirm "hunter23" shows "confirm must match the password"; fixing the last character clears it; changing the *password* while confirm stays put makes the message come back (the rule reads live data, not a snapshot). Username, email, and password validate exactly as before.

### ⭐⭐⭐ 6. Extract `useForm` so the next form is free (challenge)

`App` currently owns four things — form state, touched state, the change handler, and the submit ritual — none of which mention sign-up specifically. Extract them into a custom hook `useForm(initial, schema)` returning `{ form, touched, errors, isValid, handleChange, handleSubmit }`, where `handleSubmit(onValid)` *returns* the event handler so the caller supplies what "valid" means. Derive the list of field names from the schema so the markup and the rules can never drift apart.

**Practices:** custom hooks as the extraction tool for stateful logic, the same way components extract markup.

**Hint:** `onSubmit={handleSubmit(() => setSubmitted(true))}` — the hook does `preventDefault`, marks every schema key touched, and only then calls your callback. `Object.keys(schema)` gives you both the touch-everything object and the render loop.

**Expected:** the page behaves identically to before, `App` shrinks to a schema plus markup plus its own `submitted` flag, and a second form would need no new state logic whatsoever.

## Solutions

### 1. A rule factory of your own

```js
const maxLength = (n) => (v) =>
  typeof v === 'string' && v.length > n ? `must be at most ${n} characters` : null;

const signupSchema = {
  username: [required(), minLength(3), maxLength(12)],
  email: [required(), matches(/^\S+@\S+\.\S+$/, 'be a valid email')],
  password: [required(), minLength(8)],
};
```

**Why:** a rule is just `value -> message | null`, so a new kind of rule is a new tiny function — nothing downstream needs to know it exists. `validate` maps over whatever rules it finds, `Field` renders whatever messages come back, and the schema is the only place that decides which rules apply where. The `typeof v === 'string'` guard keeps the rule honest if the field is ever `undefined`, exactly like `minLength`.

### 2. Politeness on blur, not on keystroke

```jsx
function Field({ name, type = 'text', value, errors, touched, onChange, onBlur }) {
  const show = touched && errors.length > 0;
  return (
    <div>
      <input
        name={name} type={type} placeholder={name} value={value}
        className={show ? 'invalid' : ''}
        onChange={onChange}
        onBlur={onBlur}
      />
      {show && errors.map((e) => <p key={e} className="error">{name} {e}</p>)}
    </div>
  );
}

// in App:
function handleChange(e) {
  const { name, value } = e.target;
  setForm((f) => ({ ...f, [name]: value })); // no touching here any more
}

function handleBlur(e) {
  setTouched((t) => ({ ...t, [e.target.name]: true }));
}

// pass it down: <Field ... onChange={handleChange} onBlur={handleBlur} />
```

**Why:** `touched` was always about politeness, and blur is the more polite moment: "you've had your turn in this box, now I may comment." Validity itself is unaffected — `errors` is still derived on every keystroke, so once a field *is* touched the message updates live, which is why fixing a blurred field feels instant. One knock-on effect worth noticing: the submit button's `Object.keys(touched).length > 0` half now flips on the first blur rather than the first letter, so a user typing without ever leaving the box keeps an enabled button — which is fine, because submitting is what reveals everything anyway.

### 3. Predict the empty submit

**Six messages**, two per field: "username is required" and "username must be at least 3 characters"; "email is required" and "email must be a valid email"; "password is required" and "password must be at least 8 characters". No "✅ account created". The button is **enabled before the click and disabled after it**.

**Why:** `validate` has no early return — every rule of every field runs, and `''` fails `required` *and* the length/pattern rule, so each field contributes two messages. They were all true from the very first render; the click only flipped `touched` to `{username: true, email: true, password: true}`, which is what lets `Field` show them. The button's condition is `!isValid && Object.keys(touched).length > 0`: on a pristine form the second half is `false` (zero touched keys), so the button stays clickable — that click is the whole point, it's how the user asks to see the damage. Afterwards there are three touched keys and the form is still invalid, so the button locks until the fields are actually fixed.

### 4. Fix the one-keystroke-late errors

The bug, described: after typing `a`, `b`, `c`, the box reads `abc` but the message still says "must be at least 3 characters". Type `d` and the message finally disappears while the box reads `abcd`. Every displayed error describes the *previous* keystroke.

```jsx
// delete the useState for errors and the setErrors call; go back to:
const errors = validate(form, signupSchema);
const isValid = Object.keys(errors).length === 0;

function handleChange(e) {
  const { name, value } = e.target;
  setForm((f) => ({ ...f, [name]: value }));
  setTouched((t) => ({ ...t, [name]: true }));
}
```

**Why:** `form` inside `handleChange` is the value captured when that render created the handler — the third keystroke's handler closed over `form.username === 'ab'`, so `validate(form, ...)` inspected `'ab'` no matter what the user just typed. Even fixing it to validate `{ ...form, [name]: value }` would only patch this one path and leave `isValid` in the submit handler to rot separately. Deriving during render removes the class of bug rather than the instance: there is no second copy of the truth to keep in sync, and "wasteful" is the wrong worry — `validate` on three fields is a handful of comparisons, far cheaper than the render React was doing anyway.

### 5. A rule that can see the other fields

```js
function validate(data, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const fieldErrors = rules
      .map((rule) => rule(data[field], data)) // rules now get the whole object too
      .filter(Boolean);
    if (fieldErrors.length > 0) errors[field] = fieldErrors;
  }
  return errors;
}

const sameAs = (otherField, description) => (v, data) =>
  v !== data[otherField] ? `must ${description}` : null;

const signupSchema = {
  username: [required(), minLength(3)],
  email: [required(), matches(/^\S+@\S+\.\S+$/, 'be a valid email')],
  password: [required(), minLength(8)],
  confirm: [required(), sameAs('password', 'match the password')],
};

// App: add confirm to the initial form state, to the touched-everything object
// in handleSubmit, and to the ['username', 'email', 'password'] render list
// (type: name === 'password' || name === 'confirm' ? 'password' : 'text').
```

**Why:** the extra argument is invisible to `required`, `minLength`, and `matches` — a JavaScript function declared with one parameter simply ignores the second — so this is a genuinely backwards-compatible change to a pure module. Because `data` is the *current* form object handed in during render, the comparison is always live: edit the password and the confirm error reappears without any wiring between the two fields. One honest wrinkle to expect: an empty `confirm` with a filled password shows two messages ("is required" and "must match the password"), since both rules fail; if that annoys you, that's an argument for a rule order convention, not for early returns.

### 6. Extract `useForm` so the next form is free

```jsx
function useForm(initial, schema) {
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState({});

  const errors = validate(form, schema);
  const isValid = Object.keys(errors).length === 0;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setTouched((t) => ({ ...t, [name]: true }));
  }

  const handleSubmit = (onValid) => (e) => {
    e.preventDefault();
    const all = {};
    for (const name of Object.keys(schema)) all[name] = true;
    setTouched(all);
    if (isValid) onValid(form);
  };

  return { form, touched, errors, isValid, handleChange, handleSubmit };
}

function App() {
  const { form, touched, errors, isValid, handleChange, handleSubmit } =
    useForm({ username: '', email: '', password: '' }, signupSchema);
  const [submitted, setSubmitted] = useState(false);

  return (
    <form onSubmit={handleSubmit(() => setSubmitted(true))} noValidate>
      <h1>Sign up</h1>
      {Object.keys(signupSchema).map((name) => (
        <Field
          key={name}
          name={name}
          type={name === 'password' ? 'password' : 'text'}
          value={form[name]}
          errors={errors[name] ?? []}
          touched={Boolean(touched[name])}
          onChange={handleChange}
        />
      ))}
      <button type="submit" disabled={!isValid && Object.keys(touched).length > 0}>
        create account
      </button>
      {submitted && <p>✅ account created</p>}
    </form>
  );
}
```

**Why:** none of the extracted logic ever mentioned sign-up, which is the tell that it belongs in a hook — the hook keeps the state, the caller keeps the meaning. `handleSubmit` takes the success callback and *returns* the handler because "what happens when it's valid" is the one thing that genuinely differs per form; everything before that line (prevent the reload, touch everything, check validity) is identical everywhere. Reading `isValid` inside the returned handler is safe: it was derived from `form` during the same render that created the closure, and `setTouched` doesn't change validity. Driving the render loop off `Object.keys(schema)` closes the last gap where a field could exist in the rules but never appear on screen.
