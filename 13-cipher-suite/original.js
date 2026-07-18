// A tool that supports multiple ciphers. Usage:
//   node original.js encrypt caesar "hello" 3

function encryptCaesar(text, shift) {
  return text.replace(/[a-z]/gi, function (ch) {
    var base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(base + (ch.charCodeAt(0) - base + Number(shift)) % 26);
  });
}

function decryptCaesar(text, shift) {
  return text.replace(/[a-z]/gi, function (ch) {
    var base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(base + (ch.charCodeAt(0) - base + 26 - (Number(shift) % 26)) % 26);
  });
}

function encryptAtbash(text) {
  return text.replace(/[a-z]/gi, function (ch) {
    var base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(base + 25 - (ch.charCodeAt(0) - base));
  });
}

function decryptAtbash(text) {
  return encryptAtbash(text); // atbash is its own inverse
}

function encryptReverse(text) {
  return text.split("").reverse().join("");
}

function decryptReverse(text) {
  return text.split("").reverse().join("");
}

// The dispatch: every cipher appears AGAIN here, twice.
var mode = process.argv[2];
var cipher = process.argv[3];
var text = process.argv[4];
var key = process.argv[5];

if (mode == "encrypt") {
  if (cipher == "caesar") {
    console.log(encryptCaesar(text, key));
  } else if (cipher == "atbash") {
    console.log(encryptAtbash(text));
  } else if (cipher == "reverse") {
    console.log(encryptReverse(text));
  } else {
    console.log("unknown cipher");
  }
} else if (mode == "decrypt") {
  if (cipher == "caesar") {
    console.log(decryptCaesar(text, key));
  } else if (cipher == "atbash") {
    console.log(decryptAtbash(text));
  } else if (cipher == "reverse") {
    console.log(decryptReverse(text));
  } else {
    console.log("unknown cipher");
  }
}

// Adding a cipher touches THREE places: its two functions, the encrypt
// branch, and the decrypt branch. Forget one and you get "unknown
// cipher" — or worse, encrypt works but decrypt doesn't.
