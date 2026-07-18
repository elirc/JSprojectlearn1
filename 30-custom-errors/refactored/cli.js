// THE BOUNDARY: the one place that catches, because it's the one
// place that can act (talk to the user). Run:
//   node cli.js grace 41
//   node cli.js x 8
import { register, ValidationError } from './registration.js';

const database = [{ username: 'ada', age: 30 }];
const [username, age] = process.argv.slice(2);

try {
  const user = register({ username, age }, database);
  console.log(`Welcome, ${user.username}!`);
} catch (err) {
  if (err instanceof ValidationError) {
    // Expected failure: the user's fault, tell them kindly.
    console.error(`Sorry — ${err.message} (${err.field})`);
    process.exitCode = 1;
  } else {
    // Unexpected failure: OUR fault. Never disguise it as user error —
    // rethrow so it crashes loudly with a stack trace.
    throw err;
  }
}
