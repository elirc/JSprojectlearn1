// A type-level PARSER: recurse over the route string with template
// literal patterns + infer, and extract the params object from the
// route itself. js#49 parsed strings at runtime; this parses them
// at compile time.

// "does the route contain :name?" — pattern-match with infer:
//   `${infer _Prefix}:${infer Param}/${infer Rest}` captures a param
//   followed by more route; recurse on the rest.
export type ParamsOf<Route extends string> =
  Route extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ParamsOf<`/${Rest}`>]: string }
    : Route extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : Record<string, never>;
// no params -> Record<string, never>, NOT {}: the empty object type
// {} performs no excess-property rejection (anything non-nullish is
// assignable to it), so junk params would slip through. never-valued
// records reject every extra key.

// Spot-check the parser (hover these):
export type P1 = ParamsOf<'/users/:userId/posts/:postId'>;
// { userId: string; postId: string }
export type P2 = ParamsOf<'/health'>;
// {}

// The same runtime function — now with the computed params type.
// Route must be a LITERAL type for the magic to work, which it is
// whenever you write the route inline:
export function makeUrl<Route extends string>(
  route: Route,
  params: ParamsOf<Route>,
): string {
  return route.replace(/:([A-Za-z]+)/g, (_, name: string) => {
    const value = (params as Record<string, string>)[name];
    if (value === undefined) throw new Error(`missing param :${name}`);
    return encodeURIComponent(value);
  });
  // (the cast inside is ts#20's contained-unsafety: the public
  // signature is exact; the body erases to plain strings anyway)
}

export const a = makeUrl('/users/:userId/posts/:postId', {
  userId: '7',
  postId: '42',
});

export const health = makeUrl('/health', {}); // {} required — nothing else

// ==== type tests: both original failures, now compile errors ======
// @ts-expect-error — the typo: 'postld' is not a param of this route
export const b = makeUrl('/users/:userId/posts/:postId', { userId: '7', postld: '42' });

// @ts-expect-error — missing params are caught too
export const c = makeUrl('/users/:userId/posts/:postId', { userId: '7' });

// @ts-expect-error — param-less routes accept NO extra junk
export const d = makeUrl('/health', { probe: 'deep' });
