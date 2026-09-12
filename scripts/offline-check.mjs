#!/usr/bin/env node
/**
 * Offline / installability check for the production build.
 *
 *   node scripts/offline-check.mjs [--skip-build]
 *
 * It builds the app, serves `dist` with `vite preview` on port 4300 (4173 is left free for
 * the dev server), then drives Chromium through Playwright to assert:
 *
 *   1. /manifest.webmanifest is served with a manifest content type and parses.
 *   2. The declared icons are reachable.
 *   3. The service worker registers and takes control of the page.
 *   4. On a second visit with the network disabled (context.setOffline(true)) the app shell
 *      still loads and a mission JSON fetched on the first visit is still served.
 *
 * This is deliberately NOT part of the Playwright suite (tests/) — it needs a production
 * build and a service worker, which the dev server does not provide.
 */
import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4300;
const HOST = "127.0.0.1";
const BASE = `http://${HOST}:${PORT}`;
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function run(args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${label} exited with code ${code}`)),
    );
  });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

async function pickMissionFile() {
  const dir = path.join(root, "dist", "content", "missions");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) throw new Error(`No mission JSON found in ${dir}`);
  return `/content/missions/${files[0]}`;
}

async function main() {
  if (!process.argv.includes("--skip-build")) {
    console.log("› building (vite build)…");
    await run([viteBin, "build"], "vite build");
  }

  const missionPath = await pickMissionFile();
  console.log(`› serving dist on ${BASE} (mission probe: ${missionPath})`);
  const preview = spawn(
    process.execPath,
    [viteBin, "preview", "--host", HOST, "--port", String(PORT), "--strictPort"],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  preview.stdout.on("data", (d) => process.stdout.write(`  [preview] ${d}`));
  preview.stderr.on("data", (d) => process.stderr.write(`  [preview] ${d}`));

  let browser;
  try {
    await waitForServer(BASE);

    // 1 + 2: manifest and icons, straight off the wire.
    const manifestResponse = await fetch(`${BASE}/manifest.webmanifest`);
    const contentType = manifestResponse.headers.get("content-type") || "";
    check(
      "manifest served with a manifest content type",
      manifestResponse.ok && /manifest\+json/.test(contentType),
      `${manifestResponse.status} ${contentType || "no content-type"}`,
    );
    const manifest = await manifestResponse.json();
    check(
      "manifest fields (name, display, theme_color)",
      manifest.name === "SkillForge Quest" &&
        manifest.display === "standalone" &&
        manifest.theme_color === "#07111f",
      `${manifest.name} / ${manifest.display} / ${manifest.theme_color}`,
    );
    const iconStatuses = [];
    for (const icon of manifest.icons ?? []) {
      const res = await fetch(BASE + icon.src);
      iconStatuses.push(`${icon.src}:${res.status}`);
    }
    check(
      "manifest icons reachable",
      iconStatuses.every((s) => s.endsWith(":200")),
      iconStatuses.join(" "),
    );
    const swResponse = await fetch(`${BASE}/sw.js`);
    check(
      "sw.js served as javascript",
      swResponse.ok && /javascript/.test(swResponse.headers.get("content-type") || ""),
      `${swResponse.status} ${swResponse.headers.get("content-type")}`,
    );

    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // 3: first visit — register the SW and warm the content cache.
    await page.goto(BASE, { waitUntil: "load" });
    const registered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg && (reg.active || reg.installing || reg.waiting));
    });
    check("service worker registers", registered);

    await page.evaluate(
      async (mission) => {
        await fetch("/content/catalog.json").then((r) => r.json());
        await fetch(mission).then((r) => r.json());
      },
      missionPath,
    );

    // Reload so the page is controlled by the worker and the shell/assets are cached.
    await page.reload({ waitUntil: "load" });
    const controlled = await page.evaluate(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    check("page is controlled by the service worker", controlled);

    const cacheReport = await page.evaluate(async () => {
      const names = await caches.keys();
      const counts = {};
      for (const name of names) {
        const cache = await caches.open(name);
        counts[name] = (await cache.keys()).length;
      }
      return counts;
    });
    check(
      "versioned caches populated",
      Object.keys(cacheReport).some((n) => n.startsWith("sfq-content-")) &&
        Object.keys(cacheReport).some((n) => n.startsWith("sfq-shell-")),
      JSON.stringify(cacheReport),
    );

    // 4: second visit, offline.
    await context.setOffline(true);
    let shellLoaded = true;
    try {
      await page.goto(BASE, { waitUntil: "load" });
    } catch (error) {
      shellLoaded = false;
      check("offline navigation serves the cached app shell", false, String(error));
    }
    if (shellLoaded) {
      const rootFilled = await page
        .waitForFunction(
          () => (document.getElementById("root")?.childElementCount ?? 0) > 0,
          undefined,
          { timeout: 10_000 },
        )
        .then(
          () => true,
          () => false,
        );
      check("offline navigation serves the cached app shell", rootFilled);
    }

    const offlineMission = await page.evaluate(async (mission) => {
      try {
        const res = await fetch(mission);
        if (!res.ok) return { ok: false, status: res.status };
        const json = await res.json();
        return { ok: true, id: json.id ?? json.slug ?? "(no id field)" };
      } catch (error) {
        return { ok: false, status: String(error) };
      }
    }, missionPath);
    check(
      "mission JSON still loads while offline",
      offlineMission.ok === true,
      offlineMission.ok ? `${missionPath} → ${offlineMission.id}` : String(offlineMission.status),
    );

    const offlineCatalog = await page.evaluate(async () => {
      try {
        const res = await fetch("/content/catalog.json");
        return res.ok;
      } catch {
        return false;
      }
    });
    check("catalog.json still loads while offline", offlineCatalog === true);

    await context.setOffline(false);
  } finally {
    if (browser) await browser.close().catch(() => {});
    preview.kill();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed — ${failed.length ? "FAIL" : "PASS"}`,
  );
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
