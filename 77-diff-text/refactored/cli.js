import { diffLines, summarize } from './diff.js';
import { formatDiff, formatSummary, formatCompact } from './format.js';

const before = ["function greet(name) {", "  console.log('hi ' + name);", '}'].join('\n');
const after = ['// Say hello to somebody.', 'function greet(name) {', "  console.log('hi ' + name);", '}'].join('\n');

console.log('--- one comment line added at the top ---');
const added = diffLines(before, after);
console.log(formatDiff(added));
console.log(`  ^ ${formatSummary(added)} — the other three lines are untouched.`);

console.log('\n--- a line inserted into the middle of a list ---');
const listDiff = diffLines(['apple', 'banana', 'cherry'].join('\n'), ['apple', 'blueberry', 'banana'].join('\n'));
console.log(formatDiff(listDiff));
console.log(`  ^ ${formatSummary(listDiff)} — 'banana' is recognised as surviving.`);

console.log('\n--- identical files ---');
const none = diffLines('same\nlines', 'same\nlines');
console.log(formatDiff(none));
console.log(`  ^ ${formatSummary(none)}, and summarize().identical is ${summarize(none).identical}`);

console.log('\n--- the same operations, shown compactly (context: 1) ---');
const big = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`);
const edited = [...big];
edited[5] = 'line 6 (edited)';
const bigDiff = diffLines(big.join('\n'), edited.join('\n'));
console.log(formatCompact(bigDiff, { context: 1 }));
console.log(`  ^ ${formatSummary(bigDiff)} out of ${big.length} lines — one algorithm, three views.`);
