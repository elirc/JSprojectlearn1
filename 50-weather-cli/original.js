// "Make me a CLI that shows the weather for a city."
// Usage: node original.js Manila

// Problem 1: the API key is IN THE SOURCE CODE. This file gets
// committed, pushed, and now the key is public forever (git never
// forgets). Keys belong in the environment, not the repo.
var API_KEY = "sk_live_9f2c81d7e4a0b356"; // <- oops. rotate it. again.

var city = process.argv[2];

// Problem 2: no argument? `city` is undefined and we happily ask the
// API for the weather in "undefined". The error shows up as a weird
// API response instead of a helpful usage message.

fetch(
  "https://api.example-weather.test/v1/current?city=" +
    city + // Problem 3: not URL-encoded. "San Juan" becomes two params.
    "&key=" +
    API_KEY
)
  .then(function (res) {
    // Problem 4: fetch does NOT reject on 404/500 — only on network
    // failure. A "city not found" response sails right through here
    // and explodes later as `undefined is not an object` in the
    // formatting code, three lines from the actual cause.
    return res.json();
  })
  .then(function (data) {
    // Problem 5: fetching, formatting, and printing are one blob.
    // Want to test the formatting? You can't without a network and
    // a live key. Want a --json flag? Surgery.
    console.log("Weather for " + data.city);
    console.log(
      "  " +
        data.tempC +
        "C, " +
        data.condition +
        ", wind " +
        data.windKph +
        " kph"
    );
  })
  .catch(function (e) {
    // Problem 6: every failure — no network, bad key, bad city, bad
    // JSON — lands here as the same unhelpful blob. The user can't
    // tell "check your wifi" apart from "typo in the city name".
    console.log("error", e);
  });
