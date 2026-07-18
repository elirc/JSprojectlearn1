/**
 * A small regex engine that gets the HARD part right: backtracking.
 *
 * Supports: literals, '.', '*', '+', '?', character classes
 * [abc] [a-z] [^...], and anchors ^ $.
 *
 * Two stages (as ever — projects 69/70/71):
 *
 *   parse:  "b[aeiou]g*" -> [{atom}, {atom}, {atom, quant}] nodes.
 *           Classes and escapes are resolved HERE, once — the
 *           matcher never re-reads pattern syntax.
 *
 *   match:  a recursive walk with BACKTRACKING. A quantifier is a
 *           CHOICE POINT: try one split, and if the rest of the
 *           pattern can't match, come back and try a different
 *           split. Recursion's call stack stores the choices —
 *           project 07's recursion, working as an undo log.
 */

// ---------- stage 1: parse the pattern ---------------------------------

export function parsePattern(source) {
  let i = 0;
  const anchoredStart = source[0] === '^';
  if (anchoredStart) i = 1;

  let anchoredEnd = false;
  const nodes = [];

  while (i < source.length) {
    if (source[i] === '$' && i === source.length - 1) { anchoredEnd = true; break; }

    let atom;
    if (source[i] === '.') {
      atom = { kind: 'dot' };
      i++;
    } else if (source[i] === '\\') {
      if (i + 1 >= source.length) throw new SyntaxError('Trailing backslash');
      atom = { kind: 'char', ch: source[i + 1] }; // \. \* \\ etc: literal
      i += 2;
    } else if (source[i] === '[') {
      const close = source.indexOf(']', i + 1);
      if (close === -1) throw new SyntaxError(`Unclosed [ at position ${i}`);
      atom = parseClass(source.slice(i + 1, close));
      i = close + 1;
    } else if ('*+?'.includes(source[i])) {
      throw new SyntaxError(`Quantifier "${source[i]}" at position ${i} has nothing to repeat`);
    } else {
      atom = { kind: 'char', ch: source[i] };
      i++;
    }

    let quant = null;
    if ('*+?'.includes(source[i])) { quant = source[i]; i++; }
    nodes.push({ atom, quant });
  }

  return { anchoredStart, anchoredEnd, nodes };
}

function parseClass(body) {
  const negated = body[0] === '^';
  if (negated) body = body.slice(1);
  if (body === '') throw new SyntaxError('Empty character class');

  const chars = new Set();
  const ranges = [];
  for (let i = 0; i < body.length; i++) {
    if (body[i + 1] === '-' && i + 2 < body.length) {
      ranges.push([body.charCodeAt(i), body.charCodeAt(i + 2)]);
      i += 2;
    } else {
      chars.add(body[i]);
    }
  }
  return { kind: 'class', negated, chars, ranges };
}

function atomMatches(atom, ch) {
  if (ch === undefined) return false; // off the end of the text
  switch (atom.kind) {
    case 'dot': return true;
    case 'char': return ch === atom.ch;
    case 'class': {
      const code = ch.charCodeAt(0);
      const inside = atom.chars.has(ch) || atom.ranges.some(([lo, hi]) => code >= lo && code <= hi);
      return atom.negated ? !inside : inside;
    }
  }
}

// ---------- stage 2: match, with backtracking ---------------------------

export function test(pattern, text) {
  const { anchoredStart, anchoredEnd, nodes } = parsePattern(pattern);

  // an unanchored pattern may begin anywhere (the original couldn't):
  const starts = anchoredStart ? [0] : Array.from({ length: text.length + 1 }, (_, k) => k);
  return starts.some((start) => matchHere(nodes, 0, text, start, anchoredEnd));
}

function matchHere(nodes, n, text, t, anchoredEnd) {
  if (n === nodes.length) return anchoredEnd ? t === text.length : true;

  const { atom, quant } = nodes[n];

  if (quant === '*' || quant === '+') {
    // THE FIX for the original's greed: a loop of choice points.
    // Consume the minimum first ('+' needs one), then at EACH count
    // ask "can the rest match from here?" before consuming more.
    // If we run out of matching characters, every split was tried —
    // and each failed recursive call quietly UNDID its choice.
    let k = t;
    if (quant === '+') {
      if (!atomMatches(atom, text[k])) return false;
      k++;
    }
    while (true) {
      if (matchHere(nodes, n + 1, text, k, anchoredEnd)) return true; // this split works
      if (!atomMatches(atom, text[k])) return false; // no more to consume: defeat
      k++; // consume one more, try again
    }
  }

  if (quant === '?') {
    if (atomMatches(atom, text[t]) && matchHere(nodes, n + 1, text, t + 1, anchoredEnd)) return true;
    return matchHere(nodes, n + 1, text, t, anchoredEnd); // the zero-width choice
  }

  return atomMatches(atom, text[t]) && matchHere(nodes, n + 1, text, t + 1, anchoredEnd);
}
