(() => {
  document.addEventListener("DOMContentLoaded", installIntelligenceTrackerPrintTransform);

  function installIntelligenceTrackerPrintTransform() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === intelligenceTrackerAwareOpen) window.open = inheritedOpen;
      };

      function intelligenceTrackerAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(formatIntelligenceTrackers(html));
        restoreOpen();
        return printWindow;
      }

      window.open = intelligenceTrackerAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function formatIntelligenceTrackers(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const style = documentNode.querySelector("style");
    if (!style) return html;

    documentNode.querySelectorAll(".tracker-card").forEach(card => {
      const title = card.querySelector(".tracker-title")?.textContent.trim().toLowerCase();
      if (title === "intel tracker") card.classList.add("intel-sliding-tracker");
      if (title === "operation progress") card.classList.add("operation-progress-sliding-tracker");
    });

    style.textContent += `
.intel-sliding-tracker,.operation-progress-sliding-tracker{background:repeating-linear-gradient(135deg,#fff 0,#fff .08in,#f5f5f5 .08in,#f5f5f5 .16in)!important;}
.intel-sliding-tracker .tracker-note,.operation-progress-sliding-tracker .tracker-note{top:.34in;font-size:5pt;line-height:1.08;}
.intel-sliding-tracker .tracker-step{left:.12in;right:.12in;border-top:.7px solid #555;}
.intel-sliding-tracker .tracker-step-value{top:-.07in;width:.14in;height:.14in;border:.6px solid #111;font-size:4.5pt;}
.intel-sliding-tracker .tracker-step-label{top:-.055in;padding-left:.02in;font-size:3.8pt;}
.operation-progress-sliding-tracker .tracker-step-label{font-size:5.2pt;}
.intel-sliding-tracker .tracker-zero,.operation-progress-sliding-tracker .tracker-zero{bottom:.16in;}
`;

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }
})();
