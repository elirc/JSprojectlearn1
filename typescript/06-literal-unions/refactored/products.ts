// Literal unions: the type now says EXACTLY which strings are legal.
// Typos, cases, and synonyms became compile errors — see the type
// tests. (js#05 fixed this bug with function names; types fix it
// while keeping the parameter.)

export interface Product {
  name: string;
  price: number;
}

export type SortDirection = 'asc' | 'desc';
export type StockStatus = 'in-stock' | 'low' | 'sold-out';

export function sortProducts(
  products: Product[],
  direction: SortDirection,
): Product[] {
  return [...products].sort((a, b) =>
    direction === 'asc' ? a.price - b.price : b.price - a.price,
  );
  // the else branch is now PROVABLY 'desc' — nothing else can arrive
}

const BADGES: Record<StockStatus, string> = {
  'in-stock': '✅ in stock',
  low: '⚠️ low stock',
  'sold-out': '❌ sold out',
  // Record<StockStatus, string> means: add a status to the union and
  // this table won't compile until it has a badge. Table and union
  // can't drift (js#10's operator table, compiler-audited).
};

export function badge(status: StockStatus): string {
  return BADGES[status]; // no ❓ bucket — unrepresentable inputs need no bucket
}

const products: Product[] = [
  { name: 'Keyboard', price: 89 },
  { name: 'Mouse', price: 25 },
];

export const sorted = sortProducts(products, 'asc');
export const lowBadge = badge('low');

// Bonus: literal unions make editors great — type sortProducts(products, '
// and autocomplete offers exactly 'asc' | 'desc'.

// ==== type tests: the original's silent bugs, now loud ============
// @ts-expect-error — 'ascending' is not a SortDirection
sortProducts(products, 'ascending');

// @ts-expect-error — case matters: 'ASC' is not 'asc'
sortProducts(products, 'ASC');

// @ts-expect-error — 'instock' (typo) is not a StockStatus
badge('instock');

// @ts-expect-error — the badge table must cover every status
export const incomplete: Record<StockStatus, string> = { low: '⚠️' };
