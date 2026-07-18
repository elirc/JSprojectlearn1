// Convert text to hex or binary representation.

function convert(text, mode) {
  var output = "";
  if (mode == "hex") {
    for (var i = 0; i < text.length; i++) {
      var h = text.charCodeAt(i).toString(16);
      if (h.length == 1) {
        h = "0" + h;
      }
      output += h + " ";
    }
  } else if (mode == "binary") {
    for (var i = 0; i < text.length; i++) {
      var b = text.charCodeAt(i).toString(2);
      while (b.length < 8) {
        b = "0" + b;
      }
      output += b + " ";
    }
  }
  return output;
}

console.log(convert("Hi!", "hex"));      // "48 69 21 "
console.log(convert("Hi!", "binary"));   // "01001000 01101001 00100001 "

// The failure modes nobody tested:
console.log(convert("Hi!", "Hex"));      // "" — typo in mode, silently empty
console.log(convert(42, "hex"));         // crash: text.charCodeAt is not a function
console.log(convert("💩", "hex"));       // "d83d dca9 " — surrogate halves again
// Also: every output has a trailing space.
