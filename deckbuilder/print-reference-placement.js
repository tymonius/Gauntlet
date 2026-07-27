(() => {
  document.addEventListener("DOMContentLoaded", installReferencePlacementTransform);

  function installReferencePlacementTransform() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === referenceAwareOpen) window.open = inheritedOpen;
      };

      function referenceAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(repositionDiplomatReference(html));
        restoreOpen();
        return printWindow;
      }

      window.open = referenceAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function repositionDiplomatReference(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const frontPage = documentNode.querySelector('.duplex-front-page[data-duplex-pair="diplomat-reference"]');
    const backPage = documentNode.querySelector('.duplex-back-page[data-duplex-pair="diplomat-reference"]');
    if (!frontPage || !backPage) return html;

    moveOnlyCard(frontPage, 0);
    moveOnlyCard(backPage, 2);

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function moveOnlyCard(page, targetIndex) {
    const cells = [...page.querySelectorAll("td")];
    const card = page.querySelector(".reference-card");
    if (!card || !cells[targetIndex]) return;

    cells.forEach(cell => cell.replaceChildren());
    cells[targetIndex].append(card);
  }
})();
