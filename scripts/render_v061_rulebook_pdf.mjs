#!/usr/bin/env node

import { chromium } from "playwright";
import { resolve } from "node:path";

const [sourceUrl, outputPath] = process.argv.slice(2);
if (!sourceUrl || !outputPath) {
  console.error("Usage: node scripts/render_v061_rulebook_pdf.mjs <rulebook-url> <output.pdf>");
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1500 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const response = await page.goto(sourceUrl, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`Rulebook returned HTTP ${response?.status()}`);
  await page.waitForSelector("[data-rulebook-content]:not([aria-busy])", { timeout: 30_000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    document.documentElement.dataset.pdfRender = "true";
  });
  await page.emulateMedia({ media: "print" });

  if (errors.length) throw new Error(`Rulebook browser errors:\n${errors.join("\n")}`);

  await page.pdf({
    path: resolve(outputPath),
    width: "5.5in",
    height: "8.5in",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `
      <div style="width:100%; padding:0 0.35in; color:#665f55; font-family:Inter,Arial,sans-serif; font-size:7px; display:flex; justify-content:space-between; align-items:center;">
        <span>GAUNTLET · v0.6.1</span>
        <span><span class="pageNumber"></span></span>
      </div>`,
    margin: { top: "0.42in", right: "0.42in", bottom: "0.5in", left: "0.42in" },
  });
} finally {
  await browser.close();
}
