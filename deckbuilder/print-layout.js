document.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(installPrintLayoutOverride, 0);
});

function installPrintLayoutOverride() {
  const oldButton = document.getElementById("printDeckButton");
  if (!oldButton) return;

  const newButton = oldButton.cloneNode(true);
  oldButton.replaceWith(newButton);
  newButton.addEventListener("click", openNineUpPrintView);
}

function openNineUpPrintView() {
  const deck = readDeckFromPage();

  if (!deck.valid && !window.confirm("This deck is currently invalid. Print anyway?")) {
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.alert("Popup blocked. Allow popups to use print/PDF export.");
    return;
  }

  printWindow.document.write(buildPrintDocument(deck));
  printWindow.document.close();
  printWindow.focus();
}

function readDeckFromPage() {
  const deckName = document.getElementById("deckName")?.value.trim() || "Untitled deck";
  const version = document.getElementById("dataStatus")?.textContent.trim() || "Gauntlet";
  const valid = document.getElementById("validityText")?.textContent.trim().toLowerCase() === "valid";
  const cardCount = document.getElementById("cardCount")?.textContent.trim() || "0";
  const minimumCards = document.getElementById("minimumCards")?.textContent.trim() || "30";
  const pointTotal = document.getElementById("pointTotal")?.textContent.trim() || "0";
  const maximumPoints = document.getElementById("maximumPoints")?.textContent.trim() || "60";
  const territoryCount = document.getElementById("territoryCount")?.textContent.trim() || "0";
  const territoryRequirement = document.getElementById("territoryRequirement")?.textContent.trim() || "3";

  const cardEntries = [...document.querySelectorAll("#deckCards .deck-row")].map(row => {
    const qtyText = row.querySelector(".qty-pill")?.textContent || "1x";
    const qty = Number.parseInt(qtyText, 10) || 1;
    const texts = [...row.querySelectorAll(".card-text")];
    return {
      name: row.querySelector("h3")?.textContent.trim() || "Unnamed card",
      qty,
      costSummary: qtyText.replace(/\s+/g, " ").trim(),
      action: stripLabel(texts[0]?.textContent || "", "Action"),
      battle: stripLabel(texts[1]?.textContent || "", "Battle"),
      reminder: stripLabel(row.querySelector(".reminder-text")?.textContent || "", "Note")
    };
  });

  const cards = cardEntries.flatMap(entry => Array.from({ length: entry.qty }, () => entry));

  const territories = [...document.querySelectorAll("#territoryList .territory-row")]
    .filter(row => row.querySelector("input")?.checked || row.classList.contains("selected"))
    .map(row => ({
      name: row.querySelector("strong")?.textContent.trim() || "Unnamed Territory",
      text: row.querySelector(".card-text")?.textContent.trim() || "",
      arena: Boolean(row.querySelector(".arena-pill"))
    }));

  return {
    deckName,
    version,
    valid,
    cardCount,
    minimumCards,
    pointTotal,
    maximumPoints,
    territoryCount,
    territoryRequirement,
    cardEntries,
    cards,
    territories
  };
}

