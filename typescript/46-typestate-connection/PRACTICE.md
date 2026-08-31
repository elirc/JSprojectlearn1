# 🏋️ Practice: Typestate Connection

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a COPY of `refactored/connection.ts` (so `Disconnected`, `Connected` and `connection()` are already there), or in a scratch `.ts` file inside the `typescript/` folder ending in `export {}`. Then run `npm run typecheck` from the repo root.

## Exercises

### ⭐ 1. A terminal `Closed` state (warm-up)

In the refactor, `close()` returns a `Disconnected` — so the link can be reconnected. Model a **one-way** lifecycle instead: `Idle → connect() → Live → close() → Closed`, where `Closed` offers no operations at all, only the frames that were sent.

**Practices:** a state with no transitions out of it — the type-level version of "this resource is gone."
**Hint:** three interfaces, three `state` literals, and `Closed` holding `readonly frames: readonly string[]`. Two factories are enough; `close()` can return the closed object inline.
**Check:** `idleLink(url).connect().send('hi').close().frames.length` compiles; `closed.connect()` errors ("Property 'connect' does not exist on type 'Closed'"); `closed.send('again')` errors too.

### ⭐⭐ 2. A media player with a cycle (core)

Three states, five transitions: `Stopped.play() → Playing`, `Playing.pause() → Paused`, `Paused.resume() → Playing`, and both `Playing.stop()` and `Paused.stop()` → `Stopped`. Unlike exercise 1, this lifecycle loops.

