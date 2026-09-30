/**
 * Worked example: a Greeter service, two layers, one program.
 * Run with: npm run example
 */
import { Context, Effect, Layer } from "effect";

// 1. The service: an interface behind a tag. No implementation here.
class Greeter extends Context.Tag("Greeter")<
  Greeter,
  { readonly greet: (name: string) => Effect.Effect<string> }
>() {}

// 2. Logic that ASKS for the service — note SessionRepo-style R channel.
const welcome = (names: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const greeter = yield* Greeter; // adds Greeter to R
    const lines: string[] = [];
    for (const name of names) lines.push(yield* greeter.greet(name));
    return lines.join("\n");
  }); // Effect<string, never, Greeter>

// 3. Two interchangeable layers.
const Plain = Layer.succeed(Greeter, {
  greet: (name) => Effect.succeed(`hello, ${name}`),
});

const Shouty = Layer.succeed(Greeter, {
  greet: (name) => Effect.succeed(`HELLO, ${name.toUpperCase()}!`),
});

// 4. The edge decides which world the logic runs in.
const names = ["eli", "forge"];
console.log(Effect.runSync(Effect.provide(welcome(names), Plain)));
console.log("---");
console.log(Effect.runSync(Effect.provide(welcome(names), Shouty)));

// Uncomment to see the compiler refuse an unprovided program:
// Effect.runSync(welcome(names)); // Type error: R is Greeter, not never
