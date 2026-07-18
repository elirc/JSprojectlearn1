// Towers of Hanoi: move n discs from peg A to peg C, one at a time,
// never putting a bigger disc on a smaller one.

var moveCount = 0; // global counter, updated from inside the recursion

function hanoi(n, from, to, via) {
  if (n == 0) {
    return;
  }
  hanoi(n - 1, from, via, to);
  moveCount++;
  console.log("Move disc " + n + " from " + from + " to " + to);
  hanoi(n - 1, via, to, from);
}

hanoi(3, "A", "C", "B");
console.log("Total moves: " + moveCount);

// Problems you can't see until you try to reuse this:
// - Run it twice and moveCount keeps counting: 7, then 14.
// - Want the moves as data (to animate them, to verify them)? Too bad,
//   they went straight to the console.
// - Want to test it? You'd have to capture stdout.
moveCount = 0; // ...and now every caller has to remember this line.
