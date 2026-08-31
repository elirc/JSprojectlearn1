// Write down what a JSON value IS — all six variants, recursively —
// and every traversal becomes a checklist the compiler enforces.
// ts#40's AST lesson, applied to a structure you already use daily.

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

// One visitor interface: a handler per variant. Miss one and the
// object literal doesn't compile. `null` gets its own slot — it is a
// variant, not a flavour of object, whatever `typeof` claims.
export interface JsonVisitor<T> {
  string: (value: string, path: string) => T;
  number: (value: number, path: string) => T;
  boolean: (value: boolean, path: string) => T;
  null: (path: string) => T;
  array: (value: readonly Json[], path: string) => T;
  object: (value: { readonly [key: string]: Json }, path: string) => T;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled JSON variant: ${String(value)}`);
}

// The single traversal every consumer shares. Note the ORDER: null is
// tested first, so the `typeof value === 'object'` branch can never
// receive it. That's not discipline — after `value === null` returns,
// null is gone from the type and the compiler knows it.
export function visit<T>(value: Json, visitor: JsonVisitor<T>, path = '$'): T {
  if (value === null) return visitor.null(path);
  switch (typeof value) {
    case 'string':
      return visitor.string(value, path);
    case 'number':
      return visitor.number(value, path);
    case 'boolean':
      return visitor.boolean(value, path); // the original's 'unknown' bucket
    case 'object':
      return Array.isArray(value) ? visitor.array(value, path) : visitor.object(value, path);
    default:
      // Every variant handled, so `value` is `never` here. Add a
      // variant to Json and THIS LINE stops compiling (ts#12).
      return assertNever(value);
  }
}

// ---- consumer 1: the original's path listing, complete ------------
export const pathLines: JsonVisitor<string[]> = {
  string: (value, path) => [`${path} = ${JSON.stringify(value)}`],
  number: (value, path) => [`${path} = ${value}`],
  boolean: (value, path) => [`${path} = ${value}`],
  null: (path) => [`${path} = null`], // the crash, now a case
  array: (value, path) => value.flatMap((item, i) => visit(item, pathLines, `${path}[${i}]`)),
  object: (value, path) =>
    Object.keys(value).flatMap((key) => visit(value[key]!, pathLines, `${path}.${key}`)),
};

// ---- consumer 2: a second pass, free ------------------------------
// Every future traversal gets the same exhaustiveness guarantee from
// the same type — no new switch to keep in sync.
export const describe: JsonVisitor<string> = {
  string: () => 'text',
  number: () => 'number',
  boolean: () => 'boolean',
  null: () => 'empty',
  array: () => 'list',
  object: () => 'section',
};

const config: Json = {
  name: 'deploy',
  retries: 3,
  verbose: true,
  hooks: { before: 'lint', after: null },
  targets: ['staging', 'prod'],
};

export const lines = visit(config, pathLines); // all seven leaves, no crash
export const verboseKind = visit(true, describe); // 'boolean', not 'unknown'

// ==== type tests ==================================================
// A hypothetical seventh variant, proving the mechanism catches it.
// (`undefined` is the realistic candidate — it is what JSON.stringify
// drops and what a sloppy producer sends.)
type JsonPlusUndefined = Json | undefined;

function brokenVisit(value: JsonPlusUndefined): string {
  if (value === null) return 'empty';
  switch (typeof value) {
    case 'string':
      return 'text';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'section';
    default:
      // @ts-expect-error — 'undefined' is unhandled, so value is not never
      return assertNever(value);
  }
}
void brokenVisit;

// @ts-expect-error — a visitor missing the null case is not a JsonVisitor
export const forgetful: JsonVisitor<string> = {
  string: () => 's',
  number: () => 'n',
  boolean: () => 'b',
  array: () => 'a',
  object: () => 'o',
};

// @ts-expect-error — functions are not JSON (the original's `nonsense`)
visit(() => 42, describe);

// @ts-expect-error — neither is undefined
visit(undefined, describe);

// @ts-expect-error — nor a Date: it stringifies, but it is not a Json VALUE
visit(new Date(), describe);

// @ts-expect-error — the recursion is checked all the way down
export const nested: Json = { a: { b: [1, 'two', () => 3] } };
