#!/usr/bin/env node
/**
 * Generates the PWA icons in public/icons/ from an inline SVG.
 *
 * No new dependencies: the SVG is written to disk and rendered to PNG with the
 * Playwright Chromium that is already installed for the browser test suite.
 *
 *   node scripts/make-icons.mjs
 *
 * Outputs:
 *   public/icons/icon.svg              source artwork (also linked as a scalable icon)
 *   public/icons/icon-192.png          any-purpose, 192x192
 *   public/icons/icon-512.png          any-purpose, 512x512
 *   public/icons/icon-maskable-512.png maskable, artwork inset into the 80% safe zone
 *   public/icons/apple-touch-icon.png  180x180, opaque background for iOS
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "icons");

const BG = "#07111f";
const CYAN = "#47e9d4";
const BLUE = "#5fa8ff";

/**
 * @param {object} options
 * @param {number} options.size    viewBox size (always 512, we scale on render)
 * @param {number} options.inset   padding around the rounded square, in viewBox units
 * @param {boolean} options.bleed  fill the whole canvas with --bg (maskable / apple)
 */
function svg({ inset = 26, bleed = false } = {}) {
  const s = 512;
  const box = s - inset * 2;
  const radius = Math.round(box * 0.22);
  const fontSize = Math.round(box * 0.42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${CYAN}"/>
      <stop offset="1" stop-color="${BLUE}"/>
    </linearGradient>
    <linearGradient id="plate" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#12304a"/>
      <stop offset="1" stop-color="${BG}"/>
    </linearGradient>
    <linearGradient id="ink" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${CYAN}"/>
      <stop offset="1" stop-color="${BLUE}"/>
    </linearGradient>
  </defs>
  ${bleed ? `<rect width="${s}" height="${s}" fill="${BG}"/>` : ""}
  <rect x="${inset}" y="${inset}" width="${box}" height="${box}" rx="${radius}" fill="url(#plate)"/>
  <rect x="${inset + 6}" y="${inset + 6}" width="${box - 12}" height="${box - 12}" rx="${radius - 6}"
        fill="none" stroke="url(#edge)" stroke-width="12" stroke-opacity="0.9"/>
  <text x="${s / 2}" y="${s / 2}" fill="url(#ink)" text-anchor="middle" dominant-baseline="central"
        font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif" font-weight="700"
        font-size="${fontSize}" letter-spacing="${Math.round(fontSize * 0.02)}">SF</text>
</svg>`;
}

async function render(browser, markup, size, file) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`,
    { waitUntil: "load" },
  );
  await page.screenshot({ path: file, omitBackground: true, type: "png" });
  await page.close();
  return file;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const source = svg();
  await writeFile(path.join(outDir, "icon.svg"), `${source}\n`, "utf8");

  const browser = await chromium.launch();
  try {
    const written = [];
    written.push(await render(browser, source, 192, path.join(outDir, "icon-192.png")));
    written.push(await render(browser, source, 512, path.join(outDir, "icon-512.png")));
    // Maskable: artwork inset to ~78% of the canvas so it survives any mask shape.
    written.push(
      await render(
        browser,
        svg({ inset: 58, bleed: true }),
        512,
        path.join(outDir, "icon-maskable-512.png"),
      ),
    );
    written.push(
      await render(
        browser,
        svg({ inset: 26, bleed: true }),
        180,
        path.join(outDir, "apple-touch-icon.png"),
      ),
    );
    for (const file of written) {
      console.log(`wrote ${path.relative(root, file)}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
