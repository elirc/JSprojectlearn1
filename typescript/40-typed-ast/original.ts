// js#49's expression AST, ported as One Node Type To Rule Them All:
// every field any node might have, optional on all of them. (ts#30's
// Big Bag Of Fields — for a recursive structure, where it hurts most.)

export interface Node {
  type: string;
  value?: number;     // only 'number' nodes have this
  op?: string;        // only 'binary' nodes
  left?: Node;        // only 'binary'
  right?: Node;       // only 'binary'
  operand?: Node;     // only 'negate'
}

export function evaluate(node: Node): number {
  if (node.type === 'number') {
    return node.value!; // ! because value is optional EVERYWHERE (ts#05)
  }
  if (node.type === 'binary') {
    const left = evaluate(node.left!);   // ! again
    const right = evaluate(node.right!); // and again
    if (node.op === '+') return left + right;
    if (node.op === '-') return left - right;
    if (node.op === '*') return left * right;
    if (node.op === '/') return left / right;
    return 0; // unknown op: the silent-zero bucket (ts#12's default disease)
  }
  if (node.type === 'negate') {
    return -evaluate(node.operand!);
  }
  return 0; // unknown node type: more silent zero
}

// The bag admits every malformed tree:
export const broken1: Node = { type: 'number' };            // number, no value
export const broken2: Node = { type: 'binary', op: '+' };   // binary, no operands
export const broken3: Node = { type: 'number', value: 2, op: '*', left: { type: 'number', value: 3 } };
// a number node dragging binary luggage — evaluate ignores it, but
// whoever BUILT this tree was confused, and nothing told them

export const answer = evaluate(broken2);
// evaluate(undefined!) inside -> crash... no wait: node.left! is
// undefined, evaluate(undefined) reads .type of undefined -> crash.
// Every ! above is a promise the bag can't keep.
