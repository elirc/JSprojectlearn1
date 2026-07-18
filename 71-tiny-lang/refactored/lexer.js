/**
 * Tiny's lexer: source -> tokens, each carrying line/column.
 * (Project 69's tokenizer, grown keywords, strings, two-char
 * operators, and comments.)
 */

export class TinyError extends Error {
  constructor(message, line, col) {
    super(`${message} (line ${line}, col ${col})`);
    this.name = 'TinyError';
    this.line = line;
    this.col = col;
  }
}

const KEYWORDS = new Set(['let', 'if', 'else', 'while', 'print', 'true', 'false']);
const TWO_CHAR = new Set(['==', '!=', '<=', '>=']);
const ONE_CHAR = new Set(['+', '-', '*', '/', '(', ')', '{', '}', ';', '=', '<', '>', '!']);

export function lex(source) {
  const tokens = [];
  let i = 0, line = 1, col = 1;

  const push = (type, value, len) => {
    tokens.push({ type, value, line, col });
    i += len;
    col += len;
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch === '\n') { i++; line++; col = 1; continue; }
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; col++; continue; }
    if (ch === '#') { while (i < source.length && source[i] !== '\n') i++; continue; } // comments

    if (TWO_CHAR.has(source.slice(i, i + 2))) { push('op', source.slice(i, i + 2), 2); continue; }
    if (ONE_CHAR.has(ch)) { push('op', ch, 1); continue; }

    if (ch >= '0' && ch <= '9') {
      const m = /^\d+(\.\d+)?/.exec(source.slice(i));
      push('number', Number(m[0]), m[0].length);
      continue;
    }

    if (ch === '"') {
      const end = source.indexOf('"', i + 1);
      if (end === -1) throw new TinyError('Unterminated string', line, col);
      const raw = source.slice(i + 1, end);
      if (raw.includes('\n')) throw new TinyError('Strings cannot span lines', line, col);
      push('string', raw, raw.length + 2);
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      const m = /^[a-zA-Z_]\w*/.exec(source.slice(i));
      push(KEYWORDS.has(m[0]) ? m[0] : 'name', m[0], m[0].length);
      continue;
    }

    throw new TinyError(`Unexpected character "${ch}"`, line, col);
  }

  tokens.push({ type: 'eof', line, col });
  return tokens;
}
