/**
 * The spreadsheet engine: raw cell text in, computed values out.
 *
 *   { A1: '=B1+1', B1: '=C1*2', C1: '5' }  ->  { A1: 11, B1: 10, C1: 5 }
 *
 * Four stages, each a small function you can test on its own:
 *
 *   1. tokenize   'A1+B2*2'  -> [ref A1] [+] [ref B2] [*] [number 2]
 *   2. parse      tokens     -> a TREE that encodes precedence (project 49)
 *   3. computeOrder          -> which cell must be computed BEFORE which
 *                               (a topological sort over the dependency graph)
 *   4. evaluate   tree       -> a number, by walking the tree (project 37)
 *
 * Two things are deliberately absent: `eval` (a formula is DATA here, never
 * code) and any mention of the DOM. The browser hands this module strings and
 * draws the answers; every rule about what a formula MEANS lives in here,
 * where `node --test` can reach it.
 */

/** A formula problem the user should see in the cell, e.g. '#DIV/0!'. */
export class FormulaError extends Error {
  constructor(marker) {
    super(marker); // the message IS the thing we print in the cell
    this.name = 'FormulaError';
  }
}

export const CYCLE = '#CYCLE!';
export const BAD_FORMULA = '#ERROR!';
export const DIVIDE_BY_ZERO = '#DIV/0!';

// ============================================================
// STAGE 1: text -> tokens
// ============================================================

/**
 * Turn a formula BODY (no leading '=') into tokens. A "token" is one
 * meaningful piece: a number, a cell reference, an operator, a bracket.
 * Unlike the original's regex, this knows that 'A11' is ONE reference.
 */
export function tokenize(formula) {
  const tokens = [];
  let position = 0;

  while (position < formula.length) {
    const char = formula[position];

    if (char === ' ') {
      position++;
    } else if (char >= '0' && char <= '9') {
      let text = '';
      while (position < formula.length && /[0-9.]/.test(formula[position])) {
        text += formula[position++];
      }
      const value = Number(text);
      if (!Number.isFinite(value)) throw new SyntaxError(`Bad number "${text}"`);
      tokens.push({ type: 'number', value });
    } else if (/[A-Za-z]/.test(char)) {
      let letters = '';
      while (position < formula.length && /[A-Za-z]/.test(formula[position])) {
        letters += formula[position++];
      }
      let digits = '';
      while (position < formula.length && /[0-9]/.test(formula[position])) {
        digits += formula[position++];
      }
      // 'A1' is a reference; a bare word like 'alert' is not — and since we
      // never eval, an unknown word can only ever be a syntax error.
      if (digits === '') throw new SyntaxError(`Unknown name "${letters}"`);
      tokens.push({ type: 'ref', name: (letters + digits).toUpperCase() });
    } else if ('+-*/()'.includes(char)) {
      tokens.push({ type: char });
      position++;
    } else {
      throw new SyntaxError(`Unexpected character "${char}" at position ${position}`);
    }
  }

  return tokens;
}

/** Every cell this formula reads, once each, in the order they appear. */
export function referencesOf(formula) {
  const names = tokenize(formula)
    .filter((token) => token.type === 'ref')
    .map((token) => token.name);
  return [...new Set(names)];
}

// ============================================================
// STAGE 2: tokens -> tree (recursive descent, straight from the grammar)
//
//   expression := term (('+'|'-') term)*      <- binds loosest
//   term       := factor (('*'|'/') factor)*  <- binds tighter
//   factor     := NUMBER | REF | '(' expression ')' | '-' factor
//
// Precedence isn't checked anywhere: it IS the call structure, so
// '=A1+B2*2' can only mean A1 + (B2*2).
// ============================================================

