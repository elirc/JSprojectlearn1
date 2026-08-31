# 📘 Learning Guide: Event Emitter

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny "announcement system" for programs. One part of an app (a file downloader) needs to shout "I finished!" and other parts (a notifier, a logger, a stats counter) each want to react — *without* the downloader knowing who they are.

Run the original and you see the problem:

```
log: report.pdf
crash: logger exploded
```

The "notify" message never printed (it got overwritten), and "stats" never printed (the logger's crash stopped it). The refactor builds an **EventEmitter** class where all three fire reliably:

```
notify: report.pdf done!
log: report.pdf
stats: counted report.pdf
```

## 2. Concepts you need first

### Functions are values (callbacks)

In JavaScript, a function can be stored in a variable, put in an object, or handed to another function. A function you hand over "call this later" style is a **callback**:

```js
function greet(name) { console.log("Hi " + name); }
const saved = greet;   // no parentheses = not calling it, just holding it
saved("Ana");          // prints: Hi Ana
```

### Events and the pub/sub pattern

An **event** is a named "something happened" announcement, like `"done"` or `"click"`. **Pub/sub** (publish/subscribe) is the pattern where publishers announce events and subscribers register callbacks (**listeners**) to run when the event fires. The magic: the publisher never needs to know who is listening. That separation is called **decoupling**.

### Classes and `new`

A **class** is a blueprint for objects that bundle data with the functions (**methods**) that use it:

```js
class Counter {
  count = 0;                       // a field: data each object carries
  add() { this.count++; }          // a method: `this` means "this object"
}
const c = new Counter();           // `new` builds an object from the blueprint
c.add();
console.log(c.count); // prints: 1
```

A field starting with `#` (like `#listeners`) is **private** — only code inside the class can touch it. Outsiders can't reach in and break things.

### Map and Set

A **Map** is a key→value lookup table. A **Set** is a bag of values with no duplicates — adding the same thing twice keeps only one:

```js
const s = new Set();
s.add("a"); s.add("a"); s.add("b");
console.log(s.size);      // prints: 2
s.delete("a");
console.log([...s]);      // prints: [ 'b' ]
```

Our emitter uses a Map where each event name points to a Set of listener functions.

### Closures

A **closure** is a function that remembers the variables around it when it was created — even after that moment is long gone:

```js
function makeCounter() {
  let n = 0;
  return () => { n++; console.log(n); };
}
const tick = makeCounter();
tick(); // prints: 1
tick(); // prints: 2  (it remembered n)
```

The refactor uses this: `on()` returns a small function that *remembers exactly which listener to remove*.

### try / catch and throwing

`throw new Error("msg")` stops a function immediately with an error. `try { ... } catch (e) { ... }` lets you catch that error and keep going:

```js
try {
  throw new Error("boom");
} catch (e) {
  console.log("caught: " + e.message); // prints: caught: boom
}
console.log("still alive"); // prints: still alive
```

An **AggregateError** is a special error that carries a *list* of errors inside it (`err.errors`) — useful when several things failed and you want to report all of them at once.

### Rest and spread with `...`

In a parameter list, `...args` collects all arguments into an array (**rest**). In a call, `listener(...args)` spreads them back out. Also, `?.` (**optional chaining**) means "if the thing before me is missing, just give `undefined` instead of crashing," and `??` picks a fallback when the left side is `null`/`undefined`.

## 3. Walking through the original code

The downloader "supports events" with plain fields:

```js
var downloader = {
  onComplete: null,
  onComplete2: null, // a second listener was needed... so, this.
  onError: null,
```

One slot per listener. When someone needed a second listener, they literally added a second slot. That's a warning sign.

```js
finish: function (file) {
  if (this.onComplete) this.onComplete(file);
  if (this.onComplete2) this.onComplete2(file);
```

`finish` calls each slot if it's filled. Then modules wire themselves in:

```js
downloader.onComplete = function (file) {
  console.log("notify: " + file + " done!");
};
// Another module also wants to know... and overwrites the first:
downloader.onComplete = function (file) {
  console.log("log: " + file);
  throw new Error("logger exploded");
};
```

The second assignment *replaces* the first — plain `=` on the same field. The notify listener is gone, silently. And the logger throws, so when `finish` runs, the crash escapes `finish` before it can call `onComplete2` ("stats").

## 4. What's wrong with it (in beginner terms)

**Flaw 1: assignment overwrites.** A field can hold one function. The second module's `onComplete =` deleted the first module's listener with no error. Here's how it bites you: three months later, users report "I stopped getting download notifications." Nothing crashed, nothing logged. Someone eventually discovers a new module was added that reassigned `onComplete`. The `onComplete2` slot is the scar from the *last* time this happened.

**Flaw 2: no unsubscribe.** Once a callback is assigned, there's no clean way to remove it. In a real app, screens open and close. A closed screen's listener still fires, touching things that no longer exist — a **stale listener** — and the closed screen can never be garbage-collected: a **memory leak** (memory the program holds forever but never uses).

**Flaw 3: one bad listener kills the rest.** The logger threw, so "stats" never ran. But the logger and stats modules don't even know each other exist — the whole point of events! One module should not get to crash another's delivery.

## 5. Try it yourself first!

1. **Vague hint:** One slot per listener is the disease. What structure could hold *many* listeners per event name?
2. **Warmer:** A Map of event name → collection of functions. `on(event, fn)` adds; `emit(event, data)` loops over the collection and calls each one.
3. **Unsubscribe:** what if `on()` handed back a little function that, when called, removes that exact listener from the collection? (A closure makes this three lines.)
4. **Error isolation:** wrap *each* listener call in its own `try/catch` inside the emit loop, so a crash in one can't stop the loop.
5. **Don't swallow though:** collect caught errors in an array, and after the loop, if the array isn't empty, throw them all together.

## 6. Understanding the refactored solution

**The data structure:**

```js
#listeners = new Map(); // event name -> Set of functions
```

A Map from event name to a Set of listeners. Sets can hold any number of functions, so subscribing can never overwrite. This tiny structure is the same idea underneath the browser's `addEventListener` and Node's built-in `EventEmitter`.

**`on()` returns the unsubscribe function:**

```js
this.#listeners.get(event).add(listener);
return () => this.#listeners.get(event)?.delete(listener);
```

The returned arrow function is a closure remembering `event` and `listener`. Callers write `const off = emitter.on('done', fn)` and later just call `off()` — no bookkeeping, no "which index was mine?"

**`emit()` — isolated but not swallowed:**

```js
const listeners = [...(this.#listeners.get(event) ?? [])];
```

It copies the Set into an array *before* looping. Why? If a listener unsubscribes itself mid-delivery, changing the Set while looping over it could skip its neighbor. The copy freezes this round's guest list.

```js
try { listener(...args); }
catch (err) { failures.push(err); }
```

Each listener runs in its own try/catch — one crash can't block the others. But the errors aren't ignored: after everyone is delivered to, all failures are rethrown together as one `AggregateError`. Silently eating errors would hide bugs for years; crashing mid-loop was the original's sin. Collect-then-throw does neither.

**`once()` — subscribe for one delivery:**

```js
const off = this.on(event, (...args) => {
  off(); // unsubscribe FIRST, so a throwing listener still detaches
  listener(...args);
});
```

It wraps your listener in one that removes itself, then calls you. Unsubscribing *before* calling matters: if your listener throws, it has already detached, so it can't fire again next time.

**The tests** mirror each original bug: two subscriptions both fire (no overwrite), `off()` removes only its own listener, a throwing listener doesn't stop others (`log` and `stats` both delivered) *and* the AggregateError still surfaces with the original `boom` inside `err.errors[0]`, `once` fires exactly once, and unsubscribing during emit doesn't skip anyone.

## 7. Words you learned (glossary)

- **Callback** — a function you hand over to be called later.
- **Event** — a named "something happened" announcement.
- **Listener** — a callback registered to run when an event fires.
- **Pub/sub** — the publish/subscribe pattern: announcers and reactors, decoupled.
- **Decoupling** — parts working together without knowing about each other.
- **Class / method / field** — blueprint for objects / its functions / its data.
- **Private field (`#`)** — class data outsiders cannot touch.
- **Map / Set** — key→value table / bag of unique values.
- **Closure** — a function that remembers surrounding variables.
- **Unsubscribe** — removing a listener so it stops firing.
- **Stale listener** — a listener still firing for a screen/thing that's gone.
- **Memory leak** — memory held forever that will never be used again.
- **throw / try / catch** — raise an error / run code and intercept its errors.
- **AggregateError** — one error object carrying a list of errors.
- **Rest / spread (`...`)** — gather arguments into an array / spread them back out.
- **Optional chaining (`?.`)** — "if missing, give undefined instead of crashing."
- **`??`** — fallback value when the left side is null/undefined.

## 8. Experiments to try on the plane (no internet needed)

1. **Prove the overwrite bug.** In `original.js`, comment out the logger's `throw` line and run it. Expected: you see `log:` and `stats:` but still never `notify:` — the overwrite bug exists independently of the crash bug.
2. **Emit to nobody.** In a scratch file, `new EventEmitter().emit('silence')`. Expected: returns `0`, no crash — an event with no listeners is fine.
3. **Three throwing listeners.** Subscribe three listeners that all throw, emit inside try/catch, and print `err.errors.length`. Expected: `3` — every failure was collected, not just the first.
4. **Break `once` on purpose.** In `emitter.js`, move the `off()` call to *after* `listener(...args)`, then make a once-listener that throws and emit twice inside try/catch, counting calls. Expected: it fires **twice** now — you've recreated the subtle bug the comment warns about. (Undo your change after!)
5. **Add `listenerCount` to your mental model.** Subscribe twice to `'tick'`, call `off()` on one, then print `emitter.listenerCount('tick')`. Expected: `1`.
