// Rate limiting: "no more than 5 requests per second per user."
// Attempt: count requests, and reset the counter whenever the clock
// ticks over into a new second.

var LIMIT = 5;
var counts = {}; // user -> requests so far this second
var seconds = {}; // user -> which second we were counting

function allow(user) {
  var second = Math.floor(Date.now() / 1000);
  if (seconds[user] !== second) {
    seconds[user] = second; // new second -> throw the count away
    counts[user] = 0;
  }
  if (counts[user] < LIMIT) {
    counts[user]++;
    console.log("  ALLOWED " + user + " (" + counts[user] + "/" + LIMIT + ")");
    return true;
  }
  console.log("  BLOCKED " + user);
  return false;
}

// A second copy for the login endpoint, because it needs a different
// limit. Copy-paste, then edit — and the copy forgot to reset the
// counter, so a user who ever hits the limit is blocked FOREVER.
var LOGIN_LIMIT = 2;
var loginCounts = {};
var loginSeconds = {};

function allowLogin(user) {
  var second = Math.floor(Date.now() / 1000);
  if (loginSeconds[user] !== second) {
    loginSeconds[user] = second;
  }
  if (loginCounts[user] === undefined) loginCounts[user] = 0;
  if (loginCounts[user] < LOGIN_LIMIT) {
    loginCounts[user]++;
    console.log("  LOGIN ALLOWED " + user + " (" + loginCounts[user] + "/" + LOGIN_LIMIT + ")");
    return true;
  }
  console.log("  LOGIN BLOCKED " + user);
  return false;
}

console.log("--- normal traffic: the 6th request is blocked ---");
for (var i = 0; i < 6; i++) allow("ada");

console.log("--- the boundary burst ---");
// Busy-wait until we are ~30ms before a second boundary, so this demo
// is reproducible. (Yes, spinning the CPU. That is itself a symptom:
// the only way to test this code is to manipulate the real clock.)
while (1000 - (Date.now() % 1000) > 30) {
  /* spin */
}

var burstStart = Date.now();
console.log("  5 requests just before the boundary:");
for (var j = 0; j < 5; j++) allow("grace");

while (Date.now() % 1000 > 30) {
  /* spin across the boundary */
}

console.log("  5 more just after it:");
for (var k = 0; k < 5; k++) allow("grace");

console.log(
  "  => 10 requests allowed in " + (Date.now() - burstStart) + "ms, " +
    "with a limit of " + LIMIT + " per second."
);

console.log("--- and the copy that never resets ---");
for (var m = 0; m < 3; m++) allowLogin("ada");
console.log("  (ada is now blocked from logging in until the process restarts)");

// Three diseases:
//   1. Wrong algorithm: a FIXED window. The counter resets on a clock
//      boundary nobody agreed to, so a user can spend a full budget at
//      0.99s and another full budget at 1.01s — 2x the limit in 20ms.
//      "5 per second" turns out to mean "up to 10 per second."
//   2. Duplicated logic: allowLogin is a copy that already lost the
//      reset, and no test could catch it...
//   3. ...because time comes from Date.now() inside the function, and
//      printing happens inside it too. To test "what happens after 1.5
//      seconds?" you must actually WAIT 1.5 seconds, and then read
//      stdout to find out what happened.
