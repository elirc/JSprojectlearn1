/**
 * STAGE 2: tokens -> a TREE that encodes precedence.
 *
 * "2 + 3 * 4" becomes    (+)          evaluate the tree and you
 *                       /   \         CANNOT get 20 — the shape
 *                      2    (*)       itself says * happens first.
 *                          /   \
 *                         3     4
 *
 * This is a recursive descent parser: one function per precedence
 * level, written straight from the grammar:
 *
 *   expression := term   (('+'|'-') term)*     <- binds loosest
 *   term       := factor (('*'|'/') factor)*   <- binds tighter
 *   factor     := NUMBER | '(' expression ')' | '-' factor
 *
 * Read term() and notice: factors are glued together with * and /
 * BEFORE expression() ever sees them as a unit. Precedence isn't a
 * rule we check — it's the call structure. Parentheses work because
 * factor() calls expression() recursively: a '(...)' is just a
 * sub-expression demoted to a single factor.
 */
export function parse(tokens) {
  let position = 0;

  const peek = () => tokens[position];
  const next = () => tokens[position++];

  const nextOpIs = (...ops) =>
    peek()?.type === 'op' && ops.includes(peek().value);

  function expression() {
    let node = term();
    while (nextOpIs('+', '-')) {
      const op = next().value;
      node = { type: 'binary', op, left: node, right: term() };
    }
    return node;
  }

  function term() {
    let node = factor();
    while (nextOpIs('*', '/')) {
      const op = next().value;
      node = { type: 'binary', op, left: node, right: factor() };
    }
    return node;
  }

  function factor() {
    const token = peek();
    if (!token) {
      throw new SyntaxError('Unexpected end of input');
    }
    if (token.type === 'number') {
      next();
      return { type: 'number', value: token.value };
    }
    if (nextOpIs('(')) {
      next();
      const node = expression(); // recurse: parens hold a whole expression
      if (!nextOpIs(')')) {
        throw new SyntaxError('Missing closing parenthesis');
      }
      next();
      return node;
    }
    if (nextOpIs('-')) {
      next(); // unary minus: -x
      return { type: 'negate', operand: factor() };
    }
    throw new SyntaxError(`Unexpected "${token.value}"`);
  }

  const tree = expression();
  if (position < tokens.length) {
    throw new SyntaxError(`Unexpected "${peek().value}" after expression`);
  }
  return tree;
}

/**
 * STAGE 3: tree -> number. Trivial BECAUSE the tree already encodes
 * the order of operations — evaluation is just recursion (project 07).
 */
export function evaluate(node) {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'negate':
      return -evaluate(node.operand);
    case 'binary': {
      const left = evaluate(node.left);
      const right = evaluate(node.right);
      switch (node.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/':
          if (right === 0) throw new RangeError('Division by zero');
          return left / right;
      }
    }
  }
  throw new Error(`Unknown node type: ${node.type}`);
}
