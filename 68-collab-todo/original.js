// "Make the todo list collaborative: just poll the server and save."
// This file SIMULATES the classic first attempt — poll + save the
// whole list — with two clients and an in-memory "server", so you
// can watch the lost update happen deterministically.
// Run it: node 68-collab-todo/original.js

// ---- the "server": the whole list, replaced on every save ----------
var serverList = [{ id: 1, title: "buy milk", done: false }];

function apiGet() { return JSON.parse(JSON.stringify(serverList)); }
function apiSave(list) { serverList = JSON.parse(JSON.stringify(list)); }

// ---- two browsers ---------------------------------------------------
// Problem 1: each client's copy is a snapshot from its last poll.
// Between polls it's stale, and neither client knows HOW stale.
var alice = apiGet();
var bob = apiGet();

// Alice adds a todo and saves THE WHOLE LIST:
alice.push({ id: 2, title: "alice: call the bank", done: false });
apiSave(alice);
console.log("after alice saves:", serverList.map(function (t) { return t.title; }));

// Bob — still holding the OLD snapshot — ticks off "buy milk" and
// saves HIS whole list...
bob[0].done = true;
apiSave(bob);

// Problem 2 — THE LOST UPDATE: bob's save replaced the whole list
// with his stale copy. Alice's todo is gone. No error, no conflict
// message, nothing. She'll notice on her next poll... 2 seconds of
// confusion, then "this app eats my todos".
console.log("after bob saves:  ", serverList.map(function (t) { return t.title; }));
console.log("alice's todo just vanished — no error anywhere.");

// Problem 3: polling every 2s means up to 2s of lag for OTHER
// people's changes and a constant GET drumbeat for nothing. Project
// 67 built the push pipe this app should be using.

// Problem 4: "save the whole list" makes every write a total
// overwrite, so conflicts are guaranteed to destroy data. The finer
// the writes (one operation per change), the smaller the blast
// radius — that's most of the fix, before any clever merging.
