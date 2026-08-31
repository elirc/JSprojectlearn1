// Same shape as every capstone frontend: fetch the truth, render the truth,
// send changes to the server, re-fetch. The board object below is a mirror
// of the server's board — never the master copy (js#64's lesson: the DOM is
// not the database, and neither is a stray client-side variable).

const boardEl = document.querySelector('#board');
const errorEl = document.querySelector('#error');

let board = { columns: [] };

async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // ProblemDetails from the server: { title: "column_not_found", detail: "..." }
    const message = data ? `${data.title}: ${data.detail}` : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function post(body) {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

async function run(action) {
  try {
    errorEl.hidden = true;
    if (action) await action();
    board = await api('/api/board');
    render();
    return true;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    return false;
  }
}

function render() {
  boardEl.innerHTML = '';
  board.columns.forEach((column, columnIndex) => {
    const section = document.createElement('section');
    section.className = 'column';

    const heading = document.createElement('h2');
    heading.textContent = `${column.name} (${column.cards.length})`;
    section.appendChild(heading);

    for (const card of column.cards) {
      section.appendChild(renderCard(card, columnIndex));
    }

    const form = document.createElement('form');
    form.className = 'add-card';
    const input = document.createElement('input');
    input.placeholder = 'New card…';
    input.setAttribute('aria-label', `New card in ${column.name}`);
    const button = document.createElement('button');
    button.textContent = 'Add';
    form.append(input, button);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const ok = await run(() =>
        api('/api/cards', post({ column: column.name, title: input.value })));
      if (!ok) input.focus();
    });
    section.appendChild(form);

    boardEl.appendChild(section);
  });
}

function renderCard(card, columnIndex) {
  const div = document.createElement('div');
  div.className = 'card';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = card.title;   // titles are user input: textContent, always

  const controls = document.createElement('div');
  controls.className = 'controls';
  const left = moveButton('◀', card, columnIndex - 1);
  const right = moveButton('▶', card, columnIndex + 1);
  left.disabled = columnIndex === 0;
  right.disabled = columnIndex === board.columns.length - 1;
  controls.append(left, right);

  div.append(title, controls);
  return div;
}

function moveButton(arrow, card, toIndex) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = arrow;
  button.setAttribute('aria-label', `Move "${card.title}" ${arrow === '◀' ? 'left' : 'right'}`);
  button.addEventListener('click', () => {
    const to = board.columns[toIndex];
    if (!to) return;
    // position = end of the target column; the server clamps anyway.
    run(() => api(`/api/cards/${card.id}/move`,
      post({ toColumn: to.name, position: to.cards.length })));
  });
  return button;
}

document.querySelector('#add-column-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = document.querySelector('#new-column');
  const ok = await run(() => api('/api/columns', post({ name: input.value })));
  if (ok) input.value = '';
});

run(null);
