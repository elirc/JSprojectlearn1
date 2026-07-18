// "A regex engine is easy: walk the pattern and the text together."
// This is that first attempt — and it contains the exact misstep
// that makes people think regex engines are magic: it never UNDOES
// a greedy choice. Run it: node 72-regex-engine/original.js

function match(pattern, text) {
  // only handles: literal chars, '.', and 'x*'
  return matchHere(pattern, 0, text, 0);
}

function matchHere(pattern, p, text, t) {
  if (p >= pattern.length) return true; // pattern exhausted: match!

  var isStar = pattern[p + 1] === "*";

  if (isStar) {
    // Problem 1 — THE FATAL GREED: consume EVERY matching char,
    // then move on. Sounds right; isn't. In "a*a" against "aaa",
    // the star eats all three a's, the trailing 'a' finds nothing
    // left, and the whole match FAILS — even though a*a obviously
    // matches "aaa" (star takes two, final 'a' takes one).
    //
    // The star made a choice (eat everything) and there's no way
    // to REVISIT it. Correct engines backtrack: try a split, and
    // if the rest of the pattern can't match, give a character
    // back and try again.
    while (t < text.length && (text[t] === pattern[p] || pattern[p] === ".")) {
      t++;
    }
    return matchHere(pattern, p + 2, text, t);
  }

  if (t < text.length && (text[t] === pattern[p] || pattern[p] === ".")) {
    return matchHere(pattern, p + 1, text, t + 1);
  }

  return false;

  // Problem 2: it's also anchored-only — match() starts at text[0]
  // and never tries other starting positions, so "b.g" can't be
  // FOUND inside "big bug". And there's no ^ or $ to CONTROL
  // anchoring, no character classes, no + or ?.
}

console.log('a*a  vs "aaa":', match("a*a", "aaa"), "  <- should be true. The greed bug.");
console.log('a*b  vs "aab":', match("a*b", "aab"), "   <- works when greed happens to be right");
console.log('.*x  vs "abcx":', match(".*x", "abcx"), " <- .* ate the x too");
console.log('b.g  vs "big":', match("b.g", "big"), "   <- anchored: fine at position 0...");
console.log('b.g  in "a big dog":', match("b.g", "a big dog"), " <- ...invisible anywhere else");
