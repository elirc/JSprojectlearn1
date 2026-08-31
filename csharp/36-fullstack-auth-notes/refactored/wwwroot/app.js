// The frontend never learns the session token, and never needs to.
//
// Login sets an HttpOnly cookie, which this file CANNOT read — that is the
// point of the flag. The browser attaches it to every same-origin request
// automatically, so there is no token to store, no token to forget, and
// nothing for a cross-site script to steal. Notice what is missing from this
// file: no localStorage, no Authorization header, no `?user=` on any URL.
//
// The rendering rule is js#14's, unchanged: after any change, re-fetch and
// re-render from the server's data. The server is the single source of truth
// about which notes you may see, and this file only mirrors it.

const errorEl = document.querySelector('#error');
const authSection = document.querySelector('#auth');
const appSection = document.querySelector('#app');
const whoEl = document.querySelector('#who');
const listEl = document.querySelector('#list');
const countEl = document.querySelector('#count');

const authForm = document.querySelector('#auth-form');
const usernameEl = document.querySelector('#username');
const passwordEl = document.querySelector('#password');
const registerBtn = document.querySelector('#register-btn');
const logoutBtn = document.querySelector('#logout-btn');
const addForm = document.querySelector('#add-form');
const newTextEl = document.querySelector('#new-text');

// One wrapper around fetch. It turns bad statuses into thrown Errors, and
// treats 401 as a fact about the app's state rather than an error to show.
async function api(path, options) {
  const res = await fetch(path, options);
  if (res.status === 401) return { unauthorized: true };
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // The server answers with { error } or { errors: [...] } — both get
    // flattened into one message here so callers never branch on the shape.
    const message = (data && (data.error || (data.errors && data.errors.join('. ')))) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
}

// Ask the server who we are, then show the matching half of the page.
async function refresh() {
  const me = await api('/api/me');
  if (me.unauthorized) {
    authSection.hidden = false;
    appSection.hidden = true;
    listEl.innerHTML = '';
    return;
  }

  whoEl.textContent = me.user;
  authSection.hidden = true;
  appSection.hidden = false;

  const notes = await api('/api/notes');
  if (notes.unauthorized) return refresh();   // the session expired mid-page
  render(notes);
}

// Run an action, clear the error box, re-fetch, re-render. One place for
// error handling means no action has to remember to do it.
async function run(action) {
  try {
    clearError();
    if (action) await action();
    await refresh();
    return true;
  } catch (err) {
    showError(err.message);
    return false;
  }
}

function render(notes) {
  listEl.innerHTML = '';

  if (notes.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No notes yet. Write your first one above.';
    listEl.appendChild(li);
  }

  for (const note of notes) {
    listEl.appendChild(noteRow(note));
  }

  countEl.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;
}

function noteRow(note) {
  const li = document.createElement('li');

  const span = document.createElement('span');
  span.textContent = note.text;    // textContent, never innerHTML: a note is data, not markup
  li.appendChild(span);

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'icon';
  edit.textContent = 'Edit';
  edit.setAttribute('aria-label', `Edit note ${note.id}`);
  edit.addEventListener('click', () => startEditing(li, note));
  li.appendChild(edit);

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'icon delete';
  del.textContent = 'Delete';
  del.setAttribute('aria-label', `Delete note ${note.id}`);
  del.addEventListener('click', () => run(() => api(`/api/notes/${note.id}`, { method: 'DELETE' })));
  li.appendChild(del);

  return li;
}

// Editing swaps the row for an input; Save PUTs, Cancel just re-renders.
function startEditing(li, note) {
  li.innerHTML = '';

  const input = document.createElement('input');
  input.value = note.text;
  input.setAttribute('aria-label', `Text of note ${note.id}`);
  li.appendChild(input);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'icon';
  save.textContent = 'Save';
  save.addEventListener('click', () =>
    run(() => api(`/api/notes/${note.id}`, json('PUT', { text: input.value }))));
  li.appendChild(save);

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'icon';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => run(null));
  li.appendChild(cancel);

  input.focus();
  input.select();
}

authForm.addEventListener('submit', (event) => {
  event.preventDefault();                     // no page reload (js#14)
  run(async () => {
    const res = await api('/api/login', json('POST', { username: usernameEl.value, password: passwordEl.value }));
    // A failed login is a 401, which `api` reports rather than throws — so
    // the message here is ours, and it is the same one for every reason.
    if (res && res.unauthorized) throw new Error('Wrong username or password.');
    passwordEl.value = '';
  });
});

registerBtn.addEventListener('click', () => {
  run(async () => {
    await api('/api/register', json('POST', { username: usernameEl.value, password: passwordEl.value }));
    // Registering does not log you in; do that explicitly, with the same code
    // path every other login uses.
    const res = await api('/api/login', json('POST', { username: usernameEl.value, password: passwordEl.value }));
    if (res && res.unauthorized) throw new Error('Registered, but the login failed. Try logging in.');
    passwordEl.value = '';
  });
});

logoutBtn.addEventListener('click', () =>
  run(() => api('/api/logout', { method: 'POST' })));

addForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const ok = await run(() => api('/api/notes', json('POST', { text: newTextEl.value })));
  if (ok) newTextEl.value = '';
  newTextEl.focus();
});

// First paint: ask the server whether this browser already has a session.
run(null);
