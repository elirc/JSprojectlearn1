/**
 * The operator table. This is the whole point of the refactor:
 * adding an operator is ONE line here, and zero changes anywhere else.
 */
const OPERATORS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '^': (a, b) => a ** b, // <- this operator was "added later". One line.
};

/**
 * Evaluate an RPN expression like "5 1 2 + 4 * + 3 -".
 * Throws on malformed input instead of quietly returning NaN.
 */
export function evaluateRpn(expression) {
  const tokens = expression.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    throw new Error('Empty expression');
  }

  const stack = [];

  for (const token of tokens) {
    if (token in OPERATORS) {
      if (stack.length < 2) {
        throw new Error(`Operator "${token}" needs two operands`);
      }
      const b = stack.pop(); // popped in reverse: b was pushed last
      const a = stack.pop();
      stack.push(OPERATORS[token](a, b));
    } else {
      const value = Number(token);
      if (Number.isNaN(value)) {
        throw new Error(`Unknown token: "${token}"`);
      }
      stack.push(value);
    }
  }

  if (stack.length !== 1) {
    throw new Error(`Malformed expression: ${stack.length} values left on the stack`);
  }
  return stack[0];
}
