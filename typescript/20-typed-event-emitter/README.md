# TS 20 — Typed event emitter

**Lesson: js#38's emitter with an *event map* — publisher/subscriber contracts
enforced per event name, including the silent-typo bug.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

js#38's pub/sub logic, intact — with `event: string` and `...args: any[]`,
so the *contracts* between publishers and subscribers are vibes. Four
violations, all compiling: a string into the number-expecting `progress`
listener; a `done` payload missing `size` (`"(undefined bytes)"`); a
payload-less `done` (crash in the listener); and the worst —
`emit('progess', ...)`: a **typo'd event name that fires nothing,
silently**. The listener waits forever; nothing anywhere says why. Events
decouple modules (js#38's point), but decoupling without contracts means
the modules can drift apart *quietly*.

## What changed in the refactor

- **The event map**: `interface DownloadEvents { progress: number; done:
  {...}; error: {...} }` — one interface listing every event name and its
  payload type. The emitter is generic over it:
  `EventEmitter<DownloadEvents>`. This is ts#18's key↔value correlation
  (`K extends keyof EventMap`, payload `EventMap[K]`) scaled from a
  settings object to a whole API surface.
- **All four violations became type tests** — including the silent typo,
  now a loud squiggle. And listeners are checked from *their* side too:
  `on('progress', (s: string) => ...)` is rejected. The map is a contract
  both parties sign.
- **Inference keeps call sites clean**: `emitter.on('done', (file) => ...)`
  — `file` gets its type from the map, no annotation (ts#15's contextual
  typing).
- **The honest architecture note**: two `as` casts live *inside* the class
  — the Map stores listeners for different events together, and TS can't
  track which set holds which. That's the pattern worth learning:
  **contained unsafety behind a fully-checked public boundary** (ts#13's
  architecture, applied inward). Callers get total checking; the risk is
  sealed in fifteen audited lines.

## Key takeaway

Any string-keyed API — emitters, message buses, RPC clients, command
registries — can be upgraded from "names and vibes" to a typed map:
`Thing<KeyMap>`, methods generic on `K extends keyof KeyMap`, payloads as
`KeyMap[K]`. One interface becomes the single contract every publisher and
subscriber is checked against, and the silent-typo class of bug dies.
