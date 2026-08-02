import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.GAUNTLET_TEST_BASE_URL || "http://127.0.0.1:8000";
const outputDir = process.env.GAUNTLET_TEST_OUTPUT_DIR || "tmp/playtest-integrity";
await fs.mkdir(outputDir, { recursive: true });

const initialGame = {
  sessionId: "game-1",
  sheetSerial: "G061-INTEGRITY1",
  rulesVersion: "v0.6.1",
  status: "closed",
  createdAt: "2026-08-02T10:00:00.000Z",
  closedAt: "2026-08-02T11:15:00.000Z",
  result: { completionStatus: "completed", durationMinutes: 72 },
  players: [
    {
      participantId: "player-1", displayName: "Alice", seatIndex: 1,
      faction: "diplomats", leader: "Ambassador",
      response: { fun: 4, rulesClarity: 4, playAgain: true, submittedAt: "2026-08-02T11:12:00.000Z" }
    },
    {
      participantId: "player-2", displayName: "Ben", seatIndex: 2,
      faction: "military", leader: "General",
      response: { fun: 5, rulesClarity: 3, playAgain: true, submittedAt: "2026-08-02T11:14:00.000Z" }
    }
  ],
  arbiterQuestions: [],
  events: []
};

function statePayload(mode = "active") {
  const game = structuredClone(initialGame);
  const isExcluded = mode === "excluded";
  const isRestored = mode === "restored";
  const exclusion = {
    id: "exclusion-1", targetType: "response", targetId: "player-2", sessionId: "game-1",
    reasonCode: "test", reasonNote: "Deployment smoke test", excludedBy: "TS",
    excludedAt: "2026-08-02T12:00:00.000Z",
    restoredBy: isRestored ? "TS" : null,
    restoredAt: isRestored ? "2026-08-02T12:05:00.000Z" : null
  };
  if (isExcluded) game.players[1].response = null;
  return {
    schemaVersion: "gauntlet-playtest-integrity-v1",
    generatedAt: "2026-08-02T12:06:00.000Z",
    summary: {
      activeGameCount: 1,
      excludedGameCount: 0,
      excludedResponseCount: isExcluded ? 1 : 0,
      activeExclusionCount: isExcluded ? 1 : 0,
      historyCount: mode === "active" ? 0 : 1
    },
    activeGames: [game],
    excludedGames: [],
    excludedResponses: isExcluded ? [{
      exclusion,
      game: { sessionId: "game-1", sheetSerial: "G061-INTEGRITY1", rulesVersion: "v0.6.1", status: "closed", createdAt: initialGame.createdAt },
      player: structuredClone(initialGame.players[1])
    }] : [],
    history: mode === "active" ? [] : [exclusion]
  };
}

async function assertAccessFieldLayout(page, fieldIndex) {
  const field = page.locator(".access-field").nth(fieldIndex);
  const labelBox = await field.locator("label").boundingBox();
  const inputBox = await field.locator("input").boundingBox();
  if (!labelBox || !inputBox) throw new Error(`Access field ${fieldIndex + 1} did not render`);
  if (labelBox.y + labelBox.height > inputBox.y + 1) {
    throw new Error(`Access field ${fieldIndex + 1} label overlaps or follows its input`);
  }
  if (inputBox.width < 160 || inputBox.height < 44) {
    throw new Error(`Access field ${fieldIndex + 1} is too small to use reliably`);
  }
}

async function run(viewport, name) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  let mode = "active";
  let lastAuthorization = "";

  await page.route("**/api/tracked-analysis/exclusions", async (route) => {
    const request = route.request();
    lastAuthorization = request.headers().authorization || "";
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      if (body.action === "exclude") mode = "excluded";
      if (body.action === "restore") mode = "restored";
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(statePayload(mode))
    });
  });

  await page.goto(`${baseUrl}/playtest/analysis/integrity/`, { waitUntil: "networkidle" });
  await assertAccessFieldLayout(page, 0);
  await assertAccessFieldLayout(page, 1);

  const adminInput = page.locator("#adminToken");
  const reviewerInput = page.locator("#reviewerName");
  if ((await adminInput.getAttribute("type")) !== "password") throw new Error("Facilitator key is not masked");
  if ((await reviewerInput.getAttribute("type")) !== "text") throw new Error("Reviewer field is not plain editable text");

  await adminInput.fill("test-facilitator-key");
  await reviewerInput.fill("TS");
  if ((await adminInput.inputValue()) !== "test-facilitator-key") throw new Error("Facilitator key field rejected typed input");
  if ((await reviewerInput.inputValue()) !== "TS") throw new Error("Reviewer field rejected typed initials");

  await page.screenshot({ path: path.join(outputDir, `playtest-integrity-login-${name}.png`), fullPage: true });
  await page.click('#accessForm button[type="submit"]');
  await page.locator("#integrityApp").waitFor({ state: "visible" });

  if (lastAuthorization !== "Bearer test-facilitator-key") throw new Error("Facilitator key was not sent as a bearer token");
  if (await page.evaluate(() => localStorage.length || sessionStorage.length)) throw new Error("Integrity credentials reached browser storage");
  if ((await page.locator("#metricActiveGames").textContent()) !== "1") throw new Error("Active game metric did not load");
  if ((await page.locator('[data-exclude-type="response"]').count()) !== 2) throw new Error("Response exclusion actions were not rendered");

  await page.locator(".integrity-game summary").first().click();
  await page.locator('[data-exclude-type="response"][data-exclude-id="player-2"]').click();
  await page.selectOption("#reasonCode", "test");
  await page.fill("#reasonNote", "Deployment smoke test");
  await page.click('#excludeForm button[type="submit"]');
  await page.locator("#excludeDialog").waitFor({ state: "hidden" });

  if ((await page.locator("#metricExcludedResponses").textContent()) !== "1") throw new Error("Excluded response metric did not update");
  if ((await page.locator('[data-exclude-id="player-2"]').count()) !== 0) throw new Error("Excluded response remained in active controls");
  if ((await page.locator('[data-restore-id="exclusion-1"]').count()) !== 1) throw new Error("Excluded response did not enter quarantine");
  if (!(await page.locator("#historyRows").textContent()).includes("Deployment smoke test")) throw new Error("Audit history omitted exclusion context");

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('[data-restore-id="exclusion-1"]').click();
  await page.waitForFunction(() => document.querySelector("#metricExcludedResponses")?.textContent === "0");
  if ((await page.locator('[data-exclude-id="player-2"]').count()) !== 1) throw new Error("Restored response did not return to active controls");
  if ((await page.locator("#metricHistory").textContent()) !== "1") throw new Error("Restored action disappeared from audit totals");
  const restoredHistory = await page.locator("#historyRows").textContent();
  if (!restoredHistory.includes("restored") || !restoredHistory.includes("Deployment smoke test")) {
    throw new Error("Restored exclusion did not remain in audit history");
  }

  await page.screenshot({ path: path.join(outputDir, `playtest-integrity-${name}.png`), fullPage: true });
  await browser.close();
}

await run({ width: 1440, height: 1100 }, "desktop");
await run({ width: 390, height: 844 }, "mobile");
console.log("Verified integrity login input/layout plus exclusion, quarantine, persistent audit history, and restoration on desktop and mobile.");
