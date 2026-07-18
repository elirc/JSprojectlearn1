// Project 45's 60-line runner was great — until the team's tests
// grew hooks and async. Here's the "just add features" version.

var tests = [];
var passed = 0;
var failed = 0;

// Problem 1: ONE global beforeEach. Nested groups can't have their
// own setup, and the last file to assign wins — someone else's
// beforeEach just replaced yours, silently.
var globalBefore = null;
function beforeEach(fn) { globalBefore = fn; }

function it(name, fn) { tests.push({ name: name, fn: fn }); }

function run() {
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    try {
      if (globalBefore) globalBefore();

      // Problem 2 — THE FALSE-GREEN BUG: an async test RETURNS A
      // PROMISE, and this line ignores it. The try/catch sees no
      // throw (the rejection happens later, elsewhere), so the test
      // PASSES. Every async test in this suite passes. Including
      // the ones that fail. A test runner whose failures can't fail
      // is worse than no tests at all.
      t.fn();

      passed++;
      console.log("  ok:", t.name);
    } catch (e) {
      failed++;
      console.log("  FAIL:", t.name, "-", e.message);
    }
    // Problem 3: no afterEach — cleanup goes inside each test, which
    // means a FAILING test skips its own cleanup and poisons the
    // tests after it (project 56's leak lesson, in miniature).
  }
  console.log(passed + " passed, " + failed + " failed");
}

// Problem 4: want to focus on one test while debugging? Comment out
// the other 400. (.only/.skip don't exist.)

// Problem 5: everything above is module-global state. Two suites in
// one process share `tests`, `passed`, `globalBefore`... the runner
// itself can't be tested, because running it mutates the world.

// --- demo: watch the false green -----------------------------------
var db = { rows: [] };
beforeEach(function () { db.rows = []; });

it("sync test that fails, correctly reported", function () {
  if (db.rows.length !== 999) throw new Error("expected 999 rows");
});

it("ASYNC test that fails... and passes", async function () {
  await new Promise(function (r) { setTimeout(r, 5); });
  throw new Error("this failure is invisible"); // rejection nobody awaits
});

run(); // "1 passed, 1 failed" — should be 0 passed, 2 failed.
// Then, ~5ms AFTER the summary printed, the ignored rejection
// surfaces and kills the process — proof the runner finished
// without ever knowing the async test failed.
