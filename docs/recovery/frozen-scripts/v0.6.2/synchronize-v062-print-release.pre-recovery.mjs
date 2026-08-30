import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const check = process.argv.includes('--check');
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const normalize = (value) => String(value).replace(/\r\n/g, '\n');

function expected(relativePath, content) {
  const target = path.join(root, relativePath);
  const output = normalize(content).replace(/\s+$/, '') + '\n';
  if (check) {
    if (!fs.existsSync(target)) failures.push(`Missing synchronized print file: ${relativePath}`);
    else if (normalize(fs.readFileSync(target, 'utf8')) !== output) failures.push(`Stale synchronized print file: ${relativePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}

const printFiles = [
  'Gauntlet_v0.6.2_Rulebook.pdf',
  'Gauntlet_v0.6.2_Rulebook_Booklet.pdf',
  'Gauntlet_v0.6.2_Reference_Guide.pdf',
  'Gauntlet_v0.6.2_First_Game_Guide.pdf',
  'Gauntlet_v0.6.2_Faction_and_Component_Guide.pdf',
  'Gauntlet_v0.6.2_Returning_Player_Changes.pdf',
  'Gauntlet_v0.6.2_Player_Mat.pdf',
  'Gauntlet_v0.6.2_Formal_Playtest_Sheet.pdf',
  'Gauntlet_v0.6.2_Faction_Teaching_Cards.pdf',
  'Gauntlet_v0.6.2_Active_Player_Marker.pdf',
  'Gauntlet_v0.6.2_Tableside_Pack.pdf',
  'Gauntlet_v0.6.2_Print_Manifest.json',
];

let releaseReadme = read('releases/v0.6.2/README.md');
const printSection = `## Printed materials

- [Rulebook PDF](Gauntlet_v0.6.2_Rulebook.pdf)
- [Imposed Rulebook Booklet](Gauntlet_v0.6.2_Rulebook_Booklet.pdf) — Letter landscape, duplex, flip on short edge
- [Compact Reference PDF](Gauntlet_v0.6.2_Reference_Guide.pdf)
- [First Game Guide PDF](Gauntlet_v0.6.2_First_Game_Guide.pdf)
- [Faction and Component Guide PDF](Gauntlet_v0.6.2_Faction_and_Component_Guide.pdf)
- [Returning-Player Changes PDF](Gauntlet_v0.6.2_Returning_Player_Changes.pdf)
- [Player Mat PDF](Gauntlet_v0.6.2_Player_Mat.pdf)
- [Formal Playtest Sheet PDF](Gauntlet_v0.6.2_Formal_Playtest_Sheet.pdf)
- [Faction Teaching Cards PDF](Gauntlet_v0.6.2_Faction_Teaching_Cards.pdf)
- [Active-Player Marker PDF](Gauntlet_v0.6.2_Active_Player_Marker.pdf)
- [Combined Tableside Pack](Gauntlet_v0.6.2_Tableside_Pack.pdf)
- [Print Manifest](Gauntlet_v0.6.2_Print_Manifest.json)
- [Browser print center](../../v0.6.2/print/)`;
releaseReadme = releaseReadme.replace(/\n+## Printed materials[\s\S]*?(?=\n+## Browser tools)/, '');
releaseReadme = releaseReadme.replace(/\n+## Browser tools/, `\n\n${printSection}\n\n## Browser tools`);
expected('releases/v0.6.2/README.md', releaseReadme);

const releaseManifestPath = 'releases/v0.6.2/Gauntlet_v0.6.2_Manifest.json';
const releaseManifest = JSON.parse(read(releaseManifestPath));
releaseManifest.current_outputs = [...new Set([...(releaseManifest.current_outputs || []), ...printFiles, '../../v0.6.2/print/'])];
releaseManifest.validation = {
  ...(releaseManifest.validation || {}),
  print_package_generated: true,
  print_pdf_geometry_validated: true,
  print_browser_sources_validated: true,
  v061_print_package_unchanged: true,
};
releaseManifest.public_links = {
  ...(releaseManifest.public_links || {}),
  printed_materials: 'https://gauntlet.run/v0.6.2/print/',
  rulebook_pdf: 'https://gauntlet.run/releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.pdf',
  rulebook_booklet_pdf: 'https://gauntlet.run/releases/v0.6.2/Gauntlet_v0.6.2_Rulebook_Booklet.pdf',
  tableside_pack_pdf: 'https://gauntlet.run/releases/v0.6.2/Gauntlet_v0.6.2_Tableside_Pack.pdf',
};
expected(releaseManifestPath, `${JSON.stringify(releaseManifest, null, 2)}\n`);

const publicManifestPath = 'v0.6.2/release-manifest.json';
const publicManifest = JSON.parse(read(publicManifestPath));
publicManifest.printMaterials = {
  status: 'published',
  source: '/v0.6.2/print/',
  manifest: '/releases/v0.6.2/Gauntlet_v0.6.2_Print_Manifest.json',
  rulebookReader: '/releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.pdf',
  rulebookBooklet: '/releases/v0.6.2/Gauntlet_v0.6.2_Rulebook_Booklet.pdf',
  tablesidePack: '/releases/v0.6.2/Gauntlet_v0.6.2_Tableside_Pack.pdf',
};
publicManifest.publicationRequirementsSatisfiedBy = [...new Set([...(publicManifest.publicationRequirementsSatisfiedBy || []), 'scripts/build-v062-print-html.mjs', 'scripts/render-v062-print-package.mjs', 'scripts/validate-v062-print-package.mjs'])];
expected(publicManifestPath, `${JSON.stringify(publicManifest, null, 2)}\n`);

let rootReadme = read('README.md');
const printBullet = '- [Gauntlet v0.6.2 Printed Materials](https://gauntlet.run/v0.6.2/print/) — Rulebook and booklet PDFs, references, player mat, formal questionnaire, faction teaching cards, active-player marker, and combined tableside pack.';
if (!rootReadme.includes(printBullet)) {
  const anchor = '- [Gauntlet v0.6.2 Release Package](https://gauntlet.run/releases/v0.6.2/) — canonical source documents, data, and manifests.';
  if (!rootReadme.includes(anchor)) failures.push('Could not add the root printed-materials link.');
  else rootReadme = rootReadme.replace(anchor, `${anchor}\n${printBullet}`);
}
expected('README.md', rootReadme);

let releasePage = read('v0.6.2/index.html');
if (!releasePage.includes('href="/v0.6.2/print/"')) {
  releasePage = releasePage.replace('<a href="/v0.6.2/deckbuilder/">Build a Deck</a>', '<a href="/v0.6.2/deckbuilder/">Build a Deck</a><a href="/v0.6.2/print/">Printed materials</a>');
  releasePage = releasePage.replace('<h2>Release package</h2><ul>', '<h2>Release package</h2><ul><li><a href="/v0.6.2/print/">Complete printed-materials center</a></li><li><a href="/releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.pdf">Rulebook PDF</a> and <a href="/releases/v0.6.2/Gauntlet_v0.6.2_Rulebook_Booklet.pdf">imposed booklet</a></li>');
}
expected('v0.6.2/index.html', releasePage);

let playtest = read('playtest/index.html');
playtest = playtest
  .replaceAll('Gauntlet v0.6.1 Playtest Sheet', 'Gauntlet v0.6.2 Playtest Sheet')
  .replaceAll('Official v0.6.1 human-playtest questionnaire', 'Official v0.6.2 human-playtest questionnaire')
  .replace(/(?:\s*<a class="button-link secondary" href="guide\/">Game-night guide<\/a>){2,}/, '\n      <a class="button-link secondary" href="guide/">Game-night guide</a>');
if (!playtest.includes('href="/v0.6.2/print/"')) {
  playtest = playtest.replace('<a class="button-link secondary" href="batch/">Generate coded batch</a>', '<a class="button-link secondary" href="/v0.6.2/print/">v0.6.2 print package</a>\n      <a class="button-link secondary" href="batch/">Generate coded batch</a>');
}
expected('playtest/index.html', playtest);

const playerMatRedirect = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />
  <meta http-equiv="refresh" content="0; url=../../v0.6.2/print/player-mat.html">
  <link rel="canonical" href="https://gauntlet.run/v0.6.2/print/player-mat.html">
  <title>Gauntlet Player Mat — v0.6.2</title>
</head>
<body>
  <p>The current player mat is part of the <a href="../../v0.6.2/print/player-mat.html">Gauntlet v0.6.2 printed-materials package</a>.</p>
</body>
</html>`;
expected('playtest/player-mat/index.html', playerMatRedirect);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`${check ? 'Verified' : 'Synchronized'} v0.6.2 print-release links, manifests, and active playtest surfaces.`);
