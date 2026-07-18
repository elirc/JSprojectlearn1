// js#49's AST as a discriminated union — the shape it always wanted.
// Recursive unions are where ts#10/30 pay compound interest: every
// subtree access is certain, and malformed trees can't be BUILT.

export type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/'; left: Expr; right: Expr }
  | { kind: 'negate'; operand: Expr };
//        ^ note op is a literal union (ts#06), not string — the
//          unknown-operator bucket is about to disappear too

function assertNever(value: never): never {
  throw new Error(`Unhandled node: ${JSON.stringify(value)}`);
}

export function evaluate(node: Expr): number {
  switch (node.kind) {
    case 'number':
      return node.value; // no ! — value EXISTS here, typed number
    case 'binary': {
      const left = evaluate(node.left);   // left: Expr, present, certain
      const right = evaluate(node.right);
      switch (node.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/':
          if (right === 0) throw new RangeError('Division by zero'); // js#49
          return left / right;
        default:
          return assertNever(node.op); // ops exhaustive (ts#12)
      }
    }
    case 'negate':
      return -evaluate(node.operand);
    default:
      return assertNever(node); // nodes exhaustive too — add a 'call'
  }                             // variant and evaluate won't compile
}                               // until it's handled

// building trees reads like the math (js#49's (2 + 3) * 4):
export const tree: Expr = {
  kind: 'binary',
  op: '*',
  left: { kind: 'binary', op: '+', left: { kind: 'number', value: 2 }, right: { kind: 'number', value: 3 } },
  right: { kind: 'number', value: 4 },
};

export const answer = evaluate(tree); // 20

// a renderer over the same union — consumers multiply for free:
export function toInfix(node: Expr): string {
  switch (node.kind) {
    case 'number': return String(node.value);
    case 'binary': return `(${toInfix(node.left)} ${node.op} ${toInfix(node.right)})`;
    case 'negate': return `-${toInfix(node.operand)}`;
  }
}

export const shown = toInfix(tree); // "((2 + 3) * 4)"

// ==== type tests: every malformed tree, unbuildable ================
// @ts-expect-error — a number node requires its value
export const broken1: Expr = { kind: 'number' };

// @ts-expect-error — a binary node requires both operands
export const broken2: Expr = { kind: 'binary', op: '+' };

// @ts-expect-error — number nodes can't drag binary luggage
export const broken3: Expr = { kind: 'number', value: 2, op: '*' };

// @ts-expect-error — '%' is not an operator (the silent-zero bucket, deleted)
export const broken4: Expr = { kind: 'binary', op: '%', left: tree, right: tree };
