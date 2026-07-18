// A task scheduler whose function types are all mush: `Function`,
// `any[]`, and untyped callbacks. Compiles; helps nobody.

// `Function` accepts ANY function — wrong arity, wrong args, wrong
// everything:
export function runTask(name: string, task: Function): void {
  console.log(`running ${name}`);
  task('surprise', 42); // calls with whatever; Function can't object
}

runTask('cleanup', () => console.log('cleaning'));
runTask('add', (a: number, b: number) => a + b); // silently ('surprise', 42)
runTask('oops', 'not even a function' as any);   // compiles via any; crashes

// Callbacks without types — the handler's params are anybody's guess:
export function onResult(callback: any): void {
  callback({ ok: true, value: 99 });
}

onResult((result: any) => {
  console.log(result.vlaue); // typo: undefined. any said "sure".
});

// And the classic void confusion — a function whose return is
// MEANINGFUL gets used where the return is IGNORED:
export function saveScore(score: number): boolean {
  return score >= 0; // false = rejected!
}

const scores = [10, -5, 20];
scores.forEach(saveScore);
// forEach ignores returns. The -5 rejection vanished. No one knows.
