// "We need to parse JSON-ish config files. JSON is basically
// JavaScript, right? So..."

export function parseJson(text) {
  // Problem 1 — THE CARDINAL SIN: eval-by-another-name. JSON is a
  // subset of JS syntax, so Function() "works"... by EXECUTING the
  // input as code. Parse {"x": (console.log("pwned"), 1)} — or
  // anything a malicious config author writes — and it RUNS.
  // (This is literally how JSON was parsed before 2009. It went
  // badly. json2.js and JSON.parse exist because of it.)
  return new Function("return (" + text + ")")();
}

// Problem 2: it accepts things JSON forbids — single quotes,
// trailing commas, comments, undefined, hex numbers — so configs
// that "work" here break the moment any real JSON.parse sees them.
// A parser that's too permissive silently forks the format.

// Problem 3: error reporting is whatever the JS engine says about
// the GENERATED code: "Unexpected token )" with no line, no column,
// no hint which config file byte is wrong.

// ---- demo -----------------------------------------------------------
console.log(parseJson('{"name": "config", "port": 8080}')); // fine...

console.log(parseJson("{'singles': 'accepted', trailing: 'comma',}")); // not JSON! accepted!

console.log(parseJson('{"x": (console.log("  <-- ARBITRARY CODE RAN"), 42)}'));

try {
  parseJson('{"broken": }');
} catch (e) {
  console.log("error quality:", e.message); // which byte? no idea.
}
