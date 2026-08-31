// Two questions the original couldn't answer, both answered by the
// route strings themselves:
//   1. "is this a real route?"   -> a union of the registered paths
//   2. "which params does it need?" -> parsed out of the literal

// ==== 1. the routes become a TYPE (ts#31: `as const` keeps literals)
export const ROUTES = [
  '/',
  '/users/:id',
  '/users/:id/posts/:postId',
  '/settings/:section',
] as const;

export type Path = (typeof ROUTES)[number];
// '/' | '/users/:id' | '/users/:id/posts/:postId' | '/settings/:section'

// ==== 2. a type-level parser over the path ========================
// Split on '/', ask each segment "are you a :param?", union the
// answers. Recursion + template literals + infer (ts#26/#28).
export type ParamNames<P extends string> =
  P extends `${infer Head}/${infer Rest}`
    ? (Head extends `:${infer Name}` ? Name : never) | ParamNames<Rest>
    : P extends `:${infer Name}`
      ? Name
      : never;
// ParamNames<'/users/:id/posts/:postId'> = 'id' | 'postId'
// ParamNames<'/'> = never   (no segment starts with ':')

export type ExtractParams<P extends string> =
  [ParamNames<P>] extends [never]
    ? Record<string, never>
    : { [K in ParamNames<P>]: string };
// The `[never]` wrapper is the standard "is this exactly never?"
// check: a bare `ParamNames<P> extends never` DISTRIBUTES over the
// union and a distributive conditional over `never` returns `never`,
// so the test would never fire. Wrapping both sides in a 1-tuple
// switches distribution off.
//
// Param-less routes get `Record<string, never>`, not `{}`, because
// `{}` accepts any non-nullish value — junk params would slip
// straight through (the ts#28 footnote, still true).

export type Params<P extends Path> = ExtractParams<P>;

export const visited: string[] = [];

// P is inferred as the LITERAL you pass, which is what makes the
// second argument's type computable at the call site.
export function navigate<P extends Path>(path: P, params: ExtractParams<P>): string {
  const url = path.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) => {
    const value = (params as Record<string, string>)[name];
    if (value === undefined) throw new Error(`navigate: missing param :${name}`);
    return encodeURIComponent(value);
  });
  visited.push(url);
  return url;
}

export const post = navigate('/users/:id/posts/:postId', { id: '7', postId: '42' });
export const home = navigate('/', {}); // {} required, and nothing else fits

// ==== the registry pays a second dividend =========================
// A handler table that CANNOT drift: one entry per route, each
// receiving exactly its own params (ts#25's mapped type over Path).
export type Handlers = { [P in Path]: (params: ExtractParams<P>) => string };

export const handlers: Handlers = {
  '/': () => 'home',
  '/users/:id': (params) => `user ${params.id}`,
  '/users/:id/posts/:postId': (params) => `post ${params.postId} by ${params.id}`,
  '/settings/:section': (params) => `settings: ${params.section}`,
};
// Add a route to ROUTES and this object stops compiling until you
// handle it. Rename ':section' to ':tab' and every use of
// `params.section` — here and at every call site — lights up red.

// ==== type tests: every original failure, now a compile error =====
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type _ParserCases = [
  Expect<Equal<ParamNames<'/users/:id/posts/:postId'>, 'id' | 'postId'>>,
  Expect<Equal<ExtractParams<'/users/:id/posts/:postId'>, { id: string; postId: string }>>,
  Expect<Equal<ExtractParams<'/settings/:section'>, { section: string }>>,
  Expect<Equal<ExtractParams<'/'>, Record<string, never>>>,
];

// @ts-expect-error — the param typo: 'postld' is not a param of this route
navigate('/users/:id/posts/:postId', { id: '7', postld: '42' });

// @ts-expect-error — the missing param
navigate('/users/:id/posts/:postId', { id: '7' });

// @ts-expect-error — the TYPO IN THE PATH: '/uesrs/:id' is not a route
navigate('/uesrs/:id', { id: '7' });

// @ts-expect-error — a param-less route accepts no junk
navigate('/', { probe: 'deep' });

// @ts-expect-error — param names are checked against THIS route: it declares
// :section, so { tab } doesn't fit. Rename it to '/settings/:tab' in ROUTES
// and the reverse happens — every { section } call site fails the build
// instead of failing a user's Thursday.
navigate('/settings/:section', { tab: 'billing' });

void ((): _ParserCases | null => null);
