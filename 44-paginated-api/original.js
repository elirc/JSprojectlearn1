// APIs return big collections in PAGES: you get 25 items and a cursor
// for the next batch. (Simulated in-memory here, ~10ms per "request".)

var DATABASE = Array.from({ length: 250 }, function (_, i) {
  return { id: i + 1, name: "user" + (i + 1) };
});

function getPage(cursor) {
  var start = cursor || 0;
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve({
        items: DATABASE.slice(start, start + 25),
        nextCursor: start + 25 < DATABASE.length ? start + 25 : null,
      });
    }, 10);
  });
}

// The everything-fetcher: loop pages, accumulate ALL of them, return.
async function fetchAllUsers() {
  var all = [];
  var cursor = null;
  while (true) {
    var page = await getPage(cursor);
    all = all.concat(page.items);
    if (page.nextCursor == null) break;
    cursor = page.nextCursor;
  }
  return all;
}

// Task: "find the first user named user42".
async function findUser42() {
  var all = await fetchAllUsers();   // fetches ALL 10 pages...
  for (var i = 0; i < all.length; i++) {
    if (all[i].name == "user42") return all[i];
  }
  return null;
}

async function main() {
  console.time("findUser42");
  console.log(await findUser42());
  console.timeEnd("findUser42");
  // user42 is on PAGE 2. We fetched 10 pages (all 250 users) to find
  // one item 8 pages before the end of our fetching. With a real API
  // that's 8 wasted requests — and if the collection is 100k items,
  // it's all of them, in memory, every time.
  //
  // And every caller re-implements the same while/cursor loop —
  // search for "nextCursor" in any codebase and count the copies.
}

main();
