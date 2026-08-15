import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalizeV063LastStandText, normalizeV063LastStandValue } from '../rules-assistant/v063-last-stand-language.js';

// Publication retry after #644 synchronized the approved Mystics Rite completion artwork regression.

export const root = process.cwd();
export const check = process.argv.includes('--check');
export const failures = [];
export const AUTHORITY_SET_ID = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
export const RULEBOOK_SHA256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';
export const CANONICAL_SHA256 = '641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c';
export const STARTERS_SHA256 = '4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64';
export const RELEASE_DIR = 'releases/v0.6.3-reconstructed';
export const CLEAN = 'artifacts/reconstruction/clean-v0.6.3';
export const RULEBOOK_SOURCE = `${CLEAN}/rulebook/Gauntlet_v0.6.3_Rulebook.md`;
export const CANONICAL_SOURCE = `${CLEAN}/downstream/canonical-data.json`;
export const STARTERS_SOURCE = `${CLEAN}/downstream/starter-decks.json`;
export const PLAYER_CHAPTER_11 = 'rulebook/player-facing/chapter-11.md';
export const factionGuides = [
  ['Military', 'military', 'military', 'Gauntlet_v0.6.3_Military_Faction_Guide.md'],
  ['Diplomats', 'diplomats', 'diplomat', 'Gauntlet_v0.6.3_Diplomat_Faction_Guide.md'],
  ['Financiers', 'financiers', 'financier', 'Gauntlet_v0.6.3_Financier_Faction_Guide.md'],
  ['Intelligence', 'intelligence', 'intelligence', 'Gauntlet_v0.6.3_Intelligence_Faction_Guide.md'],
  ['Mystics', 'mystics', 'mystics', 'Gauntlet_v0.6.3_Mystics_Faction_Guide.md'],
  ['Inquisition', 'inquisition', 'inquisition', 'Gauntlet_v0.6.3_Inquisition_Faction_Guide.md'],
];
export const readBytes = (relative) => fs.readFileSync(path.join(root, relative));
export const read = (relative) => readBytes(relative).toString('utf8').replace(/\r\n/g, '\n');
export const readJson = (relative) => JSON.parse(read(relative));
export const hashBytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
export const hashFile = (relative) => hashBytes(readBytes(relative));
export const exists = (relative) => fs.existsSync(path.join(root, relative));
export function ensureParent(relative) { fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true }); }
export function normalizeText(value) { return String(value).replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n'; }
export function syncText(relative, content) {
  const expected = normalizeText(content);
  const target = path.join(root, relative);
  const actual = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
  if (actual === expected) return;
  if (check) { failures.push(`Stale publication file: ${relative}`); return; }
  ensureParent(relative); fs.writeFileSync(target, expected, 'utf8');
}
export function syncBytes(relative, bytes) {
  const target = path.join(root, relative);
  const actual = fs.existsSync(target) ? fs.readFileSync(target) : null;
  if (actual && Buffer.compare(actual, bytes) === 0) return;
  if (check) { failures.push(`Stale publication file: ${relative}`); return; }
  ensureParent(relative); fs.writeFileSync(target, bytes);
}
export function prune(relative, allowed) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) return;
  for (const name of fs.readdirSync(target)) {
    if (allowed.has(name)) continue;
    if (check) failures.push(`Unexpected stale publication path: ${relative}/${name}`);
    else fs.rmSync(path.join(target, name), { recursive: true, force: true });
  }
}
export function copyText(source, target, transform = (value) => value) { syncText(target, transform(read(source))); }
export function stripNoIndex(html) { return html.replace(/^\s*<meta name="robots" content="noindex,nofollow" \/>\n/m, ''); }
export function withCanonical(html, url) { return html.includes('rel="canonical"') ? html : html.replace('</title>', `</title>\n  <link rel="canonical" href="${url}" />`); }
export function currentize(html, title, description, canonicalUrl) {
  const out = stripNoIndex(html)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`)
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/Clean v0\.6\.3 reconstruction candidate · not the current public release · publication remains locked\./g, 'Gauntlet v0.6.3 · current canonical playtest edition.')
    .replace(/Certified clean rules · version 0\.6\.3 · reconstruction only/g, 'Current canonical rules · version 0.6.3')
    .replace(/Certified clean data · version 0\.6\.3 · reconstruction only/g, 'Current canonical data · version 0.6.3')
    .replace(/Reconstruction navigation/g, 'Primary navigation')
    .replace(/Reconstruction candidate/gi, 'current canonical playtest edition')
    .replace(/Current public playtest release remains v0\.6\.1\./g, 'Current canonical playtest release: v0.6.3.')
    .replace(/Current public rules \(v0\.6\.1\)/g, 'Home')
    .replace(/Current public Deckbuilder \(v0\.6\.1\)/g, 'Release package')
    .replace(/Current public Start \(v0\.6\.1\)/g, 'Home')
    .replace(/current public release/g, 'current release')
    .replace(/not the current public release/g, 'current canonical playtest edition')
    .replace(/publication remains locked/g, 'publication verified from the certified authority');
  return withCanonical(out, canonicalUrl);
}
export function replacePlayerFacingChapter11(source, chapter11 = read(PLAYER_CHAPTER_11)) {
  const startMarker = '# 11. Detailed Card and Timing Rules';
  const endMarker = '# 12. Overlays and Other Shared Card Rules';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  const replacement = String(chapter11).trim();
  if (start < 0 || end < 0 || end <= start) throw new Error('Rulebook Chapter 11 boundaries could not be located.');
  if (!replacement.startsWith(startMarker) || replacement.includes(`\n${endMarker}`)) {
    throw new Error('Player-facing Chapter 11 override has invalid boundaries.');
  }
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}
export function applyPlayerFacingRulebookCorrections(source) {
  const internalSanctionGuidance = 'A Sanction may state additional removal conditions. Cards therefore do not need to repeat identification of the refusing opponent or the default expiration after later acceptance.';
  const playerSanctionRule = 'Additional printed removal conditions also apply unless the Sanction says otherwise.';
  const count = source.split(internalSanctionGuidance).length - 1;
  if (count !== 1) throw new Error(`Expected exactly one remaining internal Sanction guidance paragraph after Chapter 11 replacement; found ${count}.`);
  return source.replace(internalSanctionGuidance, playerSanctionRule);
}
export function publicAuthorityNote(source) {
  const normalized = normalizeV063LastStandText(source)
    .replace('**Version 0.6.3 — Clean Reconstruction Candidate**', '**Version 0.6.3**')
    .replace(/^> \*\*Authority candidate, not current\/public rules\.\*\*[^\n]*\n\n/m, '');
  return applyPlayerFacingRulebookCorrections(replacePlayerFacingChapter11(normalized));
}
export function publicCanonicalData(source) {
  const value = typeof source === 'string' ? JSON.parse(source) : source;
  return normalizeV063LastStandValue(value);
}
export function publicFactionGuide(source) { return source.replace(/^> \*\*Clean v0\.6\.3[^\n]*\n\n/m, ''); }
export function publicGeneratedReference(source, kind) {
  const title = kind === 'cards' ? '# Gauntlet v0.6.3 Card and Territory Reference' : '# Gauntlet v0.6.3 Starter Deck Catalog';
  return source.replace(/^# Gauntlet clean v0\.6\.3 (?:Card and Territory Reference|Starter Deck Catalog)$/m, title)
    .replace(/^Reconstruction-only print\/export artifact\. Authority set: `[^`]+`\.$/m, `Current v0.6.3 print/export artifact. Authority set: \`${AUTHORITY_SET_ID}\`.`);
}
export function finish(label) {
  if (!failures.length) return;
  console.error(`${label} check failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}