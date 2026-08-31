// A tiny real frontend: plain JS + fetch + DOM — the js-track skills
// (js#14's DOM work, js#65's fetch calls), now talking to a C# API.
//
// Everything renders through textContent, never innerHTML: the third seed
// quote literally contains "<blink>" and "&", and a user can type anything
// into the form — textContent shows those CHARACTERS instead of letting the
// browser execute them as markup. That one habit is the XSS vaccine.

const list = document.getElementById('quotes');
const randomBox = document.getElementById('random');
const errorBox = document.getElementById('error');

async function loadQuotes() {
  const res = await fetch('/api/quotes');
  const quotes = await res.json();
  list.replaceChildren();
  for (const q of quotes) {
    const li = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = `"${q.text}"`;
    const author = document.createElement('span');
    author.className = 'author';
    author.textContent = ` — ${q.author}`;
    li.append(text, author);
    list.append(li);
  }
}

document.getElementById('random-btn').addEventListener('click', async () => {
  const res = await fetch('/api/quotes/random');
  const q = await res.json();
  randomBox.hidden = false;
  randomBox.textContent = `"${q.text}" — ${q.author}`;
});

document.getElementById('add-form').addEventListener('submit', async (event) => {
  event.preventDefault();   // no full-page reload; we'll fetch instead
  const text = document.getElementById('text');
  const author = document.getElementById('author');

  const res = await fetch('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.value, author: author.value }),
  });

  if (res.ok) {
    errorBox.hidden = true;
    text.value = '';
    author.value = '';
    await loadQuotes();
  } else {
    const problem = await res.json();
    errorBox.hidden = false;
    errorBox.textContent = problem.error ?? `request failed (${res.status})`;
  }
});

loadQuotes();
