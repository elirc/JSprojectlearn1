// A sortable, filterable product list — with every "mode" typed as
// `string`. js#05 met this bug as data ("Hex" vs "hex"); here the
// type system could prevent it, and wasn't asked to.

export interface Product {
  name: string;
  price: number;
}

export function sortProducts(products: Product[], direction: string): Product[] {
  return [...products].sort((a, b) =>
    direction === 'asc' ? a.price - b.price : b.price - a.price,
  );
  // Anything that isn't exactly 'asc' — 'ASC', 'ascending', 'up',
  // a typo — silently means DESCENDING, because it falls into the
  // else. No error. Wrong order, quietly.
}

export function badge(status: string): string {
  if (status === 'in-stock') return '✅ in stock';
  if (status === 'low') return '⚠️ low stock';
  if (status === 'sold-out') return '❌ sold out';
  return '❓'; // the "shouldn't happen" bucket — where typos retire
}

const products: Product[] = [
  { name: 'Keyboard', price: 89 },
  { name: 'Mouse', price: 25 },
];

// All of these compile. Three are wrong.
export const a = sortProducts(products, 'asc');        // ok
export const b = sortProducts(products, 'ascending');  // silently DESC
export const c = sortProducts(products, 'ASC');        // silently DESC
export const d = badge('instock');                     // '❓' forever

// `string` says "any of the ~infinite strings" when the function
// means "one of these two". The gap between those is where the four
// call sites above live.
