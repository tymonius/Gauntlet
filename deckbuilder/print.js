(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state } = deckbuilder;
  const getFaction = () => deckbuilder.getFaction();
  const deckEntries = () => deckbuilder.deckEntries();
  const validateDeck = () => deckbuilder.validate();
  const escapeHtml = value => deckbuilder.escapeHtml(value);
  const productionPrint = () => {
    const renderer = deckbuilder.feature("productionPrintRenderer");
    if (!renderer) throw new Error("Deckbuilder production print renderer is unavailable.");
    return renderer;
  };

  const PRINT_FONT_LINKS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700;800;900&display=block" rel="stylesheet">`;

  document.addEventListener("DOMContentLoaded", installPrintButton);

  function installPrintButton() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", openPrintView);

    const readyCheck = window.setInterval(() => {
      const ready = state.cards.length > 0
        && state.territoryPool?.length > 0
        && state.currentFactionComponentsReady === true;
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

    const html = buildPrintDocument(printData);
    const preparedHtml = deckbuilder.preparePrintDocument(html, {
      kind: "deck",
      printData
    });
    printWindow.document.write(preparedHtml);
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
    const supplementalPackage = deckbuilder.feature("supplementalPackages")?.[faction.id] || {
      summary: ["Selected Leader Card"],
      leaderImages: {},
      components: []
    };

    return {
      name: state.deckName.trim() || `Untitled ${state.currentGameDisplayVersion || state.currentGameVersion || "current"} Deck`,
      versionLabel: state.currentGameDisplayVersion || state.currentGameVersion || "current",
      faction,
      leader,
      entries,
      cards,
      territories,
      selectedRiteIds: state.factionId === "mystics" ? [...(state.rites || [])] : [],
      selectedRites: state.factionId === "mystics"
        ? (state.rites || []).map(id => state.currentGameData?.mystics?.rites?.find(rite => rite.id === id)).filter(Boolean)
        : [],
      validation: validateDeck(),
      supplementalPackage,
      supplementalRequirements: supplementalPackage.summary || ["Selected Leader Card"]
    };
  }

  function buildPrintDocument(data) {
    const supplemental = buildSupplementalPackage(data);
    const printableItems = [
      leaderToPrintHtml(data.faction, data.leader),
      ...supplemental.inlineItems,
      ...data.cards.map(cardToPrintHtml),
      ...data.territories.map(territoryToPrintHtml)
    ];

    const firstPageItems = printableItems.slice(0, 6);
    const remainingItems = printableItems.slice(6);
    const firstPage = firstPageToHtml(data, firstPageItems, remainingItems.length > 0 || supplemental.dedicatedPages.length > 0);
    const remainingPages = chunk(remainingItems, 9).map(items => cardTableToHtml(items, 3)).join("");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(data.name)} — Gauntlet ${escapeHtml(data.versionLabel)}</title>
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
.main-card{display:grid;grid-template-rows:.38in 1fr .16in}
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
.leader-card{--card-text-size:5.75pt;--card-label-size:5.55pt;display:grid;grid-template-rows:1.15in 1fr .16in}
.leader-art{position:relative;overflow:hidden;border-bottom:1px solid #111;background:#ccc}
.leader-art img{width:100%;height:100%;object-fit:cover;object-position:center top;filter:grayscale(100%)}
.leader-art::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 38%,rgba(0,0,0,.82))}
.leader-faction,.leader-title{position:absolute;z-index:1;left:.09in;color:#fff;text-shadow:0 1px 2px #000}
.leader-faction{bottom:.3in;font-size:5.8pt;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
.leader-title{right:.08in;bottom:.07in;font-size:13.4pt;font-weight:900;line-height:.95}
.leader-card-body{min-height:0;overflow:hidden;padding:.06in .09in .045in}
.leader-intro{margin-bottom:.045in;padding-bottom:.04in;border-bottom:1px solid #999}
.leader-tagline{font-size:6.5pt;font-style:italic}
.leader-role{margin-top:.018in;font-size:5.5pt;font-weight:800;text-transform:uppercase}
.reference-card,.purge-card{--card-text-size:5.65pt;--card-label-size:5.45pt;display:grid;grid-template-rows:.42in .22in 1fr .16in}
.reference-card.no-subtitle,.purge-card{grid-template-rows:.42in 1fr .16in}
.supplemental-header{display:flex;align-items:center;padding:.06in .09in;background:#d1d1d1!important;border-bottom:1px solid #111;box-shadow:inset 0 0 0 999px #d1d1d1;font-size:11pt;font-weight:900;line-height:1;text-transform:uppercase}
.supplemental-subtitle{display:flex;align-items:center;padding:.025in .09in;background:#eee!important;border-bottom:1px solid #bbb;font-size:5.8pt;font-weight:800;text-transform:uppercase;letter-spacing:.045em}
.reference-body{min-height:0;overflow:hidden;padding:.06in .09in .04in}
.reference-section+.reference-section{margin-top:.045in;padding-top:.035in;border-top:1px solid #ccc}
.reference-footer{display:flex;align-items:center;justify-content:center;padding:.025in .06in;background:#e1e1e1!important;border-top:1px solid #111;font-size:4.9pt;font-weight:700;text-align:center}
.purge-intro{margin-bottom:.045in;font-size:var(--card-text-size);line-height:1.08}
.purge-list{display:grid;gap:.04in}
.purge-row{display:grid;grid-template-columns:.28in 1fr;gap:.055in;align-items:start;padding-top:.03in;border-top:1px solid #bbb}
.purge-cost{display:flex;align-items:center;justify-content:center;width:.25in;height:.25in;border:1px solid #111;border-radius:50%;font-size:8pt;font-weight:900;line-height:1}
.purge-text{font-size:var(--card-text-size);line-height:1.06}
.purge-reminder{margin-top:.05in;padding-top:.04in;border-top:1px solid #888;font-size:calc(var(--card-text-size) - .3pt);line-height:1.04;font-style:italic}
.tracker-card{position:relative;background:repeating-linear-gradient(135deg,#fff 0,#fff .08in,#f3f3f3 .08in,#f3f3f3 .16in)}.capital-tracker-card{display:grid;grid-template-rows:.42in 1fr .16in;background:#173e32!important;color:#fff}.capital-tracker-body{padding:.1in;display:grid;grid-template-columns:1fr 1fr;gap:.08in}.capital-box{height:.85in;border:1px solid #bd9850;padding:.06in;text-align:center}.capital-box span{display:block;color:#ecd699;font-size:5.4pt;font-weight:900;text-transform:uppercase}.capital-box div{height:.42in;margin-top:.06in;border-bottom:1px solid #fff}.capital-tracker-body p{grid-column:1/-1;font-size:6pt;line-height:1.18}.deed-card{display:flex;flex-direction:column;padding:.075in;background:#f3ead7!important;text-align:center}.deed-banner{margin:-.075in -.075in .16in;padding:.095in .04in .08in;border-bottom:1.5px solid #bd9850;background:#173e32!important;color:#fff7dc;font-family:Georgia,serif;font-size:13.5pt;font-weight:700;letter-spacing:.19em;text-transform:uppercase}.deed-seal{display:flex;align-items:center;justify-content:center;width:.82in;height:.82in;margin:0 auto .13in;border:3px double #bd9850;border-radius:50%;color:#173e32;font-family:Georgia,serif;font-size:30pt;font-weight:700}.deed-title{margin-bottom:.12in;color:#173e32;font-family:Georgia,serif;font-size:11.5pt;font-weight:700}.deed-rule{margin:0 auto .1in;max-width:2.05in;font-family:Georgia,serif;font-size:6.6pt;line-height:1.16}.deed-note{margin-top:auto;padding-top:.065in;border-top:.8px solid #bd9850;color:#5b2d2c;font-size:5.2pt;font-weight:700;text-transform:uppercase}
.tracker-title{position:absolute;top:.09in;left:.1in;right:.1in;font-size:11.2pt;font-weight:900;line-height:1;text-align:center;text-transform:uppercase;letter-spacing:.035em}
.tracker-note{position:absolute;top:.38in;left:.14in;right:.14in;font-size:5.6pt;line-height:1.12;text-align:center}
.tracker-step{position:absolute;left:.16in;right:.16in;border-top:1.4px solid #111}
.tracker-step-value{position:absolute;left:0;top:-.14in;display:flex;align-items:center;justify-content:center;width:.28in;height:.28in;border:1px solid #111;border-radius:50%;background:#fff;font-size:8.5pt;font-weight:900}
.tracker-step-label{position:absolute;right:0;top:-.11in;background:#fff;padding-left:.04in;font-size:5.6pt;font-weight:800;text-transform:uppercase}
.tracker-zero{position:absolute;left:.12in;right:.12in;bottom:.18in;font-size:5.5pt;font-weight:900;text-align:center;text-transform:uppercase}
.tracker-footer{position:absolute;left:0;right:0;bottom:0;height:.14in;padding-top:.02in;border-top:1px solid #111;background:#ddd!important;font-size:4.7pt;text-align:center}
.proposal-card{--card-text-size:6.45pt;--card-label-size:6.15pt;display:grid;grid-template-rows:.21in .55in auto 1fr .16in}
.proposal-banner{display:flex;align-items:center;justify-content:center;background:#ddd!important;border-bottom:1px solid #111;font-size:5.6pt;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
.proposal-card.treaty .proposal-banner{background:#bcbcbc!important;box-shadow:inset 0 0 0 999px #bcbcbc}
.proposal-title-row{position:relative;display:flex;align-items:center;padding:.05in .45in .045in .09in;border-bottom:1px solid #aaa}
.proposal-number{font-size:5.4pt;font-weight:800;text-transform:uppercase}
.proposal-title{font-size:11.2pt;font-weight:900;line-height:1.02}
.stake-seal{position:absolute;top:.12in;right:.08in;display:flex;align-items:center;justify-content:center;width:.31in;height:.31in;border:1.2px solid #111;border-radius:50%;font-size:9pt;font-weight:900}
.requirement{padding:.04in .09in;border-bottom:1px solid #bbb;background:#f3f3f3!important;font-size:5.7pt;line-height:1.08}
.proposal-body{min-height:0;overflow:hidden;padding:.07in .09in .04in}
.proposal-effect+.proposal-effect{margin-top:.07in;padding-top:.055in;border-top:1px solid #aaa}
.proposal-effect{font-size:var(--card-text-size);line-height:1.1}
.proposal-footer{display:flex;align-items:center;justify-content:center;padding:.02in .05in;background:#ddd!important;border-top:1px solid #111;font-size:4.6pt;text-align:center}
.rite-card{--card-text-size:6pt;--card-label-size:5.8pt;display:grid;grid-template-rows:.22in .55in auto 1fr .16in;background:#f3edf7!important}.rite-card.completed{background:#e5d8ed!important}.rite-banner{display:flex;align-items:center;justify-content:center;border-bottom:1px solid #4b3158;background:#d7c4e0!important;color:#321c3e;font-size:5.5pt;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.rite-icon{display:flex;align-items:center;justify-content:center;font-size:24pt;color:#533564}.rite-title{padding:0 .08in .045in;border-bottom:1px solid #7c6188;font-family:Georgia,serif;font-size:11.4pt;font-weight:700;text-align:center}.rite-body{min-height:0;overflow:hidden;padding:.055in .085in .035in}.rite-section,.rite-complete,.rite-progress{font-size:var(--card-text-size);line-height:1.08}.rite-section+.rite-section,.rite-progress{margin-top:.045in;padding-top:.038in;border-top:1px solid #b7a4bf}.rite-footer{display:flex;align-items:center;justify-content:center;min-height:.16in;padding:.025in .055in;border-top:1px solid #4b3158;background:#d7c4e0!important;font-size:4.7pt;line-height:1;text-align:center}
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
${supplemental.dedicatedPages.join("")}
<script>
function nextFrame(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
function waitForImages(){return Promise.all(Array.from(document.images).map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});})));}
function fitPrintCards(){document.querySelectorAll('.fit-target').forEach(target=>{const territory=target.classList.contains('territory-inner');const leader=target.classList.contains('leader-card');const reference=target.classList.contains('reference-card')||target.classList.contains('purge-card');const proposal=target.classList.contains('proposal-card');let textSize=territory?8:(leader?5.75:(reference?5.65:(proposal?6.45:7)));let labelSize=territory?7:(leader?5.55:(reference?5.45:(proposal?6.15:6.8)));const minimum=territory?5.2:(leader?4.15:(reference?4.3:(proposal?4.8:4.5)));while(target.scrollHeight>target.clientHeight&&textSize>minimum){textSize-=.16;labelSize=Math.max(4,labelSize-.1);target.style.setProperty('--card-text-size',textSize.toFixed(2)+'pt');target.style.setProperty('--card-label-size',labelSize.toFixed(2)+'pt');}});}
async function preparePrint(){if(document.fonts?.ready){try{await document.fonts.ready;}catch(error){}}await waitForImages();fitPrintCards();document.body.offsetHeight;await nextFrame();await nextFrame();setTimeout(()=>window.print(),300);}
window.addEventListener('load',preparePrint);
<\/script>
</body>
</html>`;
  }

  function buildSupplementalPackage(data) {
    const packageData = data.supplementalPackage || {};
    const inlineItems = (packageData.components || []).flatMap(component => { const item = componentToPrintHtml(component); return Array.isArray(item) ? item : [item]; }).filter(Boolean);
    const dedicatedPages = [];

    if (packageData.proposals?.length) {
      const proposalFronts = packageData.proposals.map(proposal => proposalToPrintHtml(proposal, false));
      const mirroredBackOrder = [2, 1, 0, 5, 4, 3, 8, 7, 6];
      const treatyBacks = mirroredBackOrder
        .map(index => packageData.proposals[index])
        .filter(Boolean)
        .map(proposal => proposalToPrintHtml(proposal, true));
      dedicatedPages.push(cardTableToHtml(proposalFronts, 3));
      dedicatedPages.push(cardTableToHtml(treatyBacks, 3));
    }


    const packageRites = data.faction.id === "mystics"
      ? (packageData.rites || []).filter(rite => data.selectedRiteIds.includes(rite.id))
      : (packageData.rites || []);

    if (packageRites.length) {
      const riteFronts = packageRites.map(rite => riteToPrintHtml(rite, false));
      const riteBacks = [...packageRites]
        .reverse()
        .map(rite => riteToPrintHtml(rite, true));
      dedicatedPages.push(cardTableToHtml(riteFronts, 3));
      dedicatedPages.push(cardTableToHtml(riteBacks, 3));
    }

    return {
      inlineItems,
      dedicatedPages
    };
  }

  function componentToPrintHtml(component) {
    if (!component?.contractId) return "";
    const item = productionPrint().component(component.contractId, "front");
    if (component.type === "deed-set") {
      return Array.from({ length: Number(component.count) || 8 }, () => item);
    }
    return item;
  }

  function firstPageToHtml(data, pageItems, hasMorePages) {
    const validationClass = data.validation.valid ? "valid" : "invalid";
    const territoryNames = data.territories.length
      ? data.territories.map(territory => `<li>${escapeHtml(territory.name)}</li>`).join("")
      : "<li>None selected</li>";
    const supplementalItems = data.supplementalRequirements
      .filter(item => !(data.faction.id === "mystics" && /three double-sided rite cards/i.test(item)))
      .map(item => `<li>${escapeHtml(item)}</li>`).join("");
    const riteSummary = data.selectedRites?.length
      ? `<div class="summary-block"><h2>Rites</h2><ul class="summary-list">${data.selectedRites.map(rite => `<li>${escapeHtml(rite.name)}</li>`).join("")}</ul></div>`
      : "";
    const diplomatNote = data.faction.id === "diplomats"
      ? " Proposal fronts and mirrored Treaty Article backs are included on dedicated 9-up pages for long-edge duplex printing."
      : "";

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
            ${riteSummary}
            <div class="summary-block"><h2>Faction components included</h2><ul class="summary-list">${supplementalItems}</ul></div>
            <div class="summary-block"><strong>Print note:</strong> The selected Leader and required faction supplemental faces are included in this package.${diplomatNote}</div>
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
    return productionPrint().card(card);
  }

  function leaderToPrintHtml(faction, leader) {
    return productionPrint().leader(faction, leader);
  }

  function proposalToPrintHtml(proposal, treaty) {
    if (!proposal?.contractId) throw new Error("Proposal print contract id is missing.");
    return productionPrint().component(proposal.contractId, treaty ? "reverse" : "front");
  }

  function riteToPrintHtml(rite, completed) {
    if (!rite?.contractId) throw new Error("Rite print contract id is missing.");
    return productionPrint().component(rite.contractId, completed ? "reverse" : "front");
  }

  function territoryToPrintHtml(territory) {
    return productionPrint().territory(territory);
  }

  function chunk(items, size) {
    const result = [];
    for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
    return result;
  }
})();
