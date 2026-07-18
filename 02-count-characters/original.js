// Count how many times each character appears in a string.

function countChars(str) {
  var counts = {};
  for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (counts[c] == undefined) {
      counts[c] = 1;
    } else {
      counts[c] = counts[c] + 1;
    }
  }
  return counts;
}

console.log(countChars("hello world"));

// Looks fine... until the edge cases:

// 1. Emoji get split into two broken halves ("surrogate pairs"):
console.log(countChars("💩💩")); // { '\ud83d': 2, '\udca9': 2 }  ...what?

// 2. Certain keys collide with Object internals:
console.log(countChars("__proto__"[0])); // ok...
var weird = countChars("x");
weird["__proto__"]; // objects come with baggage you didn't put there
