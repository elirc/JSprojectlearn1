# 📘 Learning Guide: Typestate Connection

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

A network connection has a **lifecycle**: it starts disconnected, you connect it, you send messages, you close it. Some operations only make sense in some phases — sending on a closed connection is meaningless, connecting an already-connected one is a bug.

The usual implementation is a single class with a nullable field:

```ts
class Connection {
  private socket: Socket | null = null;
  send(message: string): void {
    if (this.socket === null) throw new Error('not connected');
    ...
  }
}
```

The lifecycle is *in there* — it's the `null` — but it's invisible from the outside. `Connection` is the same type before, during and after, so autocomplete offers `send()` to a connection that has never connected, and the mistake surfaces as a runtime exception in production.

**Typestate** is the fix: give each phase its own type, put each operation on the type that allows it, and make every transition *return* the type you land in. Exercise 45 applied this to an object under construction; this is the sequential version, where the states form a cycle.

## 2. Concepts you need first

### 2.1 A nullable field is a state machine in disguise

```ts
private socket: Socket | null = null;
```

Two states — `null` and not-`null` — and every method has to re-derive which one it's in. The compiler *can* narrow `this.socket` inside a method (exercise 09), but it cannot narrow it at a **call site**, because the caller doesn't know what the field holds. That gap is the whole bug class.

### 2.2 Separate types make separate capabilities

```ts
interface Disconnected { connect(): Connected }
interface Connected { send(message: string): Connected; close(): Disconnected }

declare const idle: Disconnected;
idle.connect(); // ✅
idle.send('x'); // ❌ Error: Property 'send' does not exist on type 'Disconnected'
```

Notice the error: not "you may not do that", but "there is no such thing." The illegal operation isn't guarded, it doesn't *exist*.

### 2.3 Transitions as return values

```ts
const live = idle.connect();   // live: Connected
const closed = live.close();   // closed: Disconnected
```

Each method's return type says where you end up. This is what strings the states together: you cannot obtain a `Connected` except by calling `connect()`, so `send()` is unreachable until you have connected — enforced by the *type* of the only producer.

### 2.4 The only-door principle

Exercise 29 used constructor functions as the only way to make a branded value. Same idea here: `connection(url)` is the only way to get a `Disconnected`, and `connect()` is the only way to get a `Connected`. If some other function also returned a `Connected` out of thin air, the guarantee would leak. Keeping the producers few and named is the design.

### 2.5 Discriminated unions and typestate are two views of one idea

Keep a literal `state` field on each type and the union becomes narrowable (exercise 10):

```ts
function describe(link: Disconnected | Connected): string {
  switch (link.state) {
    case 'disconnected': return `idle (${link.url})`;
    case 'connected':    return `live (${link.url})`;
    default: {
      const impossible: never = link; // exercise 12's exhaustiveness check
      return impossible;
    }
  }
}
```

Use the **union** when you're holding something whose state you don't know and must handle every case. Use the **individual types** when you know the state and want the wrong operations to disappear. Same types, two jobs.

### 2.6 What TypeScript cannot do: linear types

A **linear type** is one the compiler guarantees is used exactly once — so "consuming" a value would make the old binding unusable. TypeScript has no such thing:

```ts
const live = idle.connect();
const closed = live.close();
live.send('still compiles'); // ❌ conceptually wrong, ✅ compiles
```

`close()` returned a new handle, but nothing invalidated the old one. Rust models this with ownership and moves; TypeScript doesn't. So typestate in TypeScript prevents *sequence* mistakes (calling something before you're in the right state) but not *aliasing* mistakes (holding on to a stale handle). Knowing the shape of the hole is part of using the pattern honestly — and it's why the refactor keeps exactly one runtime check.

### 2.7 Closures as private state

The refactored implementation uses factory functions rather than classes:

```ts
function connected(socket: Socket): Connected {
  const handle: Connected = {
    state: 'connected',
    send(message) { socket.frames.push(message); return handle; },
    close() { socket.open = false; return connection(socket.url); },
  };
  return handle;
}
```

