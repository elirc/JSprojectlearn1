// Reverse Polish Notation calculator: "3 4 +" means 3 + 4.
// Operators come AFTER their operands, so no parentheses are needed.

function calc(expr) {
  var stack = [];
  var tokens = expr.split(" ");
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (t == "+") {
      var b = stack.pop();
      var a = stack.pop();
      stack.push(a + b);
    } else if (t == "-") {
      var b2 = stack.pop();
      var a2 = stack.pop();
      stack.push(a2 - b2);
    } else if (t == "*") {
      var b3 = stack.pop();
      var a3 = stack.pop();
      stack.push(a3 * b3);
    } else if (t == "/") {
      var b4 = stack.pop();
      var a4 = stack.pop();
      stack.push(a4 / b4);
    } else {
      stack.push(parseFloat(t));
    }
  }
  return stack.pop();
}

console.log(calc("3 4 +"));           // 7
console.log(calc("5 1 2 + 4 * + 3 -")); // 14

// Every new operator = 5 more copy-pasted lines in the if-chain.
// And the failure modes are quiet:
console.log(calc("3 +"));      // NaN (popped an empty stack -> undefined)
console.log(calc("3 4"));      // 4 (leftover operand silently dropped!)
console.log(calc("3 four +")); // NaN (typo becomes NaN, no error)
