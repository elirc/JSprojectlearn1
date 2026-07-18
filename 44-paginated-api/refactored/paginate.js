/**
 * Pagination as an ASYNC GENERATOR: the cursor loop is written ONCE,
 * and consumers get a simple stream of items via `for await`.
 *
 * The magic property is LAZINESS (project 22's generators + async):
 * pages are fetched only as the consumer keeps asking. `break` out of
 * the loop and no further requests happen — "find the first match"
 * naturally fetches only the pages it needed.
 *
 * getPage: (cursor) => Promise<{ items, nextCursor }>
 *          nextCursor === null means "last page".
 */
export async function* paginate(getPage) {
  let cursor = null;
  do {
    const page = await getPage(cursor);
    yield* page.items;           // hand items out one by one
    cursor = page.nextCursor;
  } while (cursor !== null);
}

/** Find the first item matching `predicate`, fetching as few pages as possible. */
export async function findFirst(getPage, predicate) {
  for await (const item of paginate(getPage)) {
    if (predicate(item)) return item; // break -> the generator stops fetching
  }
  return null;
}

/** When you genuinely need everything, say so explicitly. */
export async function collectAll(getPage) {
  const items = [];
  for await (const item of paginate(getPage)) {
    items.push(item);
  }
  return items;
}
