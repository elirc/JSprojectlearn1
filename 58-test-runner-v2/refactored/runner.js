/**
 * Test runner v2 — project 45's runner grown three features the
 * moment real suites demand them:
 *
 *   - beforeEach/afterEach that NEST (suite tree, not a global slot)
 *   - async tests: every test fn is awaited — no false greens
 *   - .only / .skip for focusing without commenting out the world
 *
 * And one structural fix that enables all testing OF the runner:
 * createRunner() returns an instance. No module globals — the runner
 * is just a value, so our tests below run runners inside a runner.
 *
 * run() RETURNS results; printing is a separate reporter (the
 * decide/do split, as always).
 */

export function createRunner() {
  // The suite tree. Each node: tests, hooks, child suites.
  const makeSuite = (name, parent) => ({
    name, parent, suites: [], tests: [], beforeEach: [], afterEach: [],
  });
  const root = makeSuite('', null);
  let current = root; // where describe/it register — a cursor into the tree
  let sawOnly = false;

  function describe(name, fn) {
    const suite = makeSuite(name, current);
    current.suites.push(suite);
    const prev = current;
    current = suite;
    try { fn(); } finally { current = prev; } // even a throwing describe restores the cursor
  }

  function it(name, fn) {
    current.tests.push({ name, fn, mode: 'normal' });
  }
  it.only = (name, fn) => { sawOnly = true; current.tests.push({ name, fn, mode: 'only' }); };
  it.skip = (name, fn) => { current.tests.push({ name, fn, mode: 'skip' }); };

  const beforeEach = (fn) => current.beforeEach.push(fn);
  const afterEach = (fn) => current.afterEach.push(fn);

  /** Root-to-leaf chain of suites for a given suite (for hooks & names). */
  function lineage(suite) {
    const chain = [];
    for (let s = suite; s !== null; s = s.parent) chain.unshift(s);
    return chain;
  }

  async function runTest(suite, test, results) {
    const fullName = [...lineage(suite).map((s) => s.name), test.name]
      .filter(Boolean).join(' > ');

    if (test.mode === 'skip' || (sawOnly && test.mode !== 'only')) {
      results.push({ name: fullName, status: 'skip' });
      return;
    }

    const chain = lineage(suite);
    let error = null;
    try {
      // beforeEach: OUTERMOST first (parents set the stage for children)
      for (const s of chain) for (const hook of s.beforeEach) await hook();
      await test.fn(); // THE fix: awaited, so async failures fail
    } catch (err) {
      error = err;
    } finally {
      // afterEach: INNERMOST first (unwind in reverse), and it runs
      // even when the test failed — cleanup is not optional. A hook
      // failure must not hide the test's own error.
      for (const s of [...chain].reverse()) {
        for (const hook of [...s.afterEach].reverse()) {
          try { await hook(); } catch (hookErr) { error ??= hookErr; }
        }
      }
    }

    results.push(error
      ? { name: fullName, status: 'fail', error }
      : { name: fullName, status: 'pass' });
  }

  async function runSuite(suite, results) {
    for (const test of suite.tests) await runTest(suite, test, results);
    for (const child of suite.suites) await runSuite(child, results);
  }

  /** Run everything; return data. No console in sight. */
  async function run() {
    const results = [];
    await runSuite(root, results);
    return results;
  }

  return { describe, it, beforeEach, afterEach, run };
}

/** The reporter — the only place that prints. */
export function report(results, log = console.log) {
  const icon = { pass: 'ok  ', fail: 'FAIL', skip: 'skip' };
  for (const r of results) {
    log(`  ${icon[r.status]}  ${r.name}${r.error ? ` — ${r.error.message}` : ''}`);
  }
  const count = (s) => results.filter((r) => r.status === s).length;
  log(`${count('pass')} passed, ${count('fail')} failed, ${count('skip')} skipped`);
  return count('fail') === 0;
}
