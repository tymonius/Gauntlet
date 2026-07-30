(() => {
  const LIBRARY_URLS = [
    "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
  ];

  let libraryPromise = null;
  const shim = {
    async toDataURL(value, options = {}) {
      const QRCodeConstructor = await loadLibrary();
      return renderDataUrl(QRCodeConstructor, value, options);
    }
  };

  window.QRCode = shim;

  function loadLibrary() {
    if (libraryPromise) return libraryPromise;
    libraryPromise = loadFromNextUrl(0).catch((error) => {
      libraryPromise = null;
      window.QRCode = shim;
      throw error;
    });
    return libraryPromise;
  }

  async function loadFromNextUrl(index) {
    if (index >= LIBRARY_URLS.length) {
      throw new Error("The QR renderer could not be downloaded from either provider.");
    }

    try {
      return await loadScript(LIBRARY_URLS[index]);
    } catch (error) {
      console.warn(`QR renderer provider ${index + 1} failed.`, error);
      return loadFromNextUrl(index + 1);
    }
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.referrerPolicy = "no-referrer";
      script.onload = () => {
        const implementation = window.QRCode;
        window.QRCode = shim;
        if (typeof implementation !== "function" || !implementation.CorrectLevel) {
          script.remove();
          reject(new Error("The QR renderer loaded without a usable browser API."));
          return;
        }
        resolve(implementation);
      };
      script.onerror = () => {
        window.QRCode = shim;
        script.remove();
        reject(new Error(`The QR renderer could not be downloaded from ${new URL(url).hostname}.`));
      };
      document.head.append(script);
    });
  }

  function renderDataUrl(QRCodeConstructor, value, options) {
    const size = Math.max(96, Number(options.width) || 260);
    const marginUnits = Math.max(0, Number(options.margin) || 0);
    const quietZone = marginUnits === 0 ? 0 : Math.max(6, Math.round(size * 0.04 * marginUnits));
    const coreSize = Math.max(64, size - quietZone * 2);
    const dark = options.color?.dark || "#111111";
    const light = options.color?.light || "#ffffff";
    const holder = document.createElement("div");
    holder.style.cssText = [
      "position:fixed",
      "left:-10000px",
      "top:0",
      `width:${coreSize}px`,
      `height:${coreSize}px`,
      "overflow:hidden",
      "pointer-events:none"
    ].join(";");
    document.body.append(holder);

    try {
      new QRCodeConstructor(holder, {
        text: String(value),
        width: coreSize,
        height: coreSize,
        colorDark: dark,
        colorLight: light,
        correctLevel: correctionLevel(QRCodeConstructor, options.errorCorrectionLevel)
      });

      const source = holder.querySelector("canvas");
      if (!source) throw new Error("The QR renderer did not produce a canvas.");

      const output = document.createElement("canvas");
      output.width = size;
      output.height = size;
      const context = output.getContext("2d");
      if (!context) throw new Error("This browser cannot create the QR image canvas.");
      context.fillStyle = light;
      context.fillRect(0, 0, size, size);
      context.drawImage(source, quietZone, quietZone, coreSize, coreSize);
      return output.toDataURL("image/png");
    } finally {
      holder.remove();
    }
  }

  function correctionLevel(QRCodeConstructor, requested) {
    const key = String(requested || "M").toUpperCase();
    return QRCodeConstructor.CorrectLevel[key] ?? QRCodeConstructor.CorrectLevel.M;
  }
})();
