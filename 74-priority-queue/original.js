// A task scheduler: every task has a priority (lower number = more
// urgent), and we always want to run the most urgent one next.
// Attempt: keep one array and re-sort the whole thing after every push.

var tasks = [];
var added = 0;

function addTask(name, priority) {
  added++;
  tasks.push({ name: name, priority: priority, seq: added });

  // Re-sort the ENTIRE list after adding ONE item. Sorting is O(n log n);
  // we do it n times, so n adds cost O(n^2 log n). We needed to place one
  // task; we re-derived the position of every task instead.
  tasks.sort(function (a, b) {
    return a.priority - b.priority;
  });

  // ...and the scheduler prints. Logic welded to I/O: there is no way to
  // ask "what would run next?" without something appearing on a terminal.
  console.log("  added " + name + " (p" + priority + "), queue length " + tasks.length);
}

function showNextTask() {
  // The comparator, written out a SECOND time. Copy-paste, then someone
  // "improved" this copy: ties now break by newest-first instead of
  // oldest-first. Two comparators, one queue, no warning.
  var sorted = tasks.slice().sort(function (a, b) {
    return a.priority - b.priority || b.seq - a.seq;
  });
  console.log("  next up: " + sorted[0].name);
}

function runAll() {
  while (tasks.length > 0) {
    var next = tasks.shift(); // shift() is O(n) too — every pop re-indexes
    console.log("  running " + next.name + " (p" + next.priority + ")");
  }
}

console.log("--- adding tasks ---");
addTask("email-receipt", 5);
addTask("charge-card", 1);
addTask("resize-avatar", 5);
addTask("rebuild-index", 9);
addTask("send-otp", 1);

console.log("--- the two comparators disagree ---");
showNextTask(); // says "send-otp"...
runAll(); // ...but "charge-card" runs first. Which one is the promise?

// Ties are the giveaway: charge-card and send-otp are both p1. The
// sort inside addTask leaves them in arrival order (FIFO), the sort
// inside showNextTask flips them (LIFO). The preview lies about the
// queue, and nothing in the code says which one is intended.

console.log("--- and now the cost ---");
var big = [];
var t0 = Date.now();
for (var i = 0; i < 3000; i++) {
  big.push({ name: "t" + i, priority: (i * 7919) % 10000 });
  big.sort(function (a, b) {
    return a.priority - b.priority;
  });
}
console.log("  3000 adds, re-sorting every time: " + (Date.now() - t0) + "ms");
console.log("  (a real queue does this in single-digit milliseconds)");

// Three diseases in 40 lines:
//   1. Naive algorithm: full sort per insert, when only ONE item moved.
//   2. Duplicated ordering rule: two comparators that already drifted apart.
//   3. Logic welded to I/O: adding and running a task both print, so the
//      scheduling rules cannot be tested, reused, or shown in a UI.
