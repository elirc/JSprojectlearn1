// A bank account, the obvious way: one object with a `balance` field,
// and functions that add to it and take away from it. Money in cents.

const account = { owner: "Ada", balance: 0 };

function deposit(amount) {
  account.balance += amount;
  // No validation. deposit(-5000) is a withdrawal wearing a disguise,
  // and it skips every rule below.
}

function withdraw(amount) {
  if (amount > account.balance) {
    console.log("declined: insufficient funds");
    return; // returns undefined either way — callers can't tell
  }        // success from failure without re-reading account.balance
  account.balance -= amount;
}

function chargeFee(amount) {
  account.balance -= amount; // no overdraft rule here. Nobody decided
}                            // that; the rule just wasn't copied over.

// Added six months later, by someone in a hurry, in another file:
function payBill(name, amount) {
  account.balance -= amount; // ...and here it wasn't copied either
}

// ---- one month of activity ----------------------------------------
deposit(50000);          // paycheck
withdraw(1250);          // coffee
payBill("rent", 32000);
chargeFee(3500);         // monthly fee
chargeFee(3500);         // the retry that ran twice — THE BUG
deposit(2000);           // refund
payBill("car", 18000);

console.log("balance:", account.balance); // -6250

// ---- now answer these questions ------------------------------------
// Support calls: "my balance is negative, and your app says that's
// impossible. What happened?"
//
//   1. When did the balance first go negative?          -> unknown
//   2. Was the monthly fee really charged twice?        -> unknown
//   3. What was the balance last Tuesday?               -> unknown
//   4. Which code path skipped the overdraft check?     -> unknown
//   5. Can we undo just the duplicate fee?              -> no
//
// Every answer is "unknown" for the same reason: `balance += amount`
// OVERWRITES. Each change destroys the only evidence of the change
// before it, and the object we print at the end is the single
// surviving frame of a film nobody recorded.
console.log(account); // { owner: 'Ada', balance: -6250 }

// You could sprinkle console.log into every function... which is a
// log. Project 83's question: what if the log WERE the account, and
// the balance were just something we compute from it?
