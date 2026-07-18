// Parse a CSV export from a spreadsheet. Easy, right? Split on
// newlines, split on commas. Done in four lines!

function parseCsv(text) {
  var lines = text.split("\n");
  var rows = [];
  for (var i = 0; i < lines.length; i++) {
    rows.push(lines[i].split(","));
  }
  return rows;
}

var simple = "name,role\nada,engineer\ngrace,admiral";
console.log(parseCsv(simple));
// [['name','role'],['ada','engineer'],['grace','admiral']] — works!

// Now real spreadsheet exports arrive:

// 1. Quoted fields containing commas — the entire REASON quotes exist:
var quoted = 'name,motto\nada,"simple, but no simpler"';
console.log(parseCsv(quoted));
// [..., ['ada', '"simple', ' but no simpler"']] — the motto is in pieces.

// 2. Escaped quotes inside quoted fields ("" means one quote):
var nested = 'name,quote\ngrace,"she said ""later"""';
console.log(parseCsv(nested)); // shredded

// 3. Windows line endings (\r\n) — every Excel export ever:
var windows = "name,role\r\nada,engineer\r\n";
console.log(parseCsv(windows));
// [['name','role'],['ada','engineer\r'], ['']] — stowaway \r on every
// last field, plus a phantom empty row from the trailing newline.

// split() can't parse CSV because whether a comma SEPARATES fields
// depends on whether you're inside quotes — split has no memory.
