(() => {
  const install = async () => {
    try {
      const module = await import("./custom-print.mjs?v=20260901-1");
      module.installCustomPrintMode();
    } catch (error) {
      console.error("Unable to initialize Deckbuilder custom printing", error);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
