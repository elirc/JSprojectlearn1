# 📘 Learning Guide: Undo Tree

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

An undo/redo history that never loses anything.

Here's the sequence that breaks every ordinary undo stack. You write a tagline, twice:

```
""  →  "Fast, safe, cheap"  →  "Fast, safe, cheap — pick two"
```

You're not sure about it, so you press Ctrl+Z once and write a different ending:

```
""  →  "Fast, safe, cheap"  →  "Fast, safe, cheap. Yes, all three."
```

Now you change your mind again: bring back "pick two". You press Ctrl+Y (redo) and... nothing. It's gone. Not undone — **deleted**, at the moment you typed the alternative, with no warning.

The refactor keeps both:

```
              ""
               |
     "Fast, safe, cheap"
        /            \
   "...pick two"   "...Yes, all three."
```

Undo walks up. Redo walks down. Committing adds a child. Nothing is ever thrown away, and `jumpTo(id)` teleports you to any version you've ever had.

## 2. Concepts you need first

### The linear model, and the rule it needs

Project 39 landed on three containers:

```js
let past = [];      // older versions, oldest first
let present = "";   // what you see
let future = [];    // versions you undid past, for redo
```

Undo: push `present` onto `future`, pop the last of `past` into `present`. Redo: the mirror image. And one extra rule that *must* be obeyed:

```js
function apply(text) {
  past.push(present);
  present = text;
  future = [];      // <- the rule
}
```

Why must the future be cleared? Because `past` + `present` + `future` describe **one line**. If you're at "Fast, safe, cheap" with `future = ["...pick two"]` and you now type "...all three", then "what comes after the present" has two different answers — and a line can only hold one. So the model deletes one to stay valid.

**That's the whole story of this project.** The rule isn't a mistake. It's the price of the shape.

You've now paid that price twice: react#40 wrapped these same three containers into an `undoable(reducer)` so *any* React reducer becomes undoable in one line — a genuinely good piece of engineering, built on this shape, and it discards branches too. That's worth sitting with: a design can be well-factored, well-tested, reused everywhere, and still be the wrong shape underneath. Refactoring cleans up *how* you said something; only changing the data structure changes *what you're able to say*.

### Trees again (project 37), with one new word

A **tree** is nodes, each with a **parent** and any number of **children**. The one node with no parent is the **root**; a node with no children is a **leaf**. Here the nodes are versions:

```js
{ id: 2, state: "...pick two", parentId: 1, childIds: [] }
```

The new word is **branch**: two children of the same parent are two futures that both really happened. That's precisely what a line can't express and a tree gets for free.

### Ids instead of object references

Each node gets a number: 0 for the root, then 1, 2, 3... Nodes point at each other *by id* (`parentId`, `childIds`), not by holding each other's objects. Three reasons, all of which you've met:

- `jumpTo(17)` needs a name for a version — "the object over there" isn't one (project 80's identity-vs-position argument, and project 64's card ids).
- Ids survive `JSON.stringify`; a graph of mutual object references does not.
- Looking up by id in a `Map` is O(1) (project 41).

### Walking up: `while` instead of recursion

To find the route from the root to where you are, keep asking "who's my parent?" until there isn't one:

```js
let id = this.#currentId;
while (id !== null) { ids.push(id); id = this.#nodes.get(id).parentId; }
return ids.reverse();
```

