# 📘 Learning Guide: Virtual DOM Renderer

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny version of the trick that powers React: a **virtual DOM**.

The demo app is a todo list. Open `original.html` in a browser (double-click, no internet needed). There's an input box, an Add button, and a list. Type a todo, click Add, click a todo to cross it out.

Now try to type the word "hello" into the input, one letter at a time. In the original, something feels broken: after every single keystroke the page rebuilds itself, and the input box you were typing into is thrown away and replaced by a fresh copy. Your cursor and focus die each time (the original glues them back with hacks — you can still feel the jank).

The refactored version does the same app a new way: it describes the UI as cheap JavaScript objects, compares the new description to the old one, and edits only what changed. Type in its input — focus survives, because the input was never rebuilt. That comparison step is called **diffing**, and it's the whole project.

## 2. Concepts you need first

### The DOM
The **DOM** (Document Object Model) is the browser's live tree of objects representing your page. JavaScript edits the DOM; the screen updates. Key facts for this project:

```js
const li = document.createElement("li"); // make a new <li> element
li.textContent = "buy milk";             // put text inside it
document.body.appendChild(li);           // attach it — now it's on screen
```

DOM nodes are *stateful and expensive*: a real input element remembers its focus, cursor position, and scroll. Destroy it and all of that dies with it.

### innerHTML and why it's dangerous
`element.innerHTML = someString` parses the string as HTML and rebuilds that element's entire contents. Two problems: it destroys every node inside (state included), and if the string contains user text, that text becomes *live HTML*. That's **XSS** (cross-site scripting) — user input running as code. A todo named `<img src=x onerror=alert(1)>` would execute in the original.

### Text nodes
The DOM has element nodes (`<li>`) and **text nodes** (the words inside). Text nodes made with `createTextNode("...")` are inert — whatever characters they hold are *displayed*, never executed. That's why building UIs from text nodes is XSS-safe by construction.

### Attributes vs. properties (the form-field gotcha)
An **attribute** is what's written in the HTML (`<input value="hi">`). A **property** is a field on the live JavaScript object (`input.value`). For form fields they disagree: the attribute only sets the *default*; what the user sees is the property. To control an input from code you must set `node.value = ...`, the property. Same for `checked` on checkboxes. Event handlers work as properties too: `node.onclick = fn`.

### "UI as a function of state"
**State** is your app's data (`{ draft, items }`). The dream: write one pure function `render(state)` that says what the UI should look like, and re-run it after every change. The original does this by rebuilding all HTML — correct but destructive. The virtual DOM keeps the dream and removes the destruction.

### Virtual nodes (vnodes)
A **vnode** is a plain object *describing* an element — like a blueprint, not a building:

```js
const vnode = { type: "li", props: { class: "done" }, children: [] };
console.log(vnode.type); // prints: li  — it's just data, nothing on screen
```

Plain objects are practically free to create and throw away. Real DOM nodes are not. So: build cheap descriptions freely, touch the expensive real thing minimally.

### Rest parameters and spread
`function h(type, props, ...children)` — the `...children` (a **rest parameter**) collects all remaining arguments into an array:

```js
function demo(first, ...rest) { console.log(first, rest); }
demo("a", "b", "c"); // prints: a [ 'b', 'c' ]
```

### flat, filter, map — array cleanup tools
```js
console.log([1, [2, [3]]].flat(Infinity)); // prints: [ 1, 2, 3 ]
console.log([1, false, 2, null].filter(Boolean)); // prints: [ 1, 2 ]
console.log(["a", "b"].map((s) => s.toUpperCase())); // prints: [ 'A', 'B' ]
```

`flat(Infinity)` unnests arrays fully. `filter` keeps only items passing a test. `map` transforms each item. `Object.entries({a: 1})` gives `[['a', 1]]` — key/value pairs you can loop over.

### Recursion
A **recursive** function calls itself. Trees demand it: to build a node, build each child the same way; to diff a node, diff each child the same way.

