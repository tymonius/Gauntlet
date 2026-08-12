(() => {
  const SAMPLE_MAX_DIMENSION = 128;
  const MIN_CROP_FRACTION = 0.985;
  const analysisCache = new Map();

  function apply(image, direction = null, options = {}) {
    if (!image?.naturalWidth || !image?.naturalHeight) return null;

    const frame = image.closest('.card-art, .territory-art');
    if (!frame || frame.clientWidth < 1 || frame.clientHeight < 1) return null;

    const overrideKey = options.id || options.label;
    const override = overrideKey ? window.GAUNTLET_ART_DIRECTION?.[overrideKey] : null;
    const authored = normalizeDirection(direction ?? override);
    image.style.objectFit = authored.fit;
    image.style.transform = authored.zoom === 1 ? '' : `scale(${authored.zoom})`;

    if (authored.fit !== 'cover' || authored.smart === false || authored.hasFocus) {
      const result = setPosition(
        image,
        authored.focusX ?? 0.5,
        authored.focusY ?? 0.52,
        authored.hasFocus ? 'manual' : 'default',
      );
      image.dataset.artZoom = String(authored.zoom);
      return result;
    }

    try {
      const frameAspect = frame.clientWidth / frame.clientHeight;
      const imageAspect = image.naturalWidth / image.naturalHeight;
      const analysis = analyze(image);
      let x = 0.5;
      let y = 0.52;

      if (imageAspect > frameAspect) {
        const visibleFraction = frameAspect / imageAspect;
        if (visibleFraction < MIN_CROP_FRACTION) {
          x = bestObjectPosition(analysis.columns, visibleFraction, 0.5);
        }
      } else {
        const visibleFraction = imageAspect / frameAspect;
        if (visibleFraction < MIN_CROP_FRACTION) {
          y = bestObjectPosition(analysis.rows, visibleFraction, 0.46);
        }
      }

      const result = setPosition(image, x, y, 'smart');
      image.dataset.artZoom = String(authored.zoom);
      return result;
    } catch (error) {
      const result = setPosition(image, 0.5, 0.52, 'fallback');
      image.dataset.artZoom = String(authored.zoom);
      console.warn(
        `Smart artwork crop fell back to centered positioning${options.label ? ` for ${options.label}` : ''}.`,
        error,
      );
      return result;
    }
  }

  function normalizeDirection(direction) {
    const source = direction && typeof direction === 'object' ? direction : {};
    const focus = Array.isArray(source.focus) ? source.focus : [];
    const focusX = normalizeFocus(source.focusX ?? source.focus_x ?? source.x ?? focus[0]);
    const focusY = normalizeFocus(source.focusY ?? source.focus_y ?? source.y ?? focus[1]);
    const zoomValue = Number.parseFloat(source.zoom);
    const fit = source.fit === 'contain' ? 'contain' : 'cover';

    return {
      fit,
      focusX,
      focusY,
      hasFocus: focusX !== null || focusY !== null,
      smart: source.smart !== false,
      zoom: Number.isFinite(zoomValue) ? clamp(zoomValue, 1, 1.8) : 1,
    };
  }

  function normalizeFocus(value) {
    if (value === undefined || value === null || value === '') return null;
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return null;
    return clamp(numeric > 1 ? numeric / 100 : numeric, 0, 1);
  }

  function setPosition(image, x, y, mode) {
    const xPercent = Number((clamp(x, 0, 1) * 100).toFixed(2));
    const yPercent = Number((clamp(y, 0, 1) * 100).toFixed(2));
    image.style.objectPosition = `${xPercent}% ${yPercent}%`;
    image.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    image.dataset.artCrop = mode;
    image.dataset.artFocusX = String(xPercent);
    image.dataset.artFocusY = String(yPercent);
    return { mode, focusX: xPercent, focusY: yPercent };
  }

  function analyze(image) {
    const key = `${image.currentSrc || image.src}|${image.naturalWidth}x${image.naturalHeight}`;
    if (analysisCache.has(key)) return analysisCache.get(key);

    const scale = Math.min(1, SAMPLE_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(8, Math.round(image.naturalWidth * scale));
    const height = Math.max(8, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D context unavailable.');

    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const luminance = new Float32Array(width * height);
    const columns = new Float64Array(width);
    const rows = new Float64Array(height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixel = (y * width + x) * 4;
        luminance[y * width + x] = (
          pixels[pixel] * 0.2126
          + pixels[pixel + 1] * 0.7152
          + pixels[pixel + 2] * 0.0722
        ) / 255;
      }
    }

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const offset = y * width + x;
        const pixel = offset * 4;
        const r = pixels[pixel];
        const g = pixels[pixel + 1];
        const b = pixels[pixel + 2];
        const gradient = (
          Math.abs(luminance[offset + 1] - luminance[offset - 1])
          + Math.abs(luminance[offset + width] - luminance[offset - width])
        ) * 0.5;
        const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
        const skin = skinLikelihood(r, g, b);
        const centerDistance = Math.hypot(
          (x / (width - 1) - 0.5) * 1.35,
          (y / (height - 1) - 0.48),
        );
        const compositionPrior = 0.9 + 0.1 * Math.max(0, 1 - centerDistance);
        const score = (0.02 + gradient * 1.7 + saturation * 0.14 + skin * 0.9) * compositionPrior;
        columns[x] += score;
        rows[y] += score;
      }
    }

    const analysis = { columns, rows };
    analysisCache.set(key, analysis);
    return analysis;
  }

  function skinLikelihood(r, g, b) {
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    if (cb < 75 || cb > 135 || cr < 128 || cr > 180) return 0;

    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    if (maxChannel - minChannel < 10 || r < 45 || g < 25 || b < 15) return 0;
    return clamp((cr - 128) / 35, 0.25, 1);
  }

  function bestObjectPosition(scores, visibleFraction, preferredCenter) {
    const count = scores.length;
    const windowSize = Math.max(1, Math.min(count, Math.round(count * visibleFraction)));
    const movable = count - windowSize;
    if (movable <= 0) return 0.5;

    const prefix = new Float64Array(count + 1);
    for (let index = 0; index < count; index += 1) {
      prefix[index + 1] = prefix[index] + scores[index];
    }

    let bestStart = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let start = 0; start <= movable; start += 1) {
      const end = start + windowSize;
      const retainedSaliency = prefix[end] - prefix[start];
      const center = (start + windowSize / 2) / count;
      const centerPreference = Math.max(0, 1 - Math.abs(center - preferredCenter) * 2);
      const score = retainedSaliency * (0.96 + centerPreference * 0.04);
      if (score > bestScore) {
        bestScore = score;
        bestStart = start;
      }
    }

    return clamp(bestStart / movable, 0, 1);
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  window.GauntletArtworkCrop = Object.freeze({ apply, normalizeDirection });
})();
