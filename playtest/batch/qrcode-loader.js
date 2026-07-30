(() => {
  const LIBRARY_URL = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js";
  let libraryPromise = null;
  const shim = {
    async toDataURL(...args) {
      const implementation = await loadLibrary();
      return implementation.toDataURL(...args);
    }
  };

  window.QRCode = shim;

  function loadLibrary() {
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = LIBRARY_URL;
      script.referrerPolicy = "no-referrer";
      script.onload = () => {
        const implementation = window.QRCode;
        if (!implementation || implementation === shim || typeof implementation.toDataURL !== "function") {
          reject(new Error("The QR renderer loaded without a usable browser API."));
          return;
        }
        resolve(implementation);
      };
      script.onerror = () => reject(new Error("The QR renderer could not be downloaded."));
      document.head.append(script);
    }).catch((error) => {
      libraryPromise = null;
      window.QRCode = shim;
      throw error;
    });
    return libraryPromise;
  }
})();
