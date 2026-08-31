// WebSocket client with the lesson js#67 taught: connections DROP, and a
// real client plans for it — reconnect automatically, back off a little
// more on each failed attempt, and reset once we're healthy again.

const overlay = document.querySelector('#name-overlay');
const nameForm = document.querySelector('#name-form');
const nameInput = document.querySelector('#name-input');
const main = document.querySelector('main');
const messages = document.querySelector('#messages');
const statusEl = document.querySelector('#status');
const sendForm = document.querySelector('#send-form');
const textInput = document.querySelector('#text');

let ws = null;
let name = null;
let retryDelay = 1000;   // doubles on each failure, capped below

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`;
}

function connect() {
  setStatus('connecting…', 'connecting');
  ws = new WebSocket(`ws://${location.host}/ws?name=${encodeURIComponent(name)}`);

  ws.addEventListener('open', () => {
    retryDelay = 1000;        // healthy again — reset the backoff
    messages.innerHTML = '';  // server re-sends recent history on every connect
    setStatus('online', 'online');
    textInput.focus();
  });

  ws.addEventListener('message', (event) => {
    show(JSON.parse(event.data));
  });

  ws.addEventListener('close', () => {
    setStatus(`offline — retrying in ${retryDelay / 1000}s`, 'offline');
    setTimeout(connect, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 10000);   // exponential backoff, capped
  });
}

function show(message) {
  const div = document.createElement('div');
  const time = new Date(message.at).toLocaleTimeString();

  if (message.type === 'chat') {
    div.className = 'chat';
    const who = document.createElement('strong');
    who.textContent = message.user;          // textContent — never innerHTML —
    const what = document.createElement('span');
    what.textContent = message.text;         // because chat text is user input
    const when = document.createElement('time');
    when.textContent = time;
    div.append(who, what, when);
  } else {
    div.className = 'system';
    div.textContent =
      `${message.user} ${message.type === 'join' ? 'joined' : 'left'} · ${time}`;
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

nameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  name = nameInput.value.trim() || 'anon';
  overlay.remove();
  main.hidden = false;
  connect();
});

sendForm.addEventListener('submit', (event) => {
  event.preventDefault();
  // readyState check: sending on a closed socket throws (js#67's lesson).
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const text = textInput.value.trim();
  if (!text) return;
  ws.send(JSON.stringify({ text }));
  textInput.value = '';
});
