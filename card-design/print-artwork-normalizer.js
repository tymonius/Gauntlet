const DEFAULT_MAX_EDGE = 1000;

function requestedProfile() {
  const value = String(new URLSearchParams(window.location.search).get('printArtwork') || '').trim().toLowerCase();
  return value === 'normalized' ? 'normalized' : '';
}

function cacheHost() {
  try {
    if (window.top && window.top.location.origin === window.location.origin) return window.top;
  } catch {}
  return window;
}

function sharedCache() {
  const host = cacheHost();
  if (!(host.__gauntletPrintArtworkCache instanceof Map)) {
    Object.defineProperty(host, '__gauntletPrintArtworkCache', {
      configurable: true,
      value: new Map(),
    });
  }
  return host.__gauntletPrintArtworkCache;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', () => reject(new Error(`Unable to normalize print artwork: ${source}`)), { once: true });
    image.src = source;
    if (image.complete && image.naturalWidth > 0) resolve(image);
  });
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Unable to encode normalized print artwork.')),
      'image/png',
    );
  });
}

async function normalizeSource(source, maxEdge) {
  const image = await loadImage(source);
  const sourceWidth = Number(image.naturalWidth) || 0;
  const sourceHeight = Number(image.naturalHeight) || 0;
  if (!sourceWidth || !sourceHeight) throw new Error(`Normalized print artwork has invalid dimensions: ${source}`);

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', {
    alpha: true,
    colorSpace: 'srgb',
  });
  if (!context) throw new Error('This browser cannot create the normalized print artwork canvas.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasBlob(canvas);
  const host = cacheHost();
  const url = host.URL.createObjectURL(blob);
  return Object.freeze({
    url,
    sourceWidth,
    sourceHeight,
    width,
    height,
    bytes: blob.size,
  });
}

export function normalizedPrintArtworkRequested() {
  return requestedProfile() === 'normalized';
}

export async function normalizePrintArtworkSource(source, options = {}) {
  if (!source || !normalizedPrintArtworkRequested()) return source;

  const maxEdge = Math.max(64, Math.round(Number(options.maxEdge) || DEFAULT_MAX_EDGE));
  const absolute = new URL(source, window.location.href).href;
  const key = `${absolute}|png|${maxEdge}`;
  const cache = sharedCache();

  if (!cache.has(key)) {
    cache.set(key, normalizeSource(absolute, maxEdge).catch(error => {
      cache.delete(key);
      throw error;
    }));
  }

  const record = await cache.get(key);
  document.body.dataset.printArtworkNormalized = 'true';
  document.body.dataset.printArtworkMaxEdge = String(maxEdge);
  document.body.dataset.printArtworkSourcePixels = `${record.sourceWidth}x${record.sourceHeight}`;
  document.body.dataset.printArtworkPixels = `${record.width}x${record.height}`;
  document.body.dataset.printArtworkBytes = String(record.bytes);
  return record.url;
}

export { DEFAULT_MAX_EDGE };
