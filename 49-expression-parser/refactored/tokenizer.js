/**
 * STAGE 1 of the pipeline: raw text -> a flat list of tokens.
 *
 *   "2 + 3.5*(1-4)"  ->  [ {number 2}, {op +}, {number 3.5},
 *                          {op *}, {op (}, {number 1}, {op -},
 *                          {number 4}, {op )} ]
 *
 * The tokenizer's whole job is characters: digits clump into numbers,
 * whitespace disappears, junk throws with a POSITION. It knows nothing
 * about precedence or matching parens — that's the parser's job.
 * (Same walk-with-state loop as project 34's CSV parser.)
 */
export function tokenize(input) {
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (char === ' ' || char === '\t') {
      i++;
    } else if ('+-*/()'.includes(char)) {
      tokens.push({ type: 'op', value: char });
      i++;
    } else if (/[0-9.]/.test(char)) {
      let end = i;
      while (end < input.length && /[0-9.]/.test(input[end])) end++;
      const text = input.slice(i, end);
      const value = Number(text);
      if (Number.isNaN(value)) {
        throw new SyntaxError(`Bad number "${text}" at position ${i}`);
      }
      tokens.push({ type: 'number', value });
      i = end;
    } else {
      throw new SyntaxError(`Unexpected character "${char}" at position ${i}`);
    }
  }

  return tokens;
}
