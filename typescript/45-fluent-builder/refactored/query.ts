// Same fluent chain, but the builder's TYPE changes as you build.
// Each required step adds a flag; `.build()` only exists once every
// flag is present. The half-built query stops being expressible.

// The steps we track. (Optional steps like .where() aren't here —
// they don't gate anything.)
export type Part = 'table' | 'columns';

export class Query<Have extends Part = never> {
  // The phantom marker — ts#29's trick, pointed at PROGRESS instead
  // of units. `declare` means "type-only": never assigned, never
  // read, gone at runtime. Its whole job is to make Query<'table'>
  // and Query<'table' | 'columns'> structurally DIFFERENT, because
  // `{ table: true }` is missing a property `{ table: true;
  // columns: true }` requires. Delete this line and every type test
  // below goes green-but-meaningless: with `Have` unused, the
  // compiler has nothing to compare.
  declare private readonly have: Record<Have, true>;

  private table = '';
  private columns: string[] = [];
  private conditions: string[] = [];
  private limitCount: number | null = null;

  // Required steps ADD their flag to the set:
  from(table: string): Query<Have | 'table'> {
    this.table = table;
    return this as Query<Have | 'table'>;
  }

  select(...columns: string[]): Query<Have | 'columns'> {
    this.columns.push(...columns);
    return this as Query<Have | 'columns'>;
  }

  // Optional steps PRESERVE the set — `Have` in, `Have` out:
  where(condition: string): Query<Have> {
    this.conditions.push(condition);
    return this;
  }

  limit(count: number): Query<Have> {
    this.limitCount = count;
    return this;
  }

  // The gate. A `this` parameter is not a runtime argument — it's a
  // requirement on the RECEIVER, checked at every call site. Only a
  // Query that has both flags is assignable to it, so `.build()`
  // simply isn't offered before then.
  build(this: Query<'table' | 'columns'>): string {
    const where = this.conditions.length > 0 ? ` WHERE ${this.conditions.join(' AND ')}` : '';
    const limit = this.limitCount === null ? '' : ` LIMIT ${this.limitCount}`;
    return `SELECT ${this.columns.join(', ')} FROM ${this.table}${where}${limit}`;
    // Note what's GONE: the `if (this.table === null) throw` guard.
    // The impossible state is unrepresentable, so the runtime check
    // has nothing left to check (ts#30).
  }
}

export function query(): Query {
  return new Query(); // Query<never> — nothing set yet
}

// ==== usage: the good chain, unchanged ============================
export const listing = query().from('users').select('id', 'name').where('active = 1').build();

// Order is free — flags accumulate as a union, and unions don't care:
export const reversed = query().select('id').limit(10).from('users').build();

// Partial builders are still first-class values; they just can't
// finish. Passing one around is fine, and its type says how far
// along it is:
export const halfBuilt: Query<'table'> = query().from('users');
export const finished = halfBuilt.select('id').build();

// ==== type tests: the original's three bugs, uncompilable =========
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type _StateCases = [
  // the chain's type really does advance:
  Expect<Equal<ReturnType<Query<never>['from']>, Query<'table'>>>,
  // optional steps leave it exactly where it was:
  Expect<Equal<ReturnType<Query<'table'>['where']>, Query<'table'>>>,
  // and re-adding a flag is a no-op ('table' | 'table' is 'table'):
  Expect<Equal<ReturnType<Query<'table'>['from']>, Query<'table'>>>,
];

// @ts-expect-error — the runtime crash: .build() with no table
query().where('active = 1').limit(10).build();

// @ts-expect-error — the silent 'SELECT  FROM users': .build() with no columns
query().from('users').build();

// @ts-expect-error — a fresh builder can't build anything at all
query().build();

// @ts-expect-error — and a half-built one carries its gap in its type
halfBuilt.build();
