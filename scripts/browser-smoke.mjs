const endpoint = process.env.SKILLFORGE_CDP || "http://127.0.0.1:9222";

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function findPage() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const pages = await fetch(`${endpoint}/json`).then(response => response.json());
      const page = pages.find(item => item.type === "page" && item.url.includes("127.0.0.1:4173"));
      if (page) return page;
    } catch {
      // Chrome can take a moment to publish its DevTools endpoint.
    }
    await sleep(250);
  }
  throw new Error(`No SkillForge page found at ${endpoint}`);
}

const page = await findPage();
const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let messageId = 0;

socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  const id = ++messageId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  return result.result.value;
}

async function waitFor(expression, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if (await evaluate(expression)) return;
    } catch {
      // Navigation briefly destroys the JavaScript execution context.
    }
    await sleep(125);
  }
  const state = await evaluate(`({ title: document.title, ready: document.readyState, text: document.body.innerText.slice(0, 500) })`);
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(state)}`);
}

const setValueAndInput = (selector, value) => `(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!element) return false;
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter.call(element, ${JSON.stringify(value)});
  element.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`;

await command("Runtime.enable");
await command("Page.enable");
await evaluate("localStorage.clear(); true");
await command("Page.reload", { ignoreCache: true });
await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.onboarding-card'))", "initial render");

await evaluate(setValueAndInput(".onboarding-card input", "smoke_tester"));
await evaluate("document.querySelector('.onboarding-card .primary-button').click(); true");
await waitFor("document.body.innerText.includes('CURRENT DIRECTIVE')", "dashboard");

const dashboard = await evaluate(`({
  missions: document.querySelector('.catalog-count')?.textContent,
  worlds: document.querySelectorAll('.world-card').length,
  callsign: document.querySelector('.topbar strong')?.textContent
})`);

await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('Mission map')).click(); true`);
await waitFor("document.querySelectorAll('.mission-node').length > 1", "mission map");
const initialMap = await evaluate(`({
  available: document.querySelectorAll('.mission-node.available').length,
  locked: document.querySelectorAll('.mission-node.locked').length,
  disabledLocked: [...document.querySelectorAll('.mission-node.locked')].every(button => button.disabled)
})`);

await evaluate("document.querySelector('.mission-node.available').click(); true");
await waitFor("document.querySelectorAll('.challenge-card').length === 3", "mission gates");
const mission = await evaluate(`({
  title: document.querySelector('.mission-header h1')?.textContent,
  gates: document.querySelectorAll('.challenge-card').length,
  fieldManual: document.body.innerText.includes('FIELD MANUAL'),
  codeLab: Boolean(document.querySelector('.code-lab')),
  referencesGated: Boolean(document.querySelector('.reference-lock'))
})`);

await evaluate("document.querySelector('.code-lab-heading button').click(); true");
await waitFor("document.querySelector('.code-lab pre').innerText.startsWith('PASS')", "JavaScript lab result");
mission.labOutput = await evaluate("document.querySelector('.code-lab pre').innerText");
const missionShot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await import("node:fs/promises").then(fs => fs.writeFile("skillforge-mission.png", Buffer.from(missionShot.data, "base64")));
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileShot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await import("node:fs/promises").then(fs => fs.writeFile("skillforge-mobile.png", Buffer.from(mobileShot.data, "base64")));
await command("Emulation.clearDeviceMetricsOverride");

for (let gate = 0; gate < 3; gate += 1) {
  const answer = `Gate ${gate + 1}: I will explain the mechanism from memory, identify a concrete failure mode, state a falsifiable prediction, and record the exact command plus observed result. `.repeat(3);
  await evaluate(setValueAndInput(".challenge-card:not(.done) textarea", answer));
  await waitFor("!document.querySelector('.challenge-card:not(.done) .challenge-footer button').disabled", `gate ${gate + 1} readiness`);
  await evaluate("document.querySelector('.challenge-card:not(.done) .challenge-footer button').click(); true");
  await waitFor(`document.querySelectorAll('.challenge-card.done').length === ${gate + 1}`, `gate ${gate + 1} completion`);
}

const save = await evaluate(`(() => {
  const entry = Object.entries(localStorage).find(([, value]) => value.includes('smoke_tester'));
  if (!entry) return null;
  const progress = JSON.parse(entry[1]);
  return {
    key: entry[0],
    xp: progress.xp,
    completedMissions: progress.completedMissions.length,
    completedChallenges: progress.completedChallenges.length
  };
})()`);

await evaluate("document.querySelector('.back-button').click(); true");
await waitFor("document.querySelectorAll('.mission-node.available').length >= 1", "next mission unlock");
const afterClear = await evaluate(`({
  complete: document.querySelectorAll('.mission-node.complete').length,
  available: document.querySelectorAll('.mission-node.available').length
})`);

await command("Page.reload", { ignoreCache: true });
await waitFor("document.body.innerText.includes('smoke_tester') && document.body.innerText.includes('334 missions')", "persisted reload");
const persisted = await evaluate("!document.querySelector('.onboarding') && document.body.innerText.includes('smoke_tester')");

const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await import("node:fs/promises").then(fs => fs.writeFile("skillforge-final.png", Buffer.from(screenshot.data, "base64")));

const report = { dashboard, initialMap, mission, save, afterClear, persisted };
const passed = dashboard.missions === "334 missions"
  && dashboard.worlds === 10
  && dashboard.callsign === "smoke_tester"
  && initialMap.available === 1
  && initialMap.locked > 0
  && initialMap.disabledLocked
  && mission.gates === 3
  && mission.fieldManual
  && mission.codeLab
  && mission.labOutput.startsWith("PASS")
  && save?.completedMissions === 1
  && save?.completedChallenges === 3
  && afterClear.complete === 1
  && afterClear.available === 1
  && persisted;

socket.close();
console.log(JSON.stringify(report, null, 2));
if (!passed) process.exitCode = 1;
