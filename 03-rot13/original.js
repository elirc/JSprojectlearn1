// ROT13: shift every letter 13 places, wrapping around. a->n, n->a, etc.

function rot13(str) {
  var result = "";
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      code = code + 13;
      if (code > 90) {
        code = code - 26;
      }
      result = result + String.fromCharCode(code);
    } else if (code >= 97 && code <= 122) {
      code = code + 13;
      if (code > 122) {
        code = code - 26;
      }
      result = result + String.fromCharCode(code);
    } else {
      result = result + str[i];
    }
  }
  return result;
}

console.log(rot13("Hello, World!")); // Uryyb, Jbeyq!
console.log(rot13(rot13("Hello, World!"))); // applying twice gets you back