export function parse(tokens) {
  let position = 0;
  const peek = () => tokens[position];

  function expression() {
    let node = term();
    while (peek()?.type === '+' || peek()?.type === '-') {
      const op = tokens[position++].type;
      node = { type: 'binary', op, left: node, right: term() };
    }
    return node;
  }

  function term() {
    let node = factor();
    while (peek()?.type === '*' || peek()?.type === '/') {
      const op = tokens[position++].type;
      node = { type: 'binary', op, left: node, right: factor() };
    }
    return node;
  }

  function factor() {
    const token = peek();
    if (token === undefined) throw new SyntaxError('Unexpected end of formula');

    if (token.type === 'number') {
      position++;
      return { type: 'number', value: token.value };
    }
    if (token.type === 'ref') {
      position++;
      return { type: 'ref', name: token.name };
    }
    if (token.type === '-') {
      position++;
      return { type: 'negate', operand: factor() };
    }
    if (token.type === '(') {
      position++;
      const inner = expression();
      if (peek()?.type !== ')') throw new SyntaxError('Missing closing parenthesis');
      position++;
      return inner;
    }
    throw new SyntaxError(`Unexpected "${token.type}"`);
  }

  const tree = expression();
  if (position < tokens.length) throw new SyntaxError('Unexpected input after formula');
  return tree;
}

// ============================================================
// STAGE 3: what depends on what -> a safe order to compute in
// ============================================================

/**
 * Sort the cells so that every cell comes AFTER the cells it reads.
 * This is a topological sort (Kahn's algorithm):
 *
 *   1. count how many not-yet-computed cells each cell is waiting for;
 *   2. anything waiting for nothing is ready — compute it;
 *   3. computing a cell may drop someone else's count to zero. Repeat.
 *
 * Cells that never reach zero are stuck waiting on each other: that is
 * exactly what a CYCLE is, so cycle detection is not extra code — it's
 * the leftovers. Returns { order, cyclic }.
 */
export function computeOrder(cells) {
  const names = Object.keys(cells);
  const known = new Set(names);

  const dependsOn = new Map();  // cell -> the cells it reads
  const feeds = new Map();      // cell -> the cells that read it
  for (const name of names) feeds.set(name, []);

  for (const name of names) {
    const raw = String(cells[name] ?? '').trim();
    let refs = [];
    if (raw.startsWith('=')) {
      try {
        refs = referencesOf(raw.slice(1)).filter((ref) => known.has(ref));
      } catch {
        refs = []; // a formula we can't even tokenize depends on nothing
      }
    }
    dependsOn.set(name, refs);
    for (const ref of refs) feeds.get(ref).push(name);
  }

  const waitingFor = new Map(names.map((name) => [name, dependsOn.get(name).length]));
  const ready = names.filter((name) => waitingFor.get(name) === 0);
  const order = [];

  while (ready.length > 0) {
    const name = ready.shift();
    order.push(name);
    for (const dependent of feeds.get(name)) {
      const left = waitingFor.get(dependent) - 1;
      waitingFor.set(dependent, left);
      if (left === 0) ready.push(dependent);
    }
  }

  const ordered = new Set(order);
  return { order, cyclic: names.filter((name) => !ordered.has(name)) };
}

// ============================================================
// STAGE 4: tree -> number
// ============================================================

function evaluateNode(node, values) {
  if (node.type === 'number') return node.value;

  if (node.type === 'ref') {
    const value = values[node.name];
    if (value === undefined) return 0;                     // empty / off-sheet
    if (typeof value === 'string') throw new FormulaError(value); // pass errors on
    return value;
  }

  if (node.type === 'negate') return -evaluateNode(node.operand, values);

  const left = evaluateNode(node.left, values);
  const right = evaluateNode(node.right, values);
  switch (node.op) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/':
      if (right === 0) throw new FormulaError(DIVIDE_BY_ZERO);
      return left / right;
    default: throw new SyntaxError(`Unknown operator "${node.op}"`);
  }
}

/**
 * The whole sheet, computed once, correctly, in one pass.
 * Values are numbers, or an error marker string like '#CYCLE!'.
 */
export function evaluateSheet(cells) {
  const { order, cyclic } = computeOrder(cells);
  const values = {};

  for (const name of cyclic) values[name] = CYCLE;

  for (const name of order) {
    const raw = String(cells[name] ?? '').trim();

    if (raw === '') {
      values[name] = 0;
    } else if (!raw.startsWith('=')) {
      const number = Number(raw);
      values[name] = Number.isFinite(number) ? number : BAD_FORMULA;
    } else {
      try {
        values[name] = evaluateNode(parse(tokenize(raw.slice(1))), values);
      } catch (error) {
        // A FormulaError already knows what to print (#DIV/0!, a passed-on
        // #CYCLE!); anything else is the user mistyping the formula.
        values[name] = error instanceof FormulaError ? error.message : BAD_FORMULA;
      }
    }
  }

  return values;
}
