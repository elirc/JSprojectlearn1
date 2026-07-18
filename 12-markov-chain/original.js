// Markov chain sentence generator: learn which word follows which,
// then generate new "sentences" by walking those probabilities.

function makeSentence(text, howMany) {
  // build the chain AND generate, all in one function
  var words = text.split(" ");
  var chain = {};
  for (var i = 0; i < words.length - 1; i++) {
    if (chain[words[i]] == undefined) {
      chain[words[i]] = [];
    }
    chain[words[i]].push(words[i + 1]);
  }
  // now generate
  var word = words[0];
  var sentence = word;
  for (var j = 0; j < howMany; j++) {
    var followers = chain[word];
    if (followers == undefined) {
      break;
    }
    word = followers[Math.floor(Math.random() * followers.length)];
    sentence = sentence + " " + word;
  }
  return sentence;
}

var text = "the cat sat on the mat the cat ate the fish the dog sat on the log";
console.log(makeSentence(text, 10));
console.log(makeSentence(text, 10));

// Problems:
// - The chain is rebuilt from scratch on EVERY call. Generate 1000
//   sentences from a novel and you parse the novel 1000 times.
// - Always starts from the first word of the text. Every sentence
//   begins with "the".
// - split(" ") chokes on newlines and double spaces (empty words).
// - Untestable: randomness is baked in, two phases are welded together.
