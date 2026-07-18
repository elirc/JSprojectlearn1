// Given daily prices, find the best day to buy and the best day to
// sell to maximize profit. (You must buy before you sell.)

function best(p) {
  var m = 0;
  var a = -1;
  var b = -1;
  for (var i = 0; i < p.length; i++) {
    for (var j = i + 1; j < p.length; j++) {
      if (p[j] - p[i] > m) {
        m = p[j] - p[i];
        a = i;
        b = j;
      }
    }
  }
  return [a, b, m];
}

var prices = [110, 95, 100, 87, 92, 105, 102, 99];
var r = best(prices);
console.log("buy day " + r[0] + ", sell day " + r[1] + ", profit " + r[2]);

// Quiz (no peeking): what are m, a, b? What does r[1] mean? Is that
// an index or a price? What comes back when prices only go DOWN?
// (Answer: [-1, -1, 0] — the caller has to know -1 is a magic value.)
// Also: two nested loops = checking every pair. Fine for 8 days,
// painful for 10 years of minute data (~2 million points squared).
