// Fetch 20 user profiles from an API. (Simulated here: each "request"
// takes ~100ms.) Two obvious approaches, both wrong in opposite ways.

function fetchProfile(id) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve({ id: id, name: "user" + id });
    }, 100);
  });
}

var ids = Array.from({ length: 20 }, function (_, i) { return i + 1; });

// --- Approach 1: one at a time. Correct, and 20x slower than needed. ---
async function sequential() {
  var results = [];
  for (var i = 0; i < ids.length; i++) {
    results.push(await fetchProfile(ids[i])); // each await WAITS for the last
  }
  return results;
}

// --- Approach 2: all at once. Fast, and a good way to get banned. ---
async function unbounded() {
  return Promise.all(ids.map(function (id) { return fetchProfile(id); }));
  // 20 requests in flight simultaneously. Make it 2000 profiles and
  // you've DOSed your own API / hit every rate limit / run the
  // laptop out of sockets. Real APIs return 429s or drop you.
}

async function main() {
  console.time("sequential (20 x ~100ms, one at a time)");
  await sequential();
  console.timeEnd("sequential (20 x ~100ms, one at a time)"); // ~2000ms

  console.time("unbounded (all 20 at once)");
  await unbounded();
  console.timeEnd("unbounded (all 20 at once)"); // ~100ms, but reckless

  console.log("what we WANT: 'at most 5 in flight' — neither approach can");
}

main();
