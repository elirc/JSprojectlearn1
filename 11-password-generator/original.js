// Password generator with options.

function generatePassword(length, useUpper, useNumbers, useSymbols, noAmbiguous) {
  var chars = "abcdefghijklmnopqrstuvwxyz";
  if (useUpper == true) {
    chars = chars + "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }
  if (useNumbers == true) {
    chars = chars + "0123456789";
  }
  if (useSymbols == true) {
    chars = chars + "!@#$%^&*";
  }
  if (noAmbiguous == true) {
    // remove confusing characters: l, 1, O, 0
    var cleaned = "";
    for (var i = 0; i < chars.length; i++) {
      if (chars[i] != "l" && chars[i] != "1" && chars[i] != "O" && chars[i] != "0") {
        cleaned += chars[i];
      }
    }
    chars = cleaned;
  }
  var password = "";
  for (var j = 0; j < length; j++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

// Boolean-flag soup at every call site. Quick — what does this make?
console.log(generatePassword(12, true, false, true, true));
// You had to go count parameters to find out. And these bugs compile fine:
console.log(generatePassword(12, true, true, false));        // forgot one — which?
console.log(generatePassword(12, false, true, false, true)); // swapped two? who knows

// Also: nothing GUARANTEES a digit appears even when useNumbers=true.
// A 12-char password might come out all-lowercase by chance, and the
// site that requires a digit rejects it. Intermittently. Fun to debug.