### Diffing
**Diffing** means comparing an old description with a new one and producing the minimal set of edits. Like rereading an edited paragraph: you don't retype the page, you change the three words that differ. Here we compare children *by position* (first child vs. first child, second vs. second) — simple, with one famous weakness the tests demonstrate.

### Dependency injection
**Dependency injection** = passing a thing a function needs as an argument instead of letting it grab a global. `createRenderer(doc)` receives "the document" — in a browser, the real `document`; in tests, a 50-line fake object with the same methods. The diff code can't tell the difference. That seam is literally how React Native renders phone-native views: swap the "document," keep the diffing.

## 3. Walking through the original code

State, then a render function that builds one giant HTML string:

```js
function render() {
  var html = "<h1>Todos (" + state.items.length + ")</h1>";
  html += '<input id="draft" value="' + state.draft + '" placeholder="new todo...">';
  html += "<button onclick='addItem()'>Add</button><ul>";
```

Notice `onclick='addItem()'` — a function *named inside a string*. For that to work, `addItem` must be a global function. Handlers-in-strings force globals.

The list items concatenate user text straight into markup:

```js
html += '<li class="' + (item.done ? "done" : "") + '" onclick="toggle(' + i + ')">' +
  item.text + "</li>";
```

`item.text` is whatever the user typed. If it contains HTML, it *becomes* HTML — the XSS hole.

Then the nuke:

```js
document.getElementById("app").innerHTML = html;
```

Every node in the app — heading, input, button, every `<li>` — destroyed and rebuilt from the string, even if one checkbox changed.

And finally the patch-up parade, hand-repairing what the nuke broke:

```js
var draft = document.getElementById("draft");
draft.focus();
draft.setSelectionRange(state.draft.length, state.draft.length);
draft.oninput = function (e) { state.draft = e.target.value; render(); };
```

Re-focus the new input, put the cursor back at the end, re-attach the typing handler (the old one died with the old input). Each line here was once a bug report.

## 4. What's wrong with it (in beginner terms)

**1. The focus killer.** Typing one letter fires the input handler, which updates state and re-renders — destroying the very input you're typing in. Without the patch-up lines you couldn't type two letters in a row. *How it bites you:* the patch-ups fix the one input the author noticed. Add a second input, or a scrollable list, or text selection — each needs its own hand-written restoration, discovered the hard way, forever.

**2. Nuke-and-pave costs O(everything).** ("O(everything)" = the work grows with the size of the *whole page*, not the size of the change.) Toggle one todo in a 2000-item list: the browser re-parses and rebuilds 2000 nodes, recomputes layout, discards scroll positions and listeners. *How it bites you:* the app is snappy in the demo with 2 todos and molasses in production with 2000 — and there's no small fix, because destruction is the architecture.

**3. String-concatenation UI.** User text goes into markup (XSS — try adding `<img src=x onerror=alert(1)>` as a todo in the original), and events must be globals named in strings, so the code can't be organized into modules. *How it bites you:* one creatively-named todo runs JavaScript in every visitor's browser. That's how accounts get stolen.

**4. None of it is testable.** The rendering only exists as string-glue inside a browser page. There is no function you could call from Node and check.

## 5. Try it yourself first!

Hints, vaguest first:

1. The core waste: we rebuild everything to change one thing. What if we could *know* what changed and edit only that?
2. To know what changed you need to compare "what the UI should be now" with "what it was last time." Comparing real DOM trees is hard — comparing plain objects is easy. Invent a cheap object format that describes an element: type, props, children.
3. Write `h(type, props, ...children)` that builds those objects, turning bare strings into `{ type: '#text', text: ... }` children. Then write `createNode(vnode)` that recursively turns a vnode into a real DOM node (use `createTextNode` for text — instant XSS safety).
4. Now the heart: `patch(parent, oldVNode, newVNode, index)`. Four cases — old missing: append new. New missing: remove. Different type (or different text): replace wholesale. Same type: update the props that changed, then recurse into children pairwise by position.
5. Careful with leftover children: when the new list is shorter, remove extras from the END backwards. Removing forwards shifts every later index while you're still looping.
6. Gotchas: set `value`/`checked` as properties, not attributes; `onClick`-style props become `node.onclick = fn`.
7. To make it testable, don't touch the global `document` — accept a `doc` argument, and in tests hand in a fake object with `createElement`/`createTextNode`.

