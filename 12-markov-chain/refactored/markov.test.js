import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChain, generateSentence } from './markov.js';

test('buildChain records which words follow which', () => {
  const chain = buildChain('the cat sat the cat ran');
  assert.deepEqual(chain.get('the'), ['cat', 'cat']);
  assert.deepEqual(chain.get('cat'), ['sat', 'ran']);
  assert.equal(chain.get('ran'), undefined); // last word follows nothing
});

test('messy whitespace does not create empty words', () => {
  const chain = buildChain('a  b\nc\t d');
  assert.deepEqual(chain.get('a'), ['b']);
  assert.deepEqual(chain.get('b'), ['c']);
});

test('generation is deterministic when the rng is fixed', () => {
  const chain = buildChain('a b a c');
  // rng always 0 -> always pick the first option.
  const sentence = generateSentence(chain, { start: 'a', maxWords: 3, rng: () => 0 });
  assert.equal(sentence, 'a b a');
});

test('every adjacent pair in the output existed in the source', () => {
  const source = 'the cat sat on the mat the dog ate the fish';
  const chain = buildChain(source);
  const sentence = generateSentence(chain, { maxWords: 15 });
  const words = sentence.split(' ');
  for (let i = 0; i < words.length - 1; i++) {
    assert.ok(
      chain.get(words[i]).includes(words[i + 1]),
      `"${words[i]} ${words[i + 1]}" never appeared in the source`,
    );
  }
});

test('a dead end stops the sentence instead of crashing', () => {
  const chain = buildChain('a b');
  assert.equal(generateSentence(chain, { start: 'b', maxWords: 10 }), 'b');
});

test('empty text produces empty output', () => {
  assert.equal(generateSentence(buildChain(''), { maxWords: 5 }), '');
});
