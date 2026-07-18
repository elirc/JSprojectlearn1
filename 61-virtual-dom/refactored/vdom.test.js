import { test } from 'node:test';
import assert from 'node:assert/strict';
import { h, createRenderer } from './vdom.js';
import { fakeDocument, toHTML } from './fake-dom.js';

function setup() {
  const doc = fakeDocument();
  const { createNode, patch, createApp } = createRenderer(doc);
  const root = doc.createElement('div');
  return { doc, createNode, patch, createApp, root };
}

test('h() builds trees; strings become text nodes; falsy children drop out', () => {
  const vnode = h('ul', { class: 'list' },
    h('li', null, 'one'),
    false && h('li', null, 'hidden'),   // conditional rendering
    null,
    ['two', 'three'].map((t) => h('li', null, t)), // nested arrays flatten
  );
  assert.equal(vnode.children.length, 3);
  assert.equal(vnode.children[0].children[0].text, 'one');
});

test('createNode renders a full tree', () => {
  const { createNode } = setup();
  const node = createNode(
    h('div', { id: 'app' }, h('h1', null, 'Todos (', 2, ')'), h('input', { placeholder: 'new' })),
  );
  assert.equal(toHTML(node),
    '<div id="app"><h1>Todos (2)</h1><input placeholder="new"></input></div>');
});

test('patch: text change edits ONLY the text node in place', () => {
  const { patch, createNode, root } = setup();
  const v1 = h('div', null, h('h1', null, 'count: 0'), h('input', {}));
  root.appendChild(createNode(v1));
  const inputBefore = root.childNodes[0].childNodes[1]; // the real input node

  const v2 = h('div', null, h('h1', null, 'count: 1'), h('input', {}));
  patch(root, v1, v2, 0);

  assert.equal(toHTML(root.childNodes[0]), '<div><h1>count: 1</h1><input></input></div>');
  // THE WHOLE POINT: the input is the SAME OBJECT — it was never
  // touched, so in a browser its focus/cursor/scroll all survive.
  assert.equal(root.childNodes[0].childNodes[1], inputBefore);
});

test('patch: props update in place — add, change, remove', () => {
  const { patch, createNode, root } = setup();
  const v1 = h('p', { class: 'draft', hidden: true });
  root.appendChild(createNode(v1));
  const nodeBefore = root.childNodes[0];

  patch(root, v1, h('p', { class: 'saved', title: 'done' }), 0);

  assert.equal(root.childNodes[0], nodeBefore); // updated, not replaced
  assert.deepEqual(nodeBefore.attributes, { class: 'saved', title: 'done' }); // hidden removed
});

test('patch: growing and shrinking child lists', () => {
  const { patch, createNode, root } = setup();
  const list = (n) => h('ul', null, Array.from({ length: n }, (_, i) => h('li', null, `item ${i}`)));

  let prev = list(2);
  root.appendChild(createNode(prev));
  for (const n of [5, 1, 3]) {
    const next = list(n);
    patch(root, prev, next, 0);
    prev = next;
    assert.equal(root.childNodes[0].childNodes.length, n);
    assert.equal(root.childNodes[0].childNodes[n - 1].childNodes[0].textContent, `item ${n - 1}`);
  }
});

test('patch: different tag at same position = replace wholesale', () => {
  const { patch, createNode, root } = setup();
  const v1 = h('span', null, 'x');
  root.appendChild(createNode(v1));
  patch(root, v1, h('strong', null, 'x'), 0);
  assert.equal(root.childNodes[0].tagName, 'strong');
});

test('event props attach as properties and are removable', () => {
  const { patch, createNode, root } = setup();
  let clicks = 0;
  const v1 = h('button', { onClick: () => clicks++ }, 'go');
  root.appendChild(createNode(v1));
  const btn = root.childNodes[0];
  btn.onclick(); // simulate a click
  assert.equal(clicks, 1);

  patch(root, v1, h('button', {}, 'go'), 0); // handler removed
  assert.equal(btn.onclick, null);
});

test('createApp: render is a pure state -> vnode fn; update patches the diff', () => {
  const { createApp, root } = setup();
  const render = (state) =>
    h('div', null,
      h('h1', null, `Todos (${state.items.length})`),
      h('ul', null, state.items.map((t) => h('li', { class: t.done ? 'done' : false }, t.text))),
    );

  const update = createApp(root, render);
  update({ items: [{ text: 'milk', done: false }] });
  const ulBefore = root.childNodes[0].childNodes[1];

  update({ items: [{ text: 'milk', done: true }, { text: 'ship', done: false }] });

  assert.equal(toHTML(root.childNodes[0]),
    '<div><h1>Todos (2)</h1><ul><li class="done">milk</li><li>ship</li></ul></div>');
  assert.equal(root.childNodes[0].childNodes[1], ulBefore); // list updated in place
});

test('KNOWN LIMIT of position-diffing: removing from the middle rewrites trailing items', () => {
  const { patch, createNode, root } = setup();
  const v1 = h('ul', null, h('li', null, 'a'), h('li', null, 'b'), h('li', null, 'c'));
  root.appendChild(createNode(v1));
  const nodeC = root.childNodes[0].childNodes[2];

  const v2 = h('ul', null, h('li', null, 'a'), h('li', null, 'c')); // removed b
  patch(root, v1, v2, 0);

  assert.equal(toHTML(root.childNodes[0]), '<ul><li>a</li><li>c</li></ul>'); // RESULT is right...
  // ...but "c" is not the old c node — position 1 was EDITED from b
  // to c and the old c was dropped. Correct output, wasted work, and
  // any state on those nodes migrates to the wrong row. This is the
  // problem `key` exists to solve (README).
  assert.notEqual(root.childNodes[0].childNodes[1], nodeC);
});
