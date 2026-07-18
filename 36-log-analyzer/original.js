// Analyze web server logs. Lines look like:
//   2026-07-09T10:00:00Z [ERROR] /api/users 503 1240ms

var log = [
  "2026-07-09T10:00:00Z [INFO] /home 200 12ms",
  "2026-07-09T10:00:01Z [ERROR] /api/users 503 1240ms",
  "2026-07-09T10:00:02Z [WARN] /api/orders 429 87ms",
  "2026-07-09T10:00:03Z [ERROR] /api/users 500 2310ms",
  "2026-07-09T10:00:04Z [INFO] /checkout 200 340ms",
].join("\n");

// String surgery with hardcoded positions:
function analyze(text) {
  var lines = text.split("\n");
  var errorCount = 0;
  var slowest = "";
  var slowestMs = 0;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var level = line.substring(21, line.indexOf("]"));     // magic 21!
    if (level == "ERROR") errorCount++;

    var msStart = line.lastIndexOf(" ") + 1;
    var ms = parseInt(line.substring(msStart));            // "1240ms" -> 1240,
    if (ms > slowestMs) {                                  // parseInt just... stops
      slowestMs = ms;                                      // at the 'm'. Handy? Or
      slowest = line.substring(21);                        // a silent trap? (Both.)
    }
  }
  console.log("errors: " + errorCount);
  console.log("slowest: " + slowest + " (" + slowestMs + "ms)");
}

analyze(log); // works... on these exact lines.

// The fragility: position 21 assumes the timestamp is ALWAYS 20 chars.
// A log line with milliseconds in the timestamp, a missing field, or a
// malformed line shifts everything — and instead of failing, the
// analysis quietly computes nonsense from the wrong slices. Parsing
// and analyzing are also fused: want "count by level"? Another loop
// with the same substring surgery pasted in.
