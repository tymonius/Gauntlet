(() => {
  const packages = window.GAUNTLET_V06_SUPPLEMENTALS;
  if (!packages) return;

  const assetUrl = path => new URL(path, window.location.href).href;

  if (packages.financiers) {
    packages.financiers.leaderImages = {
      banker: assetUrl("../images/banker.png"),
      executive: assetUrl("../images/executive.png")
    };
  }

  if (packages.mystics) {
    packages.mystics.leaderImages = {
      alchemist: assetUrl("../images/alchemist.png"),
      "spirit-walker": assetUrl("../images/spirit walker.png")
    };
  }

  if (packages.intelligence) {
    packages.intelligence.leaderImages = {
      ranger: assetUrl("../images/ranger.png"),
      spymaster: assetUrl("../images/spymaster.png")
    };
  }
})();
