// A calculator that evaluates "2 + 3 * 4" from a string.

// --- Attempt 1: eval. One line! ---
function calc1(expr) {
  return eval(expr);
}
console.log(calc1("2 + 3 * 4")); // 14. Done...?
// eval runs ARBITRARY CODE. If the expression ever comes from a user:
//   calc1("process.exit(1)")               - kills your server
//   calc1("require('fs').rmSync('/', ...)" - please no
// eval is also unfirable: you can't give nice errors, can't limit
// features, can't say "numbers and + - * / only". It's all of
// JavaScript or nothing. NEVER eval user input.

// --- Attempt 2: do it ourselves. Split on operators, left to right. ---
function calc2(expr) {
  var tokens = expr.split(" ");
  var result = parseFloat(tokens[0]);
  for (var i = 1; i < tokens.length; i += 2) {
    var op = tokens[i];
    var value = parseFloat(tokens[i + 1]);
    if (op == "+") result += value;
    if (op == "-") result -= value;
    if (op == "*") result *= value;
    if (op == "/") result /= value;
  }
  return result;
}

console.log(calc2("2 + 3"));     // 5 - good
console.log(calc2("2 + 3 * 4")); // 20?! Should be 14.
// Left-to-right evaluation ignores PRECEDENCE: * and / bind tighter
// than + and -. "2 + 3 * 4" means 2 + (3 * 4), not (2 + 3) * 4.
// Every calculator user expects this; calc2 silently gets it wrong.

console.log(calc2("2+3*4"));      // NaN - no spaces, split(" ") fails
console.log(calc2("(2 + 3) * 4")); // NaN - parentheses? never heard of them
console.log(calc2("2 + + 3"));     // NaN - malformed input, no error, just NaN
// Fixing precedence + parens + error messages with MORE ifs in this
// loop is hopeless: the problem isn't missing cases, it's that the
// approach has no concept of STRUCTURE. "2 + 3 * 4" isn't a list of
// tokens - it's a TREE: (+ 2 (* 3 4)). We need to build that tree.
