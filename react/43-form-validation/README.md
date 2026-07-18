# React 43 — Form validation

**Lesson: js#31's schema validator drops straight into React — validation is
*derived state*, errors render at their fields, and `touched` keeps it polite.**

## Run it

Open `original.html`, fill everything wrong, submit: an `alert()` about one
problem, three round trips to learn three things. Refactor: every error at its
field, live, all at once.

## What's wrong with the original?

js#31's original, transplanted into React with a worse messenger:

1. **One error per submit** — the if-chain stops at the first failure.
2. **`window.alert`** — blocking, unstyled, and disconnected from the field it
   complains about; the user must remember the message while hunting for the
   input.
3. **Rules welded into the submit handler** — the next form copy-pastes the
   chain (and the login form already would have).

## What changed in the refactor

- **js#31's validator, verbatim** — rule factories, schema-as-data,
  collect-all-errors. Zero React in it, which is exactly why it slots in (and
  why it's already unit-tested in the JS track). Cross-track reuse is the
  quiet headline: good pure functions don't care what framework calls them.
- **Validation is derived, every render** (project 09):
  `const errors = validate(form, schema)` — no validation state, no sync, no
  stale errors. The submit button's disabled state and the per-field messages
  all read from the same derivation.
- **`touched` is the UX state** — the one genuinely new-to-React ingredient.
  Errors exist from the first render (`''` fails `required`), but *showing*
  them before the user has visited a field is hostile. `touched[field]` gates
  display; submit marks everything touched so one click reveals the full
  picture. Validity and politeness are separate concerns with separate state.
- **`Field` renders its own errors** — message beside input, red border,
  reusable across forms (project 05/06's API lessons in miniature).
- `noValidate` on the form: opt out of the browser's built-in bubbles since
  we render better ones.

## Key takeaway

Form validation in React is three separable layers: pure rules (a schema —
write once, test in Node), derived errors (compute in render, never store),
and display politeness (`touched`). Keep them separate and every next form is
a schema plus markup — no chains, no alerts, no copy-paste.
