/**
 * A real JSON parser: tokenizer + recursive descent, ~150 lines.
 * The same two-stage shape as project 49's calculator — and the
 * foundational skill for everything language-shaped.
 *
 *   tokenize:  characters -> [{type, value, pos}]
 *   parse:     tokens     -> a JS value
 *
 * Two properties the eval-based original couldn't have:
 *   - the input is DATA and stays data — nothing can execute
 *   - errors carry line/column and say what was expected
 *
 * Strict on purpose: single quotes, trailing commas, comments and
 * friends are rejected, because "accepts more than the spec" means
 * you've silently invented a new format your tools don't share.
 */

export class JsonError extends SyntaxError {
  constructor(message, text, pos) {
    const upTo = text.slice(0, pos);
    const line = upTo.split('\n').length;
    const col = pos - upTo.lastIndexOf('\n');
    super(`${message} at line ${line}, column ${col}`);
    this.name = 'JsonError';
    this.line = line;
    this.col = col;
  }
}

// ---------- stage 1: tokenize -----------------------------------------

const PUNCT = { '{': 'lbrace', '}': 'rbrace', '[': 'lbracket', ']': 'rbracket', ':': 'colon', ',': 'comma' };
const ESCAPES = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

export function tokenize(text) {
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') { i++; continue; }

    if (PUNCT[ch]) { tokens.push({ type: PUNCT[ch], pos: i }); i++; continue; }

    if (ch === '"') {
      const start = i;
      let value = '';
      i++; // opening quote
      while (text[i] !== '"') {
        if (i >= text.length) throw new JsonError('Unterminated string', text, start);
        if (text[i] === '\\') {
          const esc = text[i + 1];
          if (esc === 'u') {
            const hex = text.slice(i + 2, i + 6);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new JsonError(`Bad \\u escape "\\u${hex}"`, text, i);
            value += String.fromCharCode(parseInt(hex, 16));
            i += 6;
          } else if (esc in ESCAPES) {
            value += ESCAPES[esc];
            i += 2;
          } else {
            throw new JsonError(`Bad escape "\\${esc}"`, text, i);
          }
        } else if (text[i] < ' ') {
          throw new JsonError('Raw control character in string', text, i);
        } else {
          value += text[i];
          i++;
        }
      }
      i++; // closing quote
      tokens.push({ type: 'string', value, pos: start });
      continue;
    }

    const num = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
    if (num && (ch === '-' || (ch >= '0' && ch <= '9'))) {
      tokens.push({ type: 'number', value: Number(num[0]), pos: i });
      i += num[0].length;
      continue;
    }

    const word = /^(true|false|null)/.exec(text.slice(i));
    if (word) {
      tokens.push({ type: 'literal', value: { true: true, false: false, null: null }[word[0]], pos: i });
      i += word[0].length;
      continue;
    }

    throw new JsonError(`Unexpected character "${ch}"`, text, i);
  }

  tokens.push({ type: 'eof', pos: text.length });
  return tokens;
}

// ---------- stage 2: parse (recursive descent) -------------------------

export function parseJson(text) {
  const tokens = tokenize(text);
  let current = 0;

  const peek = () => tokens[current];
  const next = () => tokens[current++];

  function expect(type, what) {
    const token = next();
    if (token.type !== type) {
      throw new JsonError(`Expected ${what} but found ${describe(token, text)}`, text, token.pos);
    }
    return token;
  }

  // value := string | number | literal | object | array
  // The grammar is recursive, so the parser is: parseValue calls
  // parseObject calls parseValue... nesting comes for free.
  function parseValue() {
    const token = peek();
    switch (token.type) {
      case 'string':
      case 'number':
      case 'literal':
        return next().value;
      case 'lbrace':
        return parseObject();
      case 'lbracket':
        return parseArray();
      default:
        throw new JsonError(`Expected a value but found ${describe(token, text)}`, text, token.pos);
    }
  }

  function parseObject() {
    next(); // {
    const obj = {};
    if (peek().type === 'rbrace') { next(); return obj; }
    while (true) {
      const key = expect('string', 'a string key');
      expect('colon', '":"');
      obj[key.value] = parseValue();
      if (peek().type === 'comma') {
        next();
        // strictness: a comma must be FOLLOWED by a key, so
        // {"a":1,} is an error here, not a shrug
        continue;
      }
      expect('rbrace', '"," or "}"');
      return obj;
    }
  }

  function parseArray() {
    next(); // [
    const arr = [];
    if (peek().type === 'rbracket') { next(); return arr; }
    while (true) {
      arr.push(parseValue());
      if (peek().type === 'comma') { next(); continue; }
      expect('rbracket', '"," or "]"');
      return arr;
    }
  }

  const value = parseValue();
  expect('eof', 'end of input'); // '{"a":1} trailing junk' must fail
  return value;
}

function describe(token, text) {
  if (token.type === 'eof') return 'end of input';
  if (token.type === 'string') return `string "${token.value}"`;
  if (token.type === 'number') return `number ${token.value}`;
  return `"${text[token.pos]}"`;
}
