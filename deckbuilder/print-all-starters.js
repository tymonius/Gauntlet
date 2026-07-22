(() => {
  const STARTER_DECK_SOURCE = "starter-decks.json";
  const EXPECTED_DECK_COUNT = 12;
  let starterDecks = [];
  let starterLoadError = null;
  let printing = false;

  document.addEventListener("DOMContentLoaded", installAllStarterPrintButton);

  function installAllStarterPrintButton() {
    const button = document.getElementById("printAllStarterDecksButton");
    if (!button) return;

    button.addEventListener("click", printAllStarterDecks);
    loadStarterDecks();

    const readyCheck = window.setInterval(() => {
      syncButton(button);
      if (starterLoadError || isReady()) window.clearInterval(readyCheck);
    }, 100);
  }

  async function loadStarterDecks() {
    try {
      const response = await fetch(STARTER_DECK_SOURCE, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load ${STARTER_DECK_SOURCE}: ${response.status}`);
      const data = await response.json();
      starterDecks = Array.isArray(data.decks) ? data.decks : [];
      if (starterDecks.length !== EXPECTED_DECK_COUNT) {
        throw new Error(`Expected ${EXPECTED_DECK_COUNT} starter Decks but found ${starterDecks.length}.`);
      }
    } catch (error) {
      starterLoadError = error;
      console.error(error);
    }

    const button = document.getElementById("printAllStarterDecksButton");
    if (button) syncButton(button);
  }

  function isReady() {
    return Boolean(
      starterDecks.length === EXPECTED_DECK_COUNT &&
      state.cards?.length &&
      state.territoryPool?.length &&
      !document.getElementById("printDeckButton")?.disabled
    );
  }

  function syncButton(button) {
    if (printing) return;

    button.disabled = !isReady();
    button.textContent = "Print all 12 starter decks";
    button.title = starterLoadError
      ? "The starter Deck definitions could not be loaded"
      : isReady()
        ? "Open one printable package containing all twelve complete recommended starter Decks"
        : "Waiting for card, Territory, and starter Deck data";
  }

  function printAllStarterDecks() {
    if (printing || !isReady()) return;

    const outputWindow = window.open("", "_blank");
    if (!outputWindow) {
      window.alert("Popup blocked. Allow popups to print all starter Decks.");
      return;
    }

    const button = document.getElementById("printAllStarterDecksButton");
    const snapshot = snapshotState();
    const documents = [];

    printing = true;
    button.disabled = true;
    button.textContent = `Preparing 0 of ${EXPECTED_DECK_COUNT}…`;
    outputWindow.document.write(`<!doctype html><title>Preparing all starter Decks</title><body style="font-family:Arial,sans-serif;padding:2rem"><h1>Preparing all twelve starter Decks…</h1><p>This window will open the print dialog when the complete package is ready.</p></body>`);
    outputWindow.document.close();

    try {
      starterDecks.forEach((preset, index) => {
        button.textContent = `Preparing ${index + 1} of ${EXPECTED_DECK_COUNT}…`;
        applyStarterDeckToState(preset);

        const validation = validateDeck();
        if (!validation.valid) {
          throw new Error(`${preset.name} failed Deckbuilder validation while preparing the combined print package.`);
        }

        documents.push(captureCurrentPrintDocument());
      });

      const combinedDocument = combinePrintDocuments(documents);
      outputWindow.document.open();
      outputWindow.document.write(combinedDocument);
      outputWindow.document.close();
      outputWindow.focus();
    } catch (error) {
      console.error(error);
      outputWindow.document.open();
      outputWindow.document.write(`<!doctype html><title>Unable to print starter Decks</title><body style="font-family:Arial,sans-serif;padding:2rem"><h1>Unable to prepare all starter Decks</h1><p>${escapeHtml(error.message || error)}</p></body>`);
      outputWindow.document.close();
      window.alert(`Unable to prepare all starter Decks: ${error.message || error}`);
    } finally {
      restoreState(snapshot);
      renderAll();
      printing = false;
      syncButton(button);
    }
  }

  function snapshotState() {
    return {
      deckName: state.deckName,
      factionId: state.factionId,
      leaderId: state.leaderId,
      deck: { ...state.deck },
      territories: [...(state.territories || [])],
      selectedCardId: state.selectedCardId,
      selectedTerritoryId: state.selectedTerritoryId
    };
  }

  function restoreState(snapshot) {
    state.deckName = snapshot.deckName;
    state.factionId = snapshot.factionId;
    state.leaderId = snapshot.leaderId;
    state.deck = { ...snapshot.deck };
    state.territories = [...snapshot.territories];
    state.selectedCardId = snapshot.selectedCardId;
    state.selectedTerritoryId = snapshot.selectedTerritoryId;
  }

  function applyStarterDeckToState(preset) {
    const faction = FACTIONS.find(item => item.id === preset.factionId);
    const leader = faction?.leaders?.find(item => item.id === preset.leaderId);
    if (!faction || !leader) throw new Error(`Missing faction or Leader for ${preset.name}.`);

    const deck = {};
    for (const item of preset.cards || []) {
      const card = state.cards.find(candidate =>
        candidate.name === item.name &&
        (candidate.faction === "neutral" || candidate.faction === preset.factionId)
      );
      if (!card) throw new Error(`${preset.name} references missing card ${item.name}.`);
      deck[card.id] = Number(item.quantity);
    }

    const territories = (preset.territories || []).map(name => {
      const territory = state.territoryPool.find(candidate => candidate.name === name);
      if (!territory) throw new Error(`${preset.name} references missing Territory ${name}.`);
      return territory.id;
    });

    state.deckName = `${leader.name} — ${preset.name}`;
    state.factionId = preset.factionId;
    state.leaderId = preset.leaderId;
    state.deck = deck;
    state.territories = territories;
  }

  function captureCurrentPrintDocument() {
    const printButton = document.getElementById("printDeckButton");
    const inheritedOpen = window.open;
    let captured = "";

    const fakeDocument = {
      write(value) { captured += String(value); },
      close() {}
    };
    const fakeWindow = {
      document: fakeDocument,
      focus() {}
    };

    window.open = () => fakeWindow;
    try {
      printButton.click();
    } finally {
      window.open = inheritedOpen;
    }

    if (!captured) throw new Error("The Deckbuilder did not generate a printable document.");
    return captured;
  }

  function combinePrintDocuments(documents) {
    const parser = new DOMParser();
    const parsed = documents.map(html => parser.parseFromString(html, "text/html"));
    const first = parsed[0];
    if (!first) throw new Error("No starter Deck print documents were generated.");

    const links = [...first.head.querySelectorAll("link")].map(link => link.outerHTML).join("\n");
    const styles = [...new Set(parsed.flatMap(documentNode =>
      [...documentNode.head.querySelectorAll("style")].map(style => style.textContent)
    ))];

    let printScript = "";
    const bodies = parsed.map((documentNode, index) => {
      const scripts = [...documentNode.body.querySelectorAll("script")];
      if (!printScript && scripts.length) printScript = scripts[scripts.length - 1].textContent;
      scripts.forEach(script => script.remove());

      const firstPage = documentNode.body.querySelector(".first-page");
      if (index > 0 && firstPage) firstPage.classList.add("bulk-deck-start");
      return [...documentNode.body.children].map(element => element.outerHTML).join("\n");
    }).join("\n");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>All 12 Gauntlet v0.6.0 Starter Decks</title>
${links}
${styles.map(style => `<style>${style}</style>`).join("\n")}
<style>
.bulk-deck-start{break-before:page!important;page-break-before:always!important;}
</style>
</head>
<body class="all-starter-decks-print">
${bodies}
<script>${printScript}<\/script>
</body>
</html>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
