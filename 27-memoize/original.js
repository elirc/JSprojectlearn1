// Some functions are expensive. Cache their answers!

// Attempt: one global cache, keyed by argument.
var cache = {};

function slowSquare(n) {
  if (cache[n] != undefined) return cache[n];
  // pretend this takes ages
  for (var i = 0; i < 20000000; i++) {}
  var result = n * n;
  cache[n] = result;
  return result;
}

function slowDouble(n) {
  if (cache[n] != undefined) return cache[n]; // SAME cache...
  for (var i = 0; i < 20000000; i++) {}
  var result = n * 2;
  cache[n] = result;
  return result;
}

console.log(slowSquare(4)); // 16, slow — then cached
console.log(slowSquare(4)); // 16, instant. Caching works!

// But the two functions share one cache, keyed only by the number:
console.log(slowDouble(4)); // should be 8. Prints 16 — square's answer!

// And every new function needs the same three lines of cache
// plumbing pasted into its body, forever entangling "what it
// computes" with "how it's cached".

// Meanwhile, the poster child for caching, naive fibonacci:
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
console.time("fib(32) uncached");
console.log(fib(32));
console.timeEnd("fib(32) uncached"); // ~1s of recomputing the same subtrees
