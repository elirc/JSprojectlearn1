// "We need an API for todos. Don't overthink it."
// One handler, one if/else ladder, everything inline.
import http from "node:http";

var todos = [];
var nextId = 1;

var server = http.createServer(function (req, res) {
  // Problem 1: routing is string-surgery repeated per route. Path
  // params mean split("/")[2] and hope. Add a route and you're
  // re-reading the whole ladder to find where it fits.
  if (req.method === "GET" && req.url === "/todos") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(todos));
  } else if (req.method === "POST" && req.url === "/todos") {
    // Problem 2: body parsing, hand-rolled HERE (and re-rolled in
    // every other POST/PUT below, each copy slightly different).
    var chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () {
      // Problem 3: JSON.parse with no try/catch — send `{oops` and
      // the whole PROCESS crashes. One bad client kills the server
      // for everyone.
      var body = JSON.parse(Buffer.concat(chunks).toString());

      // Problem 4: no validation. {"title": ""} or {} or
      // {"title": 12345} all sail in and live in the data forever.
      todos.push({ id: nextId++, title: body.title, done: false });
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(todos[todos.length - 1]));
    });
  } else if (req.method === "PUT" && req.url.startsWith("/todos/")) {
    var id = parseInt(req.url.split("/")[2]); // "abc" -> NaN, no check
    var chunks2 = [];
    req.on("data", function (c) { chunks2.push(c); });
    req.on("end", function () {
      var body = JSON.parse(Buffer.concat(chunks2).toString()); // crash #2
      var found = null;
      for (var i = 0; i < todos.length; i++) {
        if (todos[i].id === id) found = todos[i];
      }
      // Problem 5: error responses are improvised per site — this
      // one is text/plain "nope", others are JSON, the POST above
      // never even checked. Clients can't rely on ANY error shape.
      if (!found) {
        res.writeHead(404);
        res.end("nope");
        return;
      }
      found.done = !!body.done;
      if (body.title) found.title = body.title;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(found));
    });
  } else {
    res.writeHead(404);
    res.end("not found");
  }
  // Problem 6: business rules (what makes a valid todo? what does
  // toggling mean?) are smeared through HTTP plumbing. You cannot
  // test "todos" without booting a server and speaking HTTP.
});

server.listen(3000, function () {
  console.log("listening on http://localhost:3000 — try:");
  console.log('  curl localhost:3000/todos');
  console.log('  curl -X POST localhost:3000/todos -d \'{"title":"try {oops next"}\'');
});
