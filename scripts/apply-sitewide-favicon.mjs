import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules"
]);

const faviconBlock = [
  '  <link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />',
  '  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />',
  '  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />'
].join("\n");

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectHtmlFiles(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function removeExistingFaviconLinks(head) {
  return head.replace(
    /^\s*<link\b[^>]*\brel=(?:"(?:icon|shortcut icon|apple-touch-icon)"|'(?:icon|shortcut icon|apple-touch-icon)')[^>]*>\s*\n?/gim,
    ""
  );
}

function addFaviconLinks(html, relativePath) {
  const headMatch = html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i);
  if (!headMatch) {
    throw new Error(`${relativePath} has no <head> element`);
  }

  const originalHead = headMatch[0];
  let head = removeExistingFaviconLinks(originalHead);

  const canonical = /^(\s*<link\b[^>]*\brel=(?:"canonical"|'canonical')[^>]*>\s*)$/im;
  const viewport = /^(\s*<meta\b[^>]*\bname=(?:"viewport"|'viewport')[^>]*>\s*)$/im;

  if (canonical.test(head)) {
    head = head.replace(canonical, `$1\n${faviconBlock}`);
  } else if (viewport.test(head)) {
    head = head.replace(viewport, `$1\n${faviconBlock}`);
  } else {
    head = head.replace(/<head\b[^>]*>/i, `$&\n${faviconBlock}`);
  }

  return html.replace(originalHead, head);
}

const htmlFiles = await collectHtmlFiles(root);
const changed = [];

for (const absolutePath of htmlFiles) {
  const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, "/");
  const before = await readFile(absolutePath, "utf8");
  const after = addFaviconLinks(before, relativePath);

  if (after !== before) {
    await writeFile(absolutePath, after);
    changed.push(relativePath);
  }
}

console.log(`Applied site-wide favicon links to ${changed.length} HTML file(s).`);
for (const file of changed) console.log(`- ${file}`);
