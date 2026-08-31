// The app's one navigation helper. Every screen change goes through
// it. The app's routes are written down... in a comment:
//
//   /
//   /users/:id
//   /users/:id/posts/:postId
//   /settings/:section
//
// The compiler has never heard of any of them.

export const visited: string[] = [];

export function navigate(path: string, params: Record<string, string>): string {
  const url = path.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`navigate: missing param :${name}`);
    return encodeURIComponent(value);
  });
  visited.push(url);
  return url;
}

export function goodCase(): string {
  return navigate('/users/:id/posts/:postId', { id: '7', postId: '42' });
  // '/users/7/posts/42'. This one is fine. Nothing below is.
}

export function typoInParam(): string {
  return navigate('/users/:id/posts/:postId', { id: '7', postld: '42' });
  // 'postld' with an L. `Record<string, string>` accepts ANY key, so
  // the compiler shrugs — and navigate() THROWS at runtime.
}

export function missingParam(): string {
  return navigate('/users/:id/posts/:postId', { id: '7' });
  // no postId at all. Also compiles. Also throws.
}

export function typoInPath(): string {
  return navigate('/uesrs/:id', { id: '7' });
  // TYPO IN THE PATH ITSELF, and this one is worse: it doesn't even
  // throw. It cheerfully builds '/uesrs/7', the router matches
  // nothing, the user gets a blank screen, and the logs are empty.
}

export function junkParams(): string {
  return navigate('/', { probe: 'deep' });
  // a route with no params, handed params. Compiles, silently
  // ignored — the opposite failure mode, equally invisible.
}

// And the one that ruins a Thursday: someone renames a route.
//   '/settings/:section'  ->  '/settings/:tab'
// Every call site still passes `{ section: ... }`. Every call site
// still COMPILES. Every call site now throws the moment a user
// clicks it. The only tool that can find them is grep, and grep
// doesn't know which strings are routes.
export function afterARename(): string {
  return navigate('/settings/:tab', { section: 'billing' });
}

// The information is not missing — it is sitting in plain sight.
// '/users/:id/posts/:postId' is a string LITERAL; ':id' and
// ':postId' are inside its type (ts#26). The list of real routes is
// a list of literals too. Nothing is reading either one.
