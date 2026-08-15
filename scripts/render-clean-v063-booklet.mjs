import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { renderMarkdown } from '../rulebook/markdown.js';
import { publicAuthorityNote } from './publication-utils.mjs';

const root = process.cwd();
const cleanRulebookPath = 'artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
const publishedRulebookPath = 'releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook.md';
const stylePath = 'scripts/v063-booklet-style.css';
const outDir = 'artifacts/reconstruction/clean-v0.6.3/booklet/generated';
const htmlPath = `${outDir}/Gauntlet_v0.6.3_Rulebook_Booklet_Source.html`;
const contentPdfPath = `${outDir}/Gauntlet_v0.6.3_Rulebook_Half_Letter_Content.pdf`;
const readingPdfPath = `${outDir}/Gauntlet_v0.6.3_Rulebook_Booklet_Reading_Order.pdf`;
const imposedPdfPath = `${outDir}/Gauntlet_v0.6.3_Rulebook_Booklet.pdf`;
const manifestPath = `${outDir}/Gauntlet_v0.6.3_Rulebook_Booklet_Manifest.json`;
const cleanRulebookSha256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';
const publishedRulebookSha256 = '9bbde08376daea4558581ef598a07b0d3a8fc21666809890d846114229bc44c2';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const publicationDate = new Date('2026-08-14T00:00:00.000Z');
const halfWidth = 396;
const halfHeight = 612;
const sheetWidth = 792;
const sheetHeight = 612;
const coverAsset = 'images/sketches/hero-sketches/hero sketch.png';
const paddingAssets = [
  'images/sketches/hero-sketches/hero sketch 2.png',
  'images/sketches/hero-sketches/hero sketch 3.png',
  'images/sketches/hero-sketches/hero sketch 4.png',
];

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const bytes = (relative) => fs.readFileSync(path.join(root, relative));
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const fileHash = (relative) => hash(bytes(relative));
const write = (relative, data) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
};
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');
const stabilizeMetadata = (pdf, title, subject) => {
  pdf.setTitle(title);
  pdf.setSubject(subject);
  pdf.setAuthor('Tymon Scott');
  pdf.setCreator('Gauntlet clean v0.6.3 booklet renderer');
  pdf.setProducer('Gauntlet clean v0.6.3 booklet renderer');
  pdf.setCreationDate(publicationDate);
  pdf.setModificationDate(publicationDate);
};

const cleanRulebook = read(cleanRulebookPath);
assert.equal(hash(cleanRulebook), cleanRulebookSha256, 'Certified clean Rulebook hash drifted.');
const publishedRulebook = read(publishedRulebookPath);
assert.equal(hash(publishedRulebook), publishedRulebookSha256, 'Published v0.6.3 Rulebook hash drifted.');
assert.equal(publicAuthorityNote(cleanRulebook), publishedRulebook, 'Published Rulebook is no longer the exact publication transform of certified clean authority.');

for (const asset of [coverAsset, ...paddingAssets]) {
  assert(fs.existsSync(path.join(root, asset)), `Missing booklet artwork: ${asset}`);
}

