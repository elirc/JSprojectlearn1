// Order statuses as an enum — the feature TypeScript regrets.
// (Everything here compiles; each surprise is a comment.)

export enum OrderStatus {
  Pending,    // = 0
  Paid,       // = 1
  Shipped,    // = 2
  Delivered,  // = 3
}

export function isActionRequired(status: OrderStatus): boolean {
  // Surprise 1: numeric enums are just numbers, and numbers LIE.
  // Pending is 0, and 0 is falsy:
  if (!status) {
    // "no status"? No — this branch runs for PENDING orders.
    return true;
  }
  return status === OrderStatus.Paid;
}

// Surprise 2 (the compat one): any number can BE a numeric enum via
// assertion, and out-of-range checks don't exist:
export const mystery: OrderStatus = 99 as OrderStatus; // compiles!

// Surprise 3: enums are one of the few TS features that EMIT CODE.
// This file's enum compiles to a runtime double-mapping object
// ({0: 'Pending', Pending: 0, ...}) — which also means plain
// type-stripping runtimes (Node --experimental-strip-types, some
// bundlers) reject or mishandle enum syntax. Types are supposed to
// erase; enums don't.

// Surprise 4: serialization. An API sending {"status": 2} is
// unreadable in logs, and REORDERING the enum members renumbers
// every stored value. Adding 'Cancelled' anywhere but the end is a
// data migration.

export function describe(status: OrderStatus): string {
  return `status code ${status}`; // "status code 2" — meaning what?
}

export const report = describe(OrderStatus.Shipped);
