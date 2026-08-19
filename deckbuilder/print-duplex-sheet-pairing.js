(() => {
  const COLUMNS = 3;
  const RENDER_TIMEOUT_MS = 30000;

  document.addEventListener("DOMContentLoaded", installDuplexSheetPairingFix);

  function installDuplexSheetPairingFix() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === pairingAwareOpen) window.open = inheritedOpen;
      };

      function pairingAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => {
          try {
            inheritedWrite(prepareProductionPrintDocument(html));
          } catch (error) {
            console.error(error);
            window.alert(`Unable to prepare the production card print package: ${error.message}`);
            printWindow.close();
          }
        };
        restoreOpen();
        return printWindow;
      }

      window.open = pairingAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function prepareProductionPrintDocument(html) {
    const printCardBacks = Boolean(document.getElementById("printCardBacks")?.checked);
    const documentNode = new DOMParser().parseFromString(html, "text/html");

    if (printCardBacks) ensureSheetBackPages(documentNode);
    replaceProductionFronts(documentNode);
    if (printCardBacks) replaceProductionBacks(documentNode);
    injectProductionPrintStyles(documentNode);
    installProductionReadinessGate(documentNode);

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function ensureSheetBackPages(documentNode) {
    const frontPages = [
      documentNode.querySelector(".first-page"),
      ...documentNode.querySelectorAll(".card-page:not(.duplex-page):not(.deck-card-back-page)")
    ].filter(Boolean);

    frontPages.forEach((frontPage, index) => {
      if (frontPage.nextElementSibling?.classList.contains("deck-card-back-page")) return;

      const frontTable = frontPage.querySelector(".card-table");
      if (!frontTable) return;
      const rowCount = frontTable.classList.contains("two-row") ? 2 : 3;
      const isFirstPage = frontPage.classList.contains("first-page");
      const pairName = frontPage.dataset.duplexPair || `deck-sheet-${index + 1}`;
      const backPage = makeBlankBackPage(documentNode, rowCount, isFirstPage);

      frontPage.classList.add("deck-card-front-page");
      frontPage.dataset.duplexPair = pairName;
      backPage.dataset.duplexPair = pairName;
      frontPage.after(backPage);
    });
  }

  function replaceProductionFronts(documentNode) {
    const cardsByName = new Map(
      (Array.isArray(state.cards) ? state.cards : []).map(card => [String(card.name || "").trim(), card])
    );
    const territoriesByName = new Map(
      (Array.isArray(state.territoryPool) ? state.territoryPool : []).map(territory => [String(territory.name || "").trim(), territory])
    );
    const unresolved = [];

    documentNode.querySelectorAll(".print-card.main-card").forEach(legacyCard => {
      const name = legacyCard.querySelector(".card-name")?.textContent.trim() || "";
      const card = cardsByName.get(name);
      if (!card?.id) {
        unresolved.push(name || "unnamed playable card");
        return;
      }
      legacyCard.replaceWith(makeProductionCard(documentNode, card));
    });

    documentNode.querySelectorAll(".print-card.territory").forEach(legacyTerritory => {
      const name = legacyTerritory.querySelector(".territory-name")?.textContent.trim() || "";
      const territory = territoriesByName.get(name);
      if (!territory?.id) {
        unresolved.push(name || "unnamed Territory");
        return;
      }
      legacyTerritory.replaceWith(makeProductionTerritory(documentNode, territory));
    });

    if (unresolved.length) {
      throw new Error(`Could not resolve production render IDs for: ${unresolved.join(", ")}`);
    }
  }

  function makeProductionCard(documentNode, card) {
    const wrapper = documentNode.createElement("article");
    wrapper.className = "print-card main-card production-render-card";
    wrapper.dataset.productionCardId = card.id;
    wrapper.setAttribute("aria-label", `${card.name} production card`);

    const frame = documentNode.createElement("iframe");
    frame.className = "production-card-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "card";
    frame.src = `/card-design/card-print-render.html?card=${encodeURIComponent(card.id)}&fit=production`;
    frame.title = `${card.name} production card`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");
    wrapper.append(frame);
    return wrapper;
  }

  function makeProductionTerritory(documentNode, territory) {
    const wrapper = documentNode.createElement("article");
    wrapper.className = "print-card territory production-render-territory";
    wrapper.dataset.productionTerritoryId = territory.id;
    wrapper.setAttribute("aria-label", `${territory.name} production Territory`);

    const rotate = documentNode.createElement("div");
    rotate.className = "production-territory-rotate";

    const frame = documentNode.createElement("iframe");
    frame.className = "production-territory-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "territory";
    frame.src = `/card-design/territory-print-render.html?territory=${encodeURIComponent(territory.id)}`;
    frame.title = `${territory.name} production Territory`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");

    rotate.append(frame);
    wrapper.append(rotate);
    return wrapper;
  }

  function replaceProductionBacks(documentNode) {
    const faction = String(state.factionId || "intelligence").trim().toLowerCase();
    const backPages = [...documentNode.querySelectorAll(".deck-card-back-page[data-duplex-pair]")];

    documentNode.querySelectorAll(".deck-card-front-page[data-duplex-pair]").forEach(frontPage => {
      const pairName = frontPage.dataset.duplexPair;
      const backPage = backPages.find(page => page.dataset.duplexPair === pairName);
      if (!backPage) return;

      const frontCells = [...frontPage.querySelectorAll(".card-table td")];
      const backCells = [...backPage.querySelectorAll(".card-table td")];
      frontCells.forEach((frontCell, frontIndex) => {
        if (!frontCell.querySelector(".production-render-card, .production-render-territory")) return;
        const backCell = backCells[mirrorIndexForLongEdge(frontIndex)];
        if (!backCell) return;
        backCell.replaceChildren(makeProductionDeckBack(documentNode, faction));
      });
    });
  }

  function makeProductionDeckBack(documentNode, faction) {
    const wrapper = documentNode.createElement("article");
    wrapper.className = "print-card production-render-back";
    wrapper.setAttribute("aria-label", `${faction} production deck-card back`);

    const frame = documentNode.createElement("iframe");
    frame.className = "production-back-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "back";
    frame.src = `/tts/back-renderer/index.html?faction=${encodeURIComponent(faction)}`;
    frame.title = `${faction} production deck-card back`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");
    wrapper.append(frame);
    return wrapper;
  }

  function injectProductionPrintStyles(documentNode) {
    const style = documentNode.createElement("style");
    style.dataset.productionPrintRender = "true";
    style.textContent = `
.print-card.production-render-card,
.print-card.production-render-territory,
.print-card.production-render-back {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.print-card.production-render-card {
  display: block !important;
}
.production-card-frame {
  display: block;
  width: 2.5in;
  height: 3.5in;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}
.print-card.production-render-territory {
  position: relative !important;
}
.production-territory-rotate {
  position: absolute;
  top: 0;
  left: 2.5in;
  width: 3.5in;
  height: 2.5in;
  transform: rotate(90deg);
  transform-origin: top left;
}
.production-territory-frame {
  display: block;
  width: 3.5in;
  height: 2.5in;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}
.print-card.production-render-back {
  display: block !important;
  width: 2.5in;
  height: 3.5in;
  transform: rotate(180deg) !important;
  transform-origin: center center !important;
}
.production-back-frame {
  display: block;
  width: 2.5in;
  height: 3.5in;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}`;
    documentNode.head.append(style);
  }

  function installProductionReadinessGate(documentNode) {
    const script = documentNode.createElement("script");
    script.dataset.productionPrintGate = "true";
    script.textContent = `(() => {
  const timeoutMs = ${RENDER_TIMEOUT_MS};
  const previousPreparePrint = window.preparePrint;
  if (typeof previousPreparePrint !== 'function') return;

  window.removeEventListener('load', previousPreparePrint);

  const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  async function waitForFrame(frame) {
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      try {
        const doc = frame.contentDocument;
        const body = doc?.body;
        const kind = frame.dataset.productionRenderKind;
        if (kind === 'back') {
          if (doc?.readyState === 'complete' && doc.querySelector('.gauntlet-card-back__frame')) return 'true';
        } else {
          const status = body?.dataset?.renderReady;
          if (status === 'true' || status === 'error') return status;
        }
      } catch (error) {
        console.error('Unable to inspect production print frame', frame.src, error);
        return 'error';
      }
      await delay(25);
    }
    console.error('Timed out waiting for production print frame', frame.src);
    return 'timeout';
  }

  async function prepareProductionPrint() {
    const frames = [...document.querySelectorAll('[data-production-render-frame]')];
    const results = await Promise.all(frames.map(waitForFrame));
    if (results.some(result => result !== 'true')) {
      window.alert('One or more production card faces failed to finish rendering. Printing was stopped so the Deck is not printed with incomplete cards.');
      return;
    }
    await previousPreparePrint();
  }

  window.addEventListener('load', prepareProductionPrint, { once: true });
})();`;
    documentNode.body.append(script);
  }

  function mirrorIndexForLongEdge(index) {
    const row = Math.floor(index / COLUMNS);
    const column = index % COLUMNS;
    return row * COLUMNS + (COLUMNS - 1 - column);
  }

  function makeBlankBackPage(documentNode, rowCount, firstPageBack) {
    const section = documentNode.createElement("section");
    section.className = `card-page deck-card-back-page duplex-back-page blank-card-back-page${firstPageBack ? " first-page-back" : ""}`;

    if (firstPageBack) {
      const spacer = documentNode.createElement("div");
      spacer.className = "first-page-back-spacer";
      section.append(spacer);
    }

    const table = documentNode.createElement("table");
    table.className = `card-table ${rowCount === 2 ? "two-row" : "three-row"}`;
    const body = documentNode.createElement("tbody");

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = documentNode.createElement("tr");
      for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex += 1) {
        row.append(documentNode.createElement("td"));
      }
      body.append(row);
    }

    table.append(body);
    section.append(table);
    return section;
  }
})();
