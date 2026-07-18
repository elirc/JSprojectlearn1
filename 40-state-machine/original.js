// An order's lifecycle, tracked with booleans. Each new requirement
// added a flag. Each flag doubled the number of possible states.

function createOrder() {
  return {
    isPaid: false,
    isShipped: false,
    isDelivered: false,
    isCancelled: false,
  };
}

function pay(order) {
  order.isPaid = true;
}

function ship(order) {
  if (!order.isPaid) {
    console.log("can't ship unpaid order");
    return;
  }
  order.isShipped = true;
}

function cancel(order) {
  // someone remembered you can't cancel after shipping:
  if (order.isShipped) {
    console.log("can't cancel a shipped order");
    return;
  }
  order.isCancelled = true;
}

function deliver(order) {
  // ...but nobody remembered anything here:
  order.isDelivered = true;
}

// The flags allow states that DON'T EXIST in reality:
var order = createOrder();
pay(order);
cancel(order);       // cancelled after payment - fine, refund them
ship(order);         // SHIPS A CANCELLED ORDER. isPaid is true, so the
                     // one check in ship() passes. Nobody checked
                     // isCancelled because that flag came later.
console.log(order);
// { isPaid: true, isShipped: true, isDelivered: false, isCancelled: true }
// This order is simultaneously cancelled AND shipped. The warehouse
// sent a package for an order the customer was told is cancelled.

deliver(createOrder()); // also: delivered without pay or ship. Sure!

// 4 booleans = 16 representable states. The business has ~5 real ones.
// The other 11 are bugs waiting for the flag-check someone forgot.
