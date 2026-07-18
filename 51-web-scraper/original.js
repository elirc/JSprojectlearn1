// "Scrape the book catalog site: title and price of every book,
// across all 50 pages."
// (The site here is fictional; run the refactor's tests to see the
// logic actually work against fixture HTML.)

var results = [];

async function scrapeAll() {
  // Problem 1: a hot loop with ZERO delay. This fires 50 requests
  // as fast as the network allows at somebody else's server. Polite
  // scrapers pace themselves; impolite ones get IP-banned (and
  // deserve it).
  for (var page = 1; page <= 50; page++) {
    var res = await fetch("https://books.example.test/catalog?page=" + page);

    // Problem 2: no retry, no status check. ONE flaky 503 out of 50
    // requests and the whole 10-minute run dies with an unhandled
    // error at page 37. All 36 pages of good data: gone.
    var html = await res.text();

    // Problem 3: parsing HTML with one mega-regex, inline. It's
    // unreadable, it silently skips books when the markup varies
    // (extra class, changed attribute order), and when the site
    // tweaks its template the regex matches NOTHING and we scrape
    // 50 pages of nothing without noticing.
    var re = /<li class="book"><h3>(.*?)<\/h3><span class="price">\$([0-9.]+)<\/span><\/li>/g;
    var m;
    while ((m = re.exec(html))) {
      // Problem 4: raw strings straight into results. "&amp;" stays
      // "&amp;", prices stay strings — every consumer of this data
      // has to clean it up again, differently.
      results.push({ title: m[1], price: m[2] });
    }

    // Problem 5: no idea when to stop early. If the catalog has 12
    // pages today, we still request pages 13..50 and scrape empty
    // responses.
  }
  console.log(results.length + " books");
}

scrapeAll();
