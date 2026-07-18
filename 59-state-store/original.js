// A shopping cart's state management, the way it grows naturally:
// one shared object, mutated from wherever, with "remember to update
// the UI" sprinkled by hand.

// Problem 1: global mutable state. ANY code can reach in and change
// ANYTHING, so when cart.items is mysteriously wrong, the suspect
// list is the entire codebase.
var state = {
  items: [],
  coupon: null,
};

// Problem 2: every mutation site must REMEMBER to call the right
// update functions. Forget one (see removeItem) and the UI silently
// drifts out of sync with the data.
function addItem(name, priceCents) {
  state.items.push({ name: name, priceCents: priceCents });
  renderCart();
  renderTotal();
}

function removeItem(name) {
  state.items = state.items.filter(function (i) { return i.name !== name; });
  renderCart();
  // ...forgot renderTotal(). The total now shows a deleted item.
}

function applyCoupon(code) {
  // Problem 3: business rules live at the mutation site. Is the
  // coupon valid? Every place that touches coupons re-decides,
  // and they disagree.
  if (code === "SAVE10") state.coupon = 0.9;
  renderTotal(); // forgot renderCart(), which shows the coupon badge
}

// Problem 4: no history, no way to answer "HOW did state end up like
// this?" — mutations leave no trace. (Project 39 solved undo with
// snapshots; here we can't even log changes, because nothing funnels
// them.)

function renderCart() {
  console.log("cart:", state.items.map(function (i) { return i.name; }).join(", ") || "(empty)");
}

function renderTotal() {
  var total = 0;
  for (var i = 0; i < state.items.length; i++) total += state.items[i].priceCents;
  if (state.coupon) total = Math.round(total * state.coupon);
  console.log("total:", (total / 100).toFixed(2), state.coupon ? "(coupon)" : "");
}

addItem("keyboard", 4900);
addItem("mouse", 2900);
applyCoupon("SAVE10");
removeItem("keyboard");
// total still includes the keyboard's discount math on the stale render:
renderTotal(); // manually patched here — that's the disease, not the cure
