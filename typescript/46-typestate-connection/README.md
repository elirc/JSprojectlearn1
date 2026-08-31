# TS 46 — Typestate connection

**Lesson: one class for every lifecycle state means every method is
offered at every moment. Give each state its own type, and let each
transition hand you the next one.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`Connection` has `connect()`, `send()` and `close()`, and its type is
identical before connecting, while connected, and after closing — so
the compiler can't tell which one you're holding. Four sequence bugs
compile:

- `send()` before `connect()` — throws "not connected";
- `send()` after `close()` — the classic use-after-close, throws;
- `connect()` twice — throws nothing and silently abandons the first
  socket, so messages "sometimes disappear" days later;
- `close()` twice — a harmless-looking no-op that hides a real
  ordering mistake upstream.

Each call is individually well-typed; only the *sequence* is nonsense.
The whole lifecycle is smuggled into `private socket: Socket | null`
and re-derived at runtime by `if (this.socket === null) throw` — a
state machine (ts#33) written in a language that only speaks after
deployment.

## What changed in the refactor

- **Two types, not two flags.** `Disconnected` offers exactly
  `connect()`; `Connected` offers exactly `send()` and `close()`.
  There is no `send` on `Disconnected` to guard against — the invalid
  calls aren't rejected, they're *unspellable*.
- **Transitions return the next state.** `connect(): Connected`,
  `close(): Disconnected`, `send(): Connected`. You can't reach `send`
  without going through `connect`, because `connect` is the only thing
  in the program that produces a `Connected`. Constructors as the only
  door — ts#29's discipline, applied to a lifecycle.
- **The `state` discriminant stays** so a union is still usable:
  `describe(link: Disconnected | Connected)` narrows in a `switch` and
  ends in a `never` check (ts#10/#12). Typestate and discriminated
  unions are the same idea seen from two angles — one hides the wrong
  operations, the other makes you handle every case.
- **One runtime check survives, deliberately.** TypeScript has no
  *linear* types: after `const closed = live.close()`, the old `live`
  binding is still in scope and still typed `Connected`, so
  `live.send('x')` compiles. The refactor's answer is honest rather
  than clever — transitions return handles so the natural style is to
  rebind, and `send()` keeps a single `if (!socket.open) throw` for
  the stale-alias case. One guard left of the original's four.

## Key takeaway

When an object's legal operations depend on *what happened earlier*,
a nullable field plus defensive `throw`s is a state machine the
compiler can't read. Split the states into types, make each operation
live on the state that allows it, and have every transition return the
state you land in. ts#45 did this for an object under construction —
a set of flags, order-free; this is the sequential version, and
between them they cover most of what "typestate" means in practice.
