// A fluent query builder. Every method returns `this`, so the chain
// reads beautifully — and every method is available at every moment,
// including the ones that make no sense yet.

export class QueryBuilder {
  private table: string | null = null;
  private columns: string[] = [];
  private conditions: string[] = [];
  private limitCount: number | null = null;

  from(table: string): this {
    this.table = table;
    return this;
  }

  select(...columns: string[]): this {
    this.columns.push(...columns);
    return this;
  }

  where(condition: string): this {
    this.conditions.push(condition);
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  build(): string {
    if (this.table === null) {
      throw new Error('build(): no table — did you forget .from()?');
    }
    const where = this.conditions.length > 0 ? ` WHERE ${this.conditions.join(' AND ')}` : '';
    const limit = this.limitCount === null ? '' : ` LIMIT ${this.limitCount}`;
    return `SELECT ${this.columns.join(', ')} FROM ${this.table}${where}${limit}`;
  }
}

export function goodCase(): string {
  return new QueryBuilder().from('users').select('id', 'name').where('active = 1').build();
  // 'SELECT id, name FROM users WHERE active = 1'
}

export function buildWithNoTable(): string {
  return new QueryBuilder().where('active = 1').limit(10).build();
  // Compiles perfectly. Throws at runtime: no table. The whole chain
  // was type-checked and every single call was "valid".
}

export function buildWithNoColumns(): string {
  return new QueryBuilder().from('users').build();
  // Compiles, and DOESN'T throw — which is worse. It returns
  // 'SELECT  FROM users': syntactically broken SQL that travels one
  // more layer before the database rejects it, at 3am, in a stack
  // trace that names the driver instead of this line.
}

export function contradictions(): string {
  return new QueryBuilder()
    .from('users')
    .from('orders') // second .from() silently wins; 'users' is gone
    .select('id')
    .limit(10)
    .limit(1) // so does the second .limit()
    .build();
}

// The type of the builder is IDENTICAL at every step of the chain —
// `this`, all the way down. So the compiler offers `.build()` to a
// brand-new builder with the same confidence it offers it to a fully
// configured one, and the knowledge that actually matters ("a table
// has been set", "columns have been chosen") lives only in three
// runtime fields it never looks at.
