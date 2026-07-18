// "Add login to the API." The version that gets people breached.
// Run it: node 66-auth/original.js — it demonstrates its own holes.

var users = {}; // username -> record

function register(username, password) {
  // Problem 1: the password is stored AS TYPED. One leaked backup,
  // one nosy admin, one SQL injection anywhere — and every user's
  // real password (reused on their email, of course) is public.
  // Passwords are never stored; only slow salted HASHES are.
  users[username] = { username: username, password: password };
}

function login(username, password) {
  var user = users[username];
  if (!user) return null;

  // Problem 2: string comparison bails at the first wrong byte.
  // Comparing secrets with === leaks WHERE the mismatch happened
  // through response timing — attackers can recover a secret
  // byte-by-byte. Secrets are compared in constant time.
  if (user.password === password) {
    // Problem 3: the "token" is just the username, encoded. Encoding
    // is not encryption and DEFINITELY not authentication — anyone
    // can mint one for any user (watch below). Tokens must be
    // UNFORGEABLE: signed by a server secret.
    return Buffer.from(username).toString("base64");
  }
  return null;
}

function whoAmI(token) {
  // Problem 4: "verification" is just decoding. No signature check
  // (there's no signature), no expiry (a stolen token works forever).
  return Buffer.from(token, "base64").toString();
}

// ---- the demo ------------------------------------------------------
register("ada", "correct horse battery staple");

var token = login("ada", "correct horse battery staple");
console.log("ada's token:", token);
console.log("whoAmI:", whoAmI(token));

console.log("\n--- what an attacker does ---");
console.log("the database 'leak':", JSON.stringify(users)); // plaintext, there it is

var forged = Buffer.from("admin").toString("base64"); // no login needed
console.log("forged admin token:", forged, "->", whoAmI(forged)); // "admin". done.