Walking *down* into children needs recursion (each child is itself a tree — see `toTree` and the demo's printer); walking *up* is a plain loop, because each node has exactly one parent. Same tree, two directions, two different code shapes.

### Snapshots, and why immutability keeps mattering

The tree stores whole states — a snapshot per version. That's only safe if old states can't change afterwards. If you commit an object and then mutate it, you've edited history: every branch holding that object silently changes too. Projects 17, 39 and 59 all made this point; here it's the load-bearing assumption behind "nothing is ever lost".

### Ctrl+Z is a boundary, not an error

Undo at the very beginning, redo at the very end: users do this constantly, by mashing keys. Returning the present unchanged is a **deliberate no-op**, not a failure. Errors are for real mistakes — asking for a version that doesn't exist — and those throw a `RangeError` with the id in the message.

## 3. Walking through the original code

The structure and its rule:

```js
var past = [];
var present = "";
var future = [];

function apply(text) {
  past.push(present);
  present = text;
  future = []; // <- project 39's fix. Also: the theft.
}
```

Then the scenario, which you can run with `node 81-undo-tree/original.js`:

```js
apply("Fast, safe, cheap");
apply("Fast, safe, cheap — pick two");
undo();                                    // back to "Fast, safe, cheap"
apply("Fast, safe, cheap. Yes, all three.");
```

At that last line, `future` held `["...pick two"]`, and `apply` emptied it. Now:

```js
console.log(redo());  // "Fast, safe, cheap. Yes, all three."  <- unchanged
console.log(future);  // []
console.log(past);    // [ '', 'Fast, safe, cheap' ]
```

Look at the two arrays together: the version you wrote is in neither. Every piece of state in the program is accounted for, and "pick two" is not among them. It's not recoverable by cleverness — the bytes are gone.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: correct code that destroys work.** There is no bug to fix here. `future = []` is required for the structure to stay consistent, so the flaw sits one level up, in the *choice* of structure. That's the hardest kind of flaw to see, and the most valuable one to learn to notice: when your data shape forces a delete, ask whether the shape is wrong before you defend the delete.

**Flaw 2: it models a rare intention instead of the common one.** Discarding the future assumes "I undid because that was wrong". People usually undo because they're *unsure* and want to compare. The model optimizes for the case that almost never happens and deletes the evidence in the case that always does.

**Flaw 3: whole features are unreachable, not just missing.** "Show me everything I tried" or "go back to the version from ten minutes ago" aren't hard to implement here — they're impossible, because the data no longer exists. Compare project 14: features stop being expensive and start being *unavailable* once the truth has been thrown away.

**Flaw 4: silence.** No warning, no "you have unsaved branches", nothing. The most destructive operation in the program is invisible.

## 5. Try it yourself first!

1. **Vague hint:** after `undo()`, you have one past and *two* possible nexts. What shape holds "one thing, two nexts"?
2. **Warmer:** you've built that shape before — project 37. What does each node need to know about its neighbours?
3. **Warmer still:** if versions are nodes, what does undo do? What does redo do? What does typing something new do?
4. **Almost the answer:** each node is `{ id, state, parentId, childIds }`, kept in a `Map` by id. `commit` makes a child of the current node and moves there; `undo` moves to `parentId`; `redo` moves to a child. Notice what's missing: any line that deletes.
5. **The hard question:** after an undo, the current node has two children. Which one should a plain `redo()` pick? Write down your answer *and your reason* — there are at least three defensible policies, and the refactor's tests pin one of them down.
6. **Then:** what new feature does this shape make possible that the line couldn't? (It's one method, and it's the reason people love this design.)

## 6. Understanding the refactored solution

**One `Map`, keyed by id, holding nodes that point at each other by id:**

```js
#nodes = new Map(); // id -> { id, state, parentId, childIds, redoChildId }
#currentId;
```

**`commit` adds a child instead of overwriting a future:**

```js
const id = this.#nextId++;
this.#nodes.set(id, { id, state, parentId: parent.id, childIds: [], redoChildId: null });
parent.childIds.push(id);
parent.redoChildId = id;
this.#currentId = id;
```

Read it next to `future = []`. The linear version had to delete because a line has room for one next; here `push` just makes the list of nexts longer. **The bug didn't get fixed — it got made unrepresentable** (project 40's principle, project 41's Map trick, now applied to time).

**`undo` walks up, and leaves a breadcrumb:**

```js
const parent = this.#nodes.get(node.parentId);
parent.redoChildId = node.id; // remember the way we came, so redo comes back here
this.#currentId = parent.id;
```

That one line answers section 5's hard question. "Always take the newest child" would mean undoing from an *old* branch and being redone into a *different* one — technically fine, and horrible to use. "The child you came from" makes redo always the exact inverse of undo, and a fresh `commit` sets the same pointer, so a new branch also becomes the redo target. The tests state both halves.

**`redo` also lets you choose:**

```js
const target = childId ?? node.redoChildId ?? node.childIds[node.childIds.length - 1];
if (!node.childIds.includes(target)) throw new RangeError(...);
```

A default that does the polite thing, an explicit argument for a UI showing branches, and a `RangeError` for a version that isn't a child of where you are — because that request has no sensible interpretation.

**`jumpTo` is four lines and is the reason for the whole project:**

```js
if (!this.#nodes.has(id)) throw new RangeError(`No such version: ${id}`);
this.#currentId = id;
```

Moving in history stops being a walk and becomes a lookup. Every version ever created has a name, and naming things is what makes them reachable.

**Nothing leaks.** `children()` and `node()` return copies, so a caller can't push a bogus id into the tree's internals (there's a test); `toTree()` produces plain nested data for printing, saving, or asserting on.

**And the demo prints it recursively** — `printTree` calls itself for each child, exactly project 37's walker, because a tree of versions is self-similar like any other tree. Run `node 81-undo-tree/refactored/demo.js` and watch three timelines coexist.

## 7. Words you learned (glossary)

- **Undo stack** — the linear past/present/future model.
- **Undo tree** — history where each version can have several successors.
- **Node / root / leaf / parent / child** — tree vocabulary (project 37).
- **Branch** — two children of the same node: two futures that both happened.
- **Commit** — record a new version (Git's word, for the same reason).
- **Snapshot** — a whole stored state, as opposed to a stored *change*.
- **`jumpTo`** — move to any version directly, without walking.
- **Breadcrumb / redo pointer** — the remembered "way we came".
- **No-op** — a call that deliberately does nothing (undo at the root).
- **`RangeError`** — the error for "that id isn't in the allowed set".
- **Unrepresentable** — a wrong state the data shape cannot express.
- **API design decision** — a documented, tested behavioural choice.
- **Encapsulation** — `#private` fields plus copies out, so invariants hold.

## 8. Experiments to try on the plane (no internet needed)

1. **Watch the theft.** Run `node 81-undo-tree/original.js` and read the last three printouts. Expected: `future` is `[]` and `past` is `[ '', 'Fast, safe, cheap' ]` — "pick two" is in neither.
2. **Watch it not happen.** Run `node 81-undo-tree/refactored/demo.js`. Expected: after the same sequence, version #2 is still in the tree and `jumpTo(2)` walks straight back into it.
3. **Grow a third branch.** In a scratch file: `new HistoryTree('')`, commit `'a'`, commit `'b'`, `undo()`, commit `'c'`, `undo()`, commit `'d'`, then `console.log(history.children(1))`. Expected: three ids — one parent, three futures, none deleted.
4. **Break the redo policy on purpose.** In `history-tree.js`, delete the `parent.redoChildId = node.id;` line in `undo()`. Expected: the test "redo returns to the branch you were most recently on" fails — proof that the line was a design decision, not decoration. Put it back.
5. **Prove snapshots need immutability.** Commit an object, then mutate it: `const s = {text:'a'}; history.commit(s); s.text = 'CHANGED'; history.undo(); history.redo();`. Expected: the "old" version says `CHANGED` — history rewritten. This is why every project since 17 insisted on returning new objects.
6. **Count the cost.** Commit 1,000 versions of a 10,000-character string and check `history.size`. Expected: it works fine, and you'll notice snapshots are memory-hungry — which is exactly why real editors store *diffs* between versions instead. Same tree, cheaper nodes; that's PRACTICE exercise 6.
