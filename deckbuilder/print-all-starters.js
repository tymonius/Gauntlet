(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const territoriesApi = () => deckbuilder.feature("territories");
  const ritesApi = () => deckbuilder.feature("mysticsRites");
  const currentGame = () => deckbuilder.currentGame();
  const currentGameLabel = () => currentGame()?.displayVersion || currentGame()?.version || "current";
  const deckState = () => deckbuilder.deckState();
  const cardCatalog = () => deckbuilder.cardCatalog();

  let starterDecks = [];
  let expectedDeckCount = 0;
  let starterLoadError = null;
  let printing = false;

  deckbuilder.registerRenderHook(syncCurrentButton);
  document.addEventListener("DOMContentLoaded", installAllStarterPrintButton);

  function installAllStarterPrintButton() {
    const button = document.getElementById("printAllStarterDecksButton");
    if (!button) return;

    button.addEventListener("click", printAllStarterDecks);
    syncButton(button);
    loadStarterDecks();
  }

  async function loadStarterDecks() {
    try {
      const currentGame = await deckbuilder.bootstrap();
      expectedDeckCount = (currentGame.factions || [])
        .reduce((sum, faction) => sum + (faction.leaders || []).length, 0);
      if (!expectedDeckCount) throw new Error("Current-game authority exposes no Leaders for starter Deck coverage.");

      starterDecks = Array.isArray(currentGame.starterDecks)
        ? currentGame.starterDecks.map(deck => ({ ...deck }))
        : [];
      if (starterDecks.length !== expectedDeckCount) {
        throw new Error(`Expected one starter Deck per Leader (${expectedDeckCount}) but found ${starterDecks.length}.`);
      }
    } catch (error) {
      starterLoadError = error;
      console.error(error);
    }

    const button = document.getElementById("printAllStarterDecksButton");
    if (button) syncButton(button);
  }

  function isReady() {
    const starterApi = deckbuilder.feature("starterDecks");
    const starterTipsReady = typeof starterApi?.getSelectedDeck === "function" && Boolean(starterApi.getSelectedDeck());
    const mysticsRitesReady = ritesApi()?.isReady?.() === true;

    return Boolean(
      expectedDeckCount > 0 && starterDecks.length === expectedDeckCount &&
      starterTipsReady &&
      mysticsRitesReady &&
      cardCatalog().length &&
      territoriesApi()?.isReady?.() &&
      !document.getElementById("printDeckButton")?.disabled
    );
  }

  function syncCurrentButton() {
    const button = document.getElementById("printAllStarterDecksButton");
    if (button) syncButton(button);
  }

  function syncButton(button) {
    if (printing) return;

    button.disabled = !isReady();
    button.textContent = expectedDeckCount ? `Print all ${expectedDeckCount} starter decks` : "Print all starter decks";
    button.title = starterLoadError
      ? "The starter Deck definitions could not be loaded"
      : isReady()
        ? `Open one printable package containing all ${expectedDeckCount} complete recommended starter Decks`
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
    button.textContent = `Preparing 0 of ${expectedDeckCount}…`;
    outputWindow.document.write(`<!doctype html><title>Preparing all starter Decks</title><body style="font-family:Arial,sans-serif;padding:2rem"><h1>Preparing all ${expectedDeckCount} starter Decks…</h1><p>This window will open the print dialog when the complete package is ready.</p></body>`);
    outputWindow.document.close();

    try {
      starterDecks.forEach((preset, index) => {
        button.textContent = `Preparing ${index + 1} of ${expectedDeckCount}…`;
        applyStarterDeckToState(preset);

        const validation = deckbuilder.validate();
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
      deckbuilder.render();
      printing = false;
      syncButton(button);
    }
  }

  function snapshotState() {
    return {
      core: deckState(),
      territories: territoriesApi()?.selectedIds?.() || [],
      rites: ritesApi()?.selectedIds?.() || [],
    };
  }

  function restoreState(snapshot) {
    deckbuilder.replaceDeckState(snapshot.core);
    territoriesApi()?.setSelectedIds?.(snapshot.territories || []);
    ritesApi()?.setSelectedIds?.(snapshot.rites || []);
  }

  function starterRiteIds(preset) {
    if (preset.factionId !== "mystics") return [];
    if (Array.isArray(preset.selectedRites)) return [...preset.selectedRites];
    const riteApi = ritesApi();
    return riteApi?.selectionEnabled?.() ? [] : (riteApi?.defaultIds?.() || []);
  }

  function applyStarterDeckToState(preset) {
    const faction = deckbuilder.factions.find(item => item.id === preset.factionId);
    const leader = faction?.leaders?.find(item => item.id === preset.leaderId);
    if (!faction || !leader) throw new Error(`Missing faction or Leader for ${preset.name}.`);

    const deck = {};
    for (const item of preset.cards || []) {
      const card = cardCatalog().find(candidate =>
        candidate.name === item.name &&
        (candidate.faction === "neutral" || candidate.faction === preset.factionId)
      );
      if (!card) throw new Error(`${preset.name} references missing card ${item.name}.`);
      deck[card.id] = Number(item.quantity);
    }

    const territoryPool = currentGame()?.territories || [];
    const territories = (preset.territories || []).map(name => {
      const territory = territoryPool.find(candidate => candidate.name === name);
      if (!territory) throw new Error(`${preset.name} references missing Territory ${name}.`);
      return territory.id;
    });

    deckbuilder.replaceDeckState({
      deckName: `${leader.name} — ${preset.name}`,
      factionId: preset.factionId,
      leaderId: preset.leaderId,
      deck,
      selectedCardId: null,
    });
    territoriesApi()?.setSelectedIds?.(territories);
    ritesApi()?.setSelectedIds?.(starterRiteIds(preset));
  }

  function captureCurrentPrintDocument() {
    const printApi = deckbuilder.feature("printDeck");
    if (typeof printApi?.buildDocument !== "function") {
      throw new Error("The Deckbuilder print document API is unavailable.");
    }

    const documentHtml = printApi.buildDocument();
    if (!documentHtml) throw new Error("The Deckbuilder did not generate a printable document.");
    return documentHtml;
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

    const printScripts = [...first.body.querySelectorAll("script")].map(script => script.outerHTML);
    const bodies = parsed.map((documentNode, index) => {
      documentNode.body.querySelectorAll("script").forEach(script => script.remove());

      const firstPage = documentNode.body.querySelector(".first-page");
      if (index > 0 && firstPage) firstPage.classList.add("bulk-deck-start");
      return [...documentNode.body.children].map(element => element.outerHTML).join("\n");
    }).join("\n");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>All ${expectedDeckCount} Gauntlet ${escapeHtml(currentGameLabel())} Starter Decks</title>
${links}
${styles.map(style => `<style>${style}</style>`).join("\n")}
<style>
.bulk-deck-start{break-before:page!important;page-break-before:always!important;}
</style>
</head>
<body class="all-starter-decks-print">
${bodies}
${printScripts.join("\n")}
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
