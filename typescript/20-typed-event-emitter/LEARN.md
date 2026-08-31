# 📘 Learning Guide: Typed Event Emitter

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

An **event emitter** is a tiny message hub. One part of a program says "when the `'done'` event happens, run this function" (that's **subscribing**, via `.on(...)`). Another part says "the `'done'` event just happened, here's the data" (that's **publishing**, via `.emit(...)`). The two parts never call each other directly — they only agree on event *names* and what data comes with each one.

The type-level problem: in the original, event names are plain `string`s and payloads are `any`. So the "agreement" between publisher and subscriber is enforced by nobody. Wrong data compiles. Missing data compiles. Worst of all, a *typo'd event name* compiles — and simply fires nothing, forever, in total silence.

The fix is an **event map**: one interface listing every event name with its payload type, with the emitter class made generic over it.

## 2. Concepts you need first

### The pub/sub (publish/subscribe) pattern
"Pub/sub" decouples modules. Instead of the download code calling the UI code directly, the download code emits `'progress'` and whoever cares listens. Great for flexibility — but the modules now only agree via string names, so nothing stops them drifting apart.

### Classes and `private` (quick recap)
A `class` bundles data and methods. `private` fields are usable only inside the class:

```ts
class Counter {
  private n = 0;              // callers can't touch this
  increment() { this.n++; }
}
```

### Generic classes
Just like generic functions (exercise 16's LEARN.md), a *class* can carry a type parameter that every method shares:

```ts
class Box<T> {
  constructor(private value: T) {}
  get(): T { return this.value; }
}
const b = new Box(42); // Box<number>
b.get().toUpperCase(); // ❌ Error: number has no toUpperCase
```

### `keyof` — the union of an object type's keys
`keyof` turns a type's property names into a union of string literal types:

```ts
type Events = { progress: number; done: string };
type Names = keyof Events; // 'progress' | 'done'
```

### Lookup types — `EventMap[K]`
You can index into a *type* with a key type, like indexing an object with a key:

```ts
type Events = { progress: number; done: string };
type P = Events['progress']; // number
```

Combine with a generic: if `K extends keyof Events`, then `Events[K]` is "the payload type belonging to whichever event name K is." That correlation — key in, matching value out — is exercise 18's big idea, and this exercise scales it up to a whole API.

### `Record<string, unknown>`
`Record<A, B>` means "an object whose keys are `A` and values are `B`". Here it's used as a *constraint*: `EventMap extends Record<string, unknown>` means "the event map must be an object type with string keys" — any payload types allowed.

### Function types as values
A listener is just a function stored in a collection. Its type is written with an arrow, e.g. `(payload: number) => void`. `void` means "returns nothing we care about." (Exercise 15's LEARN.md covers function types.)

### Type assertions (`as`) — telling, not asking
`value as SomeType` *overrules* the compiler: "treat this as that type, trust me."

```ts
const x = 'hello' as unknown as number; // ✅ compiles — and lies
```

`as` is dangerous precisely because it always compiles. Exercise 14's LEARN.md covers when it lies. This exercise shows the one respectable use: a *contained*, commented cast inside a class, where the public API stays fully checked.

### `@ts-expect-error`
A comment asserting the next line must fail to compile — used as a "type test." Explained in exercise 19's LEARN.md.

## 3. Walking through the original code

```ts
type Listener = (...args: any[]) => void;
```

A listener is "a function taking any number of arguments of any type." This is the root problem: from here on, no payload is ever checked.

```ts
export class EventEmitter {
  private listeners = new Map<string, Set<Listener>>();
```

The storage: for each event name (a `string` — *any* string), a `Set` of listener functions. A `Set` is a collection with no duplicates.

```ts
on(event: string, listener: Listener): () => void {
  if (!this.listeners.has(event)) this.listeners.set(event, new Set());
  this.listeners.get(event)!.add(listener);
  return () => this.listeners.get(event)?.delete(listener);
}
```

`on` files the listener under the event name and returns an "unsubscribe" function — call it later to remove the listener. Note `event: string`: the compiler will accept `'progress'`, `'progess'`, or `'porgres'` with equal enthusiasm.

```ts
emit(event: string, ...args: any[]): void {
  for (const listener of [...(this.listeners.get(event) ?? [])]) {
    listener(...args);
  }
}
```

`emit` looks up the listeners for a name and calls each with whatever arguments were given. If the name has no listeners (say, because it's a typo), `?? []` quietly loops over nothing.

Then the demo wires up a download manager and commits four crimes, all of which compile:

```ts
emitter.emit('progress', 'fifty');        // string to a number listener
emitter.emit('done', { name: 'a.zip' });  // size missing
emitter.emit('progess', 50);              // typo'd name — fires NOTHING
emitter.emit('done');                     // no payload at all
```

## 4. What's wrong with it (in beginner terms)

**Flaw 1: payload types are on the honor system.** The `'progress'` listener declared `(percent: number)`, but `emit` sends `'fifty'`. The listener prints `fifty%`. Nothing checked that publisher and subscriber agree.

**Flaw 2: partial payloads slip through.** `emit('done', { name: 'a.zip' })` forgot `size`. The listener prints `a.zip (undefined bytes)`. Ugly, silent, shipped.

**Flaw 3: missing payloads crash.** `emit('done')` sends nothing; the listener does `file.name` on `undefined` and throws "Cannot read properties of undefined." That's a runtime crash from a line the compiler happily approved.

**Flaw 4 — the worst one: the silent typo.** `emit('progess', 50)`. That's not an event anyone subscribed to, so the emitter finds zero listeners and does... nothing. No crash, no log, no clue. The progress bar just never moves. You'll spend an hour in the debugger before you *see* the missing `r`. A crash tells you where it hurts; a silent no-op tells you nothing.

The deeper point: events decouple modules — that's their job — but decoupling *without a contract* means the two sides can drift apart quietly. The types should BE the contract.

## 5. Try it yourself first!

1. **Vague hint:** The emitter needs to know, per event name, what the payload type is. Where could that knowledge live?
2. **Less vague:** Write one type listing all three events and their payloads, like an object type: name on the left, payload type on the right.
3. **More specific:** Make the class generic: `class EventEmitter<EventMap>`. Now `on` and `emit` shouldn't take `event: string` — they should take a `K` that is *one of the keys* of `EventMap`.
4. **Very specific:** `on<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void)`, and `emit<K extends keyof EventMap>(event: K, payload: EventMap[K])`. Create it as `new EventEmitter<DownloadEvents>()`.
5. **When the internals fight you:** the private `Map` stores listeners for *different* events together, and TypeScript can't prove which set holds which. You will need one or two `as` casts *inside* the class. That's expected — keep them private and commented.

## 6. Understanding the refactored solution

```ts
export class EventEmitter<EventMap extends Record<string, unknown>> {
```

The class takes an event map — any object type mapping names to payload types.

```ts
on<K extends keyof EventMap>(
  event: K,
  listener: (payload: EventMap[K]) => void,
): () => void {
```

`K` is pinned to one specific event name per call. When you write `emitter.on('done', ...)`, `K` becomes `'done'`, so the listener must accept `EventMap['done']` — the exact payload type for that event. Contextual typing means the listener's parameter needs no annotation: write `(file) => ...` and `file` already knows it's `{ name: string; size: number }`.

```ts
emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
```

Same correlation on the publishing side. `emit('progress', 50)` — fine. `emit('progress', 'fifty')` — error. `emit('progess', 50)` — error, because `'progess'` is not a key of the map. **The silent-typo bug is now a loud compile error.**

The honest part — two casts inside the class:

```ts
set.add(listener as (payload: never) => void);
```

Why? The one private `Map` holds listeners for *all* events mixed together. TypeScript can't track "this particular `Set` only holds `'done'` listeners." So the code stores them under a deliberately impossible type and casts at the boundary. This is **contained unsafety**: about fifteen lines you audit once, sealed behind public method signatures that are fully checked. Callers never see or need a cast.

The event map itself:

```ts
type DownloadEvents = {
  progress: number;
  done: { name: string; size: number };
  error: { message: string };
};
```

One place that says everything. Note the comment in the file: it's a `type` alias on purpose. If you instead wrote `interface DownloadEvents extends Record<string, unknown>`, the interface would *inherit a string index signature* — meaning "any string is a valid key" — and typo'd event names would become legal again. Subtle! The five `@ts-expect-error` type tests at the bottom exist to catch exactly that kind of regression: all four original violations, plus a wrongly-typed listener, each pinned as a must-not-compile.

## 7. Words you learned (glossary)

- **Event emitter**: an object that routes named events from publishers to subscribers.
- **Pub/sub**: the pattern of publishing events and subscribing listeners, instead of direct calls.
- **Listener / callback**: a function stored now, called later when the event fires.
- **Payload**: the data sent along with an event.
- **Event map**: one type listing every event name and its payload type.
- **Generic class**: a class with a type parameter shared by all its methods.
- **`keyof`**: operator giving the union of a type's property names.
- **Lookup type (`T[K]`)**: indexing into a type to get a property's type.
- **`Record<K, V>`**: object type with keys `K` and values `V`.
- **Constraint (`extends`)**: a rule limiting a type parameter.
- **Contextual typing**: callback parameters getting types from their surroundings.
- **Type assertion (`as`)**: manually overriding the compiler's view of a type.
- **Contained unsafety**: unavoidable casts kept private behind a fully-checked public API.
- **Index signature**: a type rule saying "any key of this kind is allowed" — handy sometimes, typo-friendly here.
- **Silent no-op**: code that does nothing instead of failing — the hardest bug to notice.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change; undo afterward.

1. In `refactored/emitter.ts`, add a new event to `DownloadEvents`: `paused: { at: number }`. Then write `emitter.emit('paused', { at: 3 })`. Expect: ✅ compiles — and try `emitter.emit('paused', {})` to see the missing-field error.
2. Change `type DownloadEvents = {...}` to `interface DownloadEvents extends Record<string, unknown> {...}`. Expect: the `@ts-expect-error` on `emit('progess', 50)` itself errors with "Unused '@ts-expect-error' directive" — the typo became legal, and the type test caught the regression. (This is the exact trap the file's comment warns about.)
3. Remove `extends keyof EventMap` from `emit`'s `K`. Expect: errors inside the method body — `EventMap[K]` stops making sense when `K` can be anything.
4. Give a listener the wrong payload type on purpose: `emitter.on('done', (file: string) => {})`. Expect: ❌ error — the contract is checked from the subscriber's side too, not just the publisher's.
5. Try `emitter.emit('progress')` with no payload. Expect: ❌ error — payloads are required arguments now. Then ask yourself: how would you design an event that genuinely has *no* payload? (Hint: try `payload: void` in the map and see what the compiler lets callers do.)
