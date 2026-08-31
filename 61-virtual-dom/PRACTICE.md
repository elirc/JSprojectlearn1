# 🏋️ Practice: Virtual DOM Renderer

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Everything here runs in Node against the fake DOM: create a scratch file (e.g. `practice.test.js`) in `refactored/`, import from `./vdom.js` and `./fake-dom.js`, and run `node --test 61-virtual-dom/refactored/practice.test.js`.

## Exercises

### ⭐ 1. Zero is not false (warm-up)
`h()` drops `null`, `undefined`, and `false` children — but what about the number `0`? Write a test for `h('span', null, 0, false, 'x')` asserting: exactly 2 children survive, the first is a text vnode with `text === '0'`, and the second has `text === 'x'`. Predict the answer *before* running it.
What it practices: reading the normalization filter precisely — the classic `count && h(...)` rendering bug, caught at the vnode level.
Hint: the filter checks `c !== null && c !== undefined && c !== false` — it never asks "is this falsy?".

### ⭐⭐ 2. `renderToString` — server-side rendering (core)
Write `renderToString(vnode)`: vnode straight to an HTML string, no DOM at all. Rules: text vnodes are HTML-escaped (`< > & " '`); `on*` props are skipped (functions can't serialize); `false`/`null` props are omitted; `true` renders as a bare attribute. Expected: `renderToString(h('ul', {class:'todos'}, h('li', {class:'done', onClick: () => {}}, '<b>milk</b>')))` returns `<ul class="todos"><li class="done">&lt;b&gt;milk&lt;/b&gt;</li></ul>`.
What it practices: vnodes are just data — the same description can target a real DOM, a fake DOM, or a string. That's the `createRenderer(doc)` seam, taken to its logical end.
Hint: recursion, like `createNode` — text case first, then attrs, then `children.map(renderToString).join('')`.

### ⭐⭐ 3. Count the damage (core)
Prove the diff is minimal with arithmetic. Wrap `fakeDocument()` in a `countingDocument()` that counts every `createElement`/`createTextNode` call and exposes `created` plus a `reset()`. Mount a 100-item `<ul>` (each `<li>` holding one text child), `reset()`, then patch to the same list with one extra item. Expected: exactly **2** creations (one `li`, one text node) — not 202 — and the `<ul>` now has 101 children.
What it practices: dependency injection — the renderer takes *any* document-shaped object, including an instrumented one.
Hint: `Array.from({ length: n }, (_, i) => h('li', null, 'item ' + i))` builds the list; your wrapper only needs the two create methods plus delegation.

### ⭐⭐ 4. `value` is a property, not an attribute (core)
Write the test `setProp`'s form-field rule deserves: mount `h('input', { value: 'a', type: 'text' })`, then patch to `value: 'ab'`. Assert all three facts: the node after the patch is the *same object* (`===`) as before; `node.value === 'ab'`; and `node.attributes.value` is `undefined` while `node.attributes.type` is `'text'`.
What it practices: the attribute-vs-property gotcha, plus node identity as the mechanical reason focus survives typing.
Hint: on the fake DOM, properties land directly on the node object; attributes land in `node.attributes` — so the two are visibly different places.

### ⭐⭐⭐ 5. Keyed children — fix the famous limit (challenge)
The last test in `vdom.test.js` documents position-diffing's flaw: removing "b" from `[a, b, c]` edits "b" into "c". Fix it for the case where every child has a `key` prop and keeps its tag. Write `makeKeyedPatcher(doc)` returning `patchKeyedChildren(node, oldKids, newKids)`: children with a matching key are *reused and patched in place*, new keys are created, missing keys are dropped, and the child list ends up in the new order. Expected: mount `[a, b, c]` as keyed `<li>`s, save the real node for "c", patch to `[a, c]` — position 1 is now **the same object** as the old "c" node. Then patch `[a, c]` → `[c!, a]` (reorder + text change): both nodes keep their identity and `toHTML` shows `<ul><li key="c">c!</li><li key="a">a</li></ul>`.
What it practices: the exact problem React's `key` solves, implemented on top of the renderer you already have.
Hint: three phases — (1) for each new kid with a matching key, call `patch(node, oldVnode, newVnode, indexOfItsNode)` while positions still line up; (2) build the new node array (reuse or `createNode`); (3) remove all children (backwards!) and append in the new order.

## Solutions

### 1. Zero is not false
```js
test('0 renders; false disappears', () => {
  const v = h('span', null, 0, false, 'x');
  assert.equal(v.children.length, 2);
  assert.equal(v.children[0].text, '0');
  assert.equal(v.children[1].text, 'x');
});
```
WHY: The filter compares against the three "intentionally nothing" values by identity instead of truthiness, so a legitimate `0` (a count, a price) still renders. This is why React docs warn about `count && <Badge/>` — with this design `0 && h(...)` yields `0`, which *renders as text* rather than disappearing. Knowing which values vanish is part of `h()`'s contract.

### 2. `renderToString`
```js
function escapeHtml(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (ch) => map[ch]);
}
export function renderToString(vnode) {
  if (vnode.type === TEXT) return escapeHtml(vnode.text);
  const attrs = Object.entries(vnode.props)
    .filter(([key, value]) => !key.startsWith('on') && value !== false && value != null)
    .map(([key, value]) => (value === true ? ` ${key}` : ` ${key}="${escapeHtml(String(value))}"`))
    .join('');
  return `<${vnode.type}${attrs}>${vnode.children.map(renderToString).join('')}</${vnode.type}>`;
}
```
WHY: Because vnodes are plain data, "rendering" is just interpretation — this is the same walk as `createNode` with strings instead of nodes, which is genuinely how SSR works. Escaping text mirrors what real text nodes gave us for free (project 35's XSS rule), and skipping `on*`/`false` props mirrors `setProp`'s rules in string form.

### 3. Counting document
```js
function countingDocument() {
  const doc = fakeDocument();
  let created = 0;
  return {
    createElement(tag) { created++; return doc.createElement(tag); },
    createTextNode(text) { created++; return doc.createTextNode(text); },
    get created() { return created; },
    reset() { created = 0; },
  };
}
const doc = countingDocument();
const { createNode, patch } = createRenderer(doc);
const list = (n) => h('ul', null, Array.from({ length: n }, (_, i) => h('li', null, 'item ' + i)));
const root = doc.createElement('div');
const v100 = list(100);
root.appendChild(createNode(v100));
doc.reset();
patch(root, v100, list(101), 0);
assert.equal(doc.created, 2);
assert.equal(root.childNodes[0].childNodes.length, 101);
```
WHY: `createRenderer(doc)` never asks what `doc` really is, so a decorator that counts calls slides right into the seam — dependency injection paying off a second way (first tests, now instrumentation). The number 2 *is* the project's thesis: nuke-and-pave would create 202 nodes; the diff creates one `<li>` and its text. (Verified by running it under Node.)

### 4. Value-as-property test
```js
test('value updates as a property; node identity survives', () => {
  const doc = fakeDocument();
  const { createNode, patch } = createRenderer(doc);
  const parent = doc.createElement('div');
  const vOld = h('input', { value: 'a', type: 'text' });
  parent.appendChild(createNode(vOld));
  const inputBefore = parent.childNodes[0];
  patch(parent, vOld, h('input', { value: 'ab', type: 'text' }), 0);
  assert.equal(parent.childNodes[0], inputBefore);
  assert.equal(inputBefore.value, 'ab');
  assert.equal(inputBefore.attributes.value, undefined);
  assert.equal(inputBefore.attributes.type, 'text');
});
```
WHY: `setProp` routes `value`/`checked` to properties because attributes only set form-field *defaults* — the classic gotcha the code encodes. The fake DOM makes the distinction visible (`node.value` vs `node.attributes`), and the `===` assertion pins the identity-preservation that makes controlled inputs keep focus and cursor.

### 5. Keyed patcher
```js
export function makeKeyedPatcher(doc) {
  const { createNode, patch } = createRenderer(doc);
  return function patchKeyedChildren(node, oldKids, newKids) {
    const byKey = new Map(
      oldKids.map((vnode, i) => [vnode.props.key, { vnode, node: node.childNodes[i] }]),
    );
    for (const nk of newKids) {           // 1. patch kept children in place
      const hit = byKey.get(nk.props.key);
      if (hit) patch(node, hit.vnode, nk, node.childNodes.indexOf(hit.node));
    }
    const nextNodes = newKids.map((nk) => { // 2. reuse or create, in new order
      const hit = byKey.get(nk.props.key);
      if (hit) { byKey.delete(nk.props.key); return hit.node; }
      return createNode(nk);
    });
    for (let i = node.childNodes.length - 1; i >= 0; i--) node.removeChild(node.childNodes[i]);
    for (const n of nextNodes) node.appendChild(n); // 3. rebuild the list
  };
}
```
WHY: Position-diffing pairs children by index, so a middle removal edits every trailing sibling; keying pairs them by *identity*, so "c" travels with its real node — the `===` assertion proves no DOM state (focus, checkbox, animation) can migrate rows anymore. Phase 1 must run before reordering (indexes still line up with `oldKids`), and removal walks backwards for the same index-shift reason as `patch` itself. This is a simplified version of what React does when you write `key=`. (Verified by running both the removal and the reorder case under Node.)
