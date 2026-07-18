// Undo/redo for a tiny text editor: keep versions in an array with a
// pointer. How hard can it be? (Famous last words.)

var versions = [""];
var pointer = 0;

function type(text) {
  versions.push(versions[pointer] + text);
  pointer = versions.length - 1; // jump to the end... always?
}

function undo() {
  if (pointer > 0) pointer--;
  return versions[pointer];
}

function redo() {
  if (pointer < versions.length - 1) pointer++;
  return versions[pointer];
}

type("Hello");
type(" world");
console.log(versions[pointer]); // "Hello world"
console.log(undo());            // "Hello"        - good
console.log(redo());            // "Hello world"  - good

// Now the sequence every user does within 10 seconds:
console.log(undo());            // "Hello"
type("!!!");                    // typed something new after undoing
console.log(versions[pointer]); // "Hello!!!"     - looks right...
console.log(undo());            // "Hello"        - ok...
console.log(redo());            // "Hello!!!"     - ok...
console.log(redo());            // "Hello world"?!
// After undoing and typing something NEW, the old future ("Hello
// world") should be GONE — you chose a new timeline. But type()
// never discarded it, so redo resurrects a version from the
// abandoned branch. Users lose trust in undo instantly when this
// happens. The array-with-pointer isn't wrong, but its INVARIANT
// ("everything after pointer is redoable future") was never enforced.
