// A bank account "object": data plus some functions that use it.

var account = {
  owner: "Ada",
  balance: 100,
  history: [],

  deposit: function (amount) {
    this.balance += amount;
    this.history.push("deposit " + amount);
  },

  withdraw: function (amount) {
    this.balance -= amount;
    this.history.push("withdraw " + amount);
  },
};

account.deposit(50);
account.withdraw(30);
console.log(account.balance); // 120 — fine so far

// Problem 1: the data is wide open. NOTHING stops this:
account.balance = 1000000;            // direct edit, no history entry
account.withdraw(-500);               // "withdrawing" -500 ADDS money
account.deposit("50");                // string! balance becomes "100000050"...
console.log(account.balance, typeof account.balance);
console.log(account.history);         // history says almost none of this

// The invariants we CARE about — balance matches history, no negative
// amounts, no overdrafts — are hopes, not rules. Every caller
// everywhere must behave perfectly, forever.

// Problem 2: `this` is a loaded gun. Hand the method to something
// else (a callback, a button handler) and it loses its object:
var pay = account.withdraw;
try {
  pay(10); // `this` is undefined here — crash (or worse, globals)
} catch (e) {
  console.log("detached method crashed:", e.message);
}
// The async flavor of the same bug — uncomment and the crash happens
// LATER, outside any try/catch, killing the whole program:
//   setTimeout(account.withdraw, 10, 10);
// (Inside setTimeout, `this` is a Timeout object, not the account.)
