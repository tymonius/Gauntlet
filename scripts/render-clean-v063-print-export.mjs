import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

await import('./build-clean-v063-print-export.mjs');

const root = process.cwd();
const outputDir = 'artifacts/reconstruction/clean-v0.6.3/print-export/generated';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const manifestPath = `${outputDir}/Gauntlet_clean-v0.6.3_Print_Export_Manifest.json`;
const previewDir = process.env.GAUNTLET_CLEAN_PRINT_PREVIEW_DIR || '/tmp/gauntlet-clean-v063-print-export-previews';
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const hashBytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = readJson(manifestPath);
if (manifest.authority_set_id !== authoritySetId) throw new Error('Generated print/export manifest authority-set mismatch.');
fs.mkdirSync(path.join(root, outputDir, 'pdf'), { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const pdfOutputs = [];
try {
  for (const material of manifest.materials) {
    const htmlPath = path.join(root, material.html);
    const pdfName = path.basename(material.html).replace(/\.html$/, '.pdf');
    const pdfRelative = `${outputDir}/pdf/${pdfName}`;
    const pdfPath = path.join(root, pdfRelative);
    const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    const response = await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load', timeout: 60000 });
    if (response && !response.ok()) throw new Error(`${material.html} returned ${response.status()}`);
    if (errors.length) throw new Error(`${material.html} browser errors:\n${errors.join('\n')}`);
    const geometry = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, text: document.body.innerText }));
    if (geometry.width > geometry.clientWidth + 2) throw new Error(`${material.html} has horizontal overflow.`);
    if (!geometry.text.includes('clean v0.6.3') || !geometry.text.includes('not published')) throw new Error(`${material.html} is missing reconstruction/publication labeling.`);
    await page.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    await page.screenshot({ path: path.join(previewDir, `${material.key}.png`), fullPage: false, timeout: 30000 });
    await page.close();
    const bytes = fs.readFileSync(pdfPath);
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPageCount();
    if (pages < 1) throw new Error(`${pdfName} has no pages.`);
    pdfOutputs.push({ key: material.key, path: pdfRelative, pages, sha256: hashBytes(bytes), bytes: bytes.length });
    console.log(`[clean-v063-print] ${material.key}: ${pages} pages`);
  }
} finally {
  await browser.close();
}

manifest.pdf_outputs = pdfOutputs;
manifest.rendered_with = 'playwright-chromium';
manifest.preview_directory = previewDir;
fs.writeFileSync(path.join(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Rendered ${pdfOutputs.length} clean v0.6.3 PDFs.`);
