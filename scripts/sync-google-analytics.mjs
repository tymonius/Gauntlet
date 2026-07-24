import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MEASUREMENT_ID = "G-8YYYZJGGPE";
const CHECK_ONLY = process.argv.includes("--check");
const ROOT = process.cwd();
const SKIP_DIRECTORIES = new Set([".git", "node_modules"]);

const GOOGLE_TAG = `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${MEASUREMENT_ID}');
  </script>`;

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findHtmlFiles(entryPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      files.push(entryPath);
    }
  }

  return files;
}

const htmlFiles = await findHtmlFiles(ROOT);
const missing = [];
let updated = 0;

for (const filePath of htmlFiles) {
  const source = await readFile(filePath, "utf8");

  if (source.includes(MEASUREMENT_ID)) continue;

  if (source.includes("googletagmanager.com/gtag/js?id=")) {
    throw new Error(`${path.relative(ROOT, filePath)} already contains a different Google tag.`);
  }

  if (!/<head(?:\s[^>]*)?>/i.test(source)) continue;

  const relativePath = path.relative(ROOT, filePath);
  missing.push(relativePath);

  if (!CHECK_ONLY) {
    const next = source.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}\n${GOOGLE_TAG}`);
    await writeFile(filePath, next, "utf8");
    updated += 1;
  }
}

if (CHECK_ONLY && missing.length) {
  console.error(`Google Analytics tag ${MEASUREMENT_ID} is missing from:`);
  for (const file of missing) console.error(`- ${file}`);
  process.exitCode = 1;
} else if (CHECK_ONLY) {
  console.log(`Google Analytics tag ${MEASUREMENT_ID} is present in all ${htmlFiles.length} HTML files.`);
} else {
  console.log(`Added Google Analytics tag ${MEASUREMENT_ID} to ${updated} HTML files.`);
}
