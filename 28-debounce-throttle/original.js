// A search box that queries an API on every keystroke is wasteful —
// wait until the user stops typing (that's "debounce").
// Simulating keystrokes in Node so you can run this file directly.

function searchApi(query) {
  console.log("  -> API call for: " + query);
}

// The inline attempt: a timer variable next to the handler.
var timer = null;

function onSearchKeystroke(text) {
  clearTimeout(timer);
  timer = setTimeout(function () {
    searchApi(text);
  }, 300);
}

// Second feature: the username field should also debounce its
// availability check. Copy the pattern... and reuse `timer`? Oops —
// or declare timer2, timer3... one module-level variable per usage.
function onUsernameKeystroke(text) {
  clearTimeout(timer); // BUG: shared timer — this CANCELS pending searches!
  timer = setTimeout(function () {
    console.log("  -> checking username: " + text);
  }, 300);
}

console.log("typing 'cat' quickly, then a username:");
onSearchKeystroke("c");
onSearchKeystroke("ca");
onSearchKeystroke("cat");     // this search is pending...
onUsernameKeystroke("kim");   // ...and this just silently killed it.

// After 300ms only the username check fires. The search never happens,
// nothing errors, and the bug only shows when a user touches both
// fields within 300ms. Debugging this in production is misery.
