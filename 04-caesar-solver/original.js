// Crack a Caesar cipher: we don't know the shift, so try them all
// and eyeball which one looks like English.
//
// First instinct: I already have rot13 from last time... I'll just
// copy it once per shift!

function rot1(str) {
  var result = "";
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      code = code + 1;
      if (code > 90) code = code - 26;
      result += String.fromCharCode(code);
    } else if (code >= 97 && code <= 122) {
      code = code + 1;
      if (code > 122) code = code - 26;
      result += String.fromCharCode(code);
    } else {
      result += str[i];
    }
  }
  return result;
}

function rot2(str) {
  var result = "";
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      code = code + 2;
      if (code > 90) code = code - 26;
      result += String.fromCharCode(code);
    } else if (code >= 97 && code <= 122) {
      code = code + 2;
      if (code > 122) code = code - 26;
      result += String.fromCharCode(code);
    } else {
      result += str[i];
    }
  }
  return result;
}

// ... imagine rot3 through rot25 here. 23 more copies of the same
// function. (Copied twice already — the third copy is where you're
// supposed to stop and generalize. We didn't.)

var secret = "Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj";
console.log("shift 1:", rot1(secret));
console.log("shift 2:", rot2(secret));
// console.log("shift 3:", rot3(secret));  // this one is the answer,
// ...but we never wrote rot3. Now read 25 lines of output and pick
// the English one by hand.
