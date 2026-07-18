import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseJson, tokenize, JsonError } from './json.js';

test('scalars', () => {
  assert.equal(parseJson('42'), 42);
  assert.equal(parseJson('-3.25'), -3.25);
  assert.equal(parseJson('6.02e23'), 6.02e23);
  assert.equal(parseJson('"hi"'), 'hi');
  assert.equal(parseJson('true'), true);
  assert.equal(parseJson('false'), false);
  assert.equal(parseJson('null'), null);
});

test('string escapes, including \\u', () => {
  assert.equal(parseJson('"line\\nbreak"'), 'line\nbreak');
  assert.equal(parseJson('"quote \\" backslash \\\\ slash \\/"'), 'quote " backslash \\ slash /');
  assert.equal(parseJson('"\\u0041\\u00e9"'), 'Aé');
});

test('nested structures', () => {
  assert.deepEqual(
    parseJson('{"users": [{"name": "ada", "tags": ["math", "code"]}], "count": 1}'),
    { users: [{ name: 'ada', tags: ['math', 'code'] }], count: 1 },
  );
  assert.deepEqual(parseJson('[[[[]]]]'), [[[[]]]]);
  assert.deepEqual(parseJson('{}'), {});
  assert.deepEqual(parseJson('[]'), []);
});

test('AGREES WITH JSON.parse on a gnarly document (round-trip property)', () => {
  const doc = JSON.stringify({
    a: [1, -2.5, 1e-3, 'x"y\\z', null, true, { deep: { deeper: [{}, []] } }],
    'weird key ": ,': 'ok', unicode: 'héllo ☃',
  });
  assert.deepEqual(parseJson(doc), JSON.parse(doc));
});

test('THE SECURITY PROOF: code in strings stays a string', () => {
  let pwned = false;
  globalThis.__pwn = () => { pwned = true; };
  try {
    const result = parseJson('{"x": "__pwn(), 42"}'); // data, not code
    assert.equal(result.x, '__pwn(), 42');
    // ...and the original's payload SHAPE is simply a syntax error:
    assert.throws(() => parseJson('{"x": (__pwn(), 42)}'), JsonError);
    assert.equal(pwned, false);
  } finally {
    delete globalThis.__pwn;
  }
});

test('strict: the not-quite-JSON the original accepted is rejected', () => {
  for (const bad of [
    "{'single': 'quotes'}",
    '{"trailing": 1,}',
    '[1, 2,]',
    '{unquoted: 1}',
    '{"a": undefined}',
    '{"a": 0x10}',
    '{"a": 1} // comment',
    '"tab\tliteral"', // raw control char in string
    '01', // leading zero
  ]) {
    assert.throws(() => parseJson(bad), JsonError, `should reject: ${bad}`);
  }
});

test('errors carry line and column and say what was expected', () => {
  try {
    parseJson('{\n  "name": "config",\n  "port": \n}');
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof JsonError);
    assert.equal(err.line, 4); // the } where a value should be
    assert.match(err.message, /Expected a value/);
    assert.match(err.message, /line 4/);
  }
});

test('trailing junk after a complete value is an error', () => {
  // junk the tokenizer can read -> the PARSER must still refuse it
  assert.throws(() => parseJson('{"a": 1} {"b": 2}'), /Expected end of input/);
  // junk the tokenizer can't read fails even earlier
  assert.throws(() => parseJson('{"a": 1} whoops'), /Unexpected character "w"/);
});

test('tokenize positions are byte-accurate', () => {
  const tokens = tokenize('{ "a": 12 }');
  assert.deepEqual(
    tokens.map((t) => [t.type, t.pos]),
    [['lbrace', 0], ['string', 2], ['colon', 5], ['number', 7], ['rbrace', 10], ['eof', 11]],
  );
});
