// Autocomplete for a search box: the user types, we suggest words.
// Attempt: keep every word in one array and scan the whole thing with
// startsWith on every keystroke.

var words = [
  "cat", "car", "card", "care", "careful", "cart", "carton", "cast",
  "dog", "dodge", "door", "Doorbell", "dot", "double",
  "do", "does", "down", "download", "Downtown", "draw",
];

// How often each word gets picked. Popular words should rank first.
var popularity = {
  car: 90, card: 40, care: 30, careful: 5, cart: 25, carton: 3,
  cat: 80, cast: 10, do: 70, does: 20, dog: 95, dodge: 4,
  door: 35, Doorbell: 6, dot: 15, double: 8, down: 60,
  download: 50, Downtown: 7, draw: 12,
};

function suggest(prefix) {
  var matches = [];
  // Scan EVERY word, every keystroke. Typing "download" does this
  // 8 times, re-checking all 20 words from scratch each time — and
  // re-checking words that failed on the FIRST letter, over and over.
  for (var i = 0; i < words.length; i++) {
    if (words[i].toLowerCase().startsWith(prefix.toLowerCase())) {
      matches.push(words[i]);
    }
  }
  matches.sort(function (a, b) {
    return (popularity[b] || 0) - (popularity[a] || 0);
  });
  // ...and prints. The suggestions never become a value anyone can use.
  console.log("  " + prefix + " -> " + matches.slice(0, 5).join(", "));
}

function suggestPopular(prefix) {
  // Copy-paste of the above, then "improved" — and the copy dropped the
  // .toLowerCase() on the stored word.
  var matches = [];
  for (var i = 0; i < words.length; i++) {
    if (words[i].startsWith(prefix)) {
      matches.push(words[i]);
    }
  }
  matches.sort(function (a, b) {
    return (popularity[b] || 0) - (popularity[a] || 0);
  });
  console.log("  popular " + prefix + " -> " + matches.slice(0, 3).join(", "));
}

console.log("--- typing 'car' one letter at a time ---");
suggest("c");
suggest("ca");
suggest("car");

console.log("--- the two search paths disagree ---");
suggest("doo"); // finds door AND Doorbell (case-insensitive)
suggestPopular("doo"); // silently loses Doorbell (case-SENSITIVE copy)

console.log("--- ties are decided by luck ---");
suggest("cart"); // cart(25) then carton(3) — fine
suggest("z"); // no matches: prints "z -> " and says nothing useful

console.log("--- and now the cost ---");
// 50,000 five-letter words, spread across the alphabet like real ones.
var letters = "abcdefghijklmnopqrstuvwxyz";
var many = [];
for (var i = 0; i < 50000; i++) {
  var n = (i * 2654435761) % 11881376;
  var word = "";
  for (var c = 0; c < 5; c++) {
    word += letters[n % 26];
    n = Math.floor(n / 26);
  }
  many.push(word);
}

var typed = many[4999];
var t0 = Date.now();
var examined = 0;
for (var k = 1; k <= typed.length; k++) {
  var prefix = typed.slice(0, k).toLowerCase();
  var found = [];
  for (var j = 0; j < many.length; j++) {
    examined++; // <-- every word, every keystroke, forever
    if (many[j].toLowerCase().startsWith(prefix)) found.push(many[j]);
  }
  found.sort(function (a, b) {
    return a.localeCompare(b);
  });
  found.slice(0, 5);
}
console.log("  typing '" + typed + "' into a 50000-word box:");
console.log("  " + examined + " words examined, " + (Date.now() - t0) + "ms");
console.log("  ...even though only 1 word actually matches by the 4th letter.");

// Three diseases again:
//   1. Naive algorithm: every keystroke rescans the entire word list,
//      including the 49,000 words that were already ruled out by the
//      FIRST letter. The work is thrown away and redone every time.
//   2. Duplicated search: two copies of "find and rank matches" that
//      already disagree about case.
//   3. Logic welded to I/O: suggestions are printed, never returned,
//      so they cannot be tested, ranked differently, or rendered.