## 6. Understanding the refactored solution

**`h()` — describing UI.** `h('ul', {class: 'x'}, ...kids)` returns a vnode. Children get normalized: nested arrays flattened (so `items.map(...)` drops right in), `null`/`undefined`/`false` filtered out — which makes `cond && h(...)` work as conditional rendering (when `cond` is false, the child is `false`, and it vanishes) — and bare strings/numbers wrapped as `{ type: '#text', text }` vnodes.

**`createNode(vnode)` — the mount path.** Text vnodes become real text nodes (safe by construction); element vnodes become elements, get their props set, and recursively get their children created and appended.

**`setProp` / `removeProp` — the real-DOM gotchas, encoded once.** Props starting with `on` become handler properties (`onClick` → `node.onclick`). `value` and `checked` are set as properties (attributes only set defaults). `false`/`null` removes an attribute — that's why `class: item.done ? 'done' : false` cleanly removes the class. `true` becomes an empty attribute (like `hidden`).

**`patch` — the whole idea.** Same position, old vs. new:

```js
if (oldVNode === undefined) return void parent.appendChild(createNode(newVNode));
if (newVNode === undefined) return void parent.removeChild(node);
if (changed(oldVNode, newVNode)) return void parent.replaceChild(createNode(newVNode), node);
if (newVNode.type === TEXT) return; // same text, nothing to do
```

Appeared → mount. Disappeared → remove. Changed type (or text) → replace wholesale — a `span` that became a `strong` isn't "the same thing edited," it's a different thing. Otherwise: update props in place (`updateProps` removes keys gone from the new props, sets keys whose values changed), then recurse into children by position. Extra new children get appended; extra old children get removed *from the end backwards* — the comment in the code names the bug this avoids: removing forwards shifts every later index mid-loop.

**`createApp(container, render)` — the loop.** It closes over `lastVNode`. Each `update(state)` call renders a fresh vnode tree from state, patches the difference against the last one, and remembers the new tree. You still *write* the nuke-and-pave mental model — a pure `render(state)` describing everything — but the diff quietly turns it into minimal edits.

**The app in `index.html`.** All changes funnel through a tiny `dispatch(mutate)` that mutates state then calls `update(state)` — one re-render call site instead of one per handler. Handlers are real closures in props (`onClick: () => dispatch(...)`), not global names in strings. Item text flows through text nodes; the README invites you to try the `<img onerror>` attack in both versions.

**`fake-dom.js` — the DOM as a plugin.** A ~50-line object with `createElement`, `createTextNode`, `appendChild`, `removeChild`, `replaceChild`, and attribute methods — plus `toHTML(node)`, which serializes a fake tree to a readable string so tests can assert against something human-checkable.

