import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCatalogPage, decodeEntities, scrapeCatalog } from './scraper.js';

const pageHtml = (books) => `
<html><body><ul class="catalog">
${books
  .map(
    (b) => `<li id="b" class="item book"><h3>${b.title}</h3>
      <span class="price money">$${b.price}</span></li>`,
  )
  .join('\n')}
</ul></body></html>`;

test('parseCatalogPage: extracts titles and integer cents', () => {
  const html = pageHtml([
    { title: 'Eloquent JS', price: '31.99' },
    { title: 'You Don&#39;t Know JS', price: '24.50' },
  ]);
  assert.deepEqual(parseCatalogPage(html), [
    { title: 'Eloquent JS', priceCents: 3199 },
    { title: "You Don't Know JS", priceCents: 2450 },
  ]);
});

test('parseCatalogPage: tolerates extra classes/attributes (the mega-regex did not)', () => {
  const html = `<li data-x="1" class="book featured"><h3 class="t">A &amp; B</h3>
    <span class="sale price">$5.00</span></li>`;
  assert.deepEqual(parseCatalogPage(html), [{ title: 'A & B', priceCents: 500 }]);
});

test('parseCatalogPage: skips malformed blocks instead of mis-pairing fields', () => {
  const html = `<li class="book"><h3>No price here</h3></li>` +
    pageHtml([{ title: 'Good', price: '1.00' }]);
  assert.deepEqual(parseCatalogPage(html), [{ title: 'Good', priceCents: 100 }]);
});

test('decodeEntities covers the common five', () => {
  assert.equal(decodeEntities('&lt;b&gt; &quot;A&quot; &amp; &#39;B&#39;'), `<b> "A" & 'B'`);
});

/** A fake site: N catalog pages, then empty pages; page 2 fails once. */
function fakeSite({ pages = 3, flakyPage = 2 } = {}) {
  const log = [];
  let flakyFailures = 1;
  const fetchFn = async (url) => {
    log.push(url);
    const page = Number(new URL(url).searchParams.get('page'));
    if (page === flakyPage && flakyFailures-- > 0) {
      return { ok: false, status: 503, text: async () => 'server melting' };
    }
    const body =
      page <= pages
        ? pageHtml([{ title: `Book ${page}`, price: `${page}.00` }])
        : pageHtml([]);
    return { ok: true, status: 200, text: async () => body };
  };
  return { fetchFn, log };
}

const instantSleep = () => Promise.resolve();

test('scrapeCatalog: crawls until the first empty page, not maxPages', async () => {
  const { fetchFn, log } = fakeSite({ pages: 3, flakyPage: 0 });
  const books = await scrapeCatalog({ fetchFn, sleep: instantSleep, maxPages: 50 });
  assert.deepEqual(
    books.map((b) => b.title),
    ['Book 1', 'Book 2', 'Book 3'],
  );
  assert.equal(log.length, 4); // 3 full pages + 1 empty = stop. Not 50.
});

test('scrapeCatalog: survives a transient 503 via retry (project 43)', async () => {
  const { fetchFn } = fakeSite({ pages: 2, flakyPage: 2 });
  const books = await scrapeCatalog({ fetchFn, sleep: instantSleep });
  assert.deepEqual(books.map((b) => b.title), ['Book 1', 'Book 2']);
});

test('scrapeCatalog: paces itself — a delay between every pair of requests', async () => {
  const delays = [];
  const sleep = (ms) => { delays.push(ms); return Promise.resolve(); };
  const { fetchFn } = fakeSite({ pages: 3, flakyPage: 0 });
  await scrapeCatalog({ fetchFn, sleep, delayMs: 250 });
  // 4 requests -> 3 politeness gaps
  assert.deepEqual(delays, [250, 250, 250]);
});
