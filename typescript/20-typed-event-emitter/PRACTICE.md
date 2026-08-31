# 🏋️ Practice: Typed Event Emitter

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}`) and run `npm run typecheck` from the `typescript/` folder. Reuse the class with `import { EventEmitter } from './refactored/emitter.js';` — you are writing *new* maps and *new* helpers around it, not rewriting it.

## Exercises

### ⭐ 1. A map for a different domain (warm-up)

Design `ChatEvents` for a chat client: `message` carries `{ from: string; text: string }`, `typing` carries `{ from: string }`, and `disconnect` carries `{ reason: string }`. Create `const chat = new EventEmitter<ChatEvents>()`, subscribe to `message` and `disconnect` writing **no parameter annotations at all**, and emit one of each.

**Practices:** writing an event map and letting contextual typing fill in every listener parameter.
**Hint:** use a `type` alias, not `interface ... extends Record<string, unknown>` — the file's comment explains why that difference matters.
**Check:** the two listeners must compile with bare `(m) =>` / `(d) =>` parameters; add `@ts-expect-error` tests catching `emit('mesage', ...)`, `emit('typing', { from: 1 })`, and `emit('message', { from: 'ada' })` (no `text`).

### ⭐⭐ 2. `once` — a helper generic over *any* emitter (core)

Write a standalone `once(emitter, event, listener)` that subscribes, and unsubscribes itself the first time the event fires. The hard part is the signature: it must work for any event map, so it needs *two* type parameters — one for the map (constrained the way the class constrains it) and one for the event name.

**Practices:** being generic over the event map itself, so a helper stays as checked as the class it wraps.
**Hint:** `<EventMap extends Record<string, unknown>, K extends keyof EventMap>`, with the emitter typed `EventEmitter<EventMap>` and the listener `(payload: EventMap[K]) => void`.
**Check:** `once(chat, 'message', (m) => console.log(m.text))` must compile with `m` inferred; add `@ts-expect-error` tests catching a listener annotated `(m: number)` and the event name `'joined'`.

### ⭐⭐ 3. The same pattern, a different API (core)

The README claims *any* string-keyed API can be upgraded this way. Prove it: write `class CommandBus<Commands extends Record<string, unknown>>` with `register<K extends keyof Commands>(name: K, handler: (input: Commands[K]) => void)` and `run<K extends keyof Commands>(name: K, input: Commands[K])`. Drive it with an `EditorCommands` map (`insertText: { at: number; text: string }`, `deleteRange: { from: number; to: number }`, `save: { path: string }`).

**Practices:** transplanting the `Thing<KeyMap>` shape onto a command registry, including the contained internal cast.
**Hint:** you will hit the same storage problem the emitter has — one `Map` holding handlers for different commands. Store them as `(input: never) => void` and cast at both boundaries, keeping the casts private.
**Check:** `bus.run('insertText', { at: 0, text: 'hello' })` must compile; add `@ts-expect-error` tests catching `run('sav', ...)`, `run('deleteRange', { from: 3 })`, and a `save` handler annotated `(input: string)`.

### ⭐⭐ 4. Two lookups per key (core)

An RPC client needs both directions correlated. Write `type Api` where each method maps to `{ input: ...; output: ... }` — `getUser` takes `{ id: number }` and returns `{ name: string; email: string }`, `listPosts` takes `{ authorId: number }` and returns `{ titles: string[] }`, `deletePost` takes `{ id: number }` and returns `{ deleted: boolean }`. Then declare `call<K extends keyof Api>(method: K, input: Api[K]['input']): Promise<Api[K]['output']>` (a `declare function` is enough) and use it in an `async` function.

**Practices:** chained indexed access — `Api[K]['input']` — so one key drives two correlated types at once.
**Hint:** `Api[K]` is itself an object type, so you can index into it again; a lookup type is just a type, and types compose.
**Check:** `(await call('getUser', { id: 7 })).name` must compile; add `@ts-expect-error` tests catching `call('getUser', { name: 'ada' })`, `.then((u) => u.titles)` on a `getUser` call, and the method name `'deletePots'`.

### ⭐⭐⭐ 5. Bridging two differently-typed emitters (challenge)

Write `bridge(from, fromEvent, to, toEvent, transform)`: it listens on one emitter and re-emits onto a *second* emitter with a *different* map, converting the payload on the way. Four type parameters are involved — a map and a key for each side — and `transform` must be forced to produce exactly the target event's payload type.

**Practices:** holding two independent key↔value correlations in one signature and joining them with a function type.
**Hint:** `transform: (payload: From[KF]) => To[KT]` is the joint; everything else follows from writing each side the way exercise 2 wrote one side.
**Check:** bridging `chat`'s `'message'` into a `LogEvents` emitter's `'line'` with a transform returning `{ level, text }` must compile; a transform returning `m.text` (a bare string) must error with roughly `Type 'string' is not assignable to type 'LogEvents["line"]'`.

### ⭐⭐⭐ 6. From callback to promise (challenge)

Write `waitFor(emitter, event): Promise<EventMap[K]>` — it resolves with the next payload for that event and unsubscribes itself. The point is that the payload type must survive the trip through `Promise`, so `await waitFor(chat, 'message')` gives you a value with `.text` on it and nothing else.

**Practices:** carrying a looked-up payload type into a generic *return* position, so `await` on the far side is still fully checked.
**Hint:** return `new Promise((resolve) => { ... })` with no explicit type argument — the annotated return type contextually types `resolve`, so passing the payload straight in just works.
**Check:** an `async` function doing `const m = await waitFor(chat, 'message'); return m.text;` must compile and return `string`; `waitFor(chat, 'disconnect').then((d) => d.text)` must error with roughly `Property 'text' does not exist on type '{ reason: string; }'`.

## Solutions

### Solution 1

```ts
import { EventEmitter } from './refactored/emitter.js';

