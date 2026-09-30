/**
 * Worked example: declare once — get the type, decoder, encoder, and errors.
 * Run with: npm run example
 */
import { Either, ParseResult, Schema } from "effect";

const Habit = Schema.Struct({
  name: Schema.NonEmptyTrimmedString,
  streak: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  startedAt: Schema.Date, // wire: ISO string ⇄ domain: Date
});
type Habit = typeof Habit.Type;

const decode = Schema.decodeUnknownEither(Habit);
const encode = Schema.encodeSync(Habit);

// Decoding good input yields the typed, transformed value.
const good = decode({ name: "reading", streak: 4, startedAt: "2026-09-01" });
if (Either.isRight(good)) {
  const habit: Habit = good.right;
  console.log("decoded:", habit.name, habit.startedAt instanceof Date);
  // Encoding walks back to the wire shape — Date becomes a string again.
  console.log("encoded:", JSON.stringify(encode(habit)));
}

// Decoding bad input yields a structured, explainable error — not a throw.
const bad = decode({ name: "  ", streak: 2.5, startedAt: "not-a-date" });
if (Either.isLeft(bad)) {
  console.log("--- decode failed ---");
  console.log(ParseResult.TreeFormatter.formatErrorSync(bad.left));
}

// Brands: a string that must be minted through its schema.
const HabitId = Schema.String.pipe(Schema.brand("HabitId"));
type HabitId = typeof HabitId.Type;
const id: HabitId = Schema.decodeSync(HabitId)("h_42");
console.log("branded id:", id);
