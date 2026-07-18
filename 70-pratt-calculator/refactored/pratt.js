/**
 * A Pratt parser — the technique that replaces project 49's
 * function-per-precedence-level ladder with ONE loop and a TABLE.
 *
 * The whole idea in four lines:
 *
 *   parseExpression(minBP):
 *     left = parse a PREFIX thing (number, name, -x, parens, f(...))
 *     while the next operator binds >= minBP:
 *       left = { op, left, right: parseExpression(that op's right BP) }
 *
 * "Binding power" (BP) = precedence as a number in a table. Adding an
 * operator = adding a table row — no new functions, no re-wiring.
 * Associativity = which BP you recurse with: for LEFT-assoc ops
 * recurse with a HIGHER bp (so equal ops don't stack right); for
 * RIGHT-assoc ops recurse with the SAME bp (so they do).
 *
 * Grows past the original: right-assoc ^, correct unary minus,
 * variables, and function calls — each a few lines.
 */

export class CalcError extends Error {
  constructor(message, pos) {
    super(`${message} (at position ${pos})`);
    this.name = 'CalcError';
    this.pos = pos;
  }
}

// ---------- tokenizer --------------------------------------------------

export function tokenize(src) {
  const tokens = [];
  const re = /(?:(\d+\.?\d*)|([a-zA-Z_]\w*)|([+\-*/^(),<>]))/y;
  let pos = 0;
  while (pos < src.length) {
    while (pos < src.length && /\s/.test(src[pos])) pos++; // skip whitespace
    if (pos >= src.length) break;
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) throw new CalcError(`Unexpected character "${src[pos]}"`, pos);
    if (m[1] !== undefined) tokens.push({ type: 'num', value: Number(m[1]), pos });
    else if (m[2] !== undefined) tokens.push({ type: 'name', value: m[2], pos });
    else tokens.push({ type: 'op', value: m[3], pos });
    pos = re.lastIndex;
  }
  tokens.push({ type: 'eof', pos: src.length });
  return tokens;
}

// ---------- the tables (this IS the language definition) ---------------

// [leftBP, rightBP]: recurse with rightBP. left < right => left-assoc,
// left === right => right-assoc. Compare '+' [10,11] with '^' [40,40].
const INFIX = {
  '>': [5, 6],
  '+': [10, 11], '-': [10, 11],
  '*': [20, 21], '/': [20, 21],
  '^': [40, 40],           // right-associative: 2^3^2 = 2^(3^2)
};
const UNARY_MINUS_BP = 30;  // between * (20) and ^ (40): -2^2 = -(2^2)

// ---------- the parser: one loop -----------------------------------------

export function parse(src) {
  const tokens = tokenize(src);
  let current = 0;
  const peek = () => tokens[current];
  const next = () => tokens[current++];

  function expect(value) {
    const token = next();
    if (token.value !== value) {
      throw new CalcError(`Expected "${value}" but found "${token.value ?? 'end of input'}"`, token.pos);
    }
  }

  function parsePrefix() {
    const token = next();
    if (token.type === 'num') return { type: 'num', value: token.value };
    if (token.type === 'name') {
      if (peek().value === '(') { // a function call: name(arg, arg, ...)
        next();
        const args = [];
        if (peek().value !== ')') {
          args.push(parseExpression(0));
          while (peek().value === ',') { next(); args.push(parseExpression(0)); }
        }
        expect(')');
        return { type: 'call', name: token.value, args };
      }
      return { type: 'var', name: token.value };
    }
    if (token.value === '(') {
      const inner = parseExpression(0);
      expect(')');
      return inner;
    }
    if (token.value === '-') {
      return { type: 'neg', operand: parseExpression(UNARY_MINUS_BP) };
    }
    throw new CalcError(`Expected a value but found "${token.value ?? 'end of input'}"`, token.pos);
  }

  function parseExpression(minBP) {
    let left = parsePrefix();
    while (peek().type === 'op' && INFIX[peek().value] && INFIX[peek().value][0] >= minBP) {
      const op = next().value;
      const [, rightBP] = INFIX[op];
      left = { type: 'binop', op, left, right: parseExpression(rightBP) };
    }
    return left;
  }

  const ast = parseExpression(0);
  if (peek().type !== 'eof') {
    throw new CalcError(`Unexpected "${peek().value}" after the expression`, peek().pos);
  }
  return ast;
}

// ---------- the evaluator ------------------------------------------------

const FUNCTIONS = {
  sqrt: Math.sqrt, abs: Math.abs, min: Math.min, max: Math.max, round: Math.round,
};

export function evaluate(node, env = {}) {
  switch (node.type) {
    case 'num': return node.value;
    case 'neg': return -evaluate(node.operand, env);
    case 'var': {
      if (!(node.name in env)) throw new CalcError(`Unknown variable "${node.name}"`, 0);
      return env[node.name];
    }
    case 'call': {
      const fn = FUNCTIONS[node.name];
      if (!fn) throw new CalcError(`Unknown function "${node.name}"`, 0);
      return fn(...node.args.map((a) => evaluate(a, env)));
    }
    case 'binop': {
      const l = evaluate(node.left, env);
      const r = evaluate(node.right, env);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? (() => { throw new CalcError('Division by zero', 0); })() : l / r;
        case '^': return l ** r;
        case '>': return l > r ? 1 : 0;
      }
    }
  }
}

export const calc = (src, env = {}) => evaluate(parse(src), env);
