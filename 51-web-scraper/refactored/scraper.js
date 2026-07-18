/**
 * A polite scraper, split into its three real jobs:
 *
 *   parseCatalogPage(html)  — pure: HTML string -> clean records
 *   fetchPage(url, deps)    — one page, with status check + retry
 *   scrapeCatalog(deps)     — the crawl loop: pacing + early stop
 *
 * The retry logic is project 43's, imported — flaky-network handling
 * was already solved there; a scraper is just its biggest customer.
 */
import { retry } from '../../43-retry-timeout/refactored/retry.js';

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Honest disclaimer, in code: regex can extract from HTML you
 * CONTROL THE SHAPE OF (one known template), but it cannot parse
 * arbitrary HTML — nesting breaks it (project 34's CSV lesson, same
 * root cause). So: one small anchored pattern per field, tolerant of
 * attribute order, plus entity decoding, plus typed values out.
 */
export function parseCatalogPage(html) {
  const books = [];
  // Match each <li ... class="...book..."> block, then pull fields
  // out of the block — two simple patterns beat one mega-regex.
  const blockRe = /<li\b[^>]*\bclass="[^"]*\bbook\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
  for (const [, block] of html.matchAll(blockRe)) {
    const title = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1];
    const price = block.match(/<span[^>]*\bclass="[^"]*\bprice\b[^"]*"[^>]*>\$?([0-9.]+)</)?.[1];
    if (title === undefined || price === undefined) continue;
    books.push({
      title: decodeEntities(title.trim()),
      priceCents: Math.round(Number(price) * 100), // integer cents (project 32)
    });
  }
  return books;
}

/** The five entities that actually appear in text nodes. */
export function decodeEntities(s) {
  const map = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
  return s.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => map[m]);
}

/** One page: status-checked, retried with backoff on transient failures. */
async function fetchPage(url, { fetchFn, sleep }) {
  return retry(
    async () => {
      const res = await fetchFn(url);
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`); // transient
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { permanent: true });
      return res.text();
    },
    {
      attempts: 3,
      baseDelayMs: 500,
      shouldRetry: (e) => !e.permanent, // a 404 is a fact; a 503 is weather
      sleep,
    },
  );
}

/**
 * The crawl: sequential ON PURPOSE (politeness beats speed when it's
 * someone else's server), a fixed delay between requests, and an
 * early stop the moment a page comes back empty.
 */
export async function scrapeCatalog({
  baseUrl = 'https://books.example.test/catalog',
  maxPages = 50,
  delayMs = 1000,
  fetchFn = fetch,
  sleep = defaultSleep,
} = {}) {
  const books = [];
  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) await sleep(delayMs); // pace yourself — always
    const html = await fetchPage(`${baseUrl}?page=${page}`, { fetchFn, sleep });
    const found = parseCatalogPage(html);
    if (found.length === 0) break; // catalog ended — stop asking
    books.push(...found);
  }
  return books;
}
