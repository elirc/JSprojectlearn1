// Yahtzee scoring: given five dice, what does each category score?

function score(dice, category) {
  if (category == "ones" || category == "twos" || category == "threes" ||
      category == "fours" || category == "fives" || category == "sixes") {
    var target;
    if (category == "ones") target = 1;
    if (category == "twos") target = 2;
    if (category == "threes") target = 3;
    if (category == "fours") target = 4;
    if (category == "fives") target = 5;
    if (category == "sixes") target = 6;
    var total = 0;
    for (var i = 0; i < dice.length; i++) {
      if (dice[i] == target) total += dice[i];
    }
    return total;
  } else if (category == "threeOfAKind") {
    // count each face... (this exact counting loop appears 4 more times)
    for (var v = 1; v <= 6; v++) {
      var count = 0;
      for (var i = 0; i < dice.length; i++) {
        if (dice[i] == v) count++;
      }
      if (count >= 3) {
        var sum = 0;
        for (var j = 0; j < dice.length; j++) sum += dice[j];
        return sum;
      }
    }
    return 0;
  } else if (category == "fourOfAKind") {
    for (var v = 1; v <= 6; v++) {
      var count = 0;
      for (var i = 0; i < dice.length; i++) {
        if (dice[i] == v) count++;
      }
      if (count >= 4) {
        var sum = 0;
        for (var j = 0; j < dice.length; j++) sum += dice[j];
        return sum;
      }
    }
    return 0;
  } else if (category == "fullHouse") {
    var hasThree = false;
    var hasTwo = false;
    for (var v = 1; v <= 6; v++) {
      var count = 0;
      for (var i = 0; i < dice.length; i++) {
        if (dice[i] == v) count++;
      }
      if (count == 3) hasThree = true;
      if (count == 2) hasTwo = true;
    }
    if (hasThree && hasTwo) return 25;
    return 0;
  } else if (category == "smallStraight") {
    // four in a row: 1234, 2345, or 3456. Just check all three by hand.
    var has = {};
    for (var i = 0; i < dice.length; i++) has[dice[i]] = true;
    if ((has[1] && has[2] && has[3] && has[4]) ||
        (has[2] && has[3] && has[4] && has[5]) ||
        (has[3] && has[4] && has[5] && has[6])) return 30;
    return 0;
  } else if (category == "largeStraight") {
    var has2 = {};
    for (var i = 0; i < dice.length; i++) has2[dice[i]] = true;
    if ((has2[1] && has2[2] && has2[3] && has2[4] && has2[5]) ||
        (has2[2] && has2[3] && has2[4] && has2[5] && has2[6])) return 40;
    return 0;
  } else if (category == "yahtzee") {
    for (var v = 1; v <= 6; v++) {
      var count = 0;
      for (var i = 0; i < dice.length; i++) {
        if (dice[i] == v) count++;
      }
      if (count == 5) return 50;
    }
    return 0;
  } else if (category == "chance") {
    var sum2 = 0;
    for (var i = 0; i < dice.length; i++) sum2 += dice[i];
    return sum2;
  }
  return 0; // unknown category? silently zero. (typo = quiet wrong answer)
}

console.log(score([3, 3, 3, 2, 2], "fullHouse"));    // 25
console.log(score([1, 2, 3, 4, 6], "smallStraight")); // 30
console.log(score([5, 5, 5, 5, 5], "yahtzee"));       // 50
console.log(score([5, 5, 5, 5, 5], "fullHous"));      // 0 — typo, no error!