const bodyMarkdown = publishedRulebook.replace(/^# GAUNTLET\n\n## Official Rulebook\n\n\*\*Version 0\.6\.3\*\*\n\n---\n\n/, '');
assert.notEqual(bodyMarkdown, publishedRulebook, 'Could not separate the publication title block for the booklet cover.');
const { html: ruleHtml } = renderMarkdown(bodyMarkdown);
const coverUrl = pathToFileURL(path.join(root, coverAsset)).href;
const css = read(stylePath);
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Gauntlet v0.6.3 Official Rulebook - Booklet Edition</title>
<style>
${css}</style>
</head>
<body>
<section class="cover">
  <p class="cover-kicker">Official Rulebook</p>
  <h1>GAUNTLET</h1>
  <h2>Rulebook</h2>
  <p class="cover-version">Version 0.6.3</p>
  <hr class="cover-rule">
  <img class="cover-art" src="${escapeHtml(coverUrl)}" alt="">
</section>
<article class="rulebook">${ruleHtml}</article>
</body>
</html>`;
write(htmlPath, `${html}\n`);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  const response = await page.goto(pathToFileURL(path.join(root, htmlPath)).href, { waitUntil: 'load', timeout: 60000 });
  if (response && !response.ok()) throw new Error(`Booklet source HTML returned ${response.status()}.`);
  await page.evaluate(async () => { if (document.fonts) await document.fonts.ready; });
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    text: document.body.innerText,
    coverImage: document.querySelector('.cover-art')?.naturalWidth || 0,
  }));
  if (errors.length) throw new Error(`Booklet HTML browser errors:\n${errors.join('\n')}`);
  if (metrics.scrollWidth > metrics.clientWidth + 2) throw new Error(`Booklet HTML has horizontal overflow (${metrics.scrollWidth} > ${metrics.clientWidth}).`);
  if (!metrics.coverImage) throw new Error('Booklet cover art did not load.');
  for (const marker of ['Welcome to Gauntlet', 'How to Win', 'Part III', 'Copyright']) {
    if (!metrics.text.includes(marker)) throw new Error(`Booklet HTML is missing expected Rulebook marker: ${marker}`);
  }
  await page.pdf({ path: path.join(root, contentPdfPath), printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
  await page.close();
} finally {
  await browser.close();
}

const contentBytes = bytes(contentPdfPath);
const contentPdf = await PDFDocument.load(contentBytes);
const contentPages = contentPdf.getPageCount();
assert(contentPages > 1, 'Half-letter content PDF unexpectedly has fewer than two pages.');
for (const [index, page] of contentPdf.getPages().entries()) {
  const { width, height } = page.getSize();
  assert(Math.abs(width - halfWidth) < 1 && Math.abs(height - halfHeight) < 1, `Content page ${index + 1} is not half-letter (${width} x ${height}).`);
}

const paddingCount = (-contentPages) % 4;
assert(paddingCount >= 0 && paddingCount <= 3);
const selectedPaddingAssets = paddingAssets.slice(0, paddingCount);
const reading = await PDFDocument.create();
const copiedContent = await reading.copyPages(contentPdf, contentPdf.getPageIndices());
for (const page of copiedContent) reading.addPage(page);
for (const asset of selectedPaddingAssets) {
  const page = reading.addPage([halfWidth, halfHeight]);
  const image = await reading.embedPng(bytes(asset));
  const scale = Math.min((halfWidth - 72) / image.width, (halfHeight - 72) / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, { x: (halfWidth - width) / 2, y: (halfHeight - height) / 2, width, height });
}
stabilizeMetadata(reading, 'Gauntlet v0.6.3 Official Rulebook - Booklet Reading Order', 'Half-letter reading order; includes signature artwork padding when required');
const readingBytes = await reading.save();
write(readingPdfPath, readingBytes);

const logicalPages = reading.getPageCount();
assert.equal(logicalPages % 4, 0, 'Booklet logical page count is not a multiple of four.');
const imposed = await PDFDocument.create();
const embeddedLogical = await imposed.embedPages(reading.getPages());
const impositionPairs = [];
for (let sheet = 0; sheet < logicalPages / 4; sheet += 1) {
  for (const [leftIndex, rightIndex] of [
    [logicalPages - 1 - (sheet * 2), sheet * 2],
    [1 + (sheet * 2), logicalPages - 2 - (sheet * 2)],
  ]) {
    const spread = imposed.addPage([sheetWidth, sheetHeight]);
    spread.drawPage(embeddedLogical[leftIndex], { x: 0, y: 0, width: halfWidth, height: halfHeight });
    spread.drawPage(embeddedLogical[rightIndex], { x: halfWidth, y: 0, width: halfWidth, height: halfHeight });
    impositionPairs.push([leftIndex + 1, rightIndex + 1]);
  }
}
stabilizeMetadata(imposed, 'Gauntlet v0.6.3 Official Rulebook - Printable Booklet', 'Letter landscape; duplex short-edge; fold and saddle stitch');
const imposedBytes = await imposed.save();
write(imposedPdfPath, imposedBytes);

const manifest = {
  schema_version: 1,
  target: 'gauntlet-v0.6.3-rulebook-booklet',
  authority_set_id: authoritySetId,
  source: {
    certified_rulebook: { path: cleanRulebookPath, sha256: cleanRulebookSha256 },
    published_rulebook: { path: publishedRulebookPath, sha256: publishedRulebookSha256 },
    publication_transform_verified_exact: true,
  },
  artwork: {
    cover: { path: coverAsset, sha256: fileHash(coverAsset) },
    padding: selectedPaddingAssets.map((asset, index) => ({ logical_page: contentPages + index + 1, path: asset, sha256: fileHash(asset) })),
    padding_preference: paddingAssets,
  },
  geometry_points: { logical_page: [halfWidth, halfHeight], imposed_side: [sheetWidth, sheetHeight] },
  counts: {
    content_pages: contentPages,
    padding_pages: paddingCount,
    logical_pages: logicalPages,
    imposed_sides: imposed.getPageCount(),
    physical_sheets: logicalPages / 4,
  },
  imposition: { duplex_flip: 'short-edge', pairs: impositionPairs },
  outputs: [
    { role: 'half-letter-content', path: contentPdfPath, sha256: hash(contentBytes), bytes: contentBytes.length, pages: contentPages },
    { role: 'reading-order', path: readingPdfPath, sha256: hash(readingBytes), bytes: readingBytes.length, pages: logicalPages },
    { role: 'printable-booklet', path: imposedPdfPath, sha256: hash(imposedBytes), bytes: imposedBytes.length, pages: imposed.getPageCount() },
  ],
};
write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Clean v0.6.3 booklet: ${contentPages} content + ${paddingCount} hero padding = ${logicalPages} logical pages; ${imposed.getPageCount()} imposed sides / ${logicalPages / 4} sheets.`);
