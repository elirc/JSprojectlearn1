# React 33 — Context splitting

**Lesson: a context consumer wakes for every value change — so split contexts by
"what changes together," and stabilize provider values.**

## Run it

Open `original.html` and just watch: a notification ticks every second, and
*all three* render counters tick with it. Refactor: the bell ticks alone;
toggling the theme wakes only the theme panel.

## What's wrong with the original?

One `AppContext` carries theme + user + notifications. Two compounding
problems:

1. **Context has no field-level subscriptions.** A consumer re-renders when
   the context *value* changes — any of it. The theme panel doesn't read
   `notifications`, but it consumes the object that carries them, so every
   notification re-renders every consumer. One chatty field (a ticking
   counter, a mouse position, a websocket feed) makes the whole context chatty.
2. **`value={{ theme, setTheme, user, notifications }}`** is a fresh object
   every render — project 30's trap at the provider, meaning consumers can
   wake even when *nothing* they use changed.

Mega-contexts are how "we put it in context for convenience" becomes "the
whole app re-renders every second."

## What changed in the refactor

- **One context per concern** — theme, user, notifications — split by the same
  rule that groups state (react#12) and objects (js#26): *what changes
  together travels together; what changes separately, separately.* Consumers
  subscribe to exactly what they read, and the counters prove the isolation.
- **Provider values are stabilized**: `useMemo(() => ({ theme, setTheme }),
  [theme])` — the theme object is rebuilt only on real theme changes (project
  30 at the provider). For contexts holding a primitive (notifications), the
  value is already stable by nature — another point for small contexts.
- The nesting ceremony (three providers) is the honest price; project 41
  packages providers+reducer into a tidy store. A fourth tool worth knowing:
  splitting a *fast-changing* value out of a context is the same medicine as
  project 29's colocation — give the chatty thing the smallest audience.

## Key takeaway

Context is a broadcast channel, and every consumer hears every broadcast.
Design channels the way you design state groups: by rate and reason of change.
One slow channel (theme), one medium (user), one fast (notifications) — never
one firehose that everyone must drink from.
