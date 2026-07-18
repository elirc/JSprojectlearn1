// Project 49 parsed + - * / with recursive descent: one function per
// precedence level. Beautiful... at TWO levels. Then the feature
// requests arrived: exponents, unary minus, comparisons. This file is
// what "just add another level" grows into — and the two bugs it
// breeds. Run it: node 70-pratt-calculator/original.js

function tokenize(src) {
  var tokens = src.match(/\d+\.?\d*|[+\-*/^()<>]/g) || [];
  return tokens.map(function (t) {
    return /^[\d.]/.test(t) ? { type: "num", value: parseFloat(t) } : { type: "op", value: t };
  });
}

function parse(tokens) {
  var pos = 0;
  function peek() { return tokens[pos]; }
  function next() { return tokens[pos++]; }

  // Problem 1: THE LADDER. Every precedence level is another
  // hand-written function calling the next one down. Four levels
  // deep already; comparisons, logic ops, bit ops... each is another
  // copy-pasted function and another chance to wire the chain wrong.
  function comparison() {
    var left = additive();
    while (peek() && peek().value === ">") { next(); left = { op: ">", left: left, right: additive() }; }
    return left;
  }

  function additive() {
    var left = multiplicative();
    while (peek() && (peek().value === "+" || peek().value === "-")) {
      var op = next().value;
      left = { op: op, left: left, right: multiplicative() };
    }
    return left;
  }

  function multiplicative() {
    var left = power();
    while (peek() && (peek().value === "*" || peek().value === "/")) {
      var op = next().value;
      left = { op: op, left: left, right: power() };
    }
    return left;
  }

  function power() {
    var left = atom();
    // Problem 2: the while-loop pattern was copy-pasted from
    // additive() — but it builds LEFT-associative trees, and ^ is
    // RIGHT-associative. 2^3^2 must mean 2^(3^2) = 512; this
    // computes (2^3)^2 = 64. Silently. Check the demo.
    while (peek() && peek().value === "^") {
      next();
      left = { op: "^", left: left, right: atom() };
    }
    return left;
  }

  function atom() {
    if (peek() && peek().value === "(") {
      next();
      var e = comparison();
      next(); // ')' — hopefully!
      return e;
    }
    if (peek() && peek().value === "-") {
      next();
      // Problem 3: unary minus was bolted on at the BOTTOM of the
      // ladder, so it binds tighter than ^. -2^2 parses as (-2)^2
      // = 4; every math convention says -(2^2) = -4. Precedence
      // bugs don't crash — they just quietly compute wrong numbers.
      return { op: "neg", operand: atom() };
    }
    return { type: "num", value: next().value };
  }

  return comparison();
}

function evaluate(node) {
  if (node.type === "num") return node.value;
  if (node.op === "neg") return -evaluate(node.operand);
  var l = evaluate(node.left), r = evaluate(node.right);
  switch (node.op) {
    case "+": return l + r; case "-": return l - r;
    case "*": return l * r; case "/": return l / r;
    case "^": return Math.pow(l, r); case ">": return l > r ? 1 : 0;
  }
}

function calc(src) { return evaluate(parse(tokenize(src))); }

console.log("2^3^2  =", calc("2^3^2"), "   (should be 512 — got (2^3)^2 instead)");
console.log("-2^2   =", calc("-2^2"), "     (should be -4 — got (-2)^2 instead)");
console.log("1+2*3  =", calc("1+2*3"), "     (this one's fine — the EASY cases work)");
