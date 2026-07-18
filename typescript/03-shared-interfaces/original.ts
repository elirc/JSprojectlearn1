// A user shape, described inline... in four places, three of which
// agree. Compiles fine — TypeScript checks each function against its
// OWN inline type, and nobody checks the types against each other.

export function greet(user: { name: string; email: string }): string {
  return `Hi ${user.name} <${user.email}>`;
}

export function initials(user: { name: string; email: string }): string {
  return user.name.split(' ').map((w) => w[0]).join('');
}

// This one drifted: someone added `plan` here (and only here)...
export function canExport(user: { name: string; email: string; plan: string }): boolean {
  return user.plan === 'pro';
}

// ...and this one misspelled a field, creating a fourth, incompatible
// inline shape. It compiles — it's just a different type:
export function mailtoLink(user: { name: string; emial: string }): string {
  return `mailto:${user.emial}`;
}

// Now watch the call sites fight it out:
const ada = { name: 'Ada Lovelace', email: 'ada@engine.dev' };

greet(ada);        // ok
initials(ada);     // ok
// canExport(ada); // error here (good!)... so the caller "fixes" it:
export const canAdaExport = canExport({ ...ada, plan: 'pro' });
// ...by inventing data at the call site. And mailtoLink?
// mailtoLink(ada) errors ("emial is missing") — the TYPO surfaces as
// an error about the CALLER's object, pointing everyone away from
// the real bug in the signature. Four inline shapes, one concept,
// zero agreement. Renaming `email` means finding every inline copy
// by hand.
export const link = mailtoLink({ name: ada.name, emial: ada.email });
