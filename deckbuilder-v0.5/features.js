/* Deckbuilder feature layer.
   Core state, validation, persistence, and export logic remain in app.js. */

/* Compact available-card browser */
(() => {
  let browserShellReady = false;
  let previewElement = null;

  function installCardBrowserShell() {
    if (browserShellReady) return;
    const list = document.getElementById("availableCards");
    if (!list || list.closest(".card-browser")) {
      browserShellReady = true;
      previewElement = document.getElementById("cardPreview");
      return;
    }

    const browser = document.createElement("div");
    browser.className = "card-browser";
    list.parentNode.insertBefore(browser, list);
    browser.append(list);

    previewElement = document.createElement("aside");
    previewElement.id = "cardPreview";
    previewElement.className = "card-preview empty";
    previewElement.textContent = "Select a card to view its full text.";
    browser.append(previewElement);

    browserShellReady = true;
  }

  function renderCompactAvailableCards() {
    installCardBrowserShell();

    const cards = getFilteredCards();
    el.availableCards.innerHTML = "";
    el.availableCount.textContent = `${cards.length} card${cards.length === 1 ? "" : "s"}`;

    if (!cards.length) {
      el.availableCards.className = "card-list compact-card-list empty-state";
      el.availableCards.textContent = "No cards match the current filters.";
      renderCardPreview(null);
      return;
    }

    el.availableCards.className = "card-list compact-card-list";

    if (!state.selectedAvailableCard || !cards.some(card => card.name === state.selectedAvailableCard)) {
      state.selectedAvailableCard = cards[0].name;
    }

    for (const card of cards) {
      el.availableCards.append(compactCardRow(card));
    }

    renderCardPreview(state.data.cardByName[state.selectedAvailableCard] || cards[0]);
  }

  function compactCardRow(card) {
    const row = document.createElement("article");
    const owned = state.cards[card.name] || 0;
    const selected = state.selectedAvailableCard === card.name;
    const unique = (getRules().unique_cards || []).includes(card.name);

    row.className = `compact-card-row${selected ? " selected" : ""}`;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-pressed", selected ? "true" : "false");

    const main = document.createElement("div");
    main.className = "compact-card-main";

    const titleLine = document.createElement("div");
    titleLine.className = "compact-card-title-line";
    titleLine.innerHTML = `<strong>${escapeHtml(card.name)}</strong><span class="mini-pill">${card.cost}</span>${owned ? `<span class="mini-pill">${owned}x</span>` : ""}`;

    const tags = document.createElement("div");
    tags.className = "compact-card-tags";
    tags.textContent = [
      card.action ? "Action" : null,
      card.battle ? "Battle" : null,
      card.reminder ? "Note" : null,
      unique ? "Unique" : null
    ].filter(Boolean).join(" · ");

    main.append(titleLine, tags);

    const actions = document.createElement("div");
    actions.className = "compact-card-actions";
    const add = document.createElement("button");
    add.type = "button";
    add.className = "compact-add-button secondary";
    add.textContent = owned ? `Add (${owned})` : "Add";
    add.addEventListener("click", event => {
      event.stopPropagation();
      state.selectedAvailableCard = card.name;
      addCard(card.name);
    });
    actions.append(add);

    row.addEventListener("click", () => selectAvailableCard(card.name));
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectAvailableCard(card.name);
      }
    });

    row.append(main, actions);
    return row;
  }

  function selectAvailableCard(name) {
    state.selectedAvailableCard = name;
    renderCompactAvailableCards();
  }

  function renderCardPreview(card) {
    if (!previewElement) return;

    if (!card) {
      previewElement.className = "card-preview empty";
      previewElement.textContent = "Select a card to view its full text.";
      return;
    }

    const owned = state.cards[card.name] || 0;
    const unique = (getRules().unique_cards || []).includes(card.name);
    previewElement.className = "card-preview";
    previewElement.innerHTML = `
      <div class="card-preview-header">
        <div>
          <h3>${escapeHtml(card.name)}</h3>
          <div class="card-preview-meta">
            <span class="mini-pill">${card.cost} point${card.cost === 1 ? "" : "s"}</span>
            ${owned ? `<span class="mini-pill">${owned} in deck</span>` : ""}
            ${unique ? '<span class="mini-pill">Unique</span>' : ""}
          </div>
        </div>
      </div>
      <div class="card-preview-section">
        <div class="card-preview-label">Action</div>
        <p class="card-preview-text">${escapeHtml(card.action || "—")}</p>
      </div>
      <div class="card-preview-section">
        <div class="card-preview-label">Battle</div>
        <p class="card-preview-text">${escapeHtml(card.battle || "—")}</p>
      </div>
      ${card.reminder ? `<div class="card-preview-section"><div class="card-preview-label">Reminder</div><p class="card-preview-text">${escapeHtml(card.reminder)}</p></div>` : ""}
      <div class="card-preview-actions">
        <button id="previewAddCardButton" type="button">Add to deck</button>
      </div>
    `;

    previewElement.querySelector("#previewAddCardButton")?.addEventListener("click", () => {
      state.selectedAvailableCard = card.name;
      addCard(card.name);
    });
  }

  window.renderAvailableCards = renderCompactAvailableCards;
  try {
    renderAvailableCards = renderCompactAvailableCards;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();

/* Compact current-deck list */
(() => {
  function renderCompactDeckCards() {
    const entries = getDeckCardEntries();
    const selectedTerritories = state.territories
      .map(name => state.data.territoryByName[name])
      .filter(Boolean);

    el.deckCards.innerHTML = "";

    if (!entries.length && !selectedTerritories.length) {
      el.deckCards.className = "deck-list empty-state";
      el.deckCards.textContent = "No main-deck cards or Territories yet.";
      return;
    }

    el.deckCards.className = "deck-list compact-deck-list";

    if (entries.length) {
      el.deckCards.append(sectionDivider("Main deck"));
      for (const { card, qty } of entries) {
        el.deckCards.append(compactDeckRow(card, qty));
      }
    }

    if (selectedTerritories.length) {
      el.deckCards.append(sectionDivider("Territories"));
      for (const territory of selectedTerritories) {
        el.deckCards.append(compactDeckTerritoryRow(territory));
      }
    }
  }

  function sectionDivider(label) {
    const divider = document.createElement("div");
    divider.className = "compact-deck-section-divider";
    divider.innerHTML = `<span>${escapeHtml(label)}</span>`;
    return divider;
  }

  function compactDeckRow(card, qty) {
    const row = document.createElement("article");
    row.className = "compact-deck-row";

    const main = document.createElement("div");
    main.className = "compact-deck-main";

    const titleLine = document.createElement("div");
    titleLine.className = "compact-deck-title-line";
    titleLine.innerHTML = `<strong>${escapeHtml(card.name)}</strong><span class="mini-pill">${card.cost}</span>`;

    const stats = document.createElement("div");
    stats.className = "compact-deck-stats";
    stats.innerHTML = `<span class="mini-pill">${qty}x</span><span class="mini-pill">${qty * card.cost} pts</span>`;

    main.append(titleLine, stats);

    const actions = document.createElement("div");
    actions.className = "compact-deck-actions";

    const minus = makeIconButton("−", `Remove one ${card.name}`, () => removeCard(card.name));
    const plus = makeIconButton("+", `Add one ${card.name}`, () => addCard(card.name));
    const remove = makeIconButton("×", `Remove all ${card.name}`, () => removeAllCard(card.name));
    remove.classList.add("danger", "secondary");

    actions.append(minus, plus, remove);
    row.append(main, actions);
    return row;
  }

  function compactDeckTerritoryRow(territory) {
    const row = document.createElement("article");
    row.className = "compact-deck-row compact-deck-territory-row";

    const main = document.createElement("div");
    main.className = "compact-deck-main";

    const titleLine = document.createElement("div");
    titleLine.className = "compact-deck-title-line";
    titleLine.innerHTML = `<strong>${escapeHtml(territory.name)}</strong>`;

    const stats = document.createElement("div");
    stats.className = "compact-deck-stats";
    stats.innerHTML = `<span class="mini-pill">Territory</span>${territory.arena ? '<span class="arena-pill">Arena</span>' : ""}`;

    main.append(titleLine, stats);

    const actions = document.createElement("div");
    actions.className = "compact-deck-actions";

    const remove = makeIconButton("×", `Remove ${territory.name}`, () => {
      state.selectedTerritory = territory.name;
      toggleTerritory(territory.name);
    });
    remove.classList.add("danger", "secondary");

    actions.append(remove);
    row.append(main, actions);
    return row;
  }

  window.renderDeckCards = renderCompactDeckCards;
  try {
    renderDeckCards = renderCompactDeckCards;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();

/* Compact Territory browser */
(() => {
  let territoryShellReady = false;
  let territoryPreviewElement = null;

  function installTerritoryBrowserShell() {
    if (territoryShellReady) return;
    const list = document.getElementById("territoryList");
    if (!list || list.closest(".territory-browser")) {
      territoryShellReady = true;
      territoryPreviewElement = document.getElementById("territoryPreview");
      return;
    }

    const browser = document.createElement("div");
    browser.className = "territory-browser";
    list.parentNode.insertBefore(browser, list);
    browser.append(list);

    territoryPreviewElement = document.createElement("aside");
    territoryPreviewElement.id = "territoryPreview";
    territoryPreviewElement.className = "territory-preview empty";
    territoryPreviewElement.textContent = "Select a Territory to view its full text.";
    browser.append(territoryPreviewElement);

    territoryShellReady = true;
  }

  function renderCompactTerritories() {
    installTerritoryBrowserShell();

    const rules = getRules();
    const arenaCount = getSelectedArenaCount();
    el.territoryList.innerHTML = "";
    el.territoryList.className = "territory-grid compact-territory-list";

    if (!state.data.territories.length) {
      el.territoryList.className = "territory-grid compact-territory-list empty-state";
      el.territoryList.textContent = "No Territories are available for this version.";
      renderTerritoryPreview(null);
      return;
    }

    if (!state.selectedTerritory || !state.data.territoryByName[state.selectedTerritory]) {
      state.selectedTerritory = state.territories[0] || state.data.territories[0].name;
    }

    for (const territory of state.data.territories) {
      const selected = state.territories.includes(territory.name);
      const wouldExceedTerritoryLimit = !selected && state.territories.length >= rules.territories;
      const wouldExceedArenaLimit = !selected && territory.arena && arenaCount >= rules.maximum_arenas;
      el.territoryList.append(compactTerritoryRow(territory, selected, wouldExceedTerritoryLimit || wouldExceedArenaLimit));
    }

    renderTerritoryPreview(state.data.territoryByName[state.selectedTerritory] || state.data.territories[0]);
  }

  function compactTerritoryRow(territory, selected, disabled) {
    const row = document.createElement("article");
    row.className = `territory-row compact-territory-row${selected ? " selected" : ""}${disabled ? " disabled" : ""}`;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-pressed", state.selectedTerritory === territory.name ? "true" : "false");

    const title = document.createElement("div");
    title.className = "territory-title-line";
    title.innerHTML = `<strong>${escapeHtml(territory.name)}</strong>`;

    const meta = document.createElement("div");
    meta.className = "compact-territory-meta";
    meta.innerHTML = `<span class="mini-pill">Territory</span>${territory.arena ? '<span class="arena-pill">Arena</span>' : ""}${selected ? '<span class="mini-pill">Selected</span>' : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected;
    checkbox.disabled = disabled;
    checkbox.setAttribute("aria-label", `${selected ? "Remove" : "Choose"} ${territory.name}`);
    checkbox.addEventListener("click", event => event.stopPropagation());
    checkbox.addEventListener("change", () => {
      state.selectedTerritory = territory.name;
      toggleTerritory(territory.name);
    });

    const hiddenText = document.createElement("p");
    hiddenText.className = "card-text";
    hiddenText.textContent = territory.text || "";

    row.addEventListener("click", () => selectTerritoryPreview(territory.name));
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectTerritoryPreview(territory.name);
      }
    });

    row.append(title, meta, checkbox, hiddenText);
    return row;
  }

  function selectTerritoryPreview(name) {
    state.selectedTerritory = name;
    renderCompactTerritories();
  }

  function renderTerritoryPreview(territory) {
    if (!territoryPreviewElement) return;

    if (!territory) {
      territoryPreviewElement.className = "territory-preview empty";
      territoryPreviewElement.textContent = "Select a Territory to view its full text.";
      return;
    }

    const selected = state.territories.includes(territory.name);
    const rules = getRules();
    const arenaCount = getSelectedArenaCount();
    const disabled = !selected && (state.territories.length >= rules.territories || (territory.arena && arenaCount >= rules.maximum_arenas));

    territoryPreviewElement.className = "territory-preview";
    territoryPreviewElement.innerHTML = `
      <div class="territory-preview-header">
        <div>
          <h3>${escapeHtml(territory.name)}</h3>
          <div class="territory-preview-meta">
            <span class="mini-pill">Territory</span>
            ${territory.arena ? '<span class="arena-pill">Arena</span>' : ""}
            ${selected ? '<span class="mini-pill">Selected</span>' : ""}
          </div>
        </div>
      </div>
      <div class="territory-preview-section">
        <div class="territory-preview-label">Effect</div>
        <p class="territory-preview-text">${escapeHtml(territory.text || "—")}</p>
      </div>
      <div class="territory-preview-actions">
        <button id="previewToggleTerritoryButton" type="button" class="${selected ? "danger secondary" : ""}" ${disabled ? "disabled" : ""}>${selected ? "Remove Territory" : "Choose Territory"}</button>
      </div>
    `;

    territoryPreviewElement.querySelector("#previewToggleTerritoryButton")?.addEventListener("click", () => {
      state.selectedTerritory = territory.name;
      toggleTerritory(territory.name);
    });
  }

  window.renderTerritories = renderCompactTerritories;
  try {
    renderTerritories = renderCompactTerritories;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();

/* Random legal test deck */
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("randomDeckButton");
  if (!button) return;
  button.addEventListener("click", generateRandomDeckForTesting);
});

function generateRandomDeckForTesting() {
  if (!state?.data) {
    window.alert("Card data has not loaded yet.");
    return;
  }

  if (hasDeckContent() && !window.confirm("Replace the current deck with a random test deck?")) {
    return;
  }

  const rules = getRules();
  const cards = [...state.data.cards].filter(card => Number.isFinite(Number(card.cost)));
  const uniqueCards = new Set(rules.unique_cards || []);
  const minimumCards = Number(rules.minimum_cards || 30);
  const maximumPoints = Number(rules.maximum_points || 60);
  const minimumCost = Math.min(...cards.map(card => Number(card.cost)));

  const generated = buildRandomCardSet(cards, uniqueCards, minimumCards, maximumPoints, minimumCost);
  if (!generated) {
    window.alert("Could not generate a valid random deck from the current card pool.");
    return;
  }

  state.deckName = `Random Test Deck ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  state.cards = generated;
  state.territories = chooseRandomTerritories();
  renderAll();
  flashStatus("Randomized");
}

function buildRandomCardSet(cards, uniqueCards, minimumCards, maximumPoints, minimumCost) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const result = {};
    let points = 0;

    for (let slot = 0; slot < minimumCards; slot += 1) {
      const remainingSlots = minimumCards - slot - 1;
      const maxCostForThisSlot = maximumPoints - points - remainingSlots * minimumCost;
      const eligible = cards.filter(card => {
        if (Number(card.cost) > maxCostForThisSlot) return false;
        if (uniqueCards.has(card.name) && result[card.name]) return false;
        return true;
      });

      if (!eligible.length) break;

      const chosen = randomItem(eligible);
      result[chosen.name] = (result[chosen.name] || 0) + 1;
      points += Number(chosen.cost);
    }

    const count = Object.values(result).reduce((sum, qty) => sum + qty, 0);
    if (count === minimumCards && points <= maximumPoints) {
      return result;
    }
  }

  return null;
}

function chooseRandomTerritories() {
  const rules = getRules();
  const territoryTarget = Number(rules.territories || 3);
  const arenaLimit = Number(rules.maximum_arenas || 1);
  const allTerritories = [...state.data.territories];
  const arenas = shuffle(allTerritories.filter(territory => territory.arena));
  const nonArenas = shuffle(allTerritories.filter(territory => !territory.arena));
  const selected = [];

  if (arenaLimit > 0 && arenas.length && Math.random() < 0.35) {
    selected.push(arenas[0].name);
  }

  for (const territory of nonArenas) {
    if (selected.length >= territoryTarget) break;
    selected.push(territory.name);
  }

  if (selected.length < territoryTarget) {
    for (const territory of arenas.slice(0, arenaLimit)) {
      if (selected.length >= territoryTarget) break;
      if (!selected.includes(territory.name)) selected.push(territory.name);
    }
  }

  return shuffle(selected).slice(0, territoryTarget);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

/* Print/PDF view */
document.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(installPrintLayoutOverride, 0);
});

function installPrintLayoutOverride() {
  const oldButton = document.getElementById("printDeckButton");
  if (!oldButton) return;
  const newButton = oldButton.cloneNode(true);
  oldButton.replaceWith(newButton);
  newButton.addEventListener("click", openPrintView);
}

function openPrintView() {
  const deck = readDeckFromPage();
  if (!deck.valid && !window.confirm("This deck is currently invalid. Print anyway?")) return;
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
  const printableCards = [...deck.cards.map(cardToPrintHtml), ...deck.territories.map(territoryToPrintHtml)];
  const firstPageCards = printableCards.slice(0, 6);
  const remainingCards = printableCards.slice(6);
  const firstPage = firstPageToHtml(deck, firstPageCards, remainingCards.length > 0);
  const cardPages = chunk(remainingCards, 9).map(page => cardTableToHtml(page, 3, false)).join("");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(deck.deckName)} — ${escapeHtml(deck.version)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700;800;900&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;font-synthesis:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}body{font-family:"Noto Sans",Arial,Helvetica,sans-serif;color:#111;margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}h1{font-size:22pt;margin:0 0 .04in}h2{font-size:12pt;margin:0 0 .06in;break-after:avoid}p{margin:0 0 .08in}.first-page,.card-page{display:block;width:7.5in;margin:0 auto}.first-page{height:10.5in;overflow:hidden}.first-page.has-more-pages{break-after:page;page-break-after:always}.first-page-summary{height:3.5in;overflow:hidden;padding:.08in .12in .04in}.summary{font-size:10pt;margin-bottom:.1in}.decklist{columns:2;column-gap:.35in;font-size:8.8pt;line-height:1.15;margin-bottom:0}.card-page{break-after:page;page-break-after:always}.card-page:last-of-type{break-after:auto;page-break-after:auto}.card-table{border-collapse:collapse;border-spacing:0;table-layout:fixed;width:7.5in;margin:0 auto;padding:0}.card-table.three-row{height:10.5in}.card-table.two-row{height:7in}.card-table td{width:2.5in;height:3.5in;min-width:2.5in;max-width:2.5in;min-height:3.5in;max-height:3.5in;padding:0;margin:0;border:0;vertical-align:top;overflow:hidden}.print-card{--card-text-size:7.1pt;--card-label-size:7.2pt;position:relative;width:2.5in;height:3.5in;overflow:hidden;border:1px solid #111;border-radius:0;background:#fff}.main-card{display:grid;grid-template-rows:.38in 1fr .16in}.card-header{position:relative;display:flex;align-items:center;min-height:.38in;padding:.05in .42in .05in .1in;background:#d7d7d7!important;border-bottom:1px solid #111;box-shadow:inset 0 0 0 999px #d7d7d7;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}.card-name{font-weight:800;font-size:12.6pt;line-height:1.02}.cost-circle{position:absolute;top:.065in;right:.065in;width:.28in;height:.28in;min-width:.28in;min-height:.28in;border:1.25px solid #111;border-radius:50%;padding:0;display:flex;align-items:center;justify-content:center;text-align:center;background:#fff!important;font-family:"Noto Sans",Arial,Helvetica,sans-serif;font-weight:900;font-size:10.6pt;line-height:1;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}.unique-flag{position:absolute;top:.42in;right:.07in;font-weight:800;font-size:6.2pt;text-transform:uppercase}.card-body{display:flex;flex-direction:column;min-height:0;padding:.09in .1in .06in}.rules-block{min-height:0;flex:1 1 0;overflow:hidden}.battle-block{border-top:1px solid #aaa;padding-top:.045in;margin-top:.045in}.label{font-weight:800;font-size:var(--card-label-size);line-height:1;margin-bottom:.03in;text-transform:uppercase}.text{font-size:var(--card-text-size);line-height:1.08;overflow-wrap:break-word}.reminder{border-top:1px solid #c8c8c8;margin-top:.045in;padding-top:.035in;font-size:calc(var(--card-text-size) - .6pt);line-height:1.04;font-style:italic;overflow:hidden}.reminder strong{font-weight:800}.card-footer{display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;gap:.04in;padding:.035in .06in;background:#d7d7d7!important;border-top:1px solid #111;box-shadow:inset 0 0 0 999px #d7d7d7;font-size:5.3pt;line-height:1;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}.card-footer span:nth-child(1){text-align:left;font-weight:700}.card-footer span:nth-child(2){text-align:center;font-size:4.8pt}.card-footer span:nth-child(3){text-align:right}.territory{--card-text-size:8pt;--card-label-size:7pt}.territory-inner{position:absolute;top:0;left:2.5in;width:3.5in;height:2.5in;transform-origin:top left;transform:rotate(90deg);display:grid;grid-template-rows:.36in 1fr .16in;overflow:hidden}.territory-header{display:flex;align-items:end;gap:.08in;padding:.05in .1in;background:#d7d7d7!important;border-bottom:1px solid #111;box-shadow:inset 0 0 0 999px #d7d7d7;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}.territory-type{font-size:7pt;font-weight:800;text-transform:uppercase;white-space:nowrap}.territory-name{font-size:13pt;font-weight:800;line-height:1}.territory-body{padding:.08in .1in;overflow:hidden}.territory .text{font-size:var(--card-text-size);line-height:1.12}.territory-footer{display:flex;justify-content:space-between;align-items:center;padding:.035in .06in;background:#d7d7d7!important;border-top:1px solid #111;box-shadow:inset 0 0 0 999px #d7d7d7;font-size:5.3pt;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}@page{size:letter;margin:.25in .1in .04in .1in}
</style>
</head>
<body>
${firstPage}
${cardPages}
<script>
function nextFrame(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
function fitPrintCards(){document.querySelectorAll('.fit-target').forEach(target=>{let textSize=target.classList.contains('territory-inner')?8:7.1;let labelSize=target.classList.contains('territory-inner')?7:7.2;const minTextSize=target.classList.contains('territory-inner')?5.2:4.7;while(target.scrollHeight>target.clientHeight&&textSize>minTextSize){textSize-=.2;labelSize=Math.max(4.8,labelSize-.12);target.style.setProperty('--card-text-size',textSize.toFixed(1)+'pt');target.style.setProperty('--card-label-size',labelSize.toFixed(1)+'pt');}});}
async function preparePrintView(){if(document.fonts?.ready){try{await document.fonts.ready;}catch(error){}}fitPrintCards();document.body.offsetHeight;await nextFrame();await nextFrame();setTimeout(()=>window.print(),300);}
window.addEventListener('load',preparePrintView);
<\/script>
</body>
</html>`;
}

function firstPageToHtml(deck, pageCards, hasMorePages) {
  return `<section class="first-page${hasMorePages ? " has-more-pages" : ""}"><div class="first-page-summary"><h1>${escapeHtml(deck.deckName)}</h1><p class="summary">${escapeHtml(deck.version)} · ${escapeHtml(deck.cardCount)}/${escapeHtml(deck.minimumCards)} main-deck cards · ${escapeHtml(deck.pointTotal)}/${escapeHtml(deck.maximumPoints)} points · ${escapeHtml(deck.territoryCount)}/${escapeHtml(deck.territoryRequirement)} Territories · ${deck.valid ? "Valid" : "Invalid"}</p><h2>Deck list</h2><div class="decklist">${deck.cardEntries.map(entry => `${entry.qty}x ${escapeHtml(entry.name)} (${escapeHtml(entry.cost)})`).join("<br>")}<br><br><strong>Territories</strong><br>${deck.territories.map(territory => escapeHtml(territory.name)).join("<br>")}</div></div>${cardTableToHtml(pageCards, 2, true)}</section>`;
}

function cardTableToHtml(pageCards, rowCount = 3, suppressSectionWrap = false) {
  const rows = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const cells = [];
    for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
      const cardIndex = rowIndex * 3 + columnIndex;
      cells.push(`<td>${pageCards[cardIndex] || ""}</td>`);
    }
    rows.push(`<tr>${cells.join("")}</tr>`);
  }
  const tableHtml = `<table class="card-table ${rowCount === 2 ? "two-row" : "three-row"}"><tbody>${rows.join("")}</tbody></table>`;
  return suppressSectionWrap ? tableHtml : `<section class="card-page">${tableHtml}</section>`;
}

function cardToPrintHtml(card) {
  return `<article class="print-card main-card fit-target"><header class="card-header"><span class="card-name">${escapeHtml(card.name)}</span><span class="cost-circle">${escapeHtml(card.cost)}</span></header>${card.unique ? '<div class="unique-flag">Unique</div>' : ""}<div class="card-body"><section class="rules-block"><div class="label">Action</div><div class="text">${escapeHtml(card.action || "—")}</div></section><section class="rules-block battle-block"><div class="label">Battle</div><div class="text">${escapeHtml(card.battle || "—")}</div></section>${card.reminder ? `<div class="reminder"><strong>REMINDER:</strong> ${escapeHtml(card.reminder)}</div>` : ""}</div><footer class="card-footer"><span>MASTER POOL</span><span>© 2026 T. Scott</span><span>${escapeHtml(state.data?.version || "v0.5")}</span></footer></article>`;
}

function territoryToPrintHtml(territory) {
  return `<article class="print-card territory"><div class="territory-inner fit-target"><header class="territory-header"><span class="territory-type">${territory.arena ? "Arena Territory" : "Territory"}</span><span class="territory-name">${escapeHtml(territory.name)}</span></header><div class="territory-body"><div class="text">${escapeHtml(territory.text || "")}</div></div><footer class="territory-footer"><span>MASTER POOL</span><span>${escapeHtml(state.data?.version || "v0.5")}</span></footer></div></article>`;
}

function stripLabel(text, label) {
  return text.replace(new RegExp(`^${label}:\\s*`, "i"), "").trim();
}

function costNumber(value) {
  const match = String(value).match(/(\d+)\s*pts?/i);
  return match ? match[1] : "";
}

function chunk(items, size) {
  const pages = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

/* Read print data from state rather than rendered compact markup. */
(() => {
  function readDeckFromState() {
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

    const cardEntries = getDeckCardEntries().map(({ card, qty }) => ({
      name: card.name,
      qty,
      cost: card.cost,
      unique: uniqueCards.has(card.name),
      action: card.action || "",
      battle: card.battle || "",
      reminder: card.reminder || ""
    }));

    const cards = cardEntries.flatMap(entry => Array.from({ length: entry.qty }, () => entry));

    const territories = state.territories
      .map(name => state.data?.territoryByName?.[name])
      .filter(Boolean)
      .map(territory => ({
        name: territory.name,
        text: territory.text || "",
        arena: Boolean(territory.arena)
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

  window.readDeckFromPage = readDeckFromState;
  try {
    readDeckFromPage = readDeckFromState;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();
