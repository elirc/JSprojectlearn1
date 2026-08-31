# 📘 Learning Guide: File-based JSON Database

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny "database" that stores data in a single file on your computer, called `data.json`. A **database** is just any organized place a program keeps data so it survives after the program exits. Here, the whole database is one text file that looks like this:

```json
{ "users": [{ "id": 1, "name": "Ada" }], "nextId": 2 }
```

The program can add a user, rename a user, and read everyone back. If you ran the original and called `addUser("Ada")`, the file on disk would change to include Ada. Close the program, open it tomorrow — Ada is still there. That's the whole point: **persistence** (data that outlives the program).

The refactored version does the same job, but survives crashes, power cuts, and two parts of a program writing at the same time.

## 2. Concepts you need first

### JSON — text that describes data

**JSON** (JavaScript Object Notation) is a way to write objects and arrays as plain text, so they can be saved to a file or sent over a network. JavaScript has two built-in converters:

```js
const text = JSON.stringify({ name: "Ada", age: 36 });
console.log(text);              // {"name":"Ada","age":36}   (a string!)
const back = JSON.parse(text);
console.log(back.name);         // Ada                        (an object again)
```

If you give `JSON.parse` broken text, it doesn't return "close enough" — it **throws** (raises an error that stops your code unless something catches it):

```js
JSON.parse('{"users": [half a wri');  // SyntaxError: Unexpected token...
```

### The file system (fs) — reading and writing files

Node.js (the program that runs JavaScript outside a browser) lets you touch files through a built-in module called `fs` (short for **file system**). A **module** is a file of code you can pull into your own with `import`.

```js
import fs from "node:fs";
fs.writeFileSync("hello.txt", "hi there");
console.log(fs.readFileSync("hello.txt", "utf8")); // hi there
```

`"utf8"` tells Node to give you readable text instead of raw bytes.

### Sync vs async — blocking vs not blocking

`readFileSync` ends in **Sync** for "synchronous": your entire program freezes until the disk finishes. **Asynchronous** (async) versions start the work and let your program keep going; you get the result later through a **Promise** — an object that represents "a value that will arrive eventually."

```js
import fs from "node:fs/promises";           // the promise-based fs
const text = await fs.readFile("hello.txt", "utf8");
console.log(text);                            // hi there (after the disk finishes)
```

`await` means "pause *this function only* until the promise finishes" — the rest of the program keeps running. You can only use `await` inside a function marked `async`, or at the top level of a module.

### try/catch — handling errors instead of crashing

```js
try {
  JSON.parse("not json");
} catch (err) {
  console.log("caught:", err.name);  // caught: SyntaxError
}
```

Node file errors carry a `code` string. `"ENOENT"` means "Error: NO ENTry" — the file doesn't exist. Checking `err.code === "ENOENT"` lets you treat "file missing" (fine, first run) differently from "file corrupt" (bad, shout about it).

### Classes and `#private` fields

A **class** is a blueprint for making objects that bundle data with the functions (methods) that use it. A field starting with `#` is **private**: only code inside the class can touch it.

```js
class Counter {
  #n = 0;                       // outsiders can't reach #n
  bump() { return ++this.#n; }
}
console.log(new Counter().bump()); // 1
```

### Atomic operations

**Atomic** means all-or-nothing: the operation either fully happens or doesn't happen at all — there is no in-between moment anyone can observe. Writing a file is NOT atomic: the file passes through an empty state, then a half-written state. Renaming a file over another one IS atomic (on the same disk): one instant it's the old file, the next it's the new one.

### Promise chains — making things take turns

`promise.then(fn)` runs `fn` after the promise finishes, and gives you a new promise for *that*. Chain them and each step waits for the previous one:

```js
let chain = Promise.resolve();
chain = chain.then(() => console.log("first"));
chain = chain.then(() => console.log("second"));
// prints: first, then second — guaranteed order
```

This is how the refactor makes writes take turns instead of trampling each other.

### Reference vs copy

Assigning an object doesn't copy it — both variables point at the *same* object (a **reference**). `structuredClone` makes a real, deep copy:

```js
const a = { list: [] };
const b = a;                    // same object!
const c = structuredClone(a);   // real copy
a.list.push("x");
console.log(b.list, c.list);    // [ 'x' ] []
```