**Practices:** the recipe in a state *graph* rather than a line, and mutually recursive factories.
**Hint:** the three factories refer to each other, so declare them as `function` declarations inside a `player()` closure — hoisting makes the mutual references legal. Each returns a plain object literal.
**Check:** `p.play().pause().resume().stop().play().stop()` compiles all the way through; `p.pause()` errors ("Property 'pause' does not exist on type 'Stopped'"); `p.play().resume()` errors (a playing track pauses, it doesn't resume).

### ⭐⭐ 3. Back from the union: `describe()` and a type guard (core)

Sometimes you hold a value whose state you don't know — say, one stored in a field. Write `type Link = Idle | Live | Closed`, an exhaustive `describeLink(link: Link)`, and a user-defined type guard `isLive(link): link is Live` so you can recover the capability.

**Practices:** the two halves of LEARN 2.5 — the union for "handle every case", the guard for "get back to one case".
**Hint:** `switch (link.state)` with a `default` that assigns to `const impossible: never = link` (ts#12). The guard body is one line: `return link.state === 'live';`.
**Check:** `someLink.send('hi')` on the raw union errors; the same call inside `if (isLive(someLink))` compiles; and if you delete the `'closed'` case from the switch, the `never` assignment must fail with "Type 'Closed' is not assignable to type 'never'".

### ⭐⭐⭐ 4. Close the aliasing hole with a bracket (challenge)

LEARN 2.6 admits the gap: after `const closed = live.close()`, the stale `live` handle still compiles. You can't fix that with types — but you can make it *unreachable* by never handing the caller a handle that outlives the connection. Write `withConnection(url, use)` that connects, runs a callback, and closes in a `finally`.

**Practices:** the bracket / resource-scope pattern — designing the *API* around a limitation instead of fighting it.
**Hint:** `function withConnection<T>(url: string, use: (link: Connected) => T): T`. Connect, `try { return use(live) } finally { live.close() }`. The generic `T` lets the callback return whatever it likes.
**Check:** `withConnection(url, (link) => link.send('hello').send('world'))` compiles; `withConnection(url, (link) => link.connect())` errors (inside the bracket you're already `Connected`). Then note what the caller *cannot* do: there is no handle in scope after the call, so there's nothing stale to misuse.

### ⭐⭐⭐ 5. The other mechanic: one class, gated methods (challenge)

Rebuild the same protection using ts#45's approach instead — a single class `ClassLink<S extends Phase>` with a phantom, where `connect`, `send` and `close` are gated by `this` parameters. Then compare the two files and decide which you'd ship.

**Practices:** seeing both typestate mechanics side by side; `this` parameters used for a *sequence* rather than a set of flags.
**Hint:** `type Phase = 'disconnected' | 'connected'`, `declare private readonly phase: Record<S, true>`, and gates like `connect(this: ClassLink<'disconnected'>): ClassLink<'connected'>`. Transitions need `as unknown as` because the two instantiations are mutually unassignable — which is exactly the protection working.
**Check:** the good sequence compiles; `cl.send('hi')` before connecting errors; `clLive.connect()` errors; `clDone.send('bye')` after closing errors. Then look at the `this.socket!` inside `send` and read the WHY.

## Solutions

### 1. A terminal `Closed` state

```ts
interface Idle { readonly state: 'idle'; readonly url: string; connect(): Live }
interface Live { readonly state: 'live'; send(message: string): Live; close(): Closed }
interface Closed { readonly state: 'closed'; readonly frames: readonly string[] }

function idleLink(url: string): Idle {
  return { state: 'idle', url, connect: () => liveLink({ url, open: true, frames: [] }) };
}
function liveLink(socket: Socket): Live {
  const handle: Live = {
    state: 'live',
    send(message) { socket.frames.push(message); return handle; },
    close() { socket.open = false; return { state: 'closed', frames: socket.frames }; },
  };
  return handle;
}

const doneLink = idleLink('wss://x').connect().send('hi').close();
doneLink.frames.length;
// @ts-expect-error — a closed link is terminal: no reconnecting
doneLink.connect();
// @ts-expect-error — and certainly no sending
doneLink.send('again');
```

**WHY:** a state with no methods is a perfectly good state — it's how you say "this resource is spent" in the type system, and it's strictly better than a `closed: boolean` flag that every caller has to remember to check. Note that `Closed` still carries *data* (`frames`): terminal doesn't mean useless, it means no further transitions. Compare with the refactor, where `close()` returns `Disconnected` and the link is reusable; neither is more correct, they're different resources, and the types are where you record which one you're building.

### 2. A media player with a cycle

```ts
interface Stopped { readonly state: 'stopped'; play(): Playing }
interface Playing { readonly state: 'playing'; pause(): Paused; stop(): Stopped }
interface Paused  { readonly state: 'paused';  resume(): Playing; stop(): Stopped }

function player(track: string): Stopped {
  const stopped: Stopped = { state: 'stopped', play: () => playing() };
  function playing(): Playing {
    return { state: 'playing', pause: () => paused(), stop: () => stopped };
  }
  function paused(): Paused {
    return { state: 'paused', resume: () => playing(), stop: () => stopped };
  }
  return stopped;
}

const p = player('symphony.flac');
p.play().pause().resume().stop().play().stop();
// @ts-expect-error — you can't pause something that isn't playing
p.pause();
// @ts-expect-error — a playing track pauses; it doesn't resume
p.play().resume();
```

**WHY:** the interfaces *are* the state diagram — you can read every legal arrow off them, and there is no separate documentation to fall out of date. Two implementation details matter. First, the factories are mutually recursive (`playing` makes a `Paused` whose `resume` makes a `Playing`), which is why they're `function` declarations inside the closure: hoisting lets them refer to each other. Second, `stopped` is a single captured object rather than a factory call, which is fine because `Stopped` holds no per-session data — a small reminder that "one object per state" is about *types*, not about allocating.

### 3. Back from the union

```ts
type Link = Idle | Live | Closed;

function describeLink(link: Link): string {
  switch (link.state) {
    case 'idle':   return `idle (${link.url})`;
    case 'live':   return 'live';
    case 'closed': return `closed after ${link.frames.length} frames`;
    default: {
      const impossible: never = link; // ts#12
      return impossible;
    }
  }
}

function isLive(link: Link): link is Live {
  return link.state === 'live';
}

declare const someLink: Link;
// @ts-expect-error — you can't send to a link whose state you don't know
someLink.send('hi');
if (isLive(someLink)) someLink.send('hi'); // narrowed: send() is back
```

**WHY:** typestate and discriminated unions are the same types wearing different hats. When you *know* the state, the individual type hides every wrong operation; when you *don't*, the union forces you to establish it first — and the `never` default guarantees a new state can't be added without visiting this function. The type guard is the bridge back, and it's worth noticing that it's just `link.state === 'live'` promoted to a signature: the runtime check and the type-level claim sit on the same line, which is the only way a guard stays honest (ts#11).

### 4. The bracket

```ts
function withConnection<T>(url: string, use: (link: Connected) => T): T {
  const live = connection(url).connect();
  try {
    return use(live);
  } finally {
    live.close();
  }
}

const bracketed = withConnection('wss://x', (link) => {
  link.send('hello').send('world');
  return link.url;
});
// @ts-expect-error — inside the bracket you are already Connected
withConnection('wss://x', (link) => link.connect());
```

**WHY:** this is the answer to a limitation rather than a limitation itself. TypeScript can't stop you from keeping a stale handle (LEARN 2.6), so don't *give* the caller a handle: scope it to a callback, and close it in `finally` so even a thrown error can't leak the socket. The pattern has names in several languages — `with` in Python, `use` in Kotlin, bracket in Haskell, RAII in C++ — and it's the standard move whenever "you must remember to release this" would otherwise appear in a doc comment. The residual risk (a callback that squirrels `link` away in an outer variable) is small, visible in review, and much smaller than the original's.

### 5. One class, gated methods

```ts
type Phase = 'disconnected' | 'connected';

class ClassLink<S extends Phase = 'disconnected'> {
  declare private readonly phase: Record<S, true>;
  private socket: Socket | null = null;
  constructor(private readonly url: string) {}

  connect(this: ClassLink<'disconnected'>): ClassLink<'connected'> {
    this.socket = { url: this.url, open: true, frames: [] };
    return this as unknown as ClassLink<'connected'>;
  }
  send(this: ClassLink<'connected'>, message: string): ClassLink<'connected'> {
    this.socket!.frames.push(message);
    return this;
  }
  close(this: ClassLink<'connected'>): ClassLink<'disconnected'> {
    this.socket = null;
    return this as unknown as ClassLink<'disconnected'>;
  }
}

const cl = new ClassLink('wss://x');
const clLive = cl.connect();
const clDone = clLive.close();
// @ts-expect-error — send before connect
cl.send('hi');
// @ts-expect-error — connect twice
clLive.connect();
// @ts-expect-error — send after close
clDone.send('bye');
```

**WHY:** the call sites are protected exactly as well as the interface version — and the *implementation* is noticeably worse, which is the lesson. `this.socket` is still `Socket | null`, because one class has one field type across all phases, so `send` needs `this.socket!` — a non-null assertion (ts#05's lie) in the very method the design was supposed to make safe. The interface version has no nullable field at all: each factory closes over a socket that is real by construction. Rule of thumb: use flags-on-a-class (ts#45) when the states are *combinations* of independent steps and the data is the same throughout; use one-type-per-state when the states are a *sequence* and each carries different data. Here, `Closed` has frames and no socket, `Idle` has a URL and no socket — different data, so different types.
