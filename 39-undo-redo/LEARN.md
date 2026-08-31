# 📘 Learning Guide: Undo/Redo

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The Ctrl+Z / Ctrl+Y feature of a tiny text editor. You type things, and the program remembers every version so you can step backward (undo) and forward again (redo):

```
type "Hello"        → screen shows "Hello"
type " world"       → screen shows "Hello world"
undo                → screen shows "Hello"
redo                → screen shows "Hello world"
```

The tricky part — the part the original gets wrong — is what happens when you undo and *then type something new*. The old "future" should be gone forever. In the original, it comes back from the dead.

## 2. Concepts you need first

### Arrays as stacks: push and pop

An **array** is an ordered list. Two methods make it act like a **stack** — a pile of plates where you only touch the top:

```js
const pile = [];
pile.push("a");            // put on top
pile.push("b");
console.log(pile.pop());   // prints: b   (take off the top)
console.log(pile);         // prints: [ 'a' ]
```

`push` adds to the end, `pop` removes from the end. Last in, first out — exactly how undo history behaves: the most recent state is the first one you undo to.

### An index used as a "pointer"

The original stores all versions in one array and keeps a number saying "you are here":

```js
const versions = ["", "Hi", "Hi!"];
let pointer = 2;                     // currently at "Hi!"
pointer--;                           // undo: move back
console.log(versions[pointer]);      // prints: Hi
```

Nothing magical — "pointer" here just means an index (position number) into the array.

### Invariants

An **invariant** is a rule about your data that must *always* be true for the program to be correct. Example: "everything in the array after `pointer` is redoable future." The danger: if the rule lives only in the author's head, any function can silently break it. The lesson of this whole project: pick a data shape where the rule is enforced by the code itself, not by memory and discipline.

### Classes, constructors, getters, private fields

A **class** is a blueprint for objects. Its **constructor** runs when you build one with `new`. A **getter** is a method you read like a property (no parentheses). A field starting with `#` is **private** — untouchable from outside:

```js
class Box {
  #secret;                              // private field
  constructor(x) { this.#secret = x; }  // runs at `new Box(...)`
  get value() { return this.#secret; }  // getter
}
const b = new Box(5);
console.log(b.value);   // prints: 5   (note: no parentheses)
// b.#secret            // would be a syntax error — sealed inside
```

Wrapping data in a class so only approved methods can change it is called **encapsulation**.

### Snapshots and immutability

A **snapshot** is a complete copy of the state at one moment ("the whole document as it was"). Undo-by-snapshots only works if old snapshots never change afterwards. Data that never changes after creation is **immutable**. If you store an object as a snapshot and later *edit that same object*, your "history" silently rewrites itself. So the style is: never modify state — build a *new* state each time, and hand the old one to history.

### No-ops

A **no-op** is an operation that deliberately does nothing. Pressing undo when there's nothing to undo shouldn't crash — users mash Ctrl+Z. Returning the current state unchanged is a friendly no-op.

## 3. Walking through the original code

```js
var versions = [""];
var pointer = 0;
```

One array of every version (starting with the empty document), and a pointer marking the current one. Note: these are loose module-level variables that every function reaches out and changes.

```js
function type(text) {
  versions.push(versions[pointer] + text);
  pointer = versions.length - 1; // jump to the end... always?
}
```

Typing takes the current version, appends the new text, pushes it as a new version, and jumps the pointer to the end. Notice what it does *not* do: it never removes anything.

```js
function undo() {
  if (pointer > 0) pointer--;
  return versions[pointer];
}
function redo() {
  if (pointer < versions.length - 1) pointer++;
  return versions[pointer];
}
```

Undo steps the pointer back (never below 0); redo steps forward (never past the end). Both look completely reasonable — and both are! The bug isn't in undo or redo. It's in what `type()` forgot.

The script then demonstrates: type "Hello", type " world", undo back to "Hello", type "!!!" — and then two redos take you to... "Hello world". A version from a timeline you abandoned.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: redo resurrects the dead timeline.** Walk it slowly. After typing twice: `versions = ["", "Hello", "Hello world"]`, pointer at 2. Undo → pointer 1 ("Hello"). Now you type "!!!". `type()` pushes "Hello!!!" onto the end: `["", "Hello", "Hello world", "Hello!!!"]`, pointer 3. "Hello world" — the future you walked away from — is *still in the array*, sitting at index 2, in the middle. Later, undo/redo stepping through indexes will happily land on it. How it bites you: a user undoes a paragraph, types a new one, then taps redo out of habit — and the deleted paragraph reappears, interleaved with new work. They stop trusting undo, and an editor with untrustworthy undo is worse than one with none.

**Flaw 2: the invariant lived nowhere.** The design's rule was "when you type after undoing, everything after the pointer must be deleted first." That rule appears in zero lines of code. `type()` just pushes. Correctness depended on the author *remembering* — and they didn't. Any rule enforced only by memory will eventually be forgotten.

