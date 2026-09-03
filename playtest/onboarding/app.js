(() => {
  const gate = (event) => {
    event.stopImmediatePropagation();
  };
  let released = false;
  document.addEventListener("DOMContentLoaded", gate, true);

  void loadInOrder([
    "../host-navigation.js?v=20260731-2",
    "../host-registry.js?v=20260731-2",
    "../guide-link.js?v=20260731-1",
    "identity-bridge.js?v=20260731-1",
    "app-core.js?v=20260731-1",
    "busy-focus-accessibility.js?v=20260903-1",
    "games.js?v=20260731-1"
  ]).finally(() => {
    if (released) return;
    released = true;
    document.removeEventListener("DOMContentLoaded", gate, true);
    if (document.readyState !== "loading") {
      document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
    }
  });

  async function loadInOrder(sources) {
    for (const source of sources) await loadScript(source);
  }

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = source;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${source}`));
      document.head.append(script);
    });
  }
})();
