# React 31 — Resetting state with key

**Lesson: when a component should "start over" for a new subject, don't sync
props into state with an effect — change its `key`.**

## Run it

Open `original.html`: edit Ada's bio, click Grace, and catch the stale draft
flashing before the "sync" effect corrects it. Refactor: instant fresh drafts,
no effect anywhere.

## What's wrong with the original?

The requirement — "the draft resets when the selected user changes" — collides
with a fact from project 23: **state initializers run once, on mount**. The
component *instance* survives the user switch (same position in the tree), so
its state does too. The v2 patch is the infamous prop-to-state sync effect:

1. **It renders wrong content first**, then corrects — one frame of Ada's
   draft under Grace's name (visible if you look, and a real bug class in
   forms: type fast enough and your keystroke lands in the wrong user's
   draft).
2. It **silently destroys unsaved edits** after the fact.
3. It's a state←prop sync effect — the exact species project 21 declared
   always-suspicious. Correctly so.

The deep issue: the component is being *reused* across users while its state
pretends to belong to one of them.

## What changed in the refactor

- **One attribute**: `<BioEditor key={user.id} ... />`. Keys are identity
  (project 03); a changed key tells React "different thing" — so it unmounts
  the old instance (state included) and mounts a fresh one, whose initializer
  reads the new user. The wrong-content frame never exists, because the old
  instance never renders with the new user's props.
- **The editor got simpler, not smarter**: no effect, no `user.id` watching —
  it's allowed to assume it will only ever see one user, because the parent's
  `key` guarantees it. Complexity moved from runtime logic to a structural
  declaration.
- When is the sync-effect *family* legitimate? Almost never for full resets
  (use `key`); for *partial* derivation ("reset page number when the list
  changes but keep the filters"), prefer deriving (`project 09`) or computing
  during render with a previous-value comparison. Full reset = `key`. That
  covers the real cases.

## Key takeaway

`key` isn't just for lists — it's React's lever for component *identity*
anywhere. "Same key, update in place; new key, start over." When you want
start-over semantics (editors, forms, animations, per-item timers), reach for
`key={subjectId}` before you ever write `useEffect(() => setState(prop))`.
