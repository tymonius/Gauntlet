import assert from 'node:assert/strict';
import fs from 'node:fs';

const pages = [
  'v0.6.3/index.html',
  'v0.6.3/rulebook/index.html',
  'v0.6.3/start/index.html',
  'v0.6.3/quick-reference/index.html',
  'v0.6.3/changes/index.html',
  'v0.6.3/reference/index.html',
  'v0.6.3/deckbuilder/index.html',
];

const faviconLinks = [
  '<link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />',
  '<link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />',
];

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  for (const link of faviconLinks) {
    assert(html.includes(link), `${page} does not use the canonical site favicon markup`);
  }
  assert(html.includes('G-8YYYZJGGPE'), `${page} is missing the canonical Google Analytics measurement ID`);
  assert(/<head\b[^>]*>[\s\S]*?<\/head>/i.test(html), `${page} is not a complete HTML page`);
}

console.log(`v0.6.3 site convention validation passed for ${pages.length} complete HTML pages.`);
