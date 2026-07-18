// `satisfies`: CHECK against a type without BECOMING that type.
// The value keeps its precise inferred shape; the compiler verifies
// it fits the contract. Checked AND precise — the third option.

interface Theme {
  primary: string;
  background: string;
  text: string;
}

export const theme = {
  primary: '#3366cc',
  background: '#ffffff',
  text: '#111111',
} satisfies Theme;
// - missing field?  -> compile error (see type tests)
// - typo'd extra?   -> compile error
// - and theme's TYPE is still the precise literal object, not Theme

export const textColor: string = theme.text; // actually there. checked.

// The routes table shows why keeping precision matters:
export const routes = {
  home: '/',
  about: '/about',
  admin: '/admin',
} satisfies Record<string, string>;
// checked: every value must be a string. BUT the type of `routes`
// keeps its literal keys — so key typos are now compile errors:

export const adminPath = routes.admin; // '/admin', autocompleted

// Where `as` is still LEGITIMATE (rare, and both are one-way-safe):
//   - any -> unknown  (removing capability, ts#13)
//   - const assertions: `as const` (ts#31 — a special form, not a lie)
// Treat every other `as` in a review as a question: "what check is
// this replacing?"

// ==== type tests ==================================================
// @ts-expect-error — satisfies catches the MISSING field `as` waved through
export const missing = { primary: '#36c', background: '#fff' } satisfies Theme;

// @ts-expect-error — satisfies catches the typo'd EXCESS field too
export const excess = { primary: '#36c', background: '#fff', text: '#111', primry: '#f00' } satisfies Theme;

// @ts-expect-error — key typos are errors now (the annotation version hid them)
export const oops = routes.amdin;

// @ts-expect-error — non-string values fail the Record contract
export const badRoutes = { home: 0 } satisfies Record<string, string>;