type ChatEvents = {
  message: { from: string; text: string };
  typing: { from: string };
  disconnect: { reason: string };
};

const chat = new EventEmitter<ChatEvents>();

chat.on('message', (m) => console.log(`${m.from}: ${m.text}`));
chat.on('disconnect', (d) => console.log(`bye — ${d.reason}`));

chat.emit('message', { from: 'ada', text: 'hi' });
chat.emit('typing', { from: 'ada' });

// @ts-expect-error — 'mesage' is not an event on ChatEvents
chat.emit('mesage', { from: 'ada', text: 'hi' });
// @ts-expect-error — `from` is a string
chat.emit('typing', { from: 1 });
// @ts-expect-error — the message payload needs `text`
chat.emit('message', { from: 'ada' });
```

WHY: one interface is the whole contract, and both sides are checked against it — publishers by `emit`'s `payload: EventMap[K]`, subscribers by `on`'s listener type. The listeners need no annotations because `K` is pinned to a literal per call, so `EventMap[K]` resolves to one exact payload type and flows into the callback. The `type` alias matters: an `interface` extending `Record<string, unknown>` would inherit a string index signature and quietly re-legalise the `'mesage'` typo.

### Solution 2

```ts
function once<EventMap extends Record<string, unknown>, K extends keyof EventMap>(
  emitter: EventEmitter<EventMap>,
  event: K,
  listener: (payload: EventMap[K]) => void,
): () => void {
  const off = emitter.on(event, (payload) => {
    off();
    listener(payload);
  });
  return off;
}

once(chat, 'message', (m) => console.log(m.text));

// @ts-expect-error — the message payload is an object, not a number
once(chat, 'message', (m: number) => console.log(m));
// @ts-expect-error — 'joined' is not an event on ChatEvents
once(chat, 'joined', () => {});
```

WHY: the helper never learns which map it's dealing with, and it doesn't need to — `EventMap` is inferred from the emitter argument, `K` from the event name, and `EventMap[K]` recomputes the payload type per call. That is the same correlation the class uses, just relayed one level outward, which is what keeps ecosystem helpers as safe as the library they wrap. Referring to `off` inside the callback before the `const` finishes initialising is fine: the closure only runs later, when the event actually fires.

### Solution 3

```ts
class CommandBus<Commands extends Record<string, unknown>> {
  private handlers = new Map<keyof Commands, (input: never) => void>();

  register<K extends keyof Commands>(name: K, handler: (input: Commands[K]) => void): void {
    this.handlers.set(name, handler as (input: never) => void);
  }

  run<K extends keyof Commands>(name: K, input: Commands[K]): void {
    const handler = this.handlers.get(name);
    if (handler) (handler as (input: Commands[K]) => void)(input);
  }
}

type EditorCommands = {
  insertText: { at: number; text: string };
  deleteRange: { from: number; to: number };
  save: { path: string };
};

