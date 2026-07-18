// "How hard can a promise be? It's just a callback holder."
// This is the naive version everyone writes first. It LOOKS right
// and works for exactly one demo, then lies to you four ways.

function MyPromise(executor) {
  var self = this;
  self.callbacks = [];
  self.value = undefined;

  executor(function resolve(value) {
    // Problem 1: no state. Resolve twice? Callbacks run TWICE.
    // Real promises settle exactly once, forever.
    self.value = value;
    for (var i = 0; i < self.callbacks.length; i++) {
      // Problem 2: callbacks run SYNCHRONOUSLY, inside resolve().
      // Real `then` callbacks always run on the microtask queue —
      // subscribe-before-vs-after-settle must not change behavior,
      // and code after .then() must run before the handler does.
      self.callbacks[i](value);
    }
  }, function reject() {
    // Problem 3: rejection is... not implemented. Errors thrown in
    // the executor or handlers just explode up whatever stack
    // happens to be running. No .catch, no propagation.
  });
}

MyPromise.prototype.then = function (onFulfilled) {
  // Problem 4: subscribe AFTER it settled? Straight into the array
  // nobody will ever loop over again. The callback never fires.
  // (This is the bug you hit the moment a promise resolves fast.)
  this.callbacks.push(onFulfilled);

  // Problem 5: returns NOTHING. No chaining: p.then(a).then(b) is
  // a TypeError. And a handler's return value goes nowhere, so
  // transforming values through a pipeline is impossible.
};

// It demos fine — which is exactly why people ship it:
var p = new MyPromise(function (resolve) {
  setTimeout(function () { resolve(42); }, 10);
});
p.then(function (v) { console.log("got", v); });

// ...but:
var settled = new MyPromise(function (resolve) { resolve("early"); });
settled.then(function (v) { console.log("this NEVER prints:", v); });
