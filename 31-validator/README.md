# 31 — Input validator

**Lesson: build a tiny library out of composable rule functions — and collect all
errors instead of doling them out one per submit.**

## Run it

```
node 31-validator/original.js
node --test 31-validator/
```

## What's wrong with the original?

1. **One error per submit.** The user fills the form wrong, submits, fixes the one
   thing the function mentioned, submits again... five round trips to discover five
   mistakes. Genuinely hostile UX, produced by an implementation detail: early
   `return` throws away everything it hasn't checked yet.
2. **The same micro-rules, re-typed per field.** "Required" is hand-written three
   times, "at least N characters" twice. And the next form — login, settings,
   checkout — *copies the whole function* and edits it. Cost grows as
   forms × fields × rules.
3. **Structure trapped in prose.** Which fields exist? Which are optional? You have
   to *read the if-chain* to find out; nothing can render, document, or reuse the
   form's shape, because the shape only exists as control flow.

## What changed in the refactor

- **A rule is a function `value → message | null`.** That one-line interface (project
  13's lesson in miniature) makes rules composable: an array of rules *is* a field's
  validation. The engine — real, complete — is ten lines.
- **Rule factories carry their configuration in closures**: `minLength(3)` *returns*
  a rule with `3` baked in. Same pattern as projects 27/28; by now it should feel
  like a reflex.
- **Schemas are data**: `{ username: [required(), minLength(3)] }` reads like the
  form spec it is. The login schema reuses the same rules with zero new logic — the
  form × field × rule explosion collapses to rules + declarations.
- **`errors` maps field → *all* its messages**, so the UI can mark every bad field at
  once. Returning `{}` for valid keeps checking cheap.
- **`optional(...rules)` is a combinator** — a rule built from rules. Absent: fine;
  present-but-invalid: checked. Note this is a *decision the original buried* in a
  nested if.
- The last test defines a custom rule inline and it drops straight in — the interface
  is the extension point, no registration required.

## Key takeaway

When you find yourself re-typing small checks in slightly different combinations,
stop writing *checks* and start writing *a vocabulary of checks*: tiny functions with
one shared shape, factories for the configurable ones, and plain data to say which
apply where. That's what a "library" is — and it's ten lines, not a dependency.
