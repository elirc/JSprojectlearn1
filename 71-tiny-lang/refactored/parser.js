/**
 * Tiny's parser: tokens -> an AST. Two layers, two techniques:
 *
 *   STATEMENTS by recursive descent (one function per statement
 *   kind — project 69's shape), because statement syntax is keyword-
 *   led and has no precedence.
 *
 *   EXPRESSIONS by Pratt (project 70's table + loop), because
 *   operators are all about precedence and associativity.
 *
 * The grammar:
 *   program   := statement*
 *   statement := "let" name "=" expr ";"
 *              | name "=" expr ";"
 *              | "print" expr ";"
 *              | "if" "(" expr ")" block ("else" block)?
 *              | "while" "(" expr ")" block
 *   block     := "{" statement* "}"
 */
import { lex, TinyError } from './lexer.js';

const INFIX = {
  '==': [3, 4], '!=': [3, 4],
  '<': [5, 6], '>': [5, 6], '<=': [5, 6], '>=': [5, 6],
  '+': [10, 11], '-': [10, 11],
  '*': [20, 21], '/': [20, 21],
};
const UNARY_BP = 30;

export function parse(source) {
  const tokens = lex(source);
  let current = 0;

  const peek = () => tokens[current];
  const next = () => tokens[current++];
  const at = (typeOrValue) =>
    peek().type === typeOrValue || (peek().type === 'op' && peek().value === typeOrValue);

  function expect(typeOrValue, what = `"${typeOrValue}"`) {
    if (!at(typeOrValue)) {
      const t = peek();
      throw new TinyError(`Expected ${what} but found "${t.value ?? t.type}"`, t.line, t.col);
    }
    return next();
  }

  // ---- statements ----------------------------------------------------

  function parseProgram(endsAt = 'eof') {
    const statements = [];
    while (!at(endsAt)) statements.push(parseStatement());
    return { type: 'block', statements };
  }

  function parseBlock() {
    expect('{');
    const block = parseProgram('}');
    expect('}');
    return block;
  }

  function parseStatement() {
    const token = peek();

    if (at('let')) {
      next();
      const name = expect('name', 'a variable name').value;
      expect('=');
      const value = parseExpression(0);
      expect(';');
      return { type: 'let', name, value, line: token.line };
    }
    if (at('print')) {
      next();
      const value = parseExpression(0);
      expect(';');
      return { type: 'print', value };
    }
    if (at('if')) {
      next();
      expect('(');
      const condition = parseExpression(0);
      expect(')');
      const then = parseBlock();
      let otherwise = null;
      if (at('else')) { next(); otherwise = at('if') ? parseStatement() : parseBlock(); } // else-if chains
      return { type: 'if', condition, then, otherwise };
    }
    if (at('while')) {
      next();
      expect('(');
      const condition = parseExpression(0);
      expect(')');
      return { type: 'while', condition, body: parseBlock() };
    }
    if (at('name') && tokens[current + 1]?.value === '=') {
      const name = next().value;
      next(); // =
      const value = parseExpression(0);
      expect(';');
      return { type: 'assign', name, value, line: token.line };
    }

    throw new TinyError(`Expected a statement but found "${token.value ?? token.type}"`,
      token.line, token.col);
  }

  // ---- expressions (Pratt, project 70) ---------------------------------

  function parsePrefix() {
    const token = next();
    if (token.type === 'number') return { type: 'number', value: token.value };
    if (token.type === 'string') return { type: 'string', value: token.value };
    if (token.type === 'true') return { type: 'boolean', value: true };
    if (token.type === 'false') return { type: 'boolean', value: false };
    if (token.type === 'name') return { type: 'var', name: token.value, line: token.line, col: token.col };
    if (token.value === '(') {
      const inner = parseExpression(0);
      expect(')');
      return inner;
    }
    if (token.value === '-') return { type: 'neg', operand: parseExpression(UNARY_BP) };
    if (token.value === '!') return { type: 'not', operand: parseExpression(UNARY_BP) };
    throw new TinyError(`Expected an expression but found "${token.value ?? token.type}"`,
      token.line, token.col);
  }

  function parseExpression(minBP) {
    let left = parsePrefix();
    while (peek().type === 'op' && INFIX[peek().value] && INFIX[peek().value][0] >= minBP) {
      const opToken = next();
      left = {
        type: 'binop', op: opToken.value, left,
        right: parseExpression(INFIX[opToken.value][1]),
        line: opToken.line, col: opToken.col,
      };
    }
    return left;
  }

  return parseProgram();
}
