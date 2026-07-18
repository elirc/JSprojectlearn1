// ASCII digital clock in the terminal. Run: node original.js
// Prints the time in big block digits every second.

function show() {
  var d = new Date();
  var h = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();
  var hs = (h < 10 ? "0" : "") + h;
  var ms = (m < 10 ? "0" : "") + m;
  var ss = (s < 10 ? "0" : "") + s;
  var t = hs + ":" + ms + ":" + ss;

  console.clear();

  // Build the output row by row. For EVERY row, a chain of ternaries
  // per character. 8 characters x 5 rows = 40 ternary chains. The
  // "font" is smeared across all five loops — to change how "2" looks
  // you must find and edit five separate lines, in sync.
  var row1 = "";
  var row2 = "";
  var row3 = "";
  var row4 = "";
  var row5 = "";
  for (var i = 0; i < t.length; i++) {
    var c = t[i];
    row1 += (c == ":" ? "   " : c == "1" ? "  #" : c == "4" ? "# #" : "###") + " ";
    row2 += (c == ":" ? " # " : c == "1" ? "  #" : c == "2" || c == "3" || c == "7" ? "  #" : c == "5" || c == "6" ? "#  " : "# #") + " ";
    row3 += (c == ":" ? "   " : c == "1" ? "  #" : c == "0" ? "# #" : c == "7" ? "  #" : "###") + " ";
    row4 += (c == ":" ? " # " : c == "1" ? "  #" : c == "2" ? "#  " : c == "6" || c == "8" ? "# #" : c == "0" ? "# #" : "  #") + " ";
    row5 += (c == ":" ? "   " : c == "1" ? "  #" : c == "4" || c == "7" ? "  #" : "###") + " ";
  }
  console.log(row1);
  console.log(row2);
  console.log(row3);
  console.log(row4);
  console.log(row5);
}

show();
setInterval(show, 1000);

// Is the "9" right? Which ternary chain would you even check? And
// there is no way to test show() — it clears YOUR terminal and reads
// the CURRENT time. Both the font and the clock are untestable.
