import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, escapeHtml, lookup } from './template.js';

test('every occurrence is replaced (the original stopped at one)', () => {
  assert.equal(
    render('Hi {{name}}! Bye {{name}}!', { name: 'Ada' }),
    'Hi Ada! Bye Ada!',
  );
});

test('nested paths', () => {
  assert.equal(
    render('{{user.name}} ({{user.org.city}})',
      { user: { name: 'Ada', org: { city: 'London' } } }),
    'Ada (London)',
  );
});

test('missing values render as empty, not "undefined"', () => {
  assert.equal(render('Hi {{nope}}!', {}), 'Hi !');
  assert.equal(render('Hi {{a.b.c}}!', { a: {} }), 'Hi !'); // ?. saves the chain
});

test('THE BIG ONE: user data cannot inject HTML', () => {
  const hostile = { name: '<img src=x onerror="alert(1)">' };
  const html = render('<p>Hi {{name}}!</p>', hostile);
  assert.ok(!html.includes('<img'));
  assert.equal(
    html,
    '<p>Hi &lt;img src=x onerror=&quot;alert(1)&quot;&gt;!</p>',
  );
});

test('triple braces opt in to raw HTML for trusted content', () => {
  assert.equal(
    render('<div>{{{widget}}}</div>', { widget: '<b>bold</b>' }),
    '<div><b>bold</b></div>',
  );
});

test('$ in data has no magic meaning (replace-callback, not replace-string)', () => {
  assert.equal(render('{{amount}}', { amount: '$& deal' }), '$&amp; deal');
});

test('whitespace inside braces is tolerated', () => {
  assert.equal(render('{{  name  }}', { name: 'Ada' }), 'Ada');
});

test('escapeHtml escapes & first (no double-escaping)', () => {
  assert.equal(escapeHtml('<a & b>'), '&lt;a &amp; b&gt;');
});

test('lookup is useful on its own', () => {
  assert.equal(lookup({ a: { b: 7 } }, 'a.b'), 7);
  assert.equal(lookup({ a: {} }, 'a.b.c'), undefined);
});
