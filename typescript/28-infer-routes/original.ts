// A tiny router: routes have :params, and handlers receive them.
// The params object is typed Record<string, string> — so every
// handler is on its own recognizance about WHICH params exist.

export function makeUrl(route: string, params: Record<string, string>): string {
  return route.replace(/:([A-Za-z]+)/g, (_, name) => {
    const value = params[name];
    if (value === undefined) throw new Error(`missing param :${name}`);
    return encodeURIComponent(value);
  });
}

// The runtime works. The types know nothing:
export const a = makeUrl('/users/:userId/posts/:postId', {
  userId: '7',
  postId: '42',
}); // '/users/7/posts/42'

export const b = makeUrl('/users/:userId/posts/:postId', {
  userId: '7',
  postld: '42', // TYPO (postld). Compiles — Record<string,string>
});              // accepts any keys — and THROWS at runtime.

export const c = makeUrl('/health', {
  probe: 'deep', // extra junk for a route with NO params: compiles,
});               // silently ignored. The reverse failure mode.

// The route string LITERALLY CONTAINS the answer — ':userId' and
// ':postId' are right there in the type ('/users/:userId/...' is a
// string literal type!). The information exists at compile time;
// nothing is reading it.
