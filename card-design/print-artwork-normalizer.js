const SHORT_EDGE = 960;
const LONG_EDGE = 1800;
const ART_WINDOW_BACKGROUND = '#8a7a67';

function cacheHost() {
  try {
    if (window.top && window.top.location.origin === window.location.origin) return window.top;
  } catch {}
  return window;
}

function sharedCache() {
  const host = cacheHost();
  const existing = host.__gauntletPrintArtworkCache;
  if (!existing || typeof existing.get !== 'function' || typeof existing.set !== 'function') {
    Object.defineProperty(host, '__gauntletPrintArtworkCache', {
      configurable: true,
      value: new host.Map(),
    });
  }
  return host.__gauntletPrintArtworkCache;
}

function targetDimensions(width, height) {
  const sourceWidth = Number(width) || 0;
  const sourceHeight = Number(height) || 0;
  if (!sourceWidth || !sourceHeight) {
    throw new Error(`Invalid print artwork dimensions: ${width} × ${height}.`);
  }

  const scale = Math.min(
    1,
    SHORT_EDGE / Math.min(sourceWidth, sourceHeight),
    LONG_EDGE / Math.max(sourceWidth, sourceHeight),
  );
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Unable to encode normalized print artwork.')),
      'image/png',
    );
  });
}

async function normalizeLoadedImage(image) {
  const source = image.currentSrc || image.src;
  if (!source || !image.naturalWidth || !image.naturalHeight) {
    throw new Error('Canonical artwork was not loaded before print normalization.');
  }

  const dimensions = targetDimensions(image.naturalWidth, image.naturalHeight);
  const key = `${source}|png|${dimensions.width}x${dimensions.height}`;
  const cache = sharedCache();

  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d', {
        alpha: false,
        colorSpace: 'srgb',
      });
      if (!context) throw new Error('This browser cannot create the normalized print artwork canvas.');

      context.fillStyle = ART_WINDOW_BACKGROUND;
      context.fillRect(0, 0, dimensions.width, dimensions.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

      const blob = await canvasBlob(canvas);
      const url = URL.createObjectURL(blob);
      return Object.freeze({
        url,
        source,
        sourceWidth: image.naturalWidth,
        sourceHeight: image.naturalHeight,
        width: dimensions.width,
        height: dimensions.height,
        bytes: blob.size,
      });
    })().catch(error => {
      cache.delete(key);
      throw error;
    }));
  }

  return cache.get(key);
}

function waitForReplacement(image, source) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
      callback(value);
    };
    const onLoad = () => finish(resolve);
    const onError = () => finish(reject, new Error('Normalized print artwork failed to load.'));

    image.addEventListener('load', onLoad);
    image.addEventListener('error', onError);
    image.src = source;
    if (image.complete && image.naturalWidth > 0) finish(resolve);
  });
}

function cropSnapshot(image) {
  return {
    cssText: image.style.cssText,
    artCrop: image.dataset.artCrop,
    artCropX: image.dataset.artCropX,
    artCropY: image.dataset.artCropY,
    artFocusX: image.dataset.artFocusX,
    artFocusY: image.dataset.artFocusY,
    artZoom: image.dataset.artZoom,
  };
}

function restoreCrop(image, snapshot) {
  image.style.cssText = snapshot.cssText;
  for (const key of ['artCrop', 'artCropX', 'artCropY', 'artFocusX', 'artFocusY', 'artZoom']) {
    const value = snapshot[key];
    if (value === undefined) delete image.dataset[key];
    else image.dataset[key] = value;
  }
}

export function installPrintArtworkFinalizer() {
  document.body.dataset.printArtworkNormalized = 'pending';

  window.GAUNTLET_RENDER_FINALIZE = async ({ artImage } = {}) => {
    if (!artImage) throw new Error('Canonical playable card is missing its artwork image.');

    // The canonical renderer has already resolved fitting and artwork crop using
    // the original source at this point. Snapshot that visual state before
    // replacing only the raster payload used for printing.
    const snapshot = cropSnapshot(artImage);
    const record = await normalizeLoadedImage(artImage);
    await waitForReplacement(artImage, record.url);
    restoreCrop(artImage, snapshot);

    document.body.dataset.printArtworkNormalized = 'true';
    document.body.dataset.printArtworkSource = record.source;
    document.body.dataset.printArtworkPixels = `${record.width}x${record.height}`;
    document.body.dataset.printArtworkSourcePixels = `${record.sourceWidth}x${record.sourceHeight}`;
    document.body.dataset.printArtworkBytes = String(record.bytes);
  };
}

export { ART_WINDOW_BACKGROUND, LONG_EDGE, SHORT_EDGE, targetDimensions };
