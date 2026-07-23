(() => {
  const portraitSources = {
    Banker: "../images/banker.png",
    Executive: "../images/executive.png",
    Alchemist: "../images/alchemist.png",
    "Spirit Walker": "../images/spirit walker.png",
    Ranger: "../images/ranger.png",
    Spymaster: "../images/spymaster.png"
  };

  document.querySelectorAll(".leader-card").forEach(card => {
    const title = card.dataset.cardName || card.querySelector(".leader-title")?.textContent || "";
    const normalizedTitle = title.trim().replace(/\s+/g, " ").replace(/^(.+)$/u, value =>
      value.toLowerCase().replace(/\b\w/g, character => character.toUpperCase())
    );
    const source = portraitSources[normalizedTitle];
    if (!source) return;

    let image = card.querySelector(".leader-art img");
    if (!image) {
      image = document.createElement("img");
      card.querySelector(".leader-art")?.prepend(image);
    }

    image.src = new URL(source, window.location.href).href;
    image.alt = normalizedTitle;
    image.dataset.rasterPortrait = "true";
  });
})();
