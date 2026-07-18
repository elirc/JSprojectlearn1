// "Complementary color generator" — first attempt.
// Idea heard somewhere: "just invert the color!"

function complement(hex) {
  // string surgery on the hex code
  var r = 255 - parseInt(hex.substring(1, 3), 16);
  var g = 255 - parseInt(hex.substring(3, 5), 16);
  var b = 255 - parseInt(hex.substring(5, 7), 16);
  var rs = r.toString(16);
  if (rs.length == 1) rs = "0" + rs;
  var gs = g.toString(16);
  if (gs.length == 1) gs = "0" + gs;
  var bs = b.toString(16);
  if (bs.length == 1) bs = "0" + bs;
  return "#" + rs + gs + bs;
}

console.log(complement("#ff0000")); // #00ffff cyan — looks right!
console.log(complement("#00ff00")); // #ff00ff magenta — right again!

// But now the trap: RGB inversion is NOT the color-wheel complement.
console.log(complement("#808080")); // #7f7f7f — "complement" of grey
// is... nearly the same grey. Useless for picking accent colors.
// Inverting also changes the BRIGHTNESS: a dark red "complements" to
// a light cyan. A designer wants the opposite HUE at the same
// saturation and brightness — that's an HSV rotation, and we already
// wrote the HSV math in project 19. This file just doesn't use it.

// Also: we hand-rolled hex parsing AGAIN (project 19 has hexToRgb),
// complete with the padding dance, and there's no validation — watch:
console.log(complement("red")); // "#NaNNaNNaN"
