// The frontend never reloads the page. Every change is:
//   1. tell the server (fetch)
//   2. re-fetch the fresh list
//   3. re-render everything from that data (js#14's rule: state lives in data)
// Simple beats clever: no local mutation, no optimistic patching — the
// server's list is the single source of truth and we just mirror it.

const list = document.querySelector('#list');
const form = document.querySelector('#add-form');
const input = document.querySelector('#new-text');
const countsEl = document.querySelector('#counts');
const errorEl = document.querySelector('#error');

// One tiny wrapper around fetch: parses JSON, turns bad statuses into errors.
async function api(path, options) {
  const res = await fetch(path, options);
  if (res.status === 204) return null;               // DELETE says "no content"
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data;
}

function post(body) {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function put(body) {
  return { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// Run an action, then re-fetch and re-render. Errors land in one place.
async function run(action) {
  try {
    errorEl.hidden = true;
    if (action) await action();
    render(await api('/api/todos'));
    return true;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    return false;
  }
}

function render({ todos, counts }) {
  list.innerHTML = '';

  if (todos.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nothing to do. Add your first todo above.';
    list.appendChild(li);
  }

  for (const todo of todos) {
    const li = document.createElement('li');
    if (todo.done) li.classList.add('done');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.addEventListener('change', () =>
      run(() => api(`/api/todos/${todo.id}`, put({ done: checkbox.checked }))));

    const span = document.createElement('span');
    span.textContent = todo.text;   // textContent: user input never becomes HTML

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.textContent = '✕';
    del.setAttribute('aria-label', `Delete "${todo.text}"`);
    del.addEventListener('click', () =>
      run(() => api(`/api/todos/${todo.id}`, { method: 'DELETE' })));

    li.append(checkbox, span, del);
    list.appendChild(li);
  }

  countsEl.textContent = `${counts.total} total · ${counts.active} active · ${counts.done} done`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();   // the line the original never had: no page reload
  const ok = await run(() => api('/api/todos', post({ text: input.value })));
  if (ok) input.value = '';
  input.focus();
});

// First paint: fetch whatever the server already has.
run(null);
