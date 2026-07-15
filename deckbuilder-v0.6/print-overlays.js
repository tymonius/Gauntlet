(() => {
  document.addEventListener("DOMContentLoaded", installOverlayPrintTransform);

  function installOverlayPrintTransform() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const originalOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        window.open = originalOpen;
      };

      window.open = function overlayAwareOpen(...args) {
        const printWindow = originalOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const originalWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => originalWrite(addOverlayBands(html));
        restoreOpen();
        return printWindow;
      };

      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function addOverlayBands(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const style = documentNode.querySelector("style");
    if (!style) return html;

    style.textContent += `
.overlay-card .card-header,
.overlay-card .card-body,
.overlay-card .card-footer{
  margin-right:.30in;
}
.overlay-card .unique-flag{
  right:.37in;
}
.overlay-band{
  position:absolute;
  z-index:5;
  top:0;
  right:0;
  bottom:0;
  width:.30in;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
  border-left:1px solid #111;
  background:#bcbcbc!important;
  box-shadow:inset 0 0 0 999px #bcbcbc;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
  color-adjust:exact;
}
.overlay-band-name{
  display:block;
  max-height:3.24in;
  overflow:hidden;
  writing-mode:vertical-rl;
  transform:rotate(180deg);
  color:#111;
  font-size:7.8pt;
  font-weight:900;
  line-height:1;
  letter-spacing:.045em;
  text-align:center;
  text-transform:uppercase;
  white-space:nowrap;
}
`;

    documentNode.querySelectorAll(".main-card").forEach(card => {
      const isOverlay = [...card.querySelectorAll(".rules-section .card-label")]
        .some(label => /(^|\s)overlay(\s|$)/i.test(label.textContent.trim()));
      if (!isOverlay) return;

      const name = card.querySelector(".card-name")?.textContent.trim();
      if (!name) return;

      card.classList.add("overlay-card");
      const band = documentNode.createElement("div");
      band.className = "overlay-band";
      band.setAttribute("aria-label", `${name} Overlay ownership band`);

      const bandName = documentNode.createElement("span");
      bandName.className = "overlay-band-name";
      bandName.textContent = name;
      band.append(bandName);
      card.append(band);
    });

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }
})();
