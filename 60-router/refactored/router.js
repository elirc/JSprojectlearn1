/**
 * The heart of every client-side router is a PURE function:
 *
 *   matchRoute(routes, path) -> { route, params } | null
 *
 * Routes are DATA (project 10's dispatch-table move): a pattern like
 * "/users/:id" plus a handler. Matching compiles the pattern into
 * segments once and compares segment-by-segment, collecting :params.
 *
 * Everything browser-flavored (hashchange, rendering) lives in the
 * HTML shell; this file never touches `window`, which is why it has
 * a test file and the original's switch statement could not.
 */

/** "/users/:id" -> ['users', {param: 'id'}] */
function compile(pattern) {
  return pattern
    .split('/')
    .filter(Boolean)
    .map((seg) => (seg.startsWith(':') ? { param: seg.slice(1) } : seg.toLowerCase()));
}

export function matchRoute(routes, path) {
  const pathSegs = path.split('/').filter(Boolean);

  for (const route of routes) {
    const patSegs = compile(route.path);
    if (patSegs.length !== pathSegs.length) continue;

    const params = {};
    let ok = true;
    for (let i = 0; i < patSegs.length; i++) {
      const pat = patSegs[i];
      if (typeof pat === 'object') {
        params[pat.param] = decodeURIComponent(pathSegs[i]);
      } else if (pat !== pathSegs[i].toLowerCase()) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null; // no route: the CALLER decides what a 404 looks like
}

/** location.hash ("#/users/7?x=1", "", "#") -> a clean path ("/users/7") */
export function hashToPath(hash) {
  const withoutHash = hash.replace(/^#/, '');
  const withoutQuery = withoutHash.split('?')[0];
  return withoutQuery === '' ? '/' : withoutQuery;
}
