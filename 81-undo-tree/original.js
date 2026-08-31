// Undo/redo for a text editor — and this time we did it RIGHT.
// Project 39's bug was that redo could resurrect an abandoned timeline,
// so here the rule is enforced in one unmissable line: any new action
// after an undo throws the redo future away.
//
// It's correct. It's what almost every editor does. And it quietly
// destroys the user's work.

var past = [];
var present = "";
var future = [];

function apply(text) {
  past.push(present);
  present = text;
  future = []; // <- project 39's fix. Also: the theft.
}

function undo() {
  if (past.length === 0) return present;
  future.push(present);
  present = past.pop();
  return present;
}

function redo() {
  if (future.length === 0) return present;
  past.push(present);
  present = future.pop();
  return present;
}

// You're writing a tagline. Two honest attempts:
apply("Fast, safe, cheap");
apply("Fast, safe, cheap — pick two");
console.log(present);   // "Fast, safe, cheap — pick two"

// Hmm. Let's back up and try a different angle.
console.log(undo());    // "Fast, safe, cheap"
apply("Fast, safe, cheap. Yes, all three.");
console.log(present);   // "Fast, safe, cheap. Yes, all three."

// On reflection, the first version was better. Bring it back:
console.log(redo());    // "Fast, safe, cheap. Yes, all three."  <- ?!
console.log(future);    // []  — there is nothing to redo
console.log(past);      // [ '', 'Fast, safe, cheap' ]

// "pick two" is GONE. Not undone — gone. It isn't in past, it isn't in
// future, and no sequence of undo and redo will ever produce it again.
// It was deleted by `future = []` the moment you typed something new,
// silently, with no warning and no way back.
//
// Notice what the linear model assumes: that history is a LINE, so
// stepping back and going a different way means the old way was a
// mistake to be erased. But that's not how anyone actually works. You
// back up and try something else precisely BECAUSE you're not sure —
// which makes the thing you backed away from the most valuable thing
// to keep.
//
// past/present/future can only ever hold one line at a time. The real
// shape of "I tried this, then went back and tried that" is a TREE:
//
//              ""
//               |
//     "Fast, safe, cheap"
//        /            \
//   "...pick two"   "...Yes, all three."
//
// Both children exist. The user chose a path; they didn't burn the
// other one. Undo walks UP, redo walks DOWN — and nothing is deleted,
// because backing up was never a reason to throw anything away.
