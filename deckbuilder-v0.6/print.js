(() => {
  const PRINT_FONT_LINKS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700;800;900&display=block" rel="stylesheet">`;

  const SUPPLEMENTAL_REQUIREMENTS = {
    military: ["Selected Leader Card", "Military Command Tracker"],
    diplomats: ["Selected Leader Card", "Influence Tracker", "Nine Proposal / Treaty Article cards", "Diplomat Reference card"],
    inquisition: ["Selected Leader Card", "Conviction Tracker", "Inquisition Doctrine reference", "Purge Reference"]
  };

  document.addEventListener("DOMContentLoaded", installPrintButton);

  function installPrintButton() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", openPrintView);

    const readyCheck = window.setInterval(() => {
      const ready = state.cards.length > 0 && state.territoryPool?.length > 0;
      button.disabled = !ready;
      button.title = ready
        ? "Open a printable deck package for printing or saving as PDF"
        : "Waiting for card and Territory sources to load";
      if (ready) window.clearInterval(readyCheck);
    }, 100);
  }

  function openPrintView() {
    const printData = readPrintData();
    if (!printData) return;

    if (!printData.validation.valid && !window.confirm("This deck is currently invalid. Print it anyway?")) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Popup blocked. Allow popups to use Print / PDF.");
      return;
    }

    printWindow.document.write(buildPrintDocument(printData));
    printWindow.document.close();
    printWindow.focus();
  }

  function readPrintData() {
    const faction = getFaction();
    const leader = faction?.leaders.find(item => item.id === state.leaderId);
    if (!faction || !leader) {
      window.alert("Choose a completed faction and leader before printing.");
      return null;
    }

    const entries = deckEntries();
    const cards = entries.flatMap(({ card, qty }) => Array.from({ length: qty }, () => ({ ...card })));
    const territories = (state.territories || [])
      .map(id => state.territoryPool.find(territory => territory.id === id))
      .filter(Boolean);

    return {
      name: state.deckName.trim() || "Untitled v0.6 deck",
      faction,
      leader,
      entries,
      cards,
      territories,
      validation: validateDeck(),
      supplementalRequirements: SUPPLEMENTAL_REQUIREMENTS[faction.id] || ["Selected Leader Card"]
    };
  }

  function buildPrintDocument(data) {
    const printableItems = [
      leaderToPrintHtml(data.faction, data.leader),
      ...data.cards.map(cardToPrintHtml),
      ...data.territories.map(territoryToPrintHtml)
    ];

    const firstPageItems = printableItems.slice(0, 6);
    const remainingItems = printableItems.slice(6);
    const firstPage = firstPageToHtml(data, firstPageItems, remainingItems.length > 0);
    const remainingPages = chunk(remainingItems, 9).map(items => cardTableToHtml(items, 3)).join("");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(data.name)} — Gauntlet v0.6</title>
