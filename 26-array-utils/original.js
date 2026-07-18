// Utilities for a game leaderboard: dedupe player names, sort scores,
// group players by team, split into pages.

function uniqueNames(names) {
  var result = [];
  for (var i = 0; i < names.length; i++) {
    var found = false;
    for (var j = 0; j < result.length; j++) {  // O(n²) scan per item
      if (result[j] == names[i]) found = true;
    }
    if (!found) result.push(names[i]);
  }
  return result;
}

function topScores(scores) {
  scores.sort();          // TWO bugs in one line, see below
  scores.reverse();
  return scores.slice(0, 3);
}

function groupByTeam(players) {
  var teams = {};
  for (var i = 0; i < players.length; i++) {
    if (teams[players[i].team] == undefined) {
      teams[players[i].team] = [];
    }
    teams[players[i].team].push(players[i]);
  }
  return teams;
}

console.log(uniqueNames(["ana", "bo", "ana", "cy"])); // works, slowly

// Bug 1: .sort() with no comparator sorts ALPHABETICALLY — even numbers.
var scores = [100, 9, 80, 12];
console.log(topScores(scores)); // [ 9, 80, 12 ]?? because "9" > "80" > "12" as strings

// Bug 2: .sort() MUTATED the caller's array. The leaderboard we
// passed in is now reordered for everyone else using it:
console.log(scores); // [9, 80, 12, 100] — not the order we stored them in!

var players = [
  { name: "ana", team: "red" }, { name: "bo", team: "blue" },
  { name: "cy", team: "red" },
];
console.log(groupByTeam(players)); // fine... until a team is named "constructor"
