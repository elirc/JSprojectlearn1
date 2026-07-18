// Function TYPES with real signatures: parameter lists, returns, and
// named aliases for the shapes you use twice (ts#03's rule, applied
// to functions).

// A task takes nothing, returns nothing. Spelled out:
export type Task = () => void;

export function runTask(name: string, task: Task): void {
  console.log(`running ${name}`);
  task(); // the only call the type allows
}

runTask('cleanup', () => console.log('cleaning'));

// Callbacks: the parameter's SHAPE is part of the contract —
// so the handler's parameter is INFERRED at the call site
// (contextual typing: ts#02's inference, working through functions):
export interface TaskResult {
  ok: boolean;
  value: number;
}

export type ResultHandler = (result: TaskResult) => void;

export function onResult(callback: ResultHandler): void {
  callback({ ok: true, value: 99 });
}

onResult((result) => {
  // `result` is TaskResult without an annotation — and result.vlaue
  // is a compile error (see type tests)
  console.log(result.value);
});

// void returns: `saveScore` returns something MEANINGFUL, so give
// the rejection a path that can't be ignored accidentally:
export function saveScore(score: number): boolean {
  return score >= 0;
}

const scores = [10, -5, 20];
export const rejected = scores.filter((score) => !saveScore(score));
// [-5] — the rejections are DATA now, not ignored return values.
// (Why did forEach(saveScore) compile at all? A () => void context
// accepts callbacks that return MORE — by design, so number.push
// etc. work as callbacks. void means "I won't look", not "you may
// not return". Now you know — so don't hand result-bearing
// functions to return-ignoring iterators.)

// ==== type tests ==================================================
// @ts-expect-error — a Task takes no arguments; wrong-arity callbacks rejected
runTask('add', (a: number, b: number) => a + b);

// @ts-expect-error — non-functions can't be tasks (no `as any` laundering)
runTask('oops', 'not even a function');

onResult((result) => {
  // @ts-expect-error — the typo is caught: 'vlaue' doesn't exist on TaskResult
  console.log(result.vlaue);
});
