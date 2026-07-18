// "Testing" the fizzbuzz function, the way everyone starts:
// a script full of console.log comparisons.

function fizzbuzz(n) {
  var parts = [];
  if (n % 3 === 0) parts.push("Fizz");
  if (n % 5 === 0) parts.push("Buzz");
  return parts.length ? parts.join("") : String(n);
}

// check 1
if (fizzbuzz(3) === "Fizz") {
  console.log("ok: fizz");
} else {
  console.log("FAIL: fizz");
}

// check 2 — same five lines, different values (rule of three says...)
if (fizzbuzz(5) === "Buzz") {
  console.log("ok: buzz");
} else {
  console.log("FAIL: buzz");
}

// check 3 — this one CRASHES (typo: fizzbuz), and because checks are
// just top-level statements, EVERY CHECK AFTER IT never runs:
try { // (try/catch added after the crash cost an afternoon)
  if (fizzbuz(15) === "FizzBuzz") {
    console.log("ok: fizzbuzz");
  }
} catch (e) {
  console.log("FAIL: crashed - " + e.message);
}

// check 4
if (fizzbuzz(7) === "7") {
  console.log("ok: plain");
} else {
  console.log("FAIL: plain");
}

// Run it: the output is a wall of "ok" lines you stop reading by day
// two. There's no count, no summary, and — the killer for automation —
// the script's EXIT CODE is 0 even when checks fail. Hook this to CI
// and CI stays green forever. Failing quietly is the one thing a test
// must never do.
