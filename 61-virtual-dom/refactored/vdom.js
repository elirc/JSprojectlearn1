/**
 * A tiny virtual DOM — the trick React popularized, in ~100 lines:
 *
 *   1. h() describes UI as cheap plain objects (vnodes)
 *   2. createNode() turns a vnode into a real DOM node
 *   3. patch() DIFFS old vnode vs new vnode and edits only what
 *      changed — the real DOM (slow, stateful) is touched minimally,
 *      so focus, cursors, and scroll positions survive re-renders
 *
 * createRenderer(doc) takes the document as a dependency — in the
 * browser that's `document`; in tests it's a 40-line fake. The diff
 * algorithm doesn't know the difference, which is exactly why it's
 * testable in Node (and how React Native can exist: swap the
 * "document", keep the diffing).
 */

export const TEXT = '#text';

/** h('ul', {class:'x'}, ...children) -> a vnode tree. Strings become
 *  text vnodes; null/undefined/false children are dropped (so
 *  `cond && h(...)` works as conditional rendering). */
export function h(type, props, ...children) {
  const normalized = children
    .flat(Infinity)
    .filter((c) => c !== null && c !== undefined && c !== false)
    .map((c) => (typeof c === 'object' ? c : { type: TEXT, text: String(c), props: {}, children: [] }));
  return { type, props: props ?? {}, children: normalized };
}

export function createRenderer(doc) {
  /** vnode -> real node (recursively). The "mount" path. */
  function createNode(vnode) {
    if (vnode.type === TEXT) return doc.createTextNode(vnode.text);
    const node = doc.createElement(vnode.type);
    for (const [key, value] of Object.entries(vnode.props)) setProp(node, key, value);
    for (const child of vnode.children) node.appendChild(createNode(child));
    return node;
  }

  /** Events are properties (onClick -> node.onclick); value/checked
   *  are properties too (setAttribute only sets the DEFAULT for
   *  form fields — the classic gotcha); the rest are attributes. */
  function setProp(node, key, value) {
    if (key.startsWith('on')) node[key.toLowerCase()] = value;
    else if (key === 'value' || key === 'checked') node[key] = value;
    else if (value === false || value == null) node.removeAttribute(key);
    else node.setAttribute(key, value === true ? '' : value);
  }

  function removeProp(node, key) {
    if (key.startsWith('on')) node[key.toLowerCase()] = null;
    else if (key === 'value' || key === 'checked') node[key] = key === 'value' ? '' : false;
    else node.removeAttribute(key);
  }

  /** Same position, is it still "the same thing"? Different tag (or
   *  changed text) means replace wholesale; otherwise update in place. */
  function changed(a, b) {
    return a.type !== b.type || (a.type === TEXT && a.text !== b.text);
  }

  function updateProps(node, oldProps, newProps) {
    for (const key of Object.keys(oldProps)) {
      if (!(key in newProps)) removeProp(node, key);
    }
    for (const [key, value] of Object.entries(newProps)) {
      if (oldProps[key] !== value) setProp(node, key, value);
    }
  }

  /**
   * The diff. Compares children BY POSITION — simple and right for
   * stable lists. (Position-diffing mis-updates on reorder/removal
   * from the middle; keyed diffing fixes that and is the famous
   * next step — see the README.)
   */
  function patch(parent, oldVNode, newVNode, index = 0) {
    const node = parent.childNodes[index];

    if (oldVNode === undefined) return void parent.appendChild(createNode(newVNode));
    if (newVNode === undefined) return void parent.removeChild(node);
    if (changed(oldVNode, newVNode)) return void parent.replaceChild(createNode(newVNode), node);
    if (newVNode.type === TEXT) return; // same text, nothing to do

    updateProps(node, oldVNode.props, newVNode.props);

    const oldKids = oldVNode.children;
    const newKids = newVNode.children;
    const common = Math.min(oldKids.length, newKids.length);
    for (let i = 0; i < common; i++) patch(node, oldKids[i], newKids[i], i);
    for (let i = common; i < newKids.length; i++) node.appendChild(createNode(newKids[i]));
    // Remove extras from the END backwards — removing forwards would
    // shift every later index mid-loop (a classic off-by-shift bug).
    for (let i = oldKids.length - 1; i >= newKids.length; i--) node.removeChild(node.childNodes[i]);
  }

  /**
   * The app loop: hold the last vnode, render state to a new one,
   * patch the difference. `render` is state -> vnode, PURE — the
   * whole UI becomes a testable function (project 14's dream,
   * finally without the nuke).
   */
  function createApp(container, render) {
    let lastVNode;
    return function update(state) {
      const nextVNode = render(state);
      if (lastVNode === undefined) container.appendChild(createNode(nextVNode));
      else patch(container, lastVNode, nextVNode, 0);
      lastVNode = nextVNode;
    };
  }

  return { createNode, patch, createApp };
}
