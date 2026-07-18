// Rock paper scissors against the computer. Run: node original.js rock

var playerMove = process.argv[2];

var r = Math.random();
var computerMove;
if (r < 0.333) {
  computerMove = "rock";
} else if (r < 0.666) {
  computerMove = "paper";
} else {
  computerMove = "scissors";
}

console.log("You played " + playerMove);
console.log("Computer played " + computerMove);

// All nine combinations, spelled out by hand:
if (playerMove == "rock" && computerMove == "rock") {
  console.log("Draw!");
} else if (playerMove == "rock" && computerMove == "paper") {
  console.log("Computer wins!");
} else if (playerMove == "rock" && computerMove == "scissors") {
  console.log("You win!");
} else if (playerMove == "paper" && computerMove == "rock") {
  console.log("You win!");
} else if (playerMove == "paper" && computerMove == "paper") {
  console.log("Draw!");
} else if (playerMove == "paper" && computerMove == "scissors") {
  console.log("Computer wins!");
} else if (playerMove == "scissors" && computerMove == "rock") {
  console.log("Computer wins!");
} else if (playerMove == "scissors" && computerMove == "paper") {
  console.log("You win!");
} else if (playerMove == "scissors" && computerMove == "scissors") {
  console.log("Draw!");
}
// If you typo "rok", none of the nine match and the program says
// nothing at all. How would you even test this file? You can't call
// it — you can only run it and read the console.
