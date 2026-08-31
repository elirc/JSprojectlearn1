// A config viewer: parse a JSON file, list every leaf with its path.
// `JSON.parse` returns `any` (ts#13's lie), so `walk` never has to say
// what it walks — and therefore never has to handle everything it
// might meet.

const CONFIG_TEXT = `{
  "name": "deploy",
  "retries": 3,
  "verbose": true,
  "hooks": { "before": "lint", "after": null },
  "targets": ["staging", "prod"]
}`;

export function walk(value: any, path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item: any, index: number) => walk(item, `${path}[${index}]`));
  }
  if (typeof value === 'object') {
    // `typeof null === 'object'` — the oldest wart in JavaScript, and
    // this branch walks straight into it. There is no `value === null`
    // check anywhere, because nothing ever forced the author to
    // enumerate what a JSON value can be.
    return Object.keys(value).flatMap((key) => walk(value[key], `${path}.${key}`));
  }
  return [`${path} = ${value.toString()}`];
}

export const lines = walk(JSON.parse(CONFIG_TEXT));
// RUNTIME: TypeError: Cannot convert undefined or null to object
//   at Object.keys (<anonymous>)
// ...from `"after": null`. Six leaves render, the seventh kills the
// page. The stack trace says `Object.keys`; the cause is a missing
// case the compiler was never asked about.

// Same hole, second shape: a kind-labeller with a silent default.
export function describe(value: any): string {
  switch (typeof value) {
    case 'string':
      return 'text';
    case 'number':
      return 'number';
    case 'object':
      return Array.isArray(value) ? 'list' : 'section';
    default:
      return 'unknown';
  }
}

export const verboseKind = describe(true);
// 'unknown' — booleans fall into the default, so the viewer renders
// "verbose: unknown". ts#12's silent-default disease: a bucket that
// answers *something* for every input is a bucket that can never
// report a missing case.

export const nonsense = walk(() => 42);
// '$ = () => 42'. Functions are not JSON — `any` waved one in anyway,
// and the walker cheerfully described it. Nothing crashed, which is
// worse: the output is now quietly wrong.

// One root cause for all three: nobody ever wrote down what a JSON
// value IS. Six variants, one of them famously misreported by
// `typeof`. Write the type and the compiler can hold you to it.
