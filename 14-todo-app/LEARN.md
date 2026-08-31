# 📘 Learning Guide: To-do App

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny to-do list web page. You open the HTML file in a browser and see:

- a text box ("What needs doing?"),
- an **Add** button,
- a list of todos,
- a counter like "2 items left".

You type "buy milk", press Add, and "buy milk x" appears in the list. Click the text to cross it out (mark it done). Click the little **x** button to delete it. The counter always shows how many items are *not* done. In the refactored version, your list even survives closing and reopening the page.

There is no server and no internet involved — everything happens inside one HTML file.

## 2. Concepts you need first

### HTML elements and the DOM
An HTML file is a tree of **elements**: `<h1>` is a heading, `<input>` a text box, `<button>` a button, `<ul>` an "unordered list" that holds `<li>` (list item) children, `<p>` a paragraph, `<span>` a plain inline piece of text. When the browser loads the file, it builds a live, in-memory copy of that tree called the **DOM** (Document Object Model). JavaScript can read and change the DOM, and the page updates instantly.

### Finding elements: `getElementById`
Elements can carry an `id="..."` attribute — a unique name. JavaScript grabs them like this:

```js
// HTML: <p id="counter">0 items</p>
const p = document.getElementById("counter");
p.textContent = "5 items"; // the page now shows "5 items"
```

`document` is the JavaScript object representing the whole page.

### Creating and inserting elements
You can build new elements from scratch and attach them:

```js
const li = document.createElement("li"); // exists in memory only
li.textContent = "buy milk";
document.getElementById("list").append(li); // now it's on the page
```

`append` puts something inside an element, at the end. `parent.removeChild(child)` (or `child.remove()`) takes it back out.

### `textContent` vs `innerText` vs `innerHTML`
Three ways to set what's inside an element:

- `el.textContent = s` — treats `s` as plain text. Safe. Preferred.
- `el.innerText = s` — similar, older, slightly quirkier. Also plain text.
- `el.innerHTML = s` — treats `s` as **HTML code**. If `s` came from a user, they can inject live HTML — even scripts. That attack is called **XSS** (cross-site scripting). Rule of thumb: never put user input into `innerHTML`.

Setting `list.innerHTML = ''` on your *own* element is fine — that's just a quick way to empty it.

### Events: reacting to clicks and keys
An **event** is "something happened" — a click, a key press. You attach a function (a **handler**) that runs when it happens:

```js
const btn = document.getElementById("addButton");
btn.onclick = () => console.log("clicked!"); // runs on every click
```

Keyboard events tell you which key: the handler receives an event object with a `.key` property, e.g. `"Enter"`.

### CSS classes
CSS styles the page. A **class** is a label you stick on elements so CSS can target them. In this project:

```css
li.done span { text-decoration: line-through; }
```

means "inside any `<li>` that has class `done`, cross out the span's text." JavaScript flips the label with `li.className = "done"` or back with `""`. So "is this todo finished?" is stored as... a styling label. Remember that — it's the heart of the problem.

### Arrays and their power tools
An **array** is an ordered list of values. Three methods do most of the work here:

```js
const todos = [{ text: "a", done: true }, { text: "b", done: false }];
todos.push({ text: "c", done: false });        // add to the end
todos.find((t) => t.text === "b");             // first match (an object)
todos.filter((t) => !t.done).length;           // 2 — count of not-done
```

`filter` returns a *new* array containing only the items that pass the test. `reduce` boils an array down to one value — the refactor uses it once to find the largest existing id.

### State
**State** is the current data of your program — here, "the list of todos." The big design question this project teaches: *where does state live?* In a data structure you control, or scattered inside the page itself?

### JSON and `localStorage`
**JSON** is a text format for data. `JSON.stringify(value)` turns data into a string; `JSON.parse(string)` turns it back:

```js
const s = JSON.stringify([{ text: "hi", done: false }]);
console.log(s); // '[{"text":"hi","done":false}]'
```

**`localStorage`** is a tiny storage box the browser keeps per site, surviving reloads. It only stores strings — which is why JSON matters:

```js
localStorage.setItem("todos", s);        // save
const back = localStorage.getItem("todos"); // load (a string, or null)
```