**Flaw 3: naked shared variables.** `versions` and `pointer` sit at module level where anything can poke them. There's no boundary; nothing stops other code from setting `pointer = 42` and corrupting everything.

## 5. Try it yourself first!

1. **Vague hint:** The bug is one missing behavior in `type()`. What should happen to the "redo future" when you do something new?
2. **Warmer:** Before pushing the new version, `type()` could chop off everything after the pointer. Look up `array.splice(start)` or `array.length = pointer + 1`.
3. **Different shape (the refactor's route):** instead of one array + pointer, keep *three* things: a `past` array, a single `present` value, and a `future` array. Write down what undo, redo, and "new action" each do to those three.
4. **Almost the answer:** new action = push present onto past, set present to the new state, and set `future = []`. Undo = push present onto future, pop past into present. Redo is the mirror image.
5. **Polish:** make undo/redo return the present unchanged when their stack is empty, and expose `canUndo`/`canRedo` booleans.

## 6. Understanding the refactored solution

**The shape *is* the fix:**

```js
export class History {
  #past = [];
  #future = [];
  #present;
```

Three named containers instead of "array + pointer + a rule everyone must remember." `#past` holds states you can undo to, `#present` is on screen, `#future` holds states you can redo to. Same information as before, but now the invariant is visible in the structure itself.

**The one unmissable line:**

```js
push(nextState) {
  this.#past.push(this.#present);
  this.#present = nextState;
  this.#future = []; // <- the line the original was missing
}
```

A new action moves the present into the past and **empties the future**. You can't "forget" a line that's already written into the method every action goes through. That's the README's big lesson: when a design needs a rule, prefer the shape where the rule is one obvious line.

**Undo and redo are mirror images:**

```js
undo() {
  if (!this.canUndo) return this.#present; // harmless at the boundary
  this.#future.push(this.#present);
  this.#present = this.#past.pop();
  return this.#present;
}
```

Undo: current state goes into the future (so redo can bring it back), and the newest past state becomes present. At the boundary (nothing to undo) it's a safe no-op — a deliberate choice, because mashing Ctrl+Z isn't an error.

**Getters for the UI:**

```js
get canUndo() { return this.#past.length > 0; }
```

A user interface can gray out its Undo/Redo buttons by reading `canUndo`/`canRedo`, without ever reaching inside the private stacks. That's encapsulation paying off.

**The tests:** the star test is named "THE original bug" — it replays the exact killer sequence (push, push, undo, push something new) and asserts `canRedo` is `false`: "Hello world" is gone for good. Other tests check boundary no-ops, button-state getters, and — in the last test — that snapshots can be whole *objects* (`{ text, cursor }`), not just strings. Any app state works, as long as you treat states as immutable snapshots.

## 7. Words you learned (glossary)

- **Stack** — a list you only add to / remove from at one end (push/pop).
- **push / pop** — add to the end of an array / remove from the end.
- **Pointer (index)** — a number marking a position in an array.
- **Invariant** — a rule about your data that must always hold.
- **Class / constructor** — object blueprint / the setup code run by `new`.
- **Getter** — a method read like a property, without parentheses.
- **Private field (`#`)** — class data unreachable from outside.
- **Encapsulation** — hiding data behind approved methods.
- **Snapshot** — a full copy of state at one moment.
- **Immutable** — never changed after creation.
- **No-op** — an operation that intentionally does nothing.
- **Boundary condition** — the edge situation (empty history, last item) where naive code misbehaves.
- **Timeline** — the sequence of states; typing after undo starts a new one.

## 8. Experiments to try on the plane (no internet needed)

1. **Watch the corpse in the array.** In `original.js`, add `console.log(versions)` right after `type("!!!")`. Expected: `["", "Hello", "Hello world", "Hello!!!"]` — "Hello world" is still lurking at index 2, which is the entire bug in one picture.
2. **Fix the original the minimal way.** In `type()`, add `versions = versions.slice(0, pointer + 1);` as the first line (change `var versions` usage accordingly or use `versions.length = pointer + 1;`). Run it. Expected: the final `redo()` now prints "Hello!!!" instead of "Hello world".
3. **Trace the three containers.** In a scratch file using `History`, after each call print `history.present`, `history.canUndo`, `history.canRedo`. Do: push('a'), push('b'), undo, push('c'). Expected: after the last push, `canRedo` is `false`.
4. **Prove the mutation danger.** Create `const state = { text: "hi" }`, do `new History(state)`, then `state.text = "HACKED"` and read `history.present.text`. Expected: "HACKED" — the snapshot changed because you mutated a shared object. That's why immutability (always making new state objects) matters.
5. **Add a `length` getter.** Give `History` a getter returning `this.#past.length + 1 + this.#future.length` (total states remembered). Expected: after push('a'), push('b'), undo — it returns 3.
