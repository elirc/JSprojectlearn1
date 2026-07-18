/**
 * A micro-Express on node:http, ~80 lines. The three ideas every
 * HTTP framework is made of:
 *
 *   1. A ROUTE TABLE with patterns — reusing project 60's matcher.
 *      The same pure matchRoute that drove a browser SPA drives a
 *      server; URLs don't care which side they're parsed on.
 *   2. A MIDDLEWARE CHAIN — an onion of async (ctx, next) functions.
 *      Body parsing, logging, auth: each written once, composed.
 *   3. ONE error boundary — handlers THROW (HttpError for intentional
 *      statuses); a single place converts failures to consistent
 *      JSON. No per-route improvised error responses.
 */
import http from 'node:http';
import { matchRoute } from '../../60-router/refactored/router.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function createApp() {
  const middlewares = [];
  const routes = []; // { method, path, handler } — a table, not a ladder

  const app = {
    use: (fn) => middlewares.push(fn),
    listen: (port, cb) => http.createServer(handle).listen(port, cb),
    handle, // exposed for tests
  };
  for (const method of ['get', 'post', 'put', 'delete']) {
    app[method] = (path, handler) =>
      routes.push({ method: method.toUpperCase(), path, handler });
  }

  async function handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host ?? 'local'}`);
    const ctx = {
      req, res,
      method: req.method,
      path: url.pathname,
      query: url.searchParams,
      params: {},
      body: undefined,
      // the response helper: EVERY response goes through here,
      // so every response is JSON with a status — consistency by
      // construction.
      json(status, data) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      },
    };

    // find the route now so middleware can know about it if needed
    const candidates = routes.filter((r) => r.method === ctx.method);
    const match = matchRoute(candidates, ctx.path);
    if (match) ctx.params = match.params;

    const endpoint = match
      ? match.route.handler
      : () => { throw new HttpError(404, `No route: ${ctx.method} ${ctx.path}`); };

    // Build the onion: mw[0] runs first, endpoint is the core.
    const chain = [...middlewares, (c) => endpoint(c)];
    const dispatch = (i) => async (c) =>
      i < chain.length - 1 ? chain[i](c, dispatch(i + 1)) : chain[i](c);

    // THE error boundary — the only try/catch in the framework.
    try {
      await dispatch(0)(ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        ctx.json(err.status, { error: err.message });
      } else {
        console.error(err); // real bugs get logged loudly...
        ctx.json(500, { error: 'Internal server error' }); // ...not leaked
      }
    }
  }

  return app;
}

/**
 * Body-parsing middleware: written once, used by every route.
 * Malformed JSON is a 400 (the client's fault, said clearly) —
 * in the original it was a process crash.
 */
export function jsonBody({ limitBytes = 1_000_000 } = {}) {
  return async (ctx, next) => {
    if (ctx.method === 'POST' || ctx.method === 'PUT') {
      const chunks = [];
      let size = 0;
      for await (const chunk of ctx.req) {
        size += chunk.length;
        if (size > limitBytes) throw new HttpError(413, 'Body too large');
        chunks.push(chunk);
      }
      const text = Buffer.concat(chunks).toString() || '{}';
      try {
        ctx.body = JSON.parse(text);
      } catch {
        throw new HttpError(400, 'Body must be valid JSON');
      }
    }
    return next(ctx);
  };
}