${PRINT_FONT_LINKS}
<style>
*{box-sizing:border-box;font-synthesis:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
body{margin:0;background:#fff;color:#111;font-family:"Noto Sans",Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
h1{margin:0 0 .04in;font-size:21pt;line-height:1}
h2{margin:0 0 .05in;font-size:10pt;text-transform:uppercase;letter-spacing:.05em}
p{margin:0}
.first-page,.card-page{display:block;width:7.5in;margin:0 auto}
.first-page{height:10.5in;overflow:hidden}
.first-page.has-more-pages{break-after:page;page-break-after:always}
.first-page-summary{height:3.5in;overflow:hidden;padding:.08in .12in .04in}
.summary-line{margin-bottom:.08in;font-size:9pt;line-height:1.2}
.summary-grid{display:grid;grid-template-columns:1.55fr .95fr;gap:.25in;min-height:2.72in}
.deck-list{columns:2;column-gap:.24in;font-size:7.7pt;line-height:1.18}
.deck-list-entry{break-inside:avoid}
.summary-side{font-size:7.8pt;line-height:1.24}
.summary-block+.summary-block{margin-top:.11in}
.summary-list{margin:.03in 0 0;padding-left:.17in}
.summary-list li+li{margin-top:.02in}
.validity{font-weight:900;text-transform:uppercase}
.validity.valid{color:#245b38}
.validity.invalid{color:#8a2f2f}
.card-page{break-after:page;page-break-after:always}
.card-page:last-of-type{break-after:auto;page-break-after:auto}
.card-table{width:7.5in;margin:0 auto;border-collapse:collapse;border-spacing:0;table-layout:fixed}
.card-table.three-row{height:10.5in}
.card-table.two-row{height:7in}
.card-table td{width:2.5in;height:3.5in;min-width:2.5in;max-width:2.5in;min-height:3.5in;max-height:3.5in;padding:0;border:0;vertical-align:top;overflow:hidden}
.print-card{--card-text-size:7pt;--card-label-size:6.8pt;position:relative;width:2.5in;height:3.5in;overflow:hidden;border:1px solid #111;background:#fff}
.main-card,.leader-card{display:grid;grid-template-rows:.38in 1fr .16in}
.card-header{position:relative;display:flex;align-items:center;min-height:.38in;padding:.05in .42in .05in .1in;background:#d7d7d7!important;border-bottom:1px solid #111;box-shadow:inset 0 0 0 999px #d7d7d7}
.card-name{font-size:12.1pt;font-weight:800;line-height:1.02}
.cost-circle{position:absolute;top:.065in;right:.065in;display:flex;align-items:center;justify-content:center;width:.28in;height:.28in;border:1.25px solid #111;border-radius:50%;background:#fff!important;font-size:10.6pt;font-weight:900;line-height:1;text-align:center}
.unique-flag{position:absolute;top:.42in;right:.07in;font-size:6pt;font-weight:900;text-transform:uppercase}
.card-body{min-height:0;overflow:hidden;padding:.075in .1in .055in}
.rules-section+.rules-section{margin-top:.055in;padding-top:.045in;border-top:1px solid #bbb}
.card-label{margin-bottom:.022in;font-size:var(--card-label-size);font-weight:900;line-height:1;text-transform:uppercase;letter-spacing:.035em}
.card-text{font-size:var(--card-text-size);line-height:1.08;white-space:pre-line;overflow-wrap:anywhere}
.rules-section.reminder .card-text{font-style:italic}
.card-footer{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:.04in;padding:.035in .06in;background:#d7d7d7!important;border-top:1px solid #111;box-shadow:inset 0 0 0 999px #d7d7d7;font-size:5.1pt;line-height:1}
.card-footer span:first-child{font-weight:800;text-align:left}
.card-footer span:nth-child(2){font-size:4.7pt;text-align:center}
.card-footer span:last-child{text-align:right}
.leader-card{--card-text-size:6.65pt;--card-label-size:6.5pt}
.leader-card .card-header{padding-right:.1in;background:#cfcfcf!important;box-shadow:inset 0 0 0 999px #cfcfcf}
.leader-intro{margin-bottom:.06in;padding-bottom:.05in;border-bottom:1px solid #999}
.leader-tagline{font-size:7.2pt;font-style:italic}
.leader-role{margin-top:.025in;font-size:6.4pt;font-weight:800;text-transform:uppercase}
.territory{--card-text-size:8pt;--card-label-size:7pt}
.territory-inner{position:absolute;top:0;left:2.5in;width:3.5in;height:2.5in;transform:rotate(90deg);transform-origin:top left;display:grid;grid-template-rows:.36in 1fr .16in;overflow:hidden}
.territory-header{display:flex;align-items:end;gap:.08in;padding:.05in .1in;background:#d7d7d7!important;border-bottom:1px solid #111;box-shadow:inset 0 0 0 999px #d7d7d7}
.territory-type{font-size:7pt;font-weight:900;text-transform:uppercase;white-space:nowrap}
.territory-name{font-size:12.6pt;font-weight:800;line-height:1}
.territory-body{overflow:hidden;padding:.08in .1in}
.territory .card-text{font-size:var(--card-text-size);line-height:1.12}
.territory-footer{display:flex;justify-content:space-between;align-items:center;padding:.035in .06in;background:#d7d7d7!important;border-top:1px solid #111;box-shadow:inset 0 0 0 999px #d7d7d7;font-size:5.1pt}
@page{size:letter;margin:.25in .1in .04in .1in}
</style>
</head>
<body>
${firstPage}
${remainingPages}
<script>
function nextFrame(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
function fitPrintCards(){document.querySelectorAll('.fit-target').forEach(target=>{const territory=target.classList.contains('territory-inner');const leader=target.classList.contains('leader-card');let textSize=territory?8:(leader?6.65:7);let labelSize=territory?7:(leader?6.5:6.8);const minimum=territory?5.2:(leader?4.4:4.5);while(target.scrollHeight>target.clientHeight&&textSize>minimum){textSize-=.18;labelSize=Math.max(4.2,labelSize-.1);target.style.setProperty('--card-text-size',textSize.toFixed(2)+'pt');target.style.setProperty('--card-label-size',labelSize.toFixed(2)+'pt');}});}
async function preparePrint(){if(document.fonts?.ready){try{await document.fonts.ready;}catch(error){}}fitPrintCards();document.body.offsetHeight;await nextFrame();await nextFrame();setTimeout(()=>window.print(),300);}
window.addEventListener('load',preparePrint);
<\/script>
</body>
</html>`;
  }

  function firstPageToHtml(data, pageItems, hasMorePages) {
    const validationClass = data.validation.valid ? "valid" : "invalid";
    const territoryNames = data.territories.length
      ? data.territories.map(territory => `<li>${escapeHtml(territory.name)}</li>`).join("")
      : "<li>None selected</li>";
    const supplementalItems = data.supplementalRequirements.map(item => `<li>${escapeHtml(item)}</li>`).join("");

    return `<section class="first-page${hasMorePages ? " has-more-pages" : ""}">
      <div class="first-page-summary">
        <h1>${escapeHtml(data.name)}</h1>
        <p class="summary-line"><strong>${escapeHtml(data.faction.name)} — ${escapeHtml(data.leader.name)}</strong> · ${data.validation.cardCount}/30+ cards · ${data.validation.pointTotal}/60 value · ${data.territories.length}/3 Territories · <span class="validity ${validationClass}">${data.validation.valid ? "Valid" : "Invalid"}</span></p>
        <div class="summary-grid">
          <section>
            <h2>Playable deck</h2>
            <div class="deck-list">${data.entries.map(({ card, qty }) => `<div class="deck-list-entry">${qty}x ${escapeHtml(card.name)} (${card.cost}) <em>${escapeHtml(card.factionLabel)}</em></div>`).join("") || "No playable cards selected."}</div>
          </section>
          <aside class="summary-side">
            <div class="summary-block"><h2>Territories</h2><ul class="summary-list">${territoryNames}</ul></div>
            <div class="summary-block"><h2>Faction components</h2><ul class="summary-list">${supplementalItems}</ul></div>
            <div class="summary-block"><strong>Print note:</strong> This deck package includes the selected Leader Card. Use the faction sheets for trackers, references, and other faction-specific components not reproduced here.</div>
          </aside>
        </div>
      </div>
      ${cardTableToHtml(pageItems, 2, true)}
    </section>`;
  }

  function cardTableToHtml(items, rowCount = 3, suppressSection = false) {
    const rows = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const cells = [];
      for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
        const index = rowIndex * 3 + columnIndex;
        cells.push(`<td>${items[index] || ""}</td>`);
      }
      rows.push(`<tr>${cells.join("")}</tr>`);
    }
    const table = `<table class="card-table ${rowCount === 2 ? "two-row" : "three-row"}"><tbody>${rows.join("")}</tbody></table>`;
    return suppressSection ? table : `<section class="card-page">${table}</section>`;
  }

  function cardToPrintHtml(card) {
    const sections = Object.entries(card.sections || {});
    const sectionHtml = sections.length
      ? sections.map(([label, text]) => rulesSection(label, text)).join("")
      : rulesSection("Text", "—");

    return `<article class="print-card main-card fit-target">
      <header class="card-header"><span class="card-name">${escapeHtml(card.name)}</span><span class="cost-circle">${escapeHtml(card.cost)}</span></header>
      ${card.unique ? '<div class="unique-flag">Unique</div>' : ""}
      <div class="card-body">${sectionHtml}</div>
      <footer class="card-footer"><span>${escapeHtml(card.factionLabel)}</span><span>© 2026 T. Scott</span><span>v0.6 dev</span></footer>
    </article>`;
  }

  function leaderToPrintHtml(faction, leader) {
    return `<article class="print-card leader-card fit-target">
      <header class="card-header"><span class="card-name">${escapeHtml(leader.name)}</span></header>
      <div class="card-body">
        <div class="leader-intro"><div class="leader-tagline">${escapeHtml(leader.tagline || "")}</div><div class="leader-role">${escapeHtml(leader.role || faction.identity)}</div></div>
        ${(leader.rules || []).map(([label, text]) => rulesSection(label, text)).join("")}
      </div>
      <footer class="card-footer"><span>${escapeHtml(faction.name)} Leader</span><span>Supplemental</span><span>v0.6 dev</span></footer>
    </article>`;
  }

  function territoryToPrintHtml(territory) {
    return `<article class="print-card territory"><div class="territory-inner fit-target">
      <header class="territory-header"><span class="territory-type">${territory.arena ? "Arena Territory" : "Territory"}</span><span class="territory-name">${escapeHtml(territory.name)}</span></header>
      <div class="territory-body"><div class="card-text">${escapeHtml(territory.text || "")}</div></div>
      <footer class="territory-footer"><span>${escapeHtml(territory.complexity || "")}</span><span>Gauntlet v0.6 dev</span></footer>
    </div></article>`;
  }

  function rulesSection(label, text) {
    const reminderClass = String(label).toLowerCase() === "reminder" ? " reminder" : "";
    return `<section class="rules-section${reminderClass}"><div class="card-label">${escapeHtml(label)}</div><div class="card-text">${escapeHtml(text || "—")}</div></section>`;
  }

  function chunk(items, size) {
    const result = [];
    for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
    return result;
  }
})();
