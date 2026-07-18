// The team built clever types (ts#24-28 style)... and "tests" them
// by hovering in the editor. This file documents the workflow.

// A homegrown DeepPartial — recursion over objects:
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

interface Config {
  server: { port: number; host: string };
  tags: string[];
  debug: boolean;
}

// The "test": declare a value, hover it, squint:
export const looksRight: DeepPartial<Config> = {
  server: { port: 8080 }, // nested partial works! ship it.
};

// What the hover DIDN'T show: T[K] extends object is true for
// ARRAYS too — so tags became DeepPartial<string[]>, which maps `?`
// onto the ELEMENTS: a sparse (string | undefined)[] . This compiles:
export const suspicious: DeepPartial<Config> = {
  tags: ['a', undefined, 'c'], // an array with HOLES in it
};
// A consumer doing tags.map((t) => t.toUpperCase()) crashes on the
// hole. The type has a BUG — partial should mean "fields may be
// missing", never "array elements may be undefined". It shipped,
// because "hover and squint" only tests the cases you thought to
// hover.

// Second clever type, same workflow — extract ids from an entity map:
export type IdsOf<T> = { [K in keyof T]: T[K] extends { id: infer Id } ? Id : never }[keyof T];

interface Entities {
  user: { id: number; name: string };
  session: { id: string; token: string };
  health: { status: string }; // no id — should contribute nothing
}

export type EntityId = IdsOf<Entities>;
// intended: number | string. hover says: string | number ... | never?
// never vanishes in unions so it LOOKS fine — but did health leak a
// never in, or was it excluded? Is undefined in there? The hover
// truncates long types. Nobody knows, and the next refactor of IdsOf
// has no safety net: change it, hover two examples, hope.
