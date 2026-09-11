import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const key = "skillforge.quest.progress.v1";
const initial = {
  version: 1,
  revision: 1,
  epoch: "test-epoch",
  notes: [],
  callsign: "learner",
  sessionMinutes: 45,
  onboarded: true,
  xp: 0,
  completedMissions: [],
  completedChallenges: [],
  responses: {},
  reviews: {},
  activityDates: [],
};
async function seed(page: Page, value: unknown = initial) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(
          key,
          typeof value === "string" ? value : JSON.stringify(value),
        );
        sessionStorage.setItem("seeded", "yes");
      }
    },
    { key, value },
  );
  await page.goto("/");
}
async function saved(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
}
async function profile(page: Page) {
  await page.getByRole("button", { name: "Loadout & saves" }).click();
  await expect(
    page.getByRole("heading", { name: "Learning notes", exact: true }),
  ).toBeVisible();
}
async function note(page: Page, title = "SQL transaction") {
  await page.getByRole("button", { name: "New learning note" }).click();
  await page.getByLabel("Note title", { exact: true }).fill(title);
  await page
    .getByLabel("Note body", { exact: true })
    .fill(
      "Update the worker and its audit row in one transaction. If the audit insert fails, roll back both changes.",
    );
}
async function mission(page: Page) {
  await page
    .getByRole("button", { name: "Mission map", exact: false })
    .first()
    .click();
  await page.locator(".mission-node.available").first().click();
  await expect(page.getByLabel("JavaScript scratch lab")).toBeVisible();
}
test("onboarding persists only after submit and survives reload", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), key),
  ).toBeNull();
  await page.getByLabel("Callsign").fill("crud_learner");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), key),
  ).toBeNull();
  await page.getByRole("button", { name: "Enter the frontier" }).click();
  await expect(
    page.getByText("Saved revision 1", { exact: true }),
  ).toBeVisible();
  await page.reload();
  expect((await saved(page)).callsign).toBe("crud_learner");
});
test("note CRUD retains identity, search, reload and confirmed deletion", async ({
  page,
}) => {
  await seed(page);
  await profile(page);
  await note(page);
  await page
    .getByRole("button", { name: "Save learning note", exact: true })
    .click();
  await expect(page.locator(".note-card")).toHaveCount(1);
  const id = (await saved(page)).notes[0].id;
  await page.getByRole("button", { name: "Edit SQL transaction" }).click();
  await page.getByLabel("Note title", { exact: true }).fill("Atomic audit");
  await page
    .getByRole("button", { name: "Save learning note", exact: true })
    .click();
  await expect(page.locator(".note-card h3")).toHaveText("Atomic audit");
  expect((await saved(page)).notes[0].id).toBe(id);
  await page.reload();
  await profile(page);
  await page.getByLabel("Search learning notes").fill("nomatch");
  await expect(page.locator(".note-card")).toHaveCount(0);
  await page.getByLabel("Search learning notes").fill("audit");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Delete Atomic audit" }).click();
  await expect(page.locator(".note-card")).toHaveCount(1);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete Atomic audit" }).click();
  await expect(page.locator(".note-card")).toHaveCount(0);
  expect((await saved(page)).notes).toEqual([]);
});
test("competing tabs keep the losing draft and export it before reload", async ({
  page,
  context,
}) => {
  await seed(page);
  await profile(page);
  const other = await context.newPage();
  await other.goto("/");
  await profile(other);
  await note(other, "Losing draft");
  await note(page, "Winning note");
  await page
    .getByRole("button", { name: "Save learning note", exact: true })
    .click();
  await expect(page.locator(".note-card")).toHaveCount(1);
  await other
    .getByRole("button", { name: "Save learning note", exact: true })
    .click();
  await expect(other.getByLabel("Note title", { exact: true })).toHaveValue(
    "Losing draft",
  );
  await expect(
    other.getByRole("button", { name: "Export pending draft" }),
  ).toBeVisible();
  expect((await saved(other)).notes.map((n: any) => n.title)).toEqual([
    "Winning note",
  ]);
  const downloaded = other.waitForEvent("download");
  await other.getByRole("button", { name: "Export pending draft" }).click();
  const download = await downloaded;
  const raw = await readFile((await download.path())!, "utf8");
  expect(JSON.parse(raw).progress.notes[0].title).toBe("Losing draft");
  other.once("dialog", (d) => d.accept());
  await other.getByRole("button", { name: "Load current progress" }).click();
  await profile(other);
  await expect(other.locator(".note-card h3")).toHaveText("Winning note");
});
test("quota errors leave accepted storage and note fields intact", async ({
  page,
}) => {
  await seed(page);
  await profile(page);
  const before = await saved(page);
  await note(page, "Keep me");
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Save learning note", exact: true })
    .click();
  await expect(page.getByLabel("Note title", { exact: true })).toHaveValue(
    "Keep me",
  );
  await expect(
    page.getByRole("button", { name: "Export pending draft" }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(before);
});
test("corrupt startup preserves raw export and reset needs confirmation", async ({
  page,
}) => {
  const raw = "{bad original bytes";
  await seed(page, raw);
  await expect(
    page.getByRole("heading", { name: "Recover your saved progress" }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    raw,
  );
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export stored data" }).click();
  expect(await readFile((await (await pending).path())!, "utf8")).toBe(raw);
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Reset saved progress" }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    raw,
  );
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset saved progress" }).click();
  await expect(page.getByLabel("Callsign")).toBeVisible();
  expect((await saved(page)).epoch).toBeTruthy();
});
test("mission drafts save explicitly and checkpoint rewards apply once", async ({
  page,
}) => {
  await seed(page);
  await mission(page);
  const answer =
    "My prediction checks divisibility by fifteen before three or five, and checks zero and negative inputs to explain the boundary. ";
  await page.locator(".challenge-card textarea").first().fill(answer);
  await page
    .getByLabel("JavaScript scratch lab")
    .fill("console.assert(15 % 3 === 0);");
  expect((await saved(page)).responses).toEqual({});
  await page.getByRole("button", { name: "Save mission drafts" }).click();
  await expect(
    page.getByText("Saved revision 2", { exact: true }),
  ).toBeVisible();
  expect(Object.keys((await saved(page)).responses)).toHaveLength(2);
  await page.getByRole("button", { name: "Submit proof" }).first().click();
  await expect(
    page.getByRole("button", { name: "Secured", exact: true }),
  ).toHaveCount(1);
  expect((await saved(page)).xp).toBe(30);
  await page.reload();
  await mission(page);
  await expect(
    page.getByRole("button", { name: "Secured", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".challenge-card textarea").first()).toHaveValue(
    answer,
  );
});
test("invalid import, cancellation and accepted replacement", async ({
  page,
}) => {
  await seed(page);
  await profile(page);
  const input = page.locator("input[type=file]");
  await input.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"progress":{"version":1,"xp":-1}}'),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "xp" }),
  ).toBeVisible();
  expect((await saved(page)).revision).toBe(1);
  const valid = { progress: { ...initial, callsign: "imported" } };
  page.once("dialog", (d) => d.dismiss());
  await input.setInputFiles({
    name: "save.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(valid)),
  });
  expect((await saved(page)).callsign).toBe("learner");
  page.once("dialog", (d) => d.accept());
  await input.setInputFiles({
    name: "save.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(valid)),
  });
  await expect(
    page.getByRole("heading", { name: "imported, level 1" }),
  ).toBeVisible();
  expect((await saved(page)).revision).toBe(2);
});
test("catalog and mission fetch failures offer working retries", async ({
  page,
}) => {
  await page.route("**/content/catalog.json", (r) =>
    r.fulfill({ status: 503, body: "offline" }),
  );
  await seed(page);
  await expect(
    page.getByRole("button", { name: "Retry catalog" }),
  ).toBeVisible();
  await page.unroute("**/content/catalog.json");
  await page.getByRole("button", { name: "Retry catalog" }).click();
  await page.route("**/content/missions/**", (r) =>
    r.fulfill({ status: 503, body: "offline" }),
  );
  await page
    .getByRole("button", { name: "Mission map", exact: false })
    .first()
    .click();
  await page.locator(".mission-node.available").first().click();
  await expect(
    page.getByRole("button", { name: "Retry mission" }),
  ).toBeVisible();
  await page.unroute("**/content/missions/**");
  await page.getByRole("button", { name: "Retry mission" }).click();
  await expect(page.getByLabel("JavaScript scratch lab")).toBeVisible();
});
test("lab reports assertion failures, bounds output and terminates loops", async ({
  page,
}) => {
  await seed(page);
  await mission(page);
  const code = page.getByLabel("JavaScript scratch lab");
  const output = page.locator(".code-lab pre");
  await code.fill('console.assert(false,"check the edge case");');
  await page.getByRole("button", { name: "Run code" }).click();
  await expect(output).toContainText("ASSERTION FAILED");
  await expect(output).toContainText("ERROR");
  await code.fill("for(let i=0;i<1000;i++)console.log(i);");
  await page.getByRole("button", { name: "Run code" }).click();
  await expect(output).toContainText("Output truncated");
  await code.fill("while(true){}");
  await page.getByRole("button", { name: "Run code" }).click();
  await expect(output).toContainText("Timeout:", { timeout: 6000 });
});
test("desktop and narrow journal layouts have no page overflow", async ({
  page,
}) => {
  await seed(page);
  await profile(page);
  await note(page, "Compare-and-swap");
  await page
    .getByRole("button", { name: "Save learning note", exact: true })
    .click();
  await expect(page.locator(".note-card")).toHaveCount(1);
  for (const [name, width] of [
    ["desktop", 1440],
    ["narrow", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 1100 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.setViewportSize({width,height:width===390?2600:1700});
    await page.screenshot({
      path: `astraupskill/images/${name}.png`,
      fullPage: true,
    });
  }
});

test("accepted due review saves evidence and cannot award a repeat", async ({
  page,
}) => {
  const missionId = "foundations-01-fizzbuzz";
  const evidence =
    "I predict the divisible-by-fifteen branch must precede separate checks, with zero and negative integers as boundary cases. ".repeat(
      2,
    );
  const responses = Object.fromEntries(
    ["reconstruct", "predict", "prove"].map((id) => [
      missionId + "::" + id,
      evidence,
    ]),
  );
  await seed(page, {
    ...initial,
    xp: 340,
    completedMissions: [missionId],
    completedChallenges: ["reconstruct", "predict", "prove"].map(
      (id) => missionId + "::" + id,
    ),
    responses,
    reviews: {
      [missionId]: {
        missionId,
        stage: 0,
        due: "2020-01-01T00:00:00.000Z",
        reviews: 0,
        lapses: 0,
      },
    },
  });
  await page.getByRole("button", { name: "Memory forge" }).click();
  await page.locator(".review-card textarea").fill(evidence);
  await page.getByRole("button", { name: "good", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No reviews due" }),
  ).toBeVisible();
  const accepted = await saved(page);
  expect(accepted.responses[missionId + "::review"]).toBe(evidence);
  expect(accepted.reviews[missionId].reviews).toBe(1);
  await page.reload();
  expect((await saved(page)).xp).toBe(accepted.xp);
});
test("oversized import leaves storage and an open note draft untouched", async ({
  page,
}) => {
  await seed(page);
  await profile(page);
  await note(page, "Retained draft");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "huge.json",
      mimeType: "application/json",
      buffer: Buffer.alloc(4 * 1024 * 1024 + 1, 32),
    });
  await expect(
    page.getByRole("status").filter({ hasText: "4 MiB" }),
  ).toBeVisible();
  await expect(page.getByLabel("Note title", { exact: true })).toHaveValue(
    "Retained draft",
  );
  expect((await saved(page)).revision).toBe(1);
});
