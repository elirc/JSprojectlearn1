// "We don't need a database, just save it to a JSON file."
// Famous last words — here's how it's usually done.
import fs from "node:fs";

var FILE = "data.json";

// Problem 1: readFileSync/writeFileSync BLOCK the entire process.
// In a server, every request everywhere stalls while this one
// touches disk. (Sync fs is for startup scripts, not request paths.)
function load() {
  // Problem 2: no missing-file handling — first run crashes with
  // ENOENT. And if the file is half-written garbage (see Problem 3),
  // JSON.parse throws and the app is bricked until someone
  // hand-edits the file.
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function save(data) {
  // Problem 3: THE BIG ONE — this write is not atomic. writeFileSync
  // truncates the file to zero bytes, THEN writes. Crash, power cut,
  // or process kill between those two steps and data.json is empty
  // or half a JSON object. The save operation itself is what
  // destroys the data it was saving.
  fs.writeFileSync(FILE, JSON.stringify(data));
}

// Problem 4: the "API" is load-everything / save-everything, sprayed
// across every call site. Each caller re-implements read-modify-write:
export function addUser(name) {
  var data = load();
  data.users.push({ id: data.nextId++, name: name });
  save(data);
}

export function renameUser(id, name) {
  var data = load(); // load AGAIN (and again, and again...)
  for (var i = 0; i < data.users.length; i++) {
    if (data.users[i].id === id) data.users[i].name = name;
  }
  save(data);
}

// Problem 5: two async callers doing load -> modify -> save
// interleave: both load {users: [A]}, one saves [A, B], the other
// saves [A, C] over it. B is silently gone. "It's just a file"
// doesn't exempt you from write serialization.
