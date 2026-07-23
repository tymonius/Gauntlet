(() => {
  document.addEventListener("DOMContentLoaded", installIntelligencePortraitTransform);

  function installIntelligencePortraitTransform() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === intelligencePortraitAwareOpen) window.open = inheritedOpen;
      };

      function intelligencePortraitAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(frameIntelligencePortraits(html));
        restoreOpen();
        return printWindow;
      }

      window.open = intelligencePortraitAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function frameIntelligencePortraits(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const style = documentNode.querySelector("style");
    if (!style) return html;

    let found = false;
    documentNode.querySelectorAll(".leader-card").forEach(card => {
      const faction = card.querySelector(".leader-faction")?.textContent.trim().toLowerCase();
      if (faction !== "intelligence leader") return;

      const leaderName = card.querySelector(".leader-title")?.textContent.trim().toLowerCase();
      card.classList.add("intelligence-leader-card");
      if (leaderName === "ranger") card.classList.add("ranger-leader-card");
      if (leaderName === "spymaster") card.classList.add("spymaster-leader-card");
      found = true;
    });

    if (!found) return html;

    style.textContent += `
.intelligence-leader-card{grid-template-rows:1.37in 1fr .16in!important;}
.intelligence-leader-card .leader-art img{position:absolute!important;left:0!important;width:100%!important;height:auto!important;max-width:none!important;object-fit:fill!important;object-position:initial!important;}
.ranger-leader-card .leader-art img{top:-.015in!important;}
.spymaster-leader-card .leader-art img{top:-.01in!important;}`;

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }
})();
