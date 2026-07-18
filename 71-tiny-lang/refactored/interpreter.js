/**
 * Tiny's interpreter: walk the AST, carry an ENVIRONMENT.
 *
 * The environment chain IS the scoping model, in 20 lines:
 *   - each block gets a child environment
 *   - `let` declares in the CURRENT env (shadowing = a nearer link
 *     in the chain — nothing is overwritten)
 *   - assignment WALKS THE CHAIN to find where the variable lives
 *     (so inner blocks can update outer variables)
 *   - lookup walks the same chain; falling off the end is a
 *     positioned error, not `undefined`
 *
 * When the block ends, its environment is simply dropped — variable
 * lifetime for free. This chain-of-scopes is exactly how JS itself
 * works; closures are environments that outlive their block.
 */
import { parse } from './parser.js';
import { TinyError } from './lexer.js';

class Environment {
  constructor(parent = null) {
    this.vars = new Map();
    this.parent = parent;
  }

  declare(name, value, node) {
    if (this.vars.has(name)) {
      throw new TinyError(`"${name}" is already declared in this scope`, node.line ?? 0, 0);
    }
    this.vars.set(name, value);
  }

  assign(name, value, node) {
    for (let env = this; env; env = env.parent) {
      if (env.vars.has(name)) return env.vars.set(name, value);
    }
    throw new TinyError(`Cannot assign to undeclared variable "${name}" — did you mean "let"?`,
      node.line ?? 0, 0);
  }

  lookup(name, node) {
    for (let env = this; env; env = env.parent) {
      if (env.vars.has(name)) return env.vars.get(name);
    }
    throw new TinyError(`Unknown variable "${name}"`, node.line ?? 0, node.col ?? 0);
  }
}

const typeOf = (v) => (typeof v === 'boolean' ? 'boolean' : typeof v === 'string' ? 'string' : 'number');

/** run(source) -> array of printed lines. Output is DATA (returned),
 *  not a console side effect — which is what makes the tests clean. */
export function run(source, { maxSteps = 1_000_000 } = {}) {
  const program = parse(source);
  const output = [];
  let steps = 0;

  function exec(node, env) {
    if (steps++ > maxSteps) throw new TinyError('Program ran too long (infinite loop?)', 0, 0);

    switch (node.type) {
      case 'block': {
        const child = new Environment(env); // a fresh scope per block
        for (const statement of node.statements) exec(statement, child);
        return;
      }
      case 'let': return env.declare(node.name, evaluate(node.value, env), node);
      case 'assign': return env.assign(node.name, evaluate(node.value, env), node);
      case 'print': return void output.push(stringify(evaluate(node.value, env)));
      case 'if': {
        const cond = evaluate(node.condition, env);
        requireType(cond, 'boolean', node.condition, 'if condition');
        if (cond) exec(node.then, env);
        else if (node.otherwise) exec(node.otherwise, env);
        return;
      }
      case 'while': {
        while (true) {
          if (steps++ > maxSteps) throw new TinyError('Program ran too long (infinite loop?)', 0, 0);
          const cond = evaluate(node.condition, env);
          requireType(cond, 'boolean', node.condition, 'while condition');
          if (!cond) return;
          exec(node.body, env);
        }
      }
    }
  }

  function evaluate(node, env) {
    switch (node.type) {
      case 'number':
      case 'string':
      case 'boolean':
        return node.value;
      case 'var': return env.lookup(node.name, node);
      case 'neg': {
        const v = evaluate(node.operand, env);
        requireType(v, 'number', node, 'unary minus');
        return -v;
      }
      case 'not': {
        const v = evaluate(node.operand, env);
        requireType(v, 'boolean', node, '"!"');
        return !v;
      }
      case 'binop': {
        const l = evaluate(node.left, env);
        const r = evaluate(node.right, env);
        return applyOp(node, l, r);
      }
    }
  }

  function applyOp(node, l, r) {
    const { op } = node;
    if (op === '==') return valueEquals(l, r);
    if (op === '!=') return !valueEquals(l, r);
    if (op === '+') {
      // + is numbers OR strings — but never a silent mix (JS's
      // "1" + 2 === "12" is a bug factory Tiny declines to copy)
      if (typeOf(l) === 'number' && typeOf(r) === 'number') return l + r;
      if (typeOf(l) === 'string' && typeOf(r) === 'string') return l + r;
      throw new TinyError(`Cannot add ${typeOf(l)} and ${typeOf(r)}`, node.line ?? 0, node.col ?? 0);
    }
    // everything else is numbers-only
    requireType(l, 'number', node, `"${op}"`);
    requireType(r, 'number', node, `"${op}"`);
    switch (op) {
      case '-': return l - r;
      case '*': return l * r;
      case '/':
        if (r === 0) throw new TinyError('Division by zero', node.line ?? 0, node.col ?? 0);
        return l / r;
      case '<': return l < r;
      case '>': return l > r;
      case '<=': return l <= r;
      case '>=': return l >= r;
    }
  }

  function requireType(value, type, node, where) {
    if (typeOf(value) !== type) {
      throw new TinyError(`${where} needs a ${type}, got ${typeOf(value)} (${stringify(value)})`,
        node.line ?? 0, node.col ?? 0);
    }
  }

  const valueEquals = (l, r) => typeOf(l) === typeOf(r) && l === r;
  const stringify = (v) => String(v);

  exec(program, new Environment());
  return output;
}