const bus = new CommandBus<EditorCommands>();
bus.register('insertText', (input) => console.log(input.at, input.text.length));
bus.run('insertText', { at: 0, text: 'hello' });

// @ts-expect-error — 'sav' is not a command name
bus.run('sav', { path: '/tmp/a.txt' });
// @ts-expect-error — deleteRange needs `to` as well as `from`
bus.run('deleteRange', { from: 3 });
// @ts-expect-error — the save handler receives { path }, not a string
bus.register('save', (input: string) => console.log(input));
```

WHY: nothing here is emitter-specific — swap "event" for "command" and the shape is identical, which is the README's point about message buses, RPC clients, and command registries. The two `as` casts reappear for the same structural reason: one `Map` stores handlers with mutually incompatible parameter types, and `never` is the only parameter type that accepts being narrowed to any of them. They stay private, sealed behind `register` and `run`, so callers never write a cast of their own.

### Solution 4

```ts
type Api = {
  getUser: { input: { id: number }; output: { name: string; email: string } };
  listPosts: { input: { authorId: number }; output: { titles: string[] } };
  deletePost: { input: { id: number }; output: { deleted: boolean } };
};

declare function call<K extends keyof Api>(
  method: K,
  input: Api[K]['input'],
): Promise<Api[K]['output']>;

async function profileLine(): Promise<string> {
  const user = await call('getUser', { id: 7 });
  const posts = await call('listPosts', { authorId: 7 });
  return `${user.name} <${user.email}> — ${posts.titles.length} posts`;
}

// @ts-expect-error — getUser's input is { id: number }, not a name
call('getUser', { name: 'ada' });
// @ts-expect-error — getUser's output has no `titles`
call('getUser', { id: 7 }).then((u) => u.titles);
// @ts-expect-error — 'deletePots' is not a method of Api
call('deletePots', { id: 3 });
```

WHY: `Api[K]` narrows to one method's entry, and the second index picks a side of it, so a single literal method name determines both the argument you must pass and the value you get back. Wrapping the result in `Promise<...>` costs nothing — `await` unwraps it and the precision is still there at the call site. This one map now keeps client and server honest in both directions, which is the shape that graduates into exercise 34's API boundary work.

### Solution 5

```ts
function bridge<
  From extends Record<string, unknown>,
  To extends Record<string, unknown>,
  KF extends keyof From,
  KT extends keyof To,
>(
  from: EventEmitter<From>,
  fromEvent: KF,
  to: EventEmitter<To>,
  toEvent: KT,
  transform: (payload: From[KF]) => To[KT],
): () => void {
  return from.on(fromEvent, (payload) => {
    to.emit(toEvent, transform(payload));
  });
}

type LogEvents = { line: { level: string; text: string } };
const logs = new EventEmitter<LogEvents>();

bridge(chat, 'message', logs, 'line', (m) => ({
  level: 'info',
  text: `${m.from}: ${m.text}`,
}));

// @ts-expect-error — the transform must produce a `line` payload, not a string
bridge(chat, 'message', logs, 'line', (m) => m.text);
```

WHY: four type parameters look heavy, but each is inferred from an ordinary argument, so the call site stays as short as an untyped one. The signature's real work is stating that `transform`'s input is *the source event's* payload and its output is *the target event's* payload — two separate lookups that would both collapse into `any` in an untyped bridge. This is where the pattern pays off most: fan-out plumbing between subsystems is exactly the code where a silent payload mismatch would otherwise surface days later, in a log line nobody reads.

### Solution 6

```ts
function waitFor<EventMap extends Record<string, unknown>, K extends keyof EventMap>(
  emitter: EventEmitter<EventMap>,
  event: K,
): Promise<EventMap[K]> {
  return new Promise((resolve) => {
    const off = emitter.on(event, (payload) => {
      off();
      resolve(payload);
    });
  });
}

async function firstMessageText(): Promise<string> {
  const m = await waitFor(chat, 'message');
  return m.text;
}

// @ts-expect-error — the disconnect payload carries `reason`, not `text`
waitFor(chat, 'disconnect').then((d) => d.text);
```

WHY: `Promise<EventMap[K]>` is the return annotation doing double duty — it tells callers what `await` will hand them, and it contextually types `resolve` inside the body, so `resolve(payload)` is checked rather than assumed. The map stays the single contract even though the value now crosses an asynchronous boundary; nothing about `Promise` erases the correlation. Notice this helper is `once` from exercise 2 with the callback turned inside out, which is a fair summary of what promises are.
