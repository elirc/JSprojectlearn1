// "Find every dead link on our site."
// (Fictional site — the refactor's tests run this scenario against an
// in-memory fake site, cycles and all.)

var deadLinks = [];

async function crawl(url) {
  var res = await fetch(url);
  var html = await res.text();
  var links = html.match(/href="([^"]+)"/g) || [];

  // Problem 1: no visited set. Page A links to B, B links back to A
  // (every nav bar does), and this recursion crawls A -> B -> A ->
  // B -> ... forever. The checker never finishes on ANY real site.

  // Problem 2: Promise.all on EVERYTHING, unbounded. A page with 200
  // links fires 200 simultaneous requests, each of which recursively
  // fires its own. That's a self-inflicted denial-of-service — on
  // your own site.
  await Promise.all(
    links.map(async function (attr) {
      var link = attr.slice(6, -1);

      // Problem 3: external links get fully CRAWLED, not just
      // checked. We recurse into wikipedia.org and start checking
      // THEIR links. The crawl never ends and it isn't even our site.
      var r = await fetch(link);

      // Problem 4: one network hiccup anywhere rejects the whole
      // Promise.all, which rejects the parent's Promise.all, all the
      // way up — the entire report dies because one link timed out.
      // A checker whose job is FINDING failures can't treat a
      // failure as fatal.
      if (r.status >= 400) deadLinks.push({ page: url, link: link, status: r.status });

      await crawl(link);
    })
  );
}

crawl("https://oursite.example.test/").then(function () {
  console.log(deadLinks);
});
