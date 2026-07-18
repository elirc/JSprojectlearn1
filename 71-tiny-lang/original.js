// "We need a tiny scripting language for user macros. Easy: split on
// semicolons and handle each statement with regex + eval."
// Run it: node 71-tiny-lang/original.js

var variables = {}; // Problem 1: ONE flat global scope, forever.

function run(source) {
  // Problem 2: "parsing" = split(';'). A semicolon inside a string?
  // A block spanning statements? An if with an else? The format
  // can't even REPRESENT nesting — if/while below only accept ONE
  // statement, no blocks, no else.
  var statements = source.split(";");

  for (var i = 0; i < statements.length; i++) {
    var stmt = statements[i].trim();
    if (!stmt) continue;

    var m;
    if ((m = stmt.match(/^let (\w+) = (.+)$/))) {
      variables[m[1]] = evalExpr(m[2]);
    } else if ((m = stmt.match(/^print (.+)$/))) {
      console.log(evalExpr(m[1]));
    } else if ((m = stmt.match(/^if \((.+)\) (.+)$/))) {
      // one statement only. else? nested if? Impossible shapes.
      if (evalExpr(m[1])) run(m[2]);
    } else if ((m = stmt.match(/^while \((.+)\) (.+)$/))) {
      // ...and the while's body can't contain a ';' — split() above
      // already cut it off. Loops with more than one statement are
      // simply not writable.
      while (evalExpr(m[1])) run(m[2]);
    } else if ((m = stmt.match(/^(\w+) = (.+)$/))) {
      variables[m[1]] = evalExpr(m[2]);
    } else {
      // Problem 3: errors have no line numbers, no positions —
      // just the raw statement thrown back at you.
      throw new Error("what is this: " + stmt);
    }
  }
}

function evalExpr(expr) {
  // Problem 4: expressions are EVAL'D, with variables spliced in by
  // regex. All of project 69's security lesson, un-learned:
  // let x = process.exit(1) "works". And precedence, associativity,
  // error positions — all delegated to a JS engine evaluating code
  // we GENERATED.
  var substituted = expr.replace(/[a-zA-Z_]\w*/g, function (name) {
    return name in variables ? JSON.stringify(variables[name]) : name;
  });
  return eval(substituted);
}

// works — impressive for 40 lines, which is why this design survives
// code review:
run("let x = 3; let y = 4; print x * x + y * y");

// no scoping: the while's "body" variable is global, and leaks:
run("let i = 0; while (i < 3) i = i + 1; print i");
console.log("i leaked into globals:", variables.i);

// and the ceiling, immediately:
try {
  run("if (x > 2) { print 1; print 2; }"); // blocks: unrepresentable
} catch (e) {
  console.log("failed on a block:", e.message);
}
