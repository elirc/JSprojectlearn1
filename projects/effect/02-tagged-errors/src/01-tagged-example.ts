/**
 * Worked example: tagged errors, union failure channels, catchTag(s).
 * Run with: npm run example
 */
import { Data, Effect, pipe } from "effect";

class NotFound extends Data.TaggedError("NotFound")<{
  readonly id: string;
}> {}

class Forbidden extends Data.TaggedError("Forbidden")<{
  readonly user: string;
}> {}

type Doc = { id: string; owner: string; body: string };
const docs: ReadonlyArray<Doc> = [{ id: "d1", owner: "eli", body: "notes" }];

// The signature documents both failure kinds; nothing else can escape.
const fetchDoc = (
  id: string,
  user: string
): Effect.Effect<Doc, NotFound | Forbidden> =>
  Effect.gen(function* () {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return yield* new NotFound({ id }); // tagged errors are yieldable
    if (doc.owner !== user) return yield* new Forbidden({ user });
    return doc;
  });

// Handle ONE case: Forbidden disappears from the type, NotFound remains.
const asGuest = (id: string) =>
  pipe(
    fetchDoc(id, "guest"),
    Effect.catchTag("Forbidden", ({ user }) =>
      Effect.succeed({ id, owner: user, body: "[redacted]" })
    )
  ); // Effect<Doc, NotFound>

// Handle EVERY case: the error channel becomes never.
const describe = (id: string, user: string) =>
  pipe(
    fetchDoc(id, user),
    Effect.map((doc) => `ok: ${doc.body}`),
    Effect.catchTags({
      NotFound: ({ id }) => Effect.succeed(`no such doc: ${id}`),
      Forbidden: ({ user }) => Effect.succeed(`${user} may not read this`),
    })
  ); // Effect<string, never>

console.log(Effect.runSync(describe("d1", "eli")));   // ok: notes
console.log(Effect.runSync(describe("d9", "eli")));   // no such doc: d9
console.log(Effect.runSync(describe("d1", "mallory"))); // mallory may not read this
console.log(Effect.runSync(asGuest("d1")).body);      // [redacted]