## 3. Walking through the original code

The original is a straight "just save it to a file" implementation. First, loading:

```js
function load() {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}
```

Read the whole file (freezing the program while the disk works), turn the text into an object, hand it back. If the file doesn't exist or contains garbage, this line throws and there's no `try/catch` anywhere to soften the blow.

Saving is the mirror image:

```js
function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data));
}
```

Turn the object back into text, overwrite the file. Looks harmless — section 4 explains why it's the most dangerous line in the file.

Then every feature repeats the same three-step dance:

```js
export function addUser(name) {
  var data = load();
  data.users.push({ id: data.nextId++, name: name });
  save(data);
}
```

Load *everything*, change one thing, save *everything*. `renameUser` does it again with its own loop. This load → modify → save pattern is called **read-modify-write**, and having every caller do it by hand is the root of the worst bug here.

## 4. What's wrong with it (in beginner terms)

**The save can destroy your data.** `writeFileSync` works in two steps: first it *truncates* the file (chops it to zero bytes), then it writes the new content. Imagine the power goes out between those steps. Story: your notes app auto-saves every 30 seconds for a month. One evening the laptop battery dies mid-save. You reboot, open the app — `data.json` is 0 bytes. The save operation, run 80,000 times successfully, deleted a month of notes on run 80,001. That's what "not atomic" costs.

**Sync I/O freezes everything.** In a web server handling 50 people, one person's save makes the other 49 wait. On a slow disk that's visible lag for everyone, caused by anyone.

**First run crashes.** Brand-new user, no `data.json` yet, `readFileSync` throws `ENOENT`, app dead on arrival. And if the file is corrupt (see flaw one!), `JSON.parse` throws forever until a human hand-edits the file.

**The lost update.** Two parts of the app call `addUser` at nearly the same time. Both `load()` and get `{users: [Ada]}`. Caller 1 saves `[Ada, Bob]`. Caller 2 — still holding its old copy — saves `[Ada, Carol]`. Bob is gone. No error, no log, nothing. Users just notice data quietly vanishing. This is called the **lost-update problem**, and it happens because each caller holds its own private copy of "the truth" while writing.

## 5. Try it yourself first!

Try fixing the original before reading on. Hints, vague to specific:

1. What should happen on the very first run, when the file doesn't exist? Handle that one error code specially.
2. Can you write a file in a way that never leaves a half-written version, even if the process dies mid-write? (Hint: writing and *renaming* are different operations with different guarantees.)
3. Callers keep re-implementing load-modify-save. Could the database offer ONE function that takes *the modification itself* (a function!) as an argument?
4. If two updates arrive at once, how do you make the second wait for the first? You already know a structure where each step runs after the previous one finishes... (Section 2, "Promise chains.")
5. Full recipe: write to `something.tmp` in the same folder, then `fs.rename(tmp, real)`. Keep a `chain = chain.then(doUpdate)` promise so updates queue up. On read, catch only `ENOENT` and fall back to default data.

## 6. Understanding the refactored solution

The refactor is one class, `JsonDb`, with the whole write API reduced to `update(fn)`.

**Reading with a safety net.** `read()` loads the file once, keeps it in `#cache` (memory), and handles exactly one error:

```js
} catch (err) {
  if (err.code !== 'ENOENT') throw err; // real corruption should be LOUD
  this.#cache = structuredClone(this.#defaultData);
}
```

Missing file → start from `defaultData`. Corrupt file → re-throw, on purpose. Silently replacing a damaged file with defaults *would erase the user's data politely* — a loud error at least leaves the evidence. `structuredClone` copies the defaults so two `JsonDb` instances given the same default object can't secretly share it (the reference-vs-copy trap from section 2).

**One function owns the cycle.** Callers write `db.update(data => { data.count++ })`. The db loads, runs your function, saves. You *can't* re-implement read-modify-write wrong, because you never hold the cycle — you only hand over the "modify" part. If your function returns something, that return value replaces the data entirely.

**Writes take turns.** The clever three lines:

```js
const next = this.#writeChain.then(run, run);
this.#writeChain = next.then(() => {}, () => {});
return next;
```

