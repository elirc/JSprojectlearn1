# React 05 — Props design

**Lesson: mutually exclusive booleans are one variant prop in disguise — js#11's
boolean-flag-soup lesson, applied to component APIs.**

## Run it

Open `original.html` and look at the "states nobody designed" section: `primary`
*and* `danger` on the same button, `small` *and* `large`.

## What's wrong with the original?

1. **Five booleans = 2⁵ = 32 combinations; the design system defines 9.** The
   other 23 compile fine and render *something*, decided silently by the order of
   the `if`s (`danger` beats `primary` because its `if` comes later — pure
   accident). This is js#40's boolean-explosion arithmetic, living inside a
   component's props.
2. **`<Button primary danger />` doesn't even look wrong at the call site** —
   boolean props read fine individually; nothing marks them as exclusive.
3. **`label` as a string prop is a one-prop-wide content door.** Icon? Keyboard
   hint? Bold word? The component says no.

## What changed in the refactor

- **One prop per *axis* of variation**: `variant` (what kind) and `size` (how
  big), each a named value from a table. Exclusive states became *one value each*
  — "primary and danger" is unrepresentable, not merely discouraged. Call sites
  now speak the design system's vocabulary: `variant="danger" size="large"`.
- **The styles are lookup tables** (`VARIANTS`, `SIZES`) — rules-as-data yet
  again; adding a variant is one row, and unknown names **throw** with the bad
  value in the message (js#30) instead of silently styling as default.
- **`children` replaces `label`** — the content door is now as wide as JSX. This
  is the single biggest API upgrade most components can get, and it's free.
- The TypeScript track finishes this lesson: `variant: 'primary' | 'danger' | …`
  turns typos into compile errors (ts#06).

## Key takeaway

Design a component's props the way you'd design a function's parameters, because
that's what they are. Two booleans that can't both be true are one enum. Content
goes through `children`. And every prop combination someone *can* pass is a state
someone *will* ship — make the impossible ones inexpressible.
