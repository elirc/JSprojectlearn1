/**
 * Link checker = two phases with different shapes:
 *
 *   1. CRAWL our own pages (the work list GROWS as we discover
 *      pages) -> a dynamic queue with a concurrency limit.
 *   2. CHECK every external link (the work list is now FIXED)
 *      -> project 42's pool, plus allSettled semantics, because
 *      a checker whose job is finding failures can't die on one.
 *
 * Project 42's pool assumed a static task array. `crawlQueue` here is
 * the upgrade for work that creates more work — compare them side by
 * side.
 */
import { runWithLimit } from '../../42-promise-pool/refactored/pool.js';

export function extractLinks(html, baseUrl) {
  const links = [];
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (href.startsWith('mailto:') || href.startsWith('#')) continue;
    try {
      links.push(new URL(href, baseUrl).href); // resolves relative links
    } catch {
      // malformed href — skip it; the page author's problem, not a crash
    }
  }
  return links;
}

/**
 * A concurrency-limited queue that can GROW while it drains.
 *
 * The "pump" pattern: one function that tops the pool up to `limit`
 * running tasks, called again every time a task finishes. Done means
 * queue empty AND active === 0 — an empty queue alone proves nothing,
 * because a still-running task may push more work.
 *
 * (Why not project 42's worker loop? A worker seeing an empty queue
 * would have to busy-wait for siblings that might add work — and a
 * microtask spin starves the very I/O it's waiting on. The pump has
 * no waiting: completion CALLS the next step.)
 */
export function crawlQueue(seeds, processOne, { limit = 5 } = {}) {
  return new Promise((resolve, reject) => {
    const queue = [...seeds];
    let active = 0;
    let failed = false;

    function pump() {
      if (failed) return;
      if (queue.length === 0 && active === 0) return resolve();
      while (active < limit && queue.length > 0) {
        const item = queue.shift();
        active++;
        processOne(item).then(
          (discovered) => {
            active--;
            queue.push(...discovered);
            pump();
          },
          (err) => {
            failed = true;
            reject(err);
          },
        );
      }
    }

    pump();
  });
}

/**
 * The full job. Same-origin pages are crawled (GET + parse) and their
 * own status recorded; external links are only CHECKED (HEAD). Every
 * URL is visited once — the `visited` set is what makes cycles (every
 * nav bar is one) finite.
 */
export async function checkSite(rootUrl, { fetchFn = fetch, limit = 5 } = {}) {
  const origin = new URL(rootUrl).origin;
  const visited = new Set();
  const linkedFrom = new Map(); // url -> first page that linked to it
  const dead = [];
  let pagesCrawled = 0;

  await crawlQueue([rootUrl], async (url) => {
    if (visited.has(url)) return [];
    visited.add(url);
    pagesCrawled++;

    let res;
    try {
      res = await fetchFn(url);
    } catch (err) {
      dead.push({ url, status: 0, error: err.message, foundOn: linkedFrom.get(url) });
      return [];
    }
    if (!res.ok) {
      dead.push({ url, status: res.status, foundOn: linkedFrom.get(url) });
      return [];
    }

    const next = [];
    for (const link of extractLinks(await res.text(), url)) {
      if (!linkedFrom.has(link)) linkedFrom.set(link, url);
      // Only OUR pages join the crawl; external links are checked later.
      if (new URL(link).origin === origin && !visited.has(link)) next.push(link);
    }
    return next;
  }, { limit });

  // Phase 2: fixed list -> project 42's pool. Each task catches its
  // own failure (allSettled semantics): a dead link is a RESULT here,
  // not an error.
  const external = [...linkedFrom.keys()].filter((u) => new URL(u).origin !== origin);
  const checks = await runWithLimit(
    external.map((url) => async () => {
      try {
        const res = await fetchFn(url, { method: 'HEAD' }); // status only, no body
        return { url, ok: res.ok, status: res.status };
      } catch (err) {
        return { url, ok: false, status: 0, error: err.message };
      }
    }),
    limit,
  );

  for (const c of checks) {
    if (!c.ok) {
      dead.push({ url: c.url, status: c.status, error: c.error, foundOn: linkedFrom.get(c.url) });
    }
  }

  return { pagesCrawled, dead };
}
