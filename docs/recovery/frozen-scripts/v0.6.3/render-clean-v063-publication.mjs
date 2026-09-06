import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { renderMarkdown } from '../artifacts/reconstruction/clean-v0.6.3/browser-rulebook/markdown.js';

const root = process.cwd();
const releaseDir = 'releases/v0.6.3';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const manifestPath = `${releaseDir}/Gauntlet_v0.6.3_Manifest.json`;
const materials = [
  ['rulebook', 'Gauntlet v0.6.3 Rulebook', `${releaseDir}/Gauntlet_v0.6.3_Rulebook.md`, `${releaseDir}/Gauntlet_v0.6.3_Rulebook.pdf`],
  ['military', 'Military Faction Guide', `${releaseDir}/faction-guides/military/Gauntlet_v0.6.3_Military_Faction_Guide.md`, `${releaseDir}/Gauntlet_v0.6.3_Military_Faction_Guide.pdf`],
  ['diplomats', 'Diplomats Faction Guide', `${releaseDir}/faction-guides/diplomats/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md`, `${releaseDir}/Gauntlet_v0.6.3_Diplomats_Faction_Guide.pdf`],
  ['financiers', 'Financiers Faction Guide', `${releaseDir}/faction-guides/financiers/Gauntlet_v0.6.3_Financier_Faction_Guide.md`, `${releaseDir}/Gauntlet_v0.6.3_Financiers_Faction_Guide.pdf`],
  ['intelligence', 'Intelligence Faction Guide', `${releaseDir}/faction-guides/intelligence/Gauntlet_v0.6.3_Intelligence_Faction_Guide.md`, `${releaseDir}/Gauntlet_v0.6.3_Intelligence_Faction_Guide.pdf`],
  ['mystics', 'Mystics Faction Guide', `${releaseDir}/faction-guides/mystics/Gauntlet_v0.6.3_Mystics_Faction_Guide.md`, `${releaseDir}/Gauntlet_v0.6.3_Mystics_Faction_Guide.pdf`],
  ['inquisition', 'Inquisition Faction Guide', `${releaseDir}/faction-guides/inquisition/Gauntlet_v0.6.3_Inquisition_Faction_Guide.md`, `${releaseDir}/Gauntlet_v0.6.3_Inquisition_Faction_Guide.pdf`],
  ['card-reference', 'Card and Territory Reference', `${releaseDir}/Gauntlet_v0.6.3_Card_and_Territory_Reference.md`, `${releaseDir}/Gauntlet_v0.6.3_Card_and_Territory_Reference.pdf`],
  ['starter-catalog', 'Starter Deck Catalog', `${releaseDir}/Gauntlet_v0.6.3_Starter_Deck_Catalog.md`, `${releaseDir}/Gauntlet_v0.6.3_Starter_Deck_Catalog.pdf`],
];
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

const css = `
:root{--ink:#211d18;--muted:#6d6256;--line:#d8c8ae;--paper:#fffdf8;--accent:#7d241f}
*{box-sizing:border-box}body{margin:0;background:#eee8de;color:var(--ink);font-family:Georgia,'Times New Roman',serif}main{width:min(8.5in,calc(100% - 24px));margin:24px auto;padding:.55in;background:var(--paper);box-shadow:0 12px 38px rgba(40,30,20,.12)}h1,h2,h3{break-after:avoid;color:var(--accent)}h1{margin:1.1em 0 .45em;font-size:2rem}h1:first-child{margin-top:0}h2{margin:1.1em 0 .35em;font-size:1.35rem}p,li{line-height:1.5}table{width:100%;border-collapse:collapse;margin:1em 0;font-size:.9rem}th,td{padding:6px 8px;border:1px solid var(--line);vertical-align:top}th{background:#f1e7d5;text-align:left}blockquote{margin:1em 0;padding:.7em 1em;border-left:4px solid #a98446;background:#f6efe3}code{font-size:.85em;overflow-wrap:anywhere}.print-meta{margin:0 0 24px;padding:10px 12px;border:1px solid var(--line);color:var(--muted);font:12px/1.4 system-ui,sans-serif}.print-meta strong{color:var(--ink)}@page{size:Letter;margin:.5in}@media print{body{background:#fff}main{width:auto;margin:0;padding:0;box-shadow:none}h1{break-before:page}main>h1:first-of-type{break-before:auto}table,blockquote{break-inside:avoid}.print-meta{break-after:avoid}}
`;
function htmlDocument(title, markdown) {
  const rendered = renderMarkdown(markdown);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}</style></head><body><main><div class="print-meta"><strong>Gauntlet v0.6.3</strong> · current canonical playtest edition · authority ${authoritySetId}</div>${rendered.html}</main></body></html>`;
}

const browser = await chromium.launch({ headless: true });
const pdfOutputs = [];
const tempDir = '/tmp/gauntlet-v063-publication-render';
fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });
try {
  for (const [key, title, markdownPath, pdfPath] of materials) {
    const markdown = read(markdownPath);
    if (/not current\/public|publication remains locked|reconstruction-only|authority candidate|not published/i.test(markdown)) {
      throw new Error(`${markdownPath} still contains candidate-only publication language.`);
    }
    const htmlPath = path.join(tempDir, `${key}.html`);
    fs.writeFileSync(htmlPath, htmlDocument(title, markdown), 'utf8');
    const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load', timeout: 60000 });
    if (errors.length) throw new Error(`${key} render errors:\n${errors.join('\n')}`);
    const text = await page.locator('body').innerText();
    if (!text.includes('Gauntlet v0.6.3') || !text.includes('current canonical playtest edition')) throw new Error(`${key} PDF is missing current-public labeling.`);
    const target = path.join(root, pdfPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await page.pdf({ path: target, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    await page.close();
    const bytes = fs.readFileSync(target);
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPageCount();
    if (pages < 1) throw new Error(`${pdfPath} has no pages.`);
    pdfOutputs.push({ key, path: pdfPath.replace(`${releaseDir}/`, ''), pages, sha256: hash(bytes), bytes: bytes.length });
    console.log(`[v063-publication] ${key}: ${pages} pages`);
  }
} finally {
  await browser.close();
}

const manifest = JSON.parse(read(manifestPath));
if (manifest.authority_set_id !== authoritySetId) throw new Error('Publication manifest authority mismatch.');
manifest.pdf_outputs = pdfOutputs;
manifest.status = 'current_pending_live_verification';
const payloadFiles = [
  'index.html',
  'Gauntlet_v0.6.3_Rulebook.md',
  'Gauntlet_v0.6.3_Canonical_Data.json',
  'Gauntlet_v0.6.3_Starter_Decks.json',
  'Gauntlet_v0.6.3_Deck_Export_Schema.json',
  'Gauntlet_v0.6.3_Card_and_Territory_Reference.md',
  'Gauntlet_v0.6.3_Starter_Deck_Catalog.md',
  ...pdfOutputs.map((item) => item.path),
  ...materials.slice(1, 7).map(([, , markdownPath]) => markdownPath.replace(`${releaseDir}/`, '')),
];
manifest.payload_files = [...new Set(payloadFiles)].sort().map((relative) => {
  const bytes = fs.readFileSync(path.join(root, releaseDir, relative));
  return { path: relative, sha256: hash(bytes), bytes: bytes.length };
});
fs.writeFileSync(path.join(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await import('./sync-v063-legacy-package-alias.mjs');
console.log(`Rendered ${pdfOutputs.length} current v0.6.3 PDFs, sealed the canonical release manifest, and synchronized legacy package aliases.`);
