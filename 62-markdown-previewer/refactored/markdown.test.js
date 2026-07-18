import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownToHtml, renderInline, escapeHtml, isSafeUrl } from './markdown.js';

// ---------- security first: the reason this project exists ----------

test('XSS: user HTML is escaped, never executed', () => {
  const html = markdownToHtml(`<img src=x onerror="alert('xss')">`);
  assert.equal(html, `<p>&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;</p>`);
  assert.ok(!html.includes('<img')); // no live tag survives
});

test('XSS: javascript: links are refused (allowlist, not blocklist)', () => {
  const html = markdownToHtml('[click me](javascript:alert(1))');
  assert.ok(!html.includes('<a')); // left as literal text, not a live link
  assert.ok(isSafeUrl('https://example.com'));
  assert.ok(isSafeUrl('/relative/path'));
  assert.ok(isSafeUrl('#anchor'));
  assert.ok(!isSafeUrl('javascript:alert(1)'));
  assert.ok(!isSafeUrl('vbscript:x'));
  assert.ok(!isSafeUrl('data:text/html,<script>'));
});

test('escapeHtml covers the five metacharacters', () => {
  assert.equal(escapeHtml(`<a href="x" & 'y'>`), '&lt;a href=&quot;x&quot; &amp; &#39;y&#39;&gt;');
});

// ---------- blocks ---------------------------------------------------

test('headings only match at line start (block context)', () => {
  assert.equal(markdownToHtml('## Section'), '<h2>Section</h2>');
  // mid-paragraph hash is literal — the original converted it:
  assert.equal(markdownToHtml('price is # 1 today'), '<p>price is # 1 today</p>');
});

test('consecutive list lines form ONE list', () => {
  assert.equal(
    markdownToHtml('- one\n- two\n- three'),
    '<ul><li>one</li><li>two</li><li>three</li></ul>',
  );
});

test('paragraphs: blank lines separate, single newlines join', () => {
  assert.equal(
    markdownToHtml('line one\nline two\n\nnew para'),
    '<p>line one line two</p>\n<p>new para</p>',
  );
});

test('fenced code blocks are literal — no inline formatting, structure preserved', () => {
  const html = markdownToHtml('```\nconst x = a < b && c;\n# not a heading\n```');
  assert.equal(html,
    '<pre><code>const x = a &lt; b &amp;&amp; c;\n# not a heading</code></pre>');
});

// ---------- inline ----------------------------------------------------

test('code spans protect their contents from formatting', () => {
  assert.equal(renderInline('use `*args*` here'), 'use <code>*args*</code> here');
});

test('bold and italic nest sanely; a literal "0" survives placeholders', () => {
  assert.equal(renderInline('**bold** and *ital* and 0 and `x`'),
    '<strong>bold</strong> and <em>ital</em> and 0 and <code>x</code>');
});

test('safe links render with label and href', () => {
  assert.equal(renderInline('see [docs](https://example.com/a)'),
    'see <a href="https://example.com/a">docs</a>');
});

test('the kitchen sink document', () => {
  const doc = [
    '# Title',
    '',
    'Intro with **bold**, *italic*, `code`, and a [link](/home).',
    '',
    '- item one',
    '- item *two*',
    '',
    '```',
    'literal <b>block</b>',
    '```',
  ].join('\n');
  assert.equal(markdownToHtml(doc), [
    '<h1>Title</h1>',
    '<p>Intro with <strong>bold</strong>, <em>italic</em>, <code>code</code>, and a <a href="/home">link</a>.</p>',
    '<ul><li>item one</li><li>item <em>two</em></li></ul>',
    '<pre><code>literal &lt;b&gt;block&lt;/b&gt;</code></pre>',
  ].join('\n'));
});
