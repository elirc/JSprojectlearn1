# TS 11 — Type guards

**Lesson: `value is T` — the runtime check and the type knowledge as one
artifact. A cast claims; a guard proves.**

## Run it

```
npm run typecheck
node --experimental-strip-types typescript/11-type-guards/refactored/messages.ts
```

## What's wrong with the original?

The instinct was right (websocket data must be checked) but the tool was a
cast: `raw as ChatMessage | JoinMessage | PingMessage` defeats `unknown` in
one line, verifying nothing. The demo lines all compile: a chat message with
no text renders `"ada: undefined"`; `user: 42, text: null` sails through; a
plain string quietly becomes `'?'`. And the alternative the original alludes
to — re-writing `typeof x === 'object' && ...` at every call site — is js#04
copy-drift applied to safety checks.

## What changed in the refactor

- **`isMessage(value): value is Message`** — a user-defined type guard. The
  return type is a *contract with the compiler*: "if I return true, treat it
  as `Message`." Callers write one `if (!isMessage(raw))` and get both the
  runtime rejection *and* the narrowed type; the check can't drift from the
  type because they're the same function.
- **The responsibility note matters**: the compiler trusts your guard's
  *body* — a guard that returns true without checking is a cast with extra
  steps. This one verifies the discriminant *and* each variant's field
  types (`user` is a string, `text` is a string), which is exactly what the
  demo attacks probe.
- **Guards compose**: `isRecord` handles the object-and-not-null
  preamble every guard needs; `isMessage` builds on it. Small guards →
  bigger guards, like js#31's rules.
- **Malformed input gets a real path** — "dropped malformed message" — not
  an accidental `'?'` (js#36: count your rejects).
- Guards pair with everything: after the guard, project 10's discriminant
  switch runs on certainty. At real API boundaries with many shapes, this
  hand-rolled pattern is what libraries like zod industrialize — project 34
  builds that bridge.

## Key takeaway

When `unknown` (or a union) needs to become a specific type, write the
function that *earns* it: `is T` in the signature, honest field checks in
the body. One guard per shape, reused at every boundary — and `as` stays
reserved for the rare cases where you truly know more than the compiler can.
