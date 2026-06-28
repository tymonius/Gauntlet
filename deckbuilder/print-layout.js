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
  const uniqueCards = new Set(getRules()?.unique_cards || []);

  const cardEntries = [...document.querySelectorAll("#deckCards .deck-row")].map(row => {
    const name = row.querySelector("h3")?.textContent.trim() || "Unnamed card";
    const qtyText = row.querySelector(".qty-pill")?.textContent || "1x";
    const qty = Number.parseInt(qtyText, 10) || 1;
    const cardRecord = state.data?.cardByName?.[name];
    const texts = [...row.querySelectorAll(".card-text")];
    return {
      name,
      qty,
      cost: Number(cardRecord?.cost) || costNumber(qtyText) || "",
      unique: uniqueCards.has(name),
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
  const printableCards = [
    ...deck.cards.map(cardToPrintHtml),
    ...deck.territories.map(territoryToPrintHtml)
  ].join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(deck.deckName)} — ${escapeHtml(deck.version)}</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    h1 { font-size: 22pt; margin: 0 0 0.06in; }
    h2 { font-size: 12pt; margin: 0 0 0.08in; break-after: avoid; }
    p { margin: 0 0 0.08in; }
    .deck-summary { break-after: page; padding: 0.15in; }
    .summary { font-size: 10pt; margin-bottom: 0.15in; }
    .decklist { columns: 2; font-size: 9.5pt; margin-bottom: 0.2in; }
    .card-grid { display: grid; grid-template-columns: repeat(3, 2.5in); grid-auto-rows: 3.5in; gap: 0; align-items: start; justify-content: center; }
    .print-card { --card-text-size: 7.1pt; --card-label-size: 7.2pt; position: relative; width: 2.5in; height: 3.5in; overflow: hidden; border: 1px solid #111; border-radius: 0; background: #fff; break-inside: avoid; page-break-inside: avoid; }
    .main-card { display: grid; grid-template-rows: 0.38in 1fr 0.16in; }
    .card-header { position: relative; display: flex; align-items: center; min-height: 0.38in; padding: 0.05in 0.46in 0.05in 0.1in; background: #d7d7d7 !important; border-bottom: 1px solid #111; box-shadow: inset 0 0 0 999px #d7d7d7; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    .card-name { font-weight: 800; font-size: 12.6pt; line-height: 1.02; }
    .cost-circle { position: absolute; top: 0.045in; right: 0.17in; width: 0.31in; height: 0.31in; border: 1.5px solid #111; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #fff !important; font-weight: 800; font-size: 12pt; line-height: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    .unique-flag { position: absolute; top: 0.42in; right: 0.07in; font-weight: 800; font-size: 6.2pt; text-transform: uppercase; }
    .card-body { display: flex; flex-direction: column; min-height: 0; padding: 0.09in 0.1in 0.06in; }
    .rules-block { min-height: 0; flex: 1 1 0; overflow: hidden; }
    .battle-block { border-top: 1px solid #aaa; padding-top: 0.045in; margin-top: 0.045in; }
    .label { font-weight: 800; font-size: var(--card-label-size); line-height: 1; margin-bottom: 0.03in; text-transform: uppercase; }
    .text { font-size: var(--card-text-size); line-height: 1.08; overflow-wrap: break-word; }
    .reminder { border-top: 1px solid #c8c8c8; margin-top: 0.045in; padding-top: 0.035in; font-size: calc(var(--card-text-size) - 0.6pt); line-height: 1.04; font-style: italic; overflow: hidden; }
    .reminder strong { font-weight: 800; }
    .card-footer { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; gap: 0.04in; padding: 0.035in 0.06in; background: #d7d7d7 !important; border-top: 1px solid #111; box-shadow: inset 0 0 0 999px #d7d7d7; font-size: 5.3pt; line-height: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    .card-footer span:nth-child(1) { text-align: left; font-weight: 700; }
    .card-footer span:nth-child(2) { text-align: center; font-size: 4.8pt; }
    .card-footer span:nth-child(3) { text-align: right; }
    .territory { --card-text-size: 8pt; --card-label-size: 7pt; }
    .territory-inner { position: absolute; top: 0; left: 2.5in; width: 3.5in; height: 2.5in; transform-origin: top left; transform: rotate(90deg); display: grid; grid-template-rows: 0.36in 1fr 0.16in; overflow: hidden; }
    .territory-header { display: flex; align-items: end; gap: 0.08in; padding: 0.05in 0.1in; background: #d7d7d7 !important; border-bottom: 1px solid #111; box-shadow: inset 0 0 0 999px #d7d7d7; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    .territory-type { font-size: 7pt; font-weight: 800; text-transform: uppercase; white-space: nowrap; }
    .territory-name { font-size: 13pt; font-weight: 800; line-height: 1; }
    .territory-body { padding: 0.08in 0.1in; overflow: hidden; }
    .territory .text { font-size: var(--card-text-size); line-height: 1.12; }
    .territory-footer { display: flex; justify-content: space-between; align-items: center; padding: 0.035in 0.06in; background: #d7d7d7 !important; border-top: 1px solid #111; box-shadow: inset 0 0 0 999px #d7d7d7; font-size: 5.3pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    @page { size: letter; margin: 0.22in 0.1in 0.04in 0.1in; }
  </style>
</head>
<body>
  <section class="deck-summary">
    <h1>${escapeHtml(deck.deckName)}</h1>
    <p class="summary">${escapeHtml(deck.version)} · ${escapeHtml(deck.cardCount)}/${escapeHtml(deck.minimumCards)} main-deck cards · ${escapeHtml(deck.pointTotal)}/${escapeHtml(deck.maximumPoints)} points · ${escapeHtml(deck.territoryCount)}/${escapeHtml(deck.territoryRequirement)} Territories · ${deck.valid ? "Valid" : "Invalid"}</p>
    <h2>Deck list</h2>
    <div class="decklist">${deck.cardEntries.map(entry => `${entry.qty}x ${escapeHtml(entry.name)} (${escapeHtml(entry.cost)})`).join("<br>")}<br><br><strong>Territories</strong><br>${deck.territories.map(territory => escapeHtml(territory.name)).join("<br>")}</div>
  </section>
  <section class="card-section">
    <div class="card-grid">${printableCards}</div>
  </section>
  <script>
    function fitPrintCards() {
      document.querySelectorAll('.fit-target').forEach(target => {
        let textSize = target.classList.contains('territory-inner') ? 8 : 7.1;
        let labelSize = target.classList.contains('territory-inner') ? 7 : 7.2;
        const minTextSize = target.classList.contains('territory-inner') ? 5.2 : 4.7;
        while (target.scrollHeight > target.clientHeight && textSize > minTextSize) {
          textSize -= 0.2;
          labelSize = Math.max(4.8, labelSize - 0.12);
          target.style.setProperty('--card-text-size', textSize.toFixed(1) + 'pt');
          target.style.setProperty('--card-label-size', labelSize.toFixed(1) + 'pt');
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
  return `<article class="print-card main-card fit-target">
    <header class="card-header">
      <span class="card-name">${escapeHtml(card.name)}</span>
      <span class="cost-circle">${escapeHtml(card.cost)}</span>
    </header>
    ${card.unique ? '<div class="unique-flag">Unique</div>' : ""}
    <div class="card-body">
      <section class="rules-block">
        <div class="label">Action</div>
        <div class="text">${escapeHtml(card.action || "—")}</div>
      </section>
      <section class="rules-block battle-block">
        <div class="label">Battle</div>
        <div class="text">${escapeHtml(card.battle || "—")}</div>
      </section>
      ${card.reminder ? `<div class="reminder"><strong>REMINDER:</strong> ${escapeHtml(card.reminder)}</div>` : ""}
    </div>
    <footer class="card-footer"><span>MASTER POOL</span><span>© 2026 T. Scott</span><span>${escapeHtml(state.data?.version || "v0.5")}</span></footer>
  </article>`;
}

function territoryToPrintHtml(territory) {
  return `<article class="print-card territory">
    <div class="territory-inner fit-target">
      <header class="territory-header">
        <span class="territory-type">${territory.arena ? "Arena Territory" : "Territory"}</span>
        <span class="territory-name">${escapeHtml(territory.name)}</span>
      </header>
      <div class="territory-body"><div class="text">${escapeHtml(territory.text || "")}</div></div>
      <footer class="territory-footer"><span>MASTER POOL</span><span>${escapeHtml(state.data?.version || "v0.5")}</span></footer>
    </div>
  </article>`;
}

function stripLabel(text, label) {
  return text.replace(new RegExp(`^${label}:\\s*`, "i"), "").trim();
}

function costNumber(value) {
  const match = String(value).match(/(\d+)\s*pts?/i);
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