`#writeChain` is a promise chain; every update is appended to the end of it, so update #2 starts only after update #1's save hits disk — and sees its changes. Lost updates: impossible. The `.then(run, run)` (same function for success *and* failure) plus the second line mean a failed update still rejects for *its* caller, but the chain itself keeps going — one bad update can't jam the queue for everyone after it.

**The atomic write.** Write the full JSON to a temp file, then:

```js
await fs.rename(tmp, this.#file);
```

Rename is atomic, so the real file is only ever the complete old version or the complete new version. Note the temp file lives in the *same folder* as the target — rename is only atomic within one disk/filesystem, and the system temp folder is often a different one.

**How the tests work.** They use Node's built-in test runner: `test("name", async () => {...})` declares a test, and `assert.deepEqual(a, b)` fails the test unless `a` and `b` match. Each test makes a fresh temporary folder (`mkdtemp`) so tests can't contaminate each other. The star is the lost-update test: it fires 20 `db.update(d => { d.count++ })` calls *without awaiting between them* (so they're all in flight at once), then checks the count is exactly 20. Run that against the original's pattern and most increments vanish. Another test writes deliberately corrupt JSON to the file and asserts that `read()` rejects with a `SyntaxError` — proving errors stay loud.

## 7. Words you learned (glossary)

- **Database** — any organized store of data that outlives the program.
- **Persistence** — data surviving after the program exits.
- **JSON** — a text format for objects/arrays; `JSON.stringify` makes it, `JSON.parse` reads it.
- **Module** — a file of code you `import` into another.
- **fs** — Node's built-in file-system module.
- **Synchronous (sync)** — the program freezes until the operation finishes.
- **Asynchronous (async)** — the operation runs in the background; you get the result via a promise.
- **Promise** — an object representing a value that will arrive (or an error that will) later.
- **await** — pauses the current async function until a promise settles.
- **throw / throws** — raising an error that stops execution unless caught.
- **try/catch** — run code, and if it throws, jump to the `catch` block instead of crashing.
- **ENOENT** — Node's error code for "file does not exist."
- **Atomic** — all-or-nothing; no observable half-done state.
- **Truncate** — chop a file to zero bytes.
- **Read-modify-write** — load data, change it, save it back.
- **Lost-update problem** — two read-modify-writes overlap and one silently overwrites the other.
- **Serialization (of writes)** — forcing operations to run one at a time, in order.
- **Reference** — a variable pointing at an object rather than holding a copy of it.
- **structuredClone** — makes a real deep copy of an object.
- **Private field (`#name`)** — a class field only the class's own code can access.
- **Test runner / assert** — tooling that runs test functions and fails them when an assertion is false.

## 8. Experiments to try on the plane (no internet needed)

Everything here runs offline with `node`. Don't edit the originals — copy files first if you want to keep them pristine.

1. **See the lost update live.** In a scratch file, import `addUser` from `original.js`, call it three times in a row, and check `data.json` — fine. Now mimic concurrency: copy the `load`/`save` logic, `load()` twice into `a` and `b`, push a different user to each, then `save(a); save(b)`. Open `data.json`: the user pushed to `a` is gone.
2. **Prove writes are serialized.** In the refactored folder, make a scratch file that creates a `JsonDb`, fires 100 un-awaited `update(d => { d.count = (d.count||0)+1 })` calls inside `Promise.all`, then prints `(await db.read()).count`. Expected: exactly `100`.
3. **Break a file on purpose.** Write `{"users": [oops` into a `db.json` by hand, point a `JsonDb` at it, and call `read()`. Expected: a rejected promise with `SyntaxError` — not silent defaults. Then delete the file and call `read()` again: now you get `defaultData` with no error.
4. **Watch the temp file exist.** In `#atomicWrite`, add a `console.log(tmp)` before the rename (in a *copy* of jsondb.js). Run an update and look in the folder afterward: the `.tmp` file is named, used, and gone — renamed into place.
5. **Wedge test.** Call `update(() => { throw new Error("bad") })`, catch the rejection, then call a normal update. Expected: the second update still lands — the queue survived. Remove the `, run` second argument from `.then(run, run)` in your copy and repeat: the queue jams after the failure.
