import { appendAll, replay } from './ledger.js';
import {
  balanceAt, balanceCents, duplicateSuspects, firstBalanceBelow, largestDay, statement,
} from './projections.js';

// The I/O layer: it asks the log questions and prints the answers.
// Every answer below is one function call, and the original could not
// produce a single one of them.

const money = (cents) => `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;

// ---- 1. the same month as original.js, through the rulebook --------
const { events, rejected } = appendAll([], [
  { type: 'open', owner: 'Ada', at: '2024-03-01T08:00:00Z' },
  { type: 'deposit', amountCents: 50000, at: '2024-03-01T09:00:00Z', note: 'paycheck' },
  { type: 'withdraw', amountCents: 1250, at: '2024-03-02T08:15:00Z', note: 'coffee' },
  { type: 'withdraw', amountCents: 32000, at: '2024-03-03T10:00:00Z', note: 'rent' },
  { type: 'charge-fee', amountCents: 3500, at: '2024-03-04T00:00:00Z', note: 'monthly fee' },
  { type: 'charge-fee', amountCents: 3500, at: '2024-03-04T00:00:00Z', note: 'monthly fee (retry)' },
  { type: 'deposit', amountCents: 2000, at: '2024-03-05T12:00:00Z', note: 'refund' },

  // Four commands the original happily performed:
  { type: 'deposit', amountCents: -5000, at: '2024-03-05T13:00:00Z' },
  { type: 'withdraw', amountCents: 18000, at: '2024-03-06T09:00:00Z', note: 'car' },
  { type: 'open', owner: 'Bob', at: '2024-03-06T10:00:00Z' },
  { type: 'deposit', amountCents: 100, at: '2024-01-01T00:00:00Z', note: 'backdated' },
]);

console.log('=== rejected commands (the log never grew) ===');
for (const { command, error } of rejected) {
  console.log(`  ${command.type.padEnd(11)} ${error.code.padEnd(19)} ${error.message}`);
}
console.log(`  log length: ${events.length} events for ${7 + rejected.length} commands`);

// ---- 2. state is derived, never stored -----------------------------
const state = replay(events);
console.log(`\n=== ${state.owner}: ${money(state.balanceCents)} after ${state.eventCount} events ===`);
for (const row of statement(events)) {
  const delta = row.deltaCents === 0 ? '' : money(row.deltaCents);
  console.log(
    `  ${row.at}  ${row.type.padEnd(12)} ${delta.padStart(9)}  ` +
    `-> ${money(row.balanceCents).padStart(9)}  ${row.note ?? ''}`,
  );
}

// ---- 3. time travel ------------------------------------------------
console.log('\n=== "what was the balance on...?" ===');
for (const when of ['2024-03-01T00:00:00Z', '2024-03-02T23:59:59Z', '2024-03-04T23:59:59Z']) {
  console.log(`  ${when}  ${money(balanceAt(events, when))}`);
}
const busiest = largestDay(events);
console.log(`  busiest day: ${busiest.day} (${money(busiest.netCents)} over ${busiest.eventCount} events)`);
console.log(`  ever below zero? ${firstBalanceBelow(events, 0) === null ? 'no — and that is now provable' : 'yes'}`);

// ---- 4. the bug hunt -----------------------------------------------
// A log exported from the OLD system: the same story, but the fee ran
// twice and the car payment skipped the overdraft check. `append`
// would have refused the last one; these events are pasted in raw,
// exactly as the legacy code wrote them.
const legacyLog = [
  { type: 'opened', owner: 'Ada', at: '2024-03-01T08:00:00Z' },
  { type: 'deposited', amountCents: 50000, at: '2024-03-01T09:00:00Z', note: 'paycheck' },
  { type: 'withdrew', amountCents: 1250, at: '2024-03-02T08:15:00Z', note: 'coffee' },
  { type: 'withdrew', amountCents: 32000, at: '2024-03-03T10:00:00Z', note: 'rent' },
  { type: 'fee-charged', amountCents: 3500, at: '2024-03-04T00:00:00Z', note: 'monthly fee' },
  { type: 'fee-charged', amountCents: 3500, at: '2024-03-04T00:00:02Z', note: 'monthly fee' },
  { type: 'deposited', amountCents: 2000, at: '2024-03-05T12:00:00Z', note: 'refund' },
  { type: 'withdrew', amountCents: 18000, at: '2024-03-06T09:00:00Z', note: 'car' },
];

console.log(`\n=== support ticket: "my balance is ${money(balanceCents(legacyLog))}. What happened?" ===`);
const wentNegative = firstBalanceBelow(legacyLog, 0);
console.log(
  `  went negative at event #${wentNegative.index}: ` +
  `${wentNegative.type} ${money(-wentNegative.deltaCents)} (${wentNegative.note}) ` +
  `on ${wentNegative.at}, leaving ${money(wentNegative.balanceCents)}`,
);
console.log(`  balance the moment before: ${money(balanceAt(legacyLog, '2024-03-06T08:59:59Z'))}`);
for (const suspect of duplicateSuspects(legacyLog)) {
  console.log(
    `  duplicate suspect: events #${suspect.firstIndex} and #${suspect.repeatIndex} — ` +
    `${suspect.event.type} ${money(suspect.event.amountCents)} twice on ${suspect.key.slice(0, 10)}`,
  );
}
console.log(`  balance without the duplicate fee: ${money(
  balanceCents(legacyLog.filter((_, i) => i !== 5)),
)}`);

// Five questions, five one-liners, zero guesswork — because nothing
// was ever overwritten.
