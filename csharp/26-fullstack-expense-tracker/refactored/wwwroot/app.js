// One rule keeps the list and the summary panel honest: after ANY change,
// re-fetch BOTH from the server in one go and re-render everything.
// Neither panel ever does its own math from stale leftovers.
//
// (JSON numbers become JS floats on the way in. That's fine — this file
// only *displays* them. All the money math stays on the server, in decimal.)

const rows = document.querySelector('#rows');
const empty = document.querySelector('#empty');
const totalEl = document.querySelector('#total');
const biggestEl = document.querySelector('#biggest');
const byCategoryEl = document.querySelector('#by-category');
const categoriesDatalist = document.querySelector('#known-categories');
const errorEl = document.querySelector('#error');
const form = document.querySelector('#add-form');
const monthFilter = document.querySelector('#month-filter');

async function api(path, options) {
  const res = await fetch(path, options);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data;
}

function summaryUrl() {
  // <input type="month"> gives "2026-08" — split it into query params.
  if (!monthFilter.value) return '/api/summary';
  const [year, month] = monthFilter.value.split('-');
  return `/api/summary?year=${year}&month=${Number(month)}`;
}

async function refresh() {
  // Both panels from one round of fetches — they render the same truth.
  const [expenses, summary] = await Promise.all([
    api('/api/expenses'),
    api(summaryUrl()),
  ]);
  renderList(expenses);
  renderSummary(summary);
}

async function run(action) {
  try {
    errorEl.hidden = true;
    if (action) await action();
    await refresh();
    return true;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    return false;
  }
}

function money(n) {
  return n.toFixed(2);
}

function renderList(expenses) {
  rows.innerHTML = '';
  empty.hidden = expenses.length !== 0;
  const categories = new Set();

  // Newest first for reading; the server keeps insertion order.
  for (const e of [...expenses].reverse()) {
    categories.add(e.category);
    const tr = document.createElement('tr');
    for (const value of [e.date, e.description, e.category]) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    }
    const amount = document.createElement('td');
    amount.className = 'num';
    amount.textContent = money(e.amount);
    tr.appendChild(amount);

    const actions = document.createElement('td');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.textContent = '✕';
    del.setAttribute('aria-label', `Delete ${e.description}`);
    del.addEventListener('click', () =>
      run(() => api(`/api/expenses/${e.id}`, { method: 'DELETE' })));
    actions.appendChild(del);
    tr.appendChild(actions);
    rows.appendChild(tr);
  }

  // Offer previously used categories in the add form.
  categoriesDatalist.innerHTML = '';
  for (const c of [...categories].sort()) {
    const option = document.createElement('option');
    option.value = c;
    categoriesDatalist.appendChild(option);
  }
}

function renderSummary(summary) {
  totalEl.textContent = money(summary.total);
  biggestEl.textContent = summary.biggestCategory
    ? `Biggest category: ${summary.biggestCategory}`
    : 'Nothing in this period.';

  byCategoryEl.innerHTML = '';
  const max = summary.byCategory.length ? summary.byCategory[0].total : 0;
  for (const row of summary.byCategory) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${row.category} — ${money(row.total)}`;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.width = `${max ? (row.total / max) * 100 : 0}%`;
    li.append(label, bar);
    byCategoryEl.appendChild(li);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = {
    description: document.querySelector('#description').value,
    category: document.querySelector('#category').value,
    amount: Number(document.querySelector('#amount').value),
    date: document.querySelector('#date').value,
  };
  const ok = await run(() => api('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  if (ok) {
    form.reset();
    setToday();
    document.querySelector('#description').focus();
  }
});

monthFilter.addEventListener('change', () => run(null));
document.querySelector('#clear-filter').addEventListener('click', () => {
  monthFilter.value = '';
  run(null);
});

function setToday() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  document.querySelector('#date').value =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

setToday();
run(null);
