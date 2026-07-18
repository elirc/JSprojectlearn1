/**
 * THE RULE: money is stored and computed as INTEGER CENTS.
 * 1035 cents, not 10.35 dollars. Integer arithmetic in JS is exact
 * up to Number.MAX_SAFE_INTEGER (~90 trillion dollars in cents), so
 * every add and multiply is exact. Floats appear ONLY at the display
 * edge, where Intl formats them.
 *
 * (This is how payment systems actually work — Stripe's API is
 * integer cents for exactly this reason.)
 */

/** "10.35" or 10.35 (dollars) -> 1035 (cents). Validates on the way in. */
export function toCents(dollars) {
  const value = Number(dollars);
  if (!Number.isFinite(value)) {
    throw new RangeError(`Not an amount: ${dollars}`);
  }
  // One rounding, at the boundary, to absorb float dust in the input.
  const cents = Math.round(value * 100);
  return cents;
}

/** 1035 -> "$10.35". Intl handles symbols, separators, and locales. */
export function formatCents(cents, { locale = 'en-US', currency = 'USD' } = {}) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency })
    .format(cents / 100);
}

/** Cart items: { name, priceCents, quantity }. Total in exact cents. */
export function cartTotalCents(items) {
  return items.reduce(
    (total, { priceCents, quantity }) => total + priceCents * quantity,
    0,
  );
}

/**
 * Percentage discount with an EXPLICIT rounding rule (half up, in the
 * customer's favor is a policy choice — write it down!).
 */
export function applyDiscountCents(cents, percent) {
  if (percent < 0 || percent > 100) {
    throw new RangeError(`Discount must be 0-100%, got ${percent}`);
  }
  return cents - Math.round((cents * percent) / 100);
}
