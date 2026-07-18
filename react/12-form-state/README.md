# React 12 — Form state

**Lesson: fields that live and die together belong in one state object — with one
generic change handler.**

## Run it

Open both files. Identical form; then count what it costs each version to reset,
save, and prefill.

## What's wrong with the original?

Six fields → six `useState`s, six inline handlers, and — the real tax — **three
functions that each enumerate all six fields** (`reset`, `save`,
`copyFromProfile`). The form *as a whole* exists nowhere in the program; only its
shrapnel does, so every whole-form operation reassembles it by hand, and every
new field must be threaded through all of them. (Same disease as react#02's
hardcoded list: the collection is implicit in the code instead of explicit in the
data.)

When *should* fields be separate `useState`s? When they're genuinely independent
— a search box and a sidebar-collapsed flag don't reset together. These six do
everything together; that's the tell they're one value.

## What changed in the refactor

- **The form is one object in one `useState`.** Reset is `setForm(EMPTY_FORM)`.
  Prefill is `setForm(PROFILE_ADDRESS)`. Save is `JSON.stringify(form)`. Every
  field-by-field enumeration became a one-liner, because the whole form is now a
  *value* you can pass around (js#39 taught why whole-state-as-a-value pays off).
- **One `handleChange` serves every field**, via two small idioms working
  together: the input's `name` attribute names the key, and the **computed
  property** `{ ...current, [name]: value }` updates it — spread-copy (project
  10), never mutation. Six inline arrows → one named function.
- **Field definitions became data** (`FIELDS`) and the inputs a `map` — adding a
  field is a row in `FIELDS` plus a key in `EMPTY_FORM`, zero new handlers.
- `EMPTY_FORM` doubles as documentation: the form's complete shape, in one
  place, usable as the reset value *because* it's a constant object.

## Key takeaway

The grouping question for state is "what changes together?" — fields submitted
together, reset together, and validated together are one object. Pair it with the
`name`-attribute + computed-property handler and forms stop scaling in handlers,
setters, and reset lines — they scale in data rows only.
