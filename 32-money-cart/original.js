// Shopping cart totals with prices as floating-point dollars.
// Looks fine. Isn't.

var cart = [
  { name: "coffee", price: 10.35, quantity: 3 },
  { name: "filter", price: 0.10, quantity: 2 },
];

function cartTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}

var total = cartTotal(cart);
console.log(total); // 31.249999999999996  ...not 31.25

// Root cause, the most famous line in JavaScript:
console.log(0.1 + 0.2);          // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3);  // false
// Binary floats can't represent most decimal fractions exactly, the
// same way decimal can't write 1/3 exactly. Every add multiplies the dust.

// Patch attempt: round for display with toFixed...
console.log("Total: $" + total.toFixed(2)); // "$31.25" — looks fixed!

// ...but the errors are still in the DATA, and now they compound:
var discounted = total * 0.9;                  // 10% discount
console.log(discounted);                       // 28.124999999999996
console.log("free shipping over $28.125?", discounted >= 28.125); // false!?
// The customer misses the threshold by 0.000000000000004 dollars.

// And toFixed itself has rounding surprises:
console.log((1.005).toFixed(2)); // "1.00" — not "1.01"!