`socket` is captured in the closure — genuinely private, with no `private` keyword and no `null` in sight, because each factory only exists in a phase where its socket is real. (`handle` referring to itself inside `send` is fine: the reference is evaluated when `send` is *called*, long after the object exists.)

## 3. Walking through the original code

```ts
export class Connection {
  private socket: Socket | null = null;
  constructor(private readonly url: string) {}
  connect(): void { this.socket = { url: this.url, open: true, frames: [] }; }
  send(message: string): void {
    if (this.socket === null || !this.socket.open) throw new Error('send(): not connected');
    this.socket.frames.push(message);
  }
  close(): void {
    if (this.socket !== null) this.socket.open = false;
    this.socket = null;
  }
}
```

Every method returns `void`, so nothing about the object's type ever changes — and every method is available on every instance. The four scenarios in the file:

- `eagerSend()` — `send()` on a fresh connection. Compiles; throws.
- `useAfterClose()` — connect, send, close, send. Compiles; the last line throws.
- `reconnectStorm()` — `connect()` twice. Compiles, throws *nothing*, and drops the first socket on the floor. This is the nastiest of the four because there's no exception to trace: frames queued on the first socket vanish, and the symptom appears days later as "messages sometimes disappear."
- `closeTwice()` — `close()` twice. A no-op that quietly tolerates a real ordering mistake somewhere upstream.

## 4. What's wrong with it (in beginner terms)

**Bug story 1 — the eager subscriber.** A component subscribes to a feed in its constructor and calls `connection.send('subscribe')` immediately, while `connect()` happens a tick later in an effect. In development the timing works; under load it doesn't, and 0.3% of sessions get "send(): not connected" with no other clue.

**Bug story 2 — the retry that reconnects.** An error handler calls `connect()` to recover. On a flaky network it runs while a connection is already open. No error is thrown, so nothing is logged; the app now holds a socket whose frames nobody reads, and the old one leaks. This is the failure that *looks* like it worked.

**Bug story 3 — the tidy-up.** A cleanup function calls `close()`, then a late-arriving callback calls `send()`. Use-after-close, the same shape as use-after-free in C — and equally invisible to a reader, because the two calls are in different files.

**The pattern:** every one of these is well-typed *per call* and wrong *as a sequence*. A type that doesn't change can't express a sequence, so the compiler has nothing to check and the `throw`s are left to do the explaining — to a user, in production, one call stack away from the mistake.

## 5. Try it yourself first!

