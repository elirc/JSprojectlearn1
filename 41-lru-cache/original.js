// A cache that holds the N most recently used items and evicts the
// least recently used one. Attempt: an object for values, an array
// to track order.

var cache = {};
var order = [];      // order[0] = least recently used
var CAPACITY = 3;

function put(key, value) {
  cache[key] = value;
  order.push(key);   // BUG: if key already existed, it's now in the
                     // array TWICE — order and size are both lies
  if (order.length > CAPACITY) {
    var oldest = order.shift();
    delete cache[oldest];   // ...which may delete a key that ALSO
                            // appears later in the array. Chaos.
  }
}

function get(key) {
  return cache[key];
  // BUG: a get doesn't refresh recency! The whole point of LRU is
  // that recently USED items survive — this only tracks recently
  // ADDED. A hot item that was added early gets evicted anyway.
}

put("a", 1);
put("b", 2);
put("c", 3);
get("a");            // "a" is hot! should now be safest from eviction
put("d", 4);         // evicts... "a". The hot item. LRU in name only.
console.log(cache);  // { b: 2, c: 3, d: 4 }

put("b", 22);        // update an existing key...
console.log(order);  // [ 'b', 'c', 'd', 'b' ] — "b" twice
put("e", 5);         // shift() removes the FIRST "b"... which deletes
console.log(cache);  // b entirely even though a newer "b" entry remains
console.log(order);  // in the order array. Both structures now disagree.

// Also: indexOf/splice fixes for the above are O(n) per operation,
// and "cache" + "order" must be kept in sync by every code path
// forever — two structures, one implicit invariant, zero enforcement.
