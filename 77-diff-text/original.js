// Show what changed between two versions of a file, line by line.
// Attempt: compare line 1 to line 1, line 2 to line 2, and so on.

var before = [
  "function greet(name) {",
  "  console.log('hi ' + name);",
  "}",
].join("\n");

var after = [
  "// Say hello to somebody.",
  "function greet(name) {",
  "  console.log('hi ' + name);",
  "}",
].join("\n");

function diff(a, b) {
  var oldLines = a.split("\n");
  var newLines = b.split("\n");

  if (oldLines.length !== newLines.length) {
    // Different number of lines? Give up and call everything changed.
    for (var i = 0; i < oldLines.length; i++) {
      console.log("- " + oldLines[i]);
    }
    for (var j = 0; j < newLines.length; j++) {
      console.log("+" + newLines[j]); // note: no space. The 4 prefixes
    } //                                 were pasted 4 times and drifted.
    return;
  }

  for (var k = 0; k < oldLines.length; k++) {
    if (oldLines[k] === newLines[k]) {
      console.log("  " + oldLines[k]);
    } else {
      console.log("- " + oldLines[k]);
      console.log("+ " + newLines[k]);
    }
  }
}

console.log("--- one comment line added at the top ---");
diff(before, after);
console.log("  ^ every single line reported as changed. One line was added.");

console.log("--- even with matching line counts, it can only compare by position ---");
var listA = ["apple", "banana", "cherry"].join("\n");
var listB = ["apple", "blueberry", "banana"].join("\n");
diff(listA, listB);
console.log("  ^ 'banana' survived — it just moved down one. Reported as two changes.");

console.log("--- and it cannot say 'nothing changed' ---");
diff("same\nlines", "same\nlines");
console.log("  ^ correct, but only because the shape happened to line up.");

// Three diseases:
//   1. Naive algorithm: position-by-position comparison. Inserting ONE
//      line at the top shifts every later line, so a diff that compares
//      by index reports 100% churn on a 1-line change. The whole point
//      of a diff — "show me the small thing that changed" — is lost.
//   2. Duplication: "- " / "+ " / "  " prefixes written out four times,
//      and one copy already lost its space ("+" instead of "+ ").
//   3. Logic welded to I/O: the comparison prints as it goes, so nothing
//      can count the changes, build a patch file, colourise the output,
//      render it in a code review UI, or be tested at all. diff()
//      returns undefined.
