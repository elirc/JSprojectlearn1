// User registration with "error handling" — every function reports
// failure a DIFFERENT way, and the caller must remember all of them.

function parseAge(input) {
  var age = Number(input);
  if (isNaN(age)) return -1;          // convention 1: magic -1
  if (age < 13) return -1;            // (same -1 for a DIFFERENT problem)
  return age;
}

function checkUsername(name) {
  if (name.length < 3) return "ERROR: too short";  // convention 2: string
  if (name.indexOf(" ") >= 0) return "ERROR: no spaces";
  return name;
}

function findUser(username, database) {
  for (var i = 0; i < database.length; i++) {
    if (database[i].username == username) return database[i];
  }
  return null;                        // convention 3: null
}

function register(input, database) {
  var age = parseAge(input.age);
  var username = checkUsername(input.username);
  var existing = findUser(username, database);

  // The caller must now remember: -1 means bad age, strings starting
  // with "ERROR:" mean bad name, null means... available? Let's see
  // how that goes:
  if (existing) return "taken";
  return { username: username, age: age };
}

var db = [{ username: "ada", age: 30 }];

console.log(register({ username: "grace", age: "41" }, db));
// { username: 'grace', age: 41 } — works!

console.log(register({ username: "x", age: "8" }, db));
// { username: 'ERROR: too short', age: -1 }
// BOTH checks failed and registration SUCCEEDED anyway — the error
// values sailed straight through and became the account data.
// Somewhere a database now has a user named "ERROR: too short",
// age -1. Nobody threw, nobody checked, nothing logged.
