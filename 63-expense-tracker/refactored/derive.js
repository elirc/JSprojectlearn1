/**
 * The data layer of the expense tracker — every number the UI shows
 * is computed HERE, from one state shape, in cents.
 *
 *   parseAmount      "12.50" -> 1250 cents (or null: reject, don't NaN)
 *   deriveTotals     expenses -> { totalCents, byCategory }
 *   loadState        localStorage text -> valid state (versioned)
 *   formatCents      1250 -> "$12.50" (Intl does the work)
 *
 * Money is integer cents throughout (project 32): floats are for
 * measurements, not ledgers.
 */

export const SCHEMA_VERSION = 1;

/** User input -> cents. Returns null for anything not a positive amount. */
export function parseAmount(text) {
  const m = String(text).trim().match(/^\$?(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0'));
  return cents > 0 ? cents : null;
}

/**
 * ONE derivation for every displayed number. The total and the
 * category breakdown come from the same loop over the same data —
 * they CANNOT disagree (the original computed them separately and
 * they did).
 */
export function deriveTotals(expenses) {
  const byCategory = {};
  let totalCents = 0;
  for (const e of expenses) {
    totalCents += e.cents;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.cents;
  }
  return { totalCents, byCategory };
}

/** Chart-ready rows: sorted largest-first, with fractions for scaling. */
export function chartData(expenses) {
  const { totalCents, byCategory } = deriveTotals(expenses);
  return Object.entries(byCategory)
    .map(([category, cents]) => ({
      category,
      cents,
      fraction: totalCents === 0 ? 0 : cents / totalCents,
    }))
    .sort((a, b) => b.cents - a.cents);
}

/**
 * Persistence with a spine: a version field and per-record
 * validation. Unknown version or malformed records -> fresh state
 * (and the caller can warn), never a crash-on-load. This is the
 * contract the original skipped: STORED DATA IS INPUT (project 31 —
 * validate at the boundary).
 */
export function loadState(rawText) {
  if (!rawText) return { version: SCHEMA_VERSION, expenses: [] };
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { version: SCHEMA_VERSION, expenses: [] };
  }
  if (parsed?.version !== SCHEMA_VERSION || !Array.isArray(parsed.expenses)) {
    return { version: SCHEMA_VERSION, expenses: [] };
  }
  const valid = parsed.expenses.filter(
    (e) => typeof e?.description === 'string' &&
           Number.isInteger(e?.cents) && e.cents > 0 &&
           typeof e?.category === 'string',
  );
  return { version: SCHEMA_VERSION, expenses: valid };
}

export function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format(cents / 100);
}
