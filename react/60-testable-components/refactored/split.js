/**
 * Every decision the expense splitter makes, as pure functions.
 *
 *   parseCents(text)                 "$10.50" -> 1050
 *   formatCents(cents)               1050     -> "$10.50"
 *   splitEvenly(totalCents, n)       a bill into n exact shares
 *   computeBalances(people, expenses) who is up, who is down
 *   settle(balances)                 the fewest transfers that fix it
 *
 * There is no React in this file, no DOM, and no `document`. That isn't
 * tidiness — it's what makes the awkward questions answerable: does a
 * three-way split of $10 lose a cent? Does the settlement always add up?
 * Both are one assertion here and an afternoon of clicking otherwise.
 *
 * MONEY IS INTEGER CENTS, EVERYWHERE (js#32). 0.1 + 0.2 is not 0.3, and
 * a splitter that adds fractions of a cent a hundred times a day will be
 * wrong by an amount someone eventually notices.
 */

/** "$10.50", "10.5", "10" -> 1050. Returns null for anything not money. */
export function parseCents(text) {
  const cleaned = String(text).trim().replace(/[$,\s]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return null; // 3 decimals isn't money
  const negative = cleaned.startsWith('-');
  const [whole, frac = ''] = cleaned.replace('-', '').split('.');
  const cents = Number(whole || '0') * 100 + Number((frac + '00').slice(0, 2));
  return negative ? -cents : cents;
}

/** 1050 -> "$10.50". Never does arithmetic; only prints. */
export function formatCents(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Split `totalCents` into `n` whole-cent shares that add up to EXACTLY
 * `totalCents`. The remainder is handed out one cent at a time from the
 * front, so $10 between three people is [334, 333, 333] — not three
 * shares of 333 and a cent that quietly evaporates.
 *
 * Somebody pays a cent more than somebody else. That is unavoidable:
 * cents are indivisible, and the only choice is whether the difference
 * lands on a person or vanishes from the books.
 */
export function splitEvenly(totalCents, n) {
  if (n <= 0) return [];
  const base = Math.trunc(totalCents / n);
  const remainder = totalCents - base * n; // signed: works for refunds too
  const step = remainder >= 0 ? 1 : -1;
  const extras = Math.abs(remainder);
  return Array.from({ length: n }, (_, i) => base + (i < extras ? step : 0));
}

/**
 * Net position per person, in cents. Positive = owed money, negative =
 * owes money. Because every expense credits the payer the full amount
 * and debits shares that sum to exactly that amount, THE BALANCES ALWAYS
 * SUM TO ZERO — an invariant worth testing, because when it breaks, it
 * breaks by one cent and nobody notices for a month.
 *
 * people:   [{ id, name }]
 * expenses: [{ id, description, paidBy, amountCents, participants: [id] }]
 */
export function computeBalances(people, expenses) {
  const balances = {};
  for (const person of people) balances[person.id] = 0;

  for (const expense of expenses) {
    if (!(expense.paidBy in balances)) continue; // paid by a ghost: ignore it
    const participants = expense.participants.filter((id) => id in balances);
    if (participants.length === 0) continue; // nobody to charge

    const shares = splitEvenly(expense.amountCents, participants.length);
    participants.forEach((id, i) => { balances[id] -= shares[i]; });
    balances[expense.paidBy] += expense.amountCents;
  }
  return balances;
}

/**
 * Turn balances into the fewest transfers that clear them: repeatedly
 * make the biggest debtor pay the biggest creditor. That greedy pass
 * needs at most `people - 1` transfers, which is what "minimal" means in
 * practice — nobody wants a mathematically optimal answer that asks them
 * to send four payments.
 *
 * Returns [{ from, to, cents }], deterministically ordered so the same
 * balances always produce the same instructions.
 */
export function settle(balances) {
  const owing = Object.entries(balances)
    .filter(([, cents]) => cents < 0)
    .map(([id, cents]) => ({ id, cents: -cents }))
    .sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id));
  const owed = Object.entries(balances)
    .filter(([, cents]) => cents > 0)
    .map(([id, cents]) => ({ id, cents }))
    .sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id));

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < owing.length && j < owed.length) {
    const amount = Math.min(owing[i].cents, owed[j].cents);
    if (amount > 0) transfers.push({ from: owing[i].id, to: owed[j].id, cents: amount });
    owing[i].cents -= amount;
    owed[j].cents -= amount;
    if (owing[i].cents === 0) i += 1;
    if (owed[j].cents === 0) j += 1;
  }
  return transfers;
}
