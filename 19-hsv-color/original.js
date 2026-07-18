// HSV -> RGB conversion. Adapted from a half-remembered formula and
// tweaked until the reds looked red.

function hsvToRgb(h, s, v) {
  var r, g, b;
  var i = Math.floor(h / 60);
  var f = h / 60 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);
  // six copy-pasted branches with the variables shuffled — one wrong
  // letter in any of them = subtly wrong colors in one sixth of the wheel
  if (i == 0) { r = v; g = t; b = p; }
  if (i == 1) { r = q; g = v; b = p; }
  if (i == 2) { r = p; g = v; b = t; }
  if (i == 3) { r = p; g = q; b = v; }
  if (i == 4) { r = t; g = p; b = v; }
  if (i == 5) { r = v; g = p; b = t; }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

console.log(hsvToRgb(0, 1, 1));    // [255, 0, 0]  red, ok
console.log(hsvToRgb(120, 1, 1));  // [0, 255, 0]  green, ok
console.log(hsvToRgb(240, 1, 1));  // [0, 0, 255]  blue, ok

// The cases nobody tried:
console.log(hsvToRgb(360, 1, 1));  // i == 6, NO branch matches ->
                                   // [NaN, NaN, NaN]. 360 degrees is
                                   // a perfectly reasonable "red".
console.log(hsvToRgb(-30, 1, 1));  // negative hue -> NaN again
// And there's no rgbToHsv at all, so no way to round-trip check ANY
// of it. "The reds look red" is the entire test suite.
