import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'v0.6.3');
const canonicalSource = 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json';
const canonicalTarget = 'v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json';

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const write = (relative, content) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, String(content).replace(/\s+$/, '') + '\n', 'utf8');
};
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const inlineMarkdown = (value) => escapeHtml(value)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>');

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let list = null;
  let quote = false;
  let table = false;
  const closeList = () => { if (list) html.push(`</${list}>`); list = null; };
  const closeQuote = () => { if (quote) html.push('</blockquote>'); quote = false; };
  const closeTable = () => { if (table) html.push('</tbody></table>'); table = false; };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); closeQuote(); closeTable(); continue; }
    if (line.startsWith('<!--')) continue;
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList(); closeQuote(); closeTable();
      const level = Math.min(6, heading[1].length + 1);
      const id = heading[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      html.push(`<h${level} id="${id}">${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) { closeList(); closeQuote(); closeTable(); html.push('<hr>'); continue; }
    if (line.startsWith('>')) {
      closeList(); closeTable();
      if (!quote) { html.push('<blockquote>'); quote = true; }
      html.push(`<p>${inlineMarkdown(line.replace(/^>\s?/, ''))}</p>`);
      continue;
    }
    closeQuote();
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      closeTable();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { closeList(); html.push(`<${kind}>`); list = kind; }
      html.push(`<li>${inlineMarkdown((bullet || numbered)[1])}</li>`);
      continue;
    }
    if (/^\|.*\|$/.test(line)) {
      closeList();
      if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(line)) continue;
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (!table) { html.push('<table><tbody>'); table = true; }
      html.push(`<tr>${cells.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`);
      continue;
    }
    closeList(); closeTable();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  closeList(); closeQuote(); closeTable();
  return html.join('\n');
}

const nav = `<nav class="release-nav" aria-label="v0.6.3 development navigation"><a href="/">Gauntlet home</a><a href="/v0.6.3/">v0.6.3 dev</a><a href="/v0.6.3/start/">Start</a><a href="/v0.6.3/rulebook/">Rulebook</a><a href="/v0.6.3/quick-reference/">Quick reference</a><a href="/v0.6.3/deckbuilder/">Deckbuilder</a><a href="/v0.6.3/reference/">Card reference</a><a href="/v0.6.3/changes/">Changes</a><a href="/v0.6.2/">Published v0.6.2</a></nav>`;

function page({ title, description, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-8YYYZJGGPE"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-8YYYZJGGPE');</script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32">
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/v0.6.3/styles.css">
  <style>.release-shell{max-width:1060px;margin:0 auto;padding:2rem 1rem 5rem}.release-nav{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem}.release-nav a{font-weight:700}.dev-banner{margin-bottom:1rem;padding:.75rem 1rem;border:1px solid #9a6b1b;background:#fff1c6;color:#4a3412;font-weight:700}.release-doc{background:rgba(255,255,255,.78);padding:clamp(1rem,3vw,3rem);border:1px solid rgba(80,55,30,.25);box-shadow:0 18px 50px rgba(60,35,20,.12)}.release-doc table{width:100%;border-collapse:collapse;display:block;overflow:auto}.release-doc td{border:1px solid rgba(80,55,30,.25);padding:.45rem .6rem;vertical-align:top}.release-doc blockquote{margin:1rem 0;padding:.2rem 1rem;border-left:4px solid #8f1f25;background:rgba(143,31,37,.06)}.release-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin:1.5rem 0}.release-actions a{display:inline-block;padding:.7rem 1rem;border:1px solid currentColor;text-decoration:none;font-weight:700}</style>
</head>
<body><main class="release-shell">${nav}<div class="dev-banner">v0.6.3 development candidate · v0.6.2 remains the canonical published playtest edition.</div><article class="release-doc">${body}</article></main></body>
</html>`;
}

const canonical = JSON.parse(read(canonicalSource));
fs.mkdirSync(path.join(out, 'data'), { recursive: true });
fs.copyFileSync(path.join(root, canonicalSource), path.join(root, canonicalTarget));
fs.copyFileSync(path.join(root, 'v0.6.2/styles.css'), path.join(out, 'styles.css'));

const docs = [
  ['rulebook', 'Gauntlet v0.6.3 Rulebook Candidate', 'artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Rulebook_Candidate.md'],
  ['start', 'Gauntlet v0.6.3 First Game Guide', 'artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_First_Game_Guide_Candidate.md'],
  ['quick-reference', 'Gauntlet v0.6.3 Quick Reference', 'artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Reference_Guide_Candidate.md'],
  ['changes', 'What Changed in Gauntlet v0.6.3', 'artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Returning_Player_Changes_Candidate.md'],
];
for (const [directory, title, source] of docs) {
  write(`v0.6.3/${directory}/index.html`, page({ title, description: `${title} development review surface.`, body: markdownToHtml(read(source)) }));
}

write('v0.6.3/index.html', page({
  title: 'Gauntlet v0.6.3 — Development Candidate',
  description: 'Development review portal for the next Gauntlet playtest revision.',
  body: `<p class="eyebrow">Next-release development surface</p><h1>Gauntlet v0.6.3 candidate</h1><p>This portal materializes the integrated v0.6.3 rules and card-data candidates for browser review without changing the published v0.6.2 release.</p><div class="release-actions"><a href="/v0.6.3/start/">First Game guide</a><a href="/v0.6.3/rulebook/">Rulebook candidate</a><a href="/v0.6.3/deckbuilder/">Deckbuilder candidate</a><a href="/v0.6.3/reference/">Card reference</a><a href="/v0.6.3/changes/">Returning-player changes</a></div><h2>Candidate state</h2><ul><li>${canonical.cards.length} playable cards with final v0.6.3 text.</li><li>${canonical.territories.length} Territories inherited from v0.6.2 at this stage.</li><li>Opening selection precedes informed Territory arrangement and initiative.</li><li>Final-Territory capture and Last Stand victory are equal ways to run the Gauntlet.</li><li>Rules Arbiter remains on the published v0.6.2 corpus until its own v0.6.3 propagation pass.</li></ul><p><a href="/v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json">Open integrated candidate JSON</a></p>`
}));

const referenceApp = `const VERSION = "v0.6.3-candidate";
const state={data:null,search:"",allegiance:"all",cost:"all"};const $=id=>document.getElementById(id);
init().catch(error=>{$("status").innerHTML=\`<strong class="status-bad">Candidate load failed.</strong><p>\${escapeHtml(error.message)}</p>\`;});
async function init(){state.data=await fetch("../data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json",{cache:"no-store"}).then(assertJson);validate(state.data);$("status").innerHTML=\`<strong class="status-good">v0.6.3 development candidate</strong><p>\${state.data.cards.length} cards · \${state.data.territories.length} Territories · \${state.data.proposals.length} Proposals</p>\`;$("cardCount").textContent=state.data.cards.length;$("cardAllegiance").append(...Object.keys(state.data.card_pool_summary).map(name=>option(name,name)));$("cardSearch").addEventListener("input",()=>{state.search=$("cardSearch").value.toLowerCase().trim();renderCards();});$("cardAllegiance").addEventListener("change",()=>{state.allegiance=$("cardAllegiance").value;renderCards();});$("cardCost").addEventListener("change",()=>{state.cost=$("cardCost").value;renderCards();});renderCards();renderTerritories();renderProposals();}
async function assertJson(r){if(!r.ok)throw new Error(\`Candidate data returned \${r.status}\`);return r.json();}
function validate(d){if(d?.version!==VERSION)throw new Error(\`Expected \${VERSION}, received \${d?.version??"unknown"}.\`);if(d.cards?.length!==128)throw new Error("Expected 128 cards.");if(d.territories?.length!==25)throw new Error("Expected 25 Territories.");if(d.battlefield?.last_stand?.final_territory_capture_required!==false)throw new Error("Stale Last Stand data.");if(d.setup?.sequence?.[0]!=="prepare_faction_components")throw new Error("Stale setup data.");}
function renderCards(){const cards=state.data.cards.filter(c=>{if(state.allegiance!=="all"&&c.allegiance!==state.allegiance)return false;if(state.cost!=="all"&&String(c.cost)!==state.cost)return false;const h=\`\${c.name} \${c.allegiance} \${c.trait??""} \${(c.effects??[]).map(e=>\`\${e.label} \${e.text}\`).join(" ")}\`.toLowerCase();return !state.search||h.includes(state.search);});const host=$("cardEntries");host.replaceChildren();for(const c of cards){const a=document.createElement("article");a.className="panel reference-entry";a.innerHTML=\`<p class="eyebrow">\${escapeHtml(c.allegiance)} · value \${c.cost}\${c.trait?\` · \${escapeHtml(c.trait)}\`:""}\${c.unique?" · Unique":""}</p><h2>\${escapeHtml(c.name)}</h2>\${(c.effects??[]).map(e=>\`<div class="mode"><strong>\${escapeHtml(e.label)}</strong>\${formatText(e.text)}</div>\`).join("")}\`;host.append(a);}}
function renderTerritories(){const host=$("territoryEntries");host.replaceChildren();for(const t of state.data.territories){const a=document.createElement("article");a.className="card";a.innerHTML=\`<p class="eyebrow">\${t.arena?"Arena":"Territory"} · \${t.number}</p><h3>\${escapeHtml(t.name)}</h3><p>\${formatText(t.text)}</p>\`;host.append(a);}}
function renderProposals(){const host=$("proposalEntries");host.replaceChildren();for(const p of state.data.proposals){const a=document.createElement("article");a.className="card";a.innerHTML=\`<p class="eyebrow">Stake \${p.stake}</p><h3>\${escapeHtml(p.name)}</h3><p><strong>Requirement:</strong> \${escapeHtml(p.requirement)}</p><div class="mode"><strong>Accepted</strong>\${formatText(p.accepted)}</div><div class="mode"><strong>Refused</strong>\${formatText(p.refused)}</div>\`;host.append(a);}}
function option(v,l){const n=document.createElement("option");n.value=v;n.textContent=l;return n;}function formatText(v){return escapeHtml(v).replaceAll("\\n","<br>");}function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
`;
write('v0.6.3/reference/app.js', referenceApp);
write('v0.6.3/reference/index.html', `<!doctype html><html lang="en"><head><!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-8YYYZJGGPE"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-8YYYZJGGPE');</script><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="Gauntlet v0.6.3 development card and component reference."><title>Gauntlet v0.6.3 Candidate Reference</title><link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32"><link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1"><link rel="stylesheet" href="../styles.css"></head><body><div class="release-banner"><strong>v0.6.3 development candidate</strong> · v0.6.2 remains canonical</div><header class="site-header no-print"><a class="brand" href="../"><span class="brand-mark">G</span><span>Gauntlet</span></a><nav><a href="../start/">Start</a><a href="../deckbuilder/">Deckbuilder</a><a href="#shared">Shared</a><a href="#cards">Cards</a><a href="#territories">Territories</a><a href="#proposals">Proposals</a></nav></header><main class="shell"><section class="hero"><div><p class="eyebrow">Integrated candidate reference</p><h1>Review the v0.6.3 state.</h1><p class="lede">This page reads the integrated unpublished v0.6.3 canonical-data candidate.</p></div><aside id="status" class="panel">Loading v0.6.3 candidate…</aside></section><section id="shared" class="section"><div class="section-heading"><div><p class="eyebrow">Shared reference</p><h2>Setup, turn, and victory</h2></div></div><div class="grid"><article class="card"><h3>Setup</h3><p class="sequence">Faction setup → Draw 4 / discard 1 / keep 3 → arrange Territories → form/reveal → place tokens → initiative</p><p>Tokens begin on the Territories at their own ends. Setup placement is neither movement nor entering.</p></article><article class="card"><h3>Your turn</h3><p class="sequence">Capture → Draw → Opening → Movement → Denouement → Cleanup</p><p>Normally take one Action during either Opening or Denouement.</p></article><article class="card"><h3>Battle</h3><p class="sequence">Onset → Gambits → Reserves → Tactics → Outcome → Aftermath</p><p>Before committing cards, review the contested Territory and your Assets.</p></article><article class="card"><h3>Run the Gauntlet</h3><p>Win immediately by capturing the Territory at your opponent's end or winning their Last Stand. A separate legal movement sequence can initiate the Last Stand without prior final-Territory capture.</p></article></div></section><section id="cards" class="section"><div class="section-heading"><div><p class="eyebrow">Playable pool</p><h2><span id="cardCount">0</span> card titles</h2></div></div><div class="toolbar no-print"><label>Search<input id="cardSearch" type="search"></label><label>Allegiance<select id="cardAllegiance"><option value="all">All</option></select></label><label>Value<select id="cardCost"><option value="all">All</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label></div><div id="cardEntries"></div></section><section id="territories" class="section print-break"><div class="section-heading"><div><p class="eyebrow">Inherited battlefield pool</p><h2>Territories</h2></div></div><div id="territoryEntries" class="grid"></div></section><section id="proposals" class="section print-break"><div class="section-heading"><div><p class="eyebrow">Inherited Diplomat components</p><h2>Proposals</h2></div></div><div id="proposalEntries" class="grid"></div></section></main><script type="module" src="app.js"></script></body></html>`);

let deckIndex = read('v0.6.2/deckbuilder/index.html')
  .replaceAll('v0.6.2', 'v0.6.3')
  .replace('current canonical playtest edition', 'development candidate · v0.6.2 remains canonical')
  .replace('Published Deckbuilder', 'Development Deckbuilder')
  .replace('Loading effective v0.6.3 data…', 'Loading integrated v0.6.3 candidate…')
  .replace('<a href="../../deckbuilder/">Historical v0.6.1 tool</a>', '<a href="../../v0.6.2/deckbuilder/">Published v0.6.2 tool</a>')
  .replace('Choose three in order', 'Choose three; arrange after opening selection')
  .replace('Territories, own end outward', 'Selected Territories')
  .replace('Build and print a legal Gauntlet v0.6.3 Deck.', 'Build and review a Gauntlet v0.6.3 candidate Deck.')
  .replace('<head>', '<head>\n  <meta name="robots" content="noindex,nofollow">');
write('v0.6.3/deckbuilder/index.html', deckIndex);

let deckApp = read('v0.6.2/deckbuilder/app.js')
  .replaceAll('V062_VERSION', 'V063_VERSION')
  .replace('const V063_VERSION = "v0.6.2";', 'const V063_VERSION = "v0.6.3-candidate";')
  .replace('gauntlet-v062-deckbuilder', 'gauntlet-v063-candidate-deckbuilder')
  .replace('fetch("../../releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json", { cache: "no-store" })', 'fetch("../data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json", { cache: "no-store" })')
  .replace('<strong class="status-good">${data.cards.length} cards loaded.</strong><p>${escapeHtml(V063_VERSION)} · ${data.territories.length} Territories · ${data.proposals.length} Proposals</p>', '<strong class="status-good">${data.cards.length} candidate cards loaded.</strong><p>v0.6.3 development · ${data.territories.length} Territories · ${data.proposals.length} Proposals</p>')
  .replace('<p class="eyebrow">Approved v0.6.2 starter</p>', '<p class="eyebrow">Inherited v0.6.2 starter list</p>')
  .replace('<p><strong>Opening plan:</strong> ${escapeHtml(deck.openingPlan ?? "Establish the faction engine early.")}</p>', '<p><strong>Inherited strategy note:</strong> ${escapeHtml(deck.openingPlan ?? "Establish the faction engine early.")}</p>')
  .replace('<p><strong>Territories:</strong> ${deck.territories.map(escapeHtml).join(" → ")}</p>', '<p><strong>Territories:</strong> ${deck.territories.map(escapeHtml).join(", ")}. Arrange these three after opening selection.</p>');
write('v0.6.3/deckbuilder/app.js', deckApp);

console.log('Built v0.6.3 development browser portal, rule pages, candidate reference, and Deckbuilder.');