### A few small syntax pieces
- `let` / `const`: declare variables (`const` can't be reassigned). `var` is the old form.
- Arrow function: `(t) => t.done` is a short function returning `t.done`.
- Ternary: `cond ? a : b` means "if cond then a else b", as an expression.
- `??`: "if the left side is null/undefined, use the right side instead." `null ?? []` is `[]`.
- `try { ... } catch { ... }`: if the code in `try` throws an error, run `catch` instead of crashing.
- Template literal: `` `${remaining} items left` `` builds a string with a value inside.

## 3. Walking through the original code

**The page skeleton.** An input, a button with `onclick="addTodo()"` (an event handler written directly in the HTML), an empty `<ul id="list">`, and a counter paragraph.

**Adding a todo.**

```js
function addTodo() {
  var input = document.getElementById("newTodo");
  if (input.value == "") return;
  var li = document.createElement("li");
  var span = document.createElement("span");
  span.innerText = input.value;
```

Read the text box; ignore empty input; build an `<li>` containing a `<span>` with the typed text. So far so good.

**Toggling done — right there inside addTodo.**

```js
span.onclick = function () {
  if (li.className == "done") {
    li.className = "";
  } else {
    li.className = "done";
  }
  updateCounter();
};
```

Clicking the text flips the `done` CSS class on that `<li>`. Note what this means: whether a todo is done is recorded *only* as a class name on a DOM node. There is no variable anywhere saying `done: true`.

**Deleting.**

```js
del.onclick = function () {
  li.parentNode.removeChild(li);
  updateCounter(); // forget this ONCE anywhere and the counter lies
};
```

Remove the `<li>` from the page — and remember to poke the counter. That comment is the author warning you.

**The counter.**

```js
var lis = document.getElementsByTagName("li");
var remaining = 0;
for (var i = 0; i < lis.length; i++) {
  if (lis[i].className != "done") remaining++;
}
```

To find out how many todos are unfinished, the app *interrogates the page*: grab every `<li>`, inspect its CSS class, count. The DOM is being used as the database.

## 4. What's wrong with it (in beginner terms)

**The `<ul>` is the database.** Ask "where is the list of todos?" and the only honest answer is "in the HTML." No array, no objects. The consequences:

**1. Every feature must read data back out of the page.** The counter can't just look at a list — it has to run a DOM query and sniff CSS classes. Imagine adding a "clear completed" button: another DOM query, another class-sniffing loop. Filters (show only active)? Now you're hiding and showing `<li>`s and your counter loop must know about that too. Each feature has to understand every other feature's HTML tricks.

**2. Manual bookkeeping everywhere.** `updateCounter()` is called from three separate places (add, toggle, delete). Here's how that bites you: next month you add "clear completed." It removes five `<li>`s... and you forget the `updateCounter()` call. No error appears. The app just quietly shows "7 items" when there are 2. Bugs that *lie silently* are far worse than crashes, because nothing tells you to go looking.

**3. Persistence is nearly impossible.** To save the list you'd have to... save the HTML? And on load, re-attach all the click handlers to it by hand? The data is trapped inside the page.

**4. A safety habit.** `span.innerText = input.value` happens to be safe, but it's one keystroke away from `innerHTML` — and putting user input into `innerHTML` lets a "todo" like `<img src=x onerror=stealYourStuff()>` actually run. The refactor switches to `textContent` to make the safe choice the visible, deliberate one.

## 5. Try it yourself first!

Before peeking at the refactor, try rebuilding the app around data:

1. Vague: what if the JavaScript kept its *own* list of todos, and the HTML were just a picture of that list?
2. Make an array: `let todos = [];` where each todo is `{ id, text, done }`. Why an `id` and not "position 3 in the array"? (Hint: delete item 2, and every item after it shifts position.)
3. Write one function `render()` that: empties the `<ul>`, loops over `todos`, and rebuilds every `<li>` from the data — including setting class `done` from `todo.done` and computing the counter from the array.
4. Rewrite add/toggle/delete so they *only* change the array... then call `render()`. They never touch the DOM directly.
5. Persistence should now be two tiny functions using `JSON.stringify` / `JSON.parse` and `localStorage`. If it isn't tiny, your state isn't plain data yet.

## 6. Understanding the refactored solution

The refactored file is organized into five labeled layers, top to bottom.

**1. STATE.** `let todos = load();` — one array of `{ id, text, done }` objects, loaded from storage at startup. The line below it:

```js
let nextId = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
```

scans the loaded todos for the biggest id and starts counting after it, so a new todo never reuses an old id.

**2. ACTIONS.** `addTodo`, `toggleTodo`, `removeTodo` are the only functions allowed to change `todos`. Each does its one data change and ends with `render()`. Notice `removeTodo` doesn't hunt for a DOM node — it just makes a new array without that id: `todos = todos.filter((t) => t.id !== id)`. Also notice `text.trim()` — trimming removes spaces from both ends, so "   " can't become a blank todo.

**3. RENDER.** The whole screen is redrawn from the array every time:

```js
list.innerHTML = '';
for (const todo of todos) { ... }
const remaining = todos.filter((t) => !t.done).length;
```

"Wipe and rebuild everything" sounds wasteful, but the list is tiny, and the payoff is huge: the list and the counter are computed from the *same array in the same function*, so they physically cannot disagree. No more "call updateCounter from three places." This exact idea — the screen is a function of the state — is what the React framework industrializes; learn it here and React will feel familiar.

Inside the loop, `span.textContent = todo.text` displays user input the safe way, and the handlers are one-liners that call actions: `span.onclick = () => toggleTodo(todo.id)`.

**4. PERSISTENCE.** `save()` is one line: `localStorage.setItem('todos', JSON.stringify(todos))`, called at the end of every render. `load()` parses it back, with two guards: `?? []` handles "nothing saved yet" (getItem returns null), and `try/catch` handles corrupted saved text. This feature costs ~8 lines *because* state is plain data.

**5. WIRING.** The button's click and the input's Enter key both just call `addTodo(input.value)` and clear the box. The very last line, `render()`, paints the loaded todos on startup — which answers the README's test question: delete the whole DOM, re-render, and the app comes back intact.

## 7. Words you learned (glossary)

- **DOM**: the browser's live, scriptable tree of the page's elements.
- **Element**: one node of the page — a button, a list item, a paragraph.
- **`id`**: a unique name on an element so scripts can find it.
- **Event / handler**: something that happens (click, keypress) / the function that runs in response.
- **CSS class**: a label on an element that CSS styles can target.
- **State**: the current data of the program.
- **Single source of truth**: one authoritative place where a piece of data lives.
- **Render**: draw the screen from the state.
- **Action**: a function whose job is to change state (then trigger a render).
- **`textContent`**: sets an element's text as plain text (safe).
- **`innerHTML`**: sets an element's contents as HTML code (dangerous with user input).
- **XSS**: an attack where user-supplied text gets executed as HTML/script.
- **JSON**: a text format for data; `stringify` encodes, `parse` decodes.
- **`localStorage`**: small per-site browser storage that survives reloads.
- **Serialize**: turn in-memory data into text you can store or send.
- **`filter` / `find` / `reduce`**: array methods to select many / find one / boil down to one value.
- **Ternary (`?:`)**: an inline if/else expression.
- **`??`**: use the right-hand value when the left is null or undefined.
- **`try`/`catch`**: run code, and recover instead of crashing if it throws.

## 8. Experiments to try on the plane (no internet needed)

1. **Add "clear completed"** to the refactored app: add a `<button id="clearDone">` in the HTML, and in the WIRING section set its onclick to a new action that does `todos = todos.filter((t) => !t.done); render();`. Expected: done items vanish and the counter is instantly right — no counter code touched. Then imagine (or try) doing the same in original.html and count how many things you must keep in sync.
2. **Prove the counter can't lie**: in the refactored `render()`, temporarily comment out the counter lines. Expected: the counter freezes — but reappears correct the moment you restore them, because it's always recomputed from `todos`.
3. **Test persistence**: add three todos in the refactored app, mark one done, close the tab, reopen the file. Expected: all three come back, the done one still crossed out. Do the same in original.html — everything is gone.
4. **See XSS for real (safely)**: in the refactored file, change `span.textContent = todo.text` to `span.innerHTML = todo.text`, then add a todo with the text `<b>hi</b>`. Expected: the page shows a bold "hi" instead of the literal text you typed — proof that user input became live HTML. Change it back!
5. **Add a "count of done" line**: in `render()`, compute `todos.filter((t) => t.done).length` and show it in the counter string. Expected: one edit, in one place, and it can never go stale.