**The tests** (Node's `node:test` + `assert`) are the story in executable form:
- `h()` flattens arrays and drops falsy children (conditional rendering works).
- A text-change patch edits *only* the text — and the input at position 1 is **the same object** after the patch (`assert.equal(nodeAfter, inputBefore)`). Object identity is the mechanical reason focus survives; the test pins it.
- Props add/change/remove in place without replacing the node; lists grow 2→5→1→3 correctly; a changed tag replaces wholesale; handlers attach as properties and are removable.
- The last test is unusual: it documents a **known limit**. Remove "b" from `[a, b, c]` and the *output* is right — but position-diffing got there by *editing* the old "b" node into "c" and dropping the old "c" node. Wasted work, and worse: any real-DOM state living on those rows (focus, a checkbox, an animation) silently migrates to the wrong row. This is exactly the problem React's `key` attribute exists to solve — keyed diffing matches children by identity instead of position, and it's the natural next exercise.

## 7. Words you learned (glossary)

- **DOM** — the browser's live object tree for the page.
- **DOM node** — one object in that tree (element or text).
- **Text node** — a DOM node holding plain characters; displayed, never executed.
- **Attribute vs. property** — HTML-source value vs. live-object field; form fields differ (`value`, `checked`).
- **innerHTML** — replaces an element's contents by parsing a string as HTML.
- **XSS** — user input executing as HTML/script.
- **State** — the app's data; here `{ draft, items }`.
- **Render function** — pure function from state to a UI description.
- **Virtual DOM** — the technique: describe UI as cheap objects, diff, patch.
- **Vnode (virtual node)** — a plain object describing one element or text.
- **Mount** — turning a vnode tree into real nodes the first time.
- **Diffing** — comparing old vs. new descriptions to find minimal edits.
- **Patch** — applying those edits to the real DOM.
- **Position-diffing** — pairing children by index; simple, breaks on middle-removals.
- **Key / keyed diffing** — matching children by identity; React's fix for the above.
- **Object identity** — whether two references point at the exact same object (`===`).
- **Rest parameter (`...args`)** — collects remaining arguments into an array.
- **`flat` / `filter` / `map`** — array flatten / keep-some / transform-each.
- **Falsy** — values treated as false (`false`, `null`, `undefined`, `0`, `""`).
- **Conditional rendering** — `cond && h(...)`: renders nothing when false.
- **Recursion** — a function calling itself, e.g. to walk a tree.
- **Closure** — a function remembering variables from where it was made (`lastVNode`).
- **Dependency injection** — passing needs in (`doc`) instead of grabbing globals.
- **Fake / test double** — a minimal stand-in object used in tests (`fakeDocument`).
- **O(everything)** — cost proportional to the whole page, not the change.

## 8. Experiments to try on the plane (no internet needed)

Both HTML files open from disk; tests run with `node --test 61-virtual-dom/refactored/`. All offline.

1. **Feel the difference with your fingers.** Open `original.html`, click into the input, type "hello" — notice the flicker/jank per keystroke (the patch-ups are re-focusing you each time). Open `refactored/index.html`, type the same — smooth, because the input node is never rebuilt. Then try the XSS todo in both: add `<img src=x onerror=alert(1)>`. Original: a broken-image request fires (an attack would run). Refactored: the text just appears as a todo.
2. **Break the backwards-removal rule.** In `refactored/vdom.js`, change the last loop in `patch` to remove forwards: `for (let i = newKids.length; i < oldKids.length; i++) node.removeChild(node.childNodes[i]);`. Run the tests. Expected: the "growing and shrinking child lists" test fails (shrinking 5→1 leaves the wrong children), because each removal shifted the survivors' indexes. Restore the backwards loop.
3. **Prove identity is the point.** In `vdom.test.js`'s text-change test, temporarily change the last assertion to `assert.notEqual(...)` and run tests — it fails, because the input really IS the same object. Now break the *code* instead: in `changed()`, make it `return true;`. The same test now fails on the original assertion — every patch became a wholesale replace, which is exactly the original's nuke-and-pave, rediscovered.
4. **Add a "clear all" button.** In `refactored/index.html`, add to `render`: `h('button', { onClick: () => dispatch((s) => { s.items = []; }) }, 'Clear')`. Expected: clicking empties the list; the heading count drops to 0; the input keeps focus if you were typing — you extended the UI without touching the renderer.
5. **Watch the known limit live.** In the refactored page, add todos "a", "b", "c", click "b" to cross it out — now click "a" to cross it out too, then imagine deleting from the middle. Better: write a tiny Node script importing `fakeDocument` and `createRenderer`, mount `[a, b, c]` as `<li>`s, patch to `[a, c]`, and `console.log` whether position 1 is the old "c" node. Expected: it isn't — you've reproduced the final test and now know, from the inside, why React makes you write `key=` on lists.