function buildPrintDocument(deck) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(deck.deckName)} — ${escapeHtml(deck.version)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, "Times New Roman", serif; color: #1f1a14; margin: 0; }
    h1 { font-size: 22pt; margin: 0 0 0.06in; }
    h2 { font-size: 12pt; margin: 0 0 0.08in; break-after: avoid; }
    p { margin: 0 0 0.08in; }
    .deck-summary { break-after: page; padding: 0.15in; }
    .summary { font-family: Arial, sans-serif; font-size: 10pt; margin-bottom: 0.15in; }
    .decklist { columns: 2; font-family: Arial, sans-serif; font-size: 9.5pt; margin-bottom: 0.2in; }
    .section-title { display: none; }
    .card-grid { display: grid; grid-template-columns: repeat(3, 2.5in); grid-auto-rows: 3.5in; gap: 0.04in; align-items: start; justify-content: center; }
    .territory-grid { display: grid; grid-template-columns: repeat(2, 3.5in); grid-auto-rows: 2.5in; gap: 0.04in; align-items: start; justify-content: center; }
    .card-section + .card-section { break-before: page; margin-top: 0; }
    .print-card { --card-text-size: 7.2pt; --card-label-size: 6.1pt; width: 2.5in; height: 3.5in; overflow: hidden; border: 1px solid #1f1a14; border-radius: 0.1in; padding: 0.08in; display: flex; flex-direction: column; break-inside: avoid; page-break-inside: avoid; }
    .print-card.territory { --card-text-size: 8.2pt; --card-label-size: 6.2pt; width: 3.5in; height: 2.5in; }
    .card-header { display: flex; justify-content: space-between; align-items: start; gap: 0.06in; border-bottom: 1px solid #1f1a14; padding-bottom: 0.04in; margin-bottom: 0.05in; min-height: 0.27in; }
    .card-name { font-weight: bold; font-size: 9.4pt; line-height: 1.05; }
    .territory .card-name { font-size: 11pt; }
    .card-cost { font-family: Arial, sans-serif; font-weight: bold; font-size: 8pt; white-space: nowrap; }
    .label { font-family: Arial, sans-serif; font-weight: bold; font-size: var(--card-label-size); text-transform: uppercase; letter-spacing: 0.035em; margin-top: 0.035in; }
    .text { font-size: var(--card-text-size); line-height: 1.12; overflow-wrap: break-word; }
    .territory .text { line-height: 1.16; }
    .territory .card-header { border-bottom-style: double; }
    .reminder { font-size: calc(var(--card-text-size) - 0.4pt); line-height: 1.1; font-style: italic; margin-top: auto; color: #554b40; }
    @page { size: letter; margin: 0.1in; }
  </style>
</head>
<body>
  <section class="deck-summary">
    <h1>${escapeHtml(deck.deckName)}</h1>
    <p class="summary">${escapeHtml(deck.version)} · ${escapeHtml(deck.cardCount)}/${escapeHtml(deck.minimumCards)} main-deck cards · ${escapeHtml(deck.pointTotal)}/${escapeHtml(deck.maximumPoints)} points · ${escapeHtml(deck.territoryCount)}/${escapeHtml(deck.territoryRequirement)} Territories · ${deck.valid ? "Valid" : "Invalid"}</p>
    <h2>Deck list</h2>
    <div class="decklist">${deck.cardEntries.map(entry => `${entry.qty}x ${escapeHtml(entry.name)} ${escapeHtml(costOnly(entry.costSummary))}`).join("<br>")}<br><br><strong>Territories</strong><br>${deck.territories.map(territory => escapeHtml(territory.name)).join("<br>")}</div>
  </section>
  <section class="card-section">
    <h2 class="section-title">Main deck cards</h2>
    <div class="card-grid">${deck.cards.map(cardToPrintHtml).join("")}</div>
  </section>
  <section class="card-section">
    <h2 class="section-title">Territories</h2>
    <div class="territory-grid">${deck.territories.map(territoryToPrintHtml).join("")}</div>
  </section>
  <script>
    function fitPrintCards() {
      document.querySelectorAll('.print-card').forEach(card => {
        let textSize = card.classList.contains('territory') ? 8.2 : 7.2;
        let labelSize = card.classList.contains('territory') ? 6.2 : 6.1;
        const minTextSize = card.classList.contains('territory') ? 5.4 : 4.8;
        while (card.scrollHeight > card.clientHeight && textSize > minTextSize) {
          textSize -= 0.2;
          labelSize = Math.max(4.6, labelSize - 0.15);
          card.style.setProperty('--card-text-size', textSize.toFixed(1) + 'pt');
          card.style.setProperty('--card-label-size', labelSize.toFixed(1) + 'pt');
        }
      });
    }
    window.addEventListener('load', () => {
      fitPrintCards();
      setTimeout(() => window.print(), 300);
    });
  <\/script>
</body>
</html>`;
}

function cardToPrintHtml(card) {
  return `<article class="print-card">
    <div class="card-header"><span class="card-name">${escapeHtml(card.name)}</span><span class="card-cost">${escapeHtml(costOnly(card.costSummary))}</span></div>
    <div class="label">Action</div>
    <div class="text">${escapeHtml(card.action || "—")}</div>
    <div class="label">Battle</div>
    <div class="text">${escapeHtml(card.battle || "—")}</div>
    ${card.reminder ? `<div class="reminder">${escapeHtml(card.reminder)}</div>` : ""}
  </article>`;
}

function territoryToPrintHtml(territory) {
  return `<article class="print-card territory">
    <div class="card-header"><span class="card-name">${escapeHtml(territory.name)}</span><span class="card-cost">Territory</span></div>
    <div class="text">${escapeHtml(territory.text || "")}</div>
  </article>`;
}

function stripLabel(text, label) {
  return text.replace(new RegExp(`^${label}:\\s*`, "i"), "").trim();
}

function costOnly(value) {
  const match = String(value).match(/·\s*(\d+\s*pts?)/i);
  return match ? match[1] : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
