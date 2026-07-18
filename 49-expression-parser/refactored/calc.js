// The pipeline, assembled: text -> tokens -> tree -> number.
// Run:  node calc.js "2 + 3 * (4 - 1)"
import { tokenize } from './tokenizer.js';
import { parse, evaluate } from './parser.js';

export function calculate(input) {
  return evaluate(parse(tokenize(input)));
}

const expression = process.argv[2];
if (expression !== undefined) {
  try {
    console.log(calculate(expression));
  } catch (err) {
    console.error(`${err.name}: ${err.message}`);
    process.exitCode = 1;
  }
}
