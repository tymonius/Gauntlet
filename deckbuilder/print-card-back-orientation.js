(() => {
  document.addEventListener("DOMContentLoaded", installCardBackOrientationFix);

  function installCardBackOrientationFix() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === cardBackAwareOpen) window.open = inheritedOpen;
      };

      function cardBackAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(rotateCardBacks(html));
        restoreOpen();
        return printWindow;
      }

      window.open = cardBackAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function rotateCardBacks(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const style = documentNode.querySelector("style");
    if (!style) return html;

    style.textContent += `
.gauntlet-card-back{
  transform:rotate(180deg)!important;
  transform-origin:center center!important;
}`;

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }
})();
