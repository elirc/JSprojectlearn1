/**
 * A working test framework in ~60 lines. Not a toy: registration,
 * isolation, async support, assertion helpers, a summary, and a
 * meaningful exit code. Every framework you'll ever use (node:test,
 * jest, vitest) is this file plus features.
 *
 * The deep-equal that powers assertEqual comes from project 25 —
 * an assertEqual IS a deep-equal with a good error message.
 */
import { deepEqual } from '../../25-deep-equal/refactored/deep-equal.js';

const tests = [];

/** Phase 1 — REGISTRATION: test() only collects; nothing runs yet. */
export function test(name, fn) {
  tests.push({ name, fn });
}

/** Phase 2 — the runner: every test runs, no matter who fails. */
export async function run() {
  const failures = [];

  for (const { name, fn } of tests) {
    try {
      await fn(); // await: async tests work for free
      console.log(`  ok    ${name}`);
    } catch (err) {
      // ISOLATION: one crash fails ONE test, not the whole file.
      failures.push({ name, err });
      console.log(`  FAIL  ${name}`);
      console.log(`        ${err.message}`);
    }
  }

  console.log(`\n${tests.length - failures.length}/${tests.length} passed`);

  // The line the original was missing: tell the OUTSIDE WORLD.
  // CI systems only read the exit code — 0 lies, 1 alarms.
  process.exitCode = failures.length > 0 ? 1 : 0;
  return failures;
}

// ---- assertions: throw on failure, with messages that do the debugging ----

export function assertEqual(actual, expected, label = 'values') {
  if (!deepEqual(actual, expected)) {
    throw new Error(
      `${label}: expected ${show(expected)}, got ${show(actual)}`,
    );
  }
}

export function assertThrows(fn, pattern) {
  try {
    fn();
  } catch (err) {
    if (pattern && !pattern.test(err.message)) {
      throw new Error(
        `threw the wrong error: "${err.message}" does not match ${pattern}`,
      );
    }
    return err;
  }
  throw new Error('expected the function to throw, but it returned normally');
}

function show(value) {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}
