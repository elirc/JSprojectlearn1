/**
 * A ~50-line fake DOM: just enough surface for the renderer —
 * createElement/createTextNode, child list editing, attributes.
 *
 * The point of this file is what it PROVES: the diff algorithm only
 * needs this tiny interface, so it can be tested in Node, ported to
 * native views, or rendered to strings. The DOM is a plugin.
 */

export function fakeDocument() {
  return {
    createElement(tagName) {
      return {
        tagName,
        attributes: {},
        childNodes: [],
        appendChild(child) { this.childNodes.push(child); return child; },
        removeChild(child) {
          const i = this.childNodes.indexOf(child);
          if (i === -1) throw new Error('removeChild: not a child');
          this.childNodes.splice(i, 1);
          return child;
        },
        replaceChild(next, prev) {
          const i = this.childNodes.indexOf(prev);
          if (i === -1) throw new Error('replaceChild: not a child');
          this.childNodes[i] = next;
          return prev;
        },
        setAttribute(name, value) { this.attributes[name] = String(value); },
        removeAttribute(name) { delete this.attributes[name]; },
      };
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: text };
    },
  };
}

/** Serialize a fake node to HTML-ish text, for readable assertions. */
export function toHTML(node) {
  if (node.nodeType === 3) return node.textContent;
  const attrs = Object.entries(node.attributes)
    .map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${v}"`))
    .join('');
  const kids = node.childNodes.map(toHTML).join('');
  return `<${node.tagName}${attrs}>${kids}</${node.tagName}>`;
}
