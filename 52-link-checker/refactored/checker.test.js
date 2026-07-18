import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractLinks, crawlQueue, checkSite } from './checker.js';

test('extractLinks resolves relative hrefs against the page URL', () => {
  const html = `<a href="/about">About</a> <a href="team.html">Team</a>
    <a href="https://other.test/x">Ext</a> <a href="#top">Top</a> <a href="mailto:a@b.c">Mail</a>`;
  assert.deepEqual(extractLinks(html, 'https://site.test/blog/'), [
    'https://site.test/about',
    'https://site.test/blog/team.html',
    'https://other.test/x',
  ]);
});

test('crawlQueue: processes work that creates more work, once each', async () => {
  const seen = [];
  await crawlQueue([1], async (n) => {
    seen.push(n);
    return n < 4 ? [n * 2, n * 2 + 1] : []; // a little binary tree
  }, { limit: 2 });
  assert.deepEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7]);
});

test('crawlQueue: never exceeds the concurrency limit', async () => {
  let inFlight = 0;
  let peak = 0;
  await crawlQueue([1, 2, 3, 4, 5, 6, 7, 8], async () => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    return [];
  }, { limit: 3 });
  assert.equal(peak, 3);
});

/**
 * A fake site with a cycle (home <-> about, like every nav bar),
 * one dead internal page, one dead external link, and one external
 * link that throws (DNS failure).
 */
const SITE = {
  'https://site.test/': `<a href="/about">, <a href="/missing">, <a href="https://ext.test/ok">`,
  'https://site.test/about': `<a href="/">, <a href="https://gone.test/">, <a href="https://ext.test/dead">`,
};
const EXTERNAL = {
  'https://ext.test/ok': 200,
  'https://ext.test/dead': 404,
};

function fakeFetch(log = []) {
  return async (url, opts = {}) => {
    log.push({ url, method: opts.method ?? 'GET' });
    if (url.startsWith('https://gone.test')) throw new Error('DNS lookup failed');
    if (url in SITE) return { ok: true, status: 200, text: async () => SITE[url] };
    if (url in EXTERNAL) {
      const status = EXTERNAL[url];
      return { ok: status < 400, status, text: async () => '' };
    }
    return { ok: false, status: 404, text: async () => '' };
  };
}

test('checkSite: finds all three kinds of dead link and terminates despite the cycle', async () => {
  const { pagesCrawled, dead } = await checkSite('https://site.test/', {
    fetchFn: fakeFetch(),
    limit: 3,
  });
  assert.equal(pagesCrawled, 3); // /, /about, /missing — each ONCE
  const byUrl = Object.fromEntries(dead.map((d) => [d.url, d]));
  assert.equal(byUrl['https://site.test/missing'].status, 404);
  assert.equal(byUrl['https://site.test/missing'].foundOn, 'https://site.test/');
  assert.equal(byUrl['https://ext.test/dead'].status, 404);
  assert.equal(byUrl['https://gone.test/'].status, 0); // network failure = result, not crash
  assert.match(byUrl['https://gone.test/'].error, /DNS/);
  assert.equal(dead.length, 3);
});

test('checkSite: external links get HEAD, not a full crawl', async () => {
  const log = [];
  await checkSite('https://site.test/', { fetchFn: fakeFetch(log) });
  const extOk = log.filter((l) => l.url === 'https://ext.test/ok');
  assert.deepEqual(extOk, [{ url: 'https://ext.test/ok', method: 'HEAD' }]);
});
