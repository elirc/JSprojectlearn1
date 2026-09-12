import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          process.env.SKILLFORGE_BROWSER_REPORT || ".verification/browser.json",
      },
    ],
  ],
  workers: 1,
  retries: 0,
  // Tests that open a mission, save, reload and reopen spend most of their time
  // waiting on the Vite dev server; 30 s was flaky on a busy machine.
  timeout: 90000,
  use: {
    baseURL: "http://127.0.0.1:4287",
    viewport: { width: 1440, height: 1100 },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4287 --strictPort",
    url: "http://127.0.0.1:4287",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