1. **Vague hint:** the lifecycle already exists in the code — find where. (It's the `| null`.) Why can a *caller* not see it?
2. **Warmer:** stop trying to make one type describe three situations. How many types do you actually need, and which operations belong on each?
3. **Warmer still:** if `Disconnected` only has `connect()`, what should `connect()` *return* so the caller can then send? Write the two interfaces before writing any implementation — this exercise is design-first.
4. **Then:** implement them with two factory functions, `connection(url)` and an internal `connected(socket)`. Notice that neither one needs a nullable field: each exists only in a phase where its data is real.
5. **Don't forget:** keep a literal `state` field on both so the union stays narrowable (section 2.5), and write the `describe()` function with a `never` default to prove it.
6. **The honest part:** try to prevent `live.send()` after `live.close()`. You won't be able to, in the type system (section 2.6). Decide what to do about it — the refactor's answer is one runtime check, and a comment explaining why it's the only one left.

## 6. Understanding the refactored solution

The design is the two interfaces, and everything else follows:

```ts
export interface Disconnected {
  readonly state: 'disconnected';
  readonly url: string;
  connect(): Connected;
}

export interface Connected {
  readonly state: 'connected';
  readonly url: string;
  send(message: string): Connected;
  close(): Disconnected;
}
```

Read them as a state diagram: two nodes, and each arrow is a method whose return type names its destination. `send()` returning `Connected` is what keeps chaining (`live.send('a').send('b')`) while staying in the same state.

The implementation is two factories (section 2.7). `connection(url)` builds a `Disconnected`; the module-private `connected(socket)` builds a `Connected` around a live socket. `connect()` calls the second, `close()` calls the first. Because `connected` isn't exported, the *only* way any code outside this file can obtain a `Connected` is by calling `connect()` — section 2.4's only-door principle, which is what turns a convention into a guarantee.

Look at what's missing from `send()`: there is no `if (this.socket === null)`. The socket can't be null, because a `Connected` is only ever built from a real one. That's exercise 30's rule playing out — the impossible state is unrepresentable, so the check has nothing to check.

What *is* there is one guard: `if (!socket.open) throw new Error('send(): stale handle...')`. That's the linear-types hole from 2.6, patched at runtime because it can't be patched at compile time. The file says so, out loud. Four runtime checks became one, and the one that remains is documented as covering the exact gap the type system leaves.

Then the type tests replay all four original bugs as compile errors — `idle.send`, `idle.close`, `live.connect`, `closed.send`, `closed.close` — each failing with "Property X does not exist on type Y", which is the most satisfying error message in this track: not "you may not", but "there is no such thing."

## 7. Words you learned (glossary)

- **Typestate** — encoding an object's lifecycle phase in its type so illegal operations don't exist.
- **Lifecycle / state machine** — the legal sequence of operations on a resource (exercise 33).
- **Transition** — an operation that moves you from one state to another; here, a method whose return type is the destination.
- **Discriminant** — a literal-typed field (`state: 'connected'`) that lets a union be narrowed (exercise 10).
- **Exhaustiveness check** — assigning the narrowed value to `never` so a missed case fails to compile (exercise 12).
- **Only-door principle** — restricting the producers of a type so its guarantees can't be forged (exercise 29).
- **Linear type** — a type the compiler guarantees is consumed exactly once; TypeScript has none.
- **Use-after-close** — operating on a resource that has already been released.
- **Aliasing** — two bindings referring to one object, so invalidating one doesn't invalidate the other.
- **Closure state** — data captured by a factory function's scope instead of stored in a field.
- **Defensive throw** — a runtime check for a state that better types would make impossible.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the repo root after each change, then undo it.

1. Add `close(): Disconnected;` to the `Disconnected` interface (and a matching `close()` to the `connection()` factory). **Expected:** ❌ *two* "Unused '@ts-expect-error'" reports — the `idle.close()` test and the `closed.close()` test. One added method, two protections gone: you re-introduced `closeTwice()` and "close before connect" in the same edit. The type tests found both instantly, which is what type tests are for.
2. Change `send()`'s return type from `Connected` to `void`. **Expected:** ❌ `live.send('hello').send('world')` errors ("Property 'send' does not exist on type 'void'"). Chaining isn't decoration here: it's the return type carrying the state forward.
3. Export the internal `connected` factory and call it directly with a socket you build yourself, then `send()` on it. **Expected:** ✅ compiles — and that's the point of section 2.4. The guarantee comes from `connect()` being the *only* producer; export a second door and the invariant walks out of it.
4. Delete the `readonly state` fields from both interfaces. **Expected:** ❌ `describe()` stops compiling — with no discriminant there's nothing to switch on, and the two types become hard to tell apart when you're holding the union. The typestate half still works; the union half doesn't.
5. Write `const live = connection('wss://x').connect(); const closed = live.close(); live.send('zombie');`. **Expected:** ✅ compiles (section 2.6 — no linear types), and *throws* at runtime thanks to the one surviving guard. Now delete that guard and run the same code: it silently pushes a frame onto a dead socket. That comparison is the best argument for keeping exactly one runtime check.
6. Add a third state: `Connecting`, with `Disconnected.connect(): Connecting` and `Connecting.ready(): Connected`. **Expected:** ❌ every existing call site breaks until it goes through the new step — which is exactly what you want when a real async handshake gets added. Notice how cheap the change is to *find*: the compiler lists the sites for you.
