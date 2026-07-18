// Are these two values "the same"? First discovery: === doesn't do
// what you'd hope on objects.

console.log({ a: 1 } === { a: 1 }); // false?! (compares IDENTITY, not contents)

// Workaround found on the internet: compare JSON strings!
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

console.log(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })); // true - great!
console.log(deepEqual([1, [2, 3]], [1, [2, 3]]));       // true - nested works!

// Ship it? Watch it lie in BOTH directions:

// 1. Falsely UNEQUAL: same contents, different key order.
console.log(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })); // false. Same object!

// 2. Falsely EQUAL: undefined values vanish when stringified.
console.log(deepEqual({ a: undefined }, {}));           // true. Different objects!

// 3. NaN stringifies to "null"... so NaN "equals" null.
console.log(deepEqual({ x: NaN }, { x: null }));        // true?!

// 4. And it throws on cycles:
var loop = {}; loop.self = loop;
try { deepEqual(loop, loop); } catch (e) {
  console.log("crashed on:", e.message); // "Converting circular structure..."
}
