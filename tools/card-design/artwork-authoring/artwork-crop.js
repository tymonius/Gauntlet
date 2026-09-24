(() => {
  const SAMPLE_MAX_DIMENSION = 160;
  const MIN_CROP_FRACTION = 0.985;
  const PRIORITY_STDDEV_WEIGHT = 0.45;
  const BOUNDARY_BAND_FRACTION = 0.035;
  const analysisCache = new Map();

  function apply(image, direction = null, options = {}) {
    if (!image?.naturalWidth || !image?.naturalHeight) return null;

    const frame = image.closest('.card-art, .territory-art');
    if (!frame || frame.clientWidth < 1 || frame.clientHeight < 1) return null;

    const overrideKey = options.id || options.label;
    const override = overrideKey ? window.GAUNTLET_ART_DIRECTION?.[overrideKey] : null;
    const authored = normalizeDirection(mergeDirections(override, direction));
    image.style.objectFit = authored.fit;
    image.style.transform = authored.zoom === 1 ? '' : `scale(${authored.zoom})`;

    if (authored.fit !== 'cover' || authored.smart === false) {
      const result = setPosition(
        image,
        authored.focusX ?? 0.5,
        authored.focusY ?? 0.52,
        {
          x: authored.focusX !== null ? 'manual' : 'default',
          y: authored.focusY !== null ? 'manual' : 'default',
        },
      );
      image.dataset.artZoom = String(authored.zoom);
      return result;
    }

    try {
      const frameAspect = frame.clientWidth / frame.clientHeight;
      const imageAspect = image.naturalWidth / image.naturalHeight;
      const visibleX = clamp(Math.min(1, frameAspect / imageAspect) / authored.zoom, 0, 1);
      const visibleY = clamp(Math.min(1, imageAspect / frameAspect) / authored.zoom, 0, 1);
      const needsSmartX = authored.focusX === null && visibleX < MIN_CROP_FRACTION;
      const needsSmartY = authored.focusY === null && visibleY < MIN_CROP_FRACTION;
      const analysis = needsSmartX || needsSmartY ? analyze(image) : null;

      const x = authored.focusX ?? (
        needsSmartX
          ? bestObjectPosition(analysis.x, visibleX, 0.5)
          : 0.5
      );
      const y = authored.focusY ?? (
        needsSmartY
          ? bestObjectPosition(analysis.y, visibleY, frame.classList.contains('card-art') ? 0.44 : 0.5)
          : 0.52
      );

      const result = setPosition(image, x, y, {
        x: authored.focusX !== null ? 'manual' : needsSmartX ? 'smart' : 'default',
        y: authored.focusY !== null ? 'manual' : needsSmartY ? 'smart' : 'default',
      });
      image.dataset.artZoom = String(authored.zoom);
      return result;
    } catch (error) {
      const result = setPosition(
        image,
        authored.focusX ?? 0.5,
        authored.focusY ?? 0.52,
        {
          x: authored.focusX !== null ? 'manual' : 'fallback',
          y: authored.focusY !== null ? 'manual' : 'fallback',
        },
      );
      image.dataset.artZoom = String(authored.zoom);
      console.warn(
        `Smart artwork crop fell back to centered positioning${options.label ? ` for ${options.label}` : ''}.`,
        error,
      );
      return result;
    }
  }

  function mergeDirections(override, direction) {
    const base = override && typeof override === 'object' ? override : null;
    const authored = direction && typeof direction === 'object' ? direction : null;
    if (!base) return authored;
    if (!authored) return base;
    return { ...base, ...authored };
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

  function setPosition(image, x, y, modes) {
    const xPercent = Number((clamp(x, 0, 1) * 100).toFixed(2));
    const yPercent = Number((clamp(y, 0, 1) * 100).toFixed(2));
    const xMode = modes?.x || 'default';
    const yMode = modes?.y || 'default';
    const activeModes = [...new Set([xMode, yMode].filter((mode) => mode !== 'default'))];
    const mode = activeModes.length ? activeModes.join('+') : 'default';

    image.style.objectPosition = `${xPercent}% ${yPercent}%`;
    image.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    image.dataset.artCrop = mode;
    image.dataset.artCropX = xMode;
    image.dataset.artCropY = yMode;
    image.dataset.artFocusX = String(xPercent);
    image.dataset.artFocusY = String(yPercent);
    return { mode, focusX: xPercent, focusY: yPercent, xMode, yMode };
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
    let meanR = 0;
    let meanG = 0;
    let meanB = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = y * width + x;
        const pixel = offset * 4;
        const r = pixels[pixel];
        const g = pixels[pixel + 1];
        const b = pixels[pixel + 2];
        luminance[offset] = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
        meanR += r;
        meanG += g;
        meanB += b;
      }
    }

    const pixelCount = width * height;
    meanR /= pixelCount;
    meanG /= pixelCount;
    meanB /= pixelCount;
    const luminanceIntegral = buildIntegral(luminance, width, height);
    const raw = new Float64Array(pixelCount);

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
        const localMean = boxMean(luminanceIntegral, width, height, x, y, 3);
        const localContrast = Math.abs(luminance[offset] - localMean);
        const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
        const colorDistinctiveness = Math.sqrt(
          ((r - meanR) ** 2 + (g - meanG) ** 2 + (b - meanB) ** 2) / (3 * 255 * 255),
        );
        const portrait = skinLikelihood(r, g, b);
        const centerDistance = Math.hypot(
          (x / (width - 1) - 0.5) * 1.35,
          (y / (height - 1) - 0.46),
        );
        const compositionPrior = 0.94 + 0.06 * Math.max(0, 1 - centerDistance);
        raw[offset] = (
          0.01
          + gradient * 1.25
          + localContrast * 0.95
          + colorDistinctiveness * 0.38
          + saturation * 0.08
          + portrait * 0.75
        ) * compositionPrior;
      }
    }

    const smoothed = boxBlur(raw, width, height, 2);
    let saliencyMean = 0;
    for (const score of smoothed) saliencyMean += score;
    saliencyMean /= smoothed.length;

    let variance = 0;
    for (const score of smoothed) variance += (score - saliencyMean) ** 2;
    const saliencyStdDev = Math.sqrt(variance / smoothed.length);
    const priorityThreshold = saliencyMean + saliencyStdDev * PRIORITY_STDDEV_WEIGHT;
    const priority = new Float64Array(smoothed.length);
    let priorityTotal = 0;
    let saliencyTotal = 0;

    for (let index = 0; index < smoothed.length; index += 1) {
      saliencyTotal += smoothed[index];
      const priorityScore = Math.max(0, smoothed[index] - priorityThreshold);
      priority[index] = priorityScore;
      priorityTotal += priorityScore;
    }

    if (priorityTotal < saliencyTotal * 0.01) {
      for (let index = 0; index < smoothed.length; index += 1) {
        priority[index] = smoothed[index];
      }
    }

    const analysis = {
      x: buildAxisProfile(smoothed, priority, width, height, 'x'),
      y: buildAxisProfile(smoothed, priority, width, height, 'y'),
    };
    analysisCache.set(key, analysis);
    return analysis;
  }

  function buildAxisProfile(saliencyMap, priorityMap, width, height, axis) {
    const count = axis === 'x' ? width : height;
    const crossCount = axis === 'x' ? height : width;
    const saliency = new Float64Array(count);
    const priority = new Float64Array(count);

    for (let index = 0; index < count; index += 1) {
      for (let cross = 0; cross < crossCount; cross += 1) {
        const x = axis === 'x' ? index : cross;
        const y = axis === 'x' ? cross : index;
        const offset = y * width + x;
        saliency[index] += saliencyMap[offset];
        priority[index] += priorityMap[offset];
      }
    }

    let saliencyTotal = 0;
    let priorityTotal = 0;
    let saliencyMoment = 0;
    let priorityMoment = 0;
    for (let index = 0; index < count; index += 1) {
      saliencyTotal += saliency[index];
      priorityTotal += priority[index];
      saliencyMoment += saliency[index] * (index + 0.5);
      priorityMoment += priority[index] * (index + 0.5);
    }

    const centroid = priorityTotal > 0
      ? priorityMoment / priorityTotal / count
      : saliencyTotal > 0
        ? saliencyMoment / saliencyTotal / count
        : 0.5;

    return { saliency, priority, saliencyTotal, priorityTotal, centroid };
  }

  function skinLikelihood(r, g, b) {
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const channelRange = maxChannel - minChannel;
    if (channelRange < 8 || maxChannel < 35) return 0;

    const cbScore = clamp(1 - Math.abs(cb - 105) / 48, 0, 1);
    const crScore = clamp(1 - Math.abs(cr - 150) / 44, 0, 1);
    const chromaScore = Math.sqrt(cbScore * crScore);
    const saturationScore = clamp(channelRange / 70, 0.25, 1);
    return chromaScore * saturationScore;
  }

  function bestObjectPosition(profile, visibleFraction, preferredCenter) {
    const count = profile.saliency.length;
    const windowSize = Math.max(1, Math.min(count, Math.round(count * visibleFraction)));
    const movable = count - windowSize;
    if (movable <= 0) return 0.5;

    const saliencyPrefix = buildPrefix(profile.saliency);
    const priorityPrefix = buildPrefix(profile.priority);
    const saliencyTotal = Math.max(profile.saliencyTotal, Number.EPSILON);
    const priorityTotal = Math.max(profile.priorityTotal, Number.EPSILON);
    const centroidIndex = clamp(profile.centroid, 0, 1) * count;
    const nativeCentroid = clamp(profile.centroid, 0, 1);
    const boundaryBand = Math.max(1, Math.round(count * BOUNDARY_BAND_FRACTION));

    let bestStart = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let start = 0; start <= movable; start += 1) {
      const end = start + windowSize;
      const retainedSaliency = rangeSum(saliencyPrefix, start, end) / saliencyTotal;
      const retainedPriority = rangeSum(priorityPrefix, start, end) / priorityTotal;
      const center = (start + windowSize / 2) / count;
      const centerPreference = Math.max(0, 1 - Math.abs(center - preferredCenter) * 2);
      const localCentroid = clamp((centroidIndex - start) / windowSize, 0, 1);
      const compositionPreservation = Math.max(0, 1 - Math.abs(localCentroid - nativeCentroid) * 2.5);
      const centroidEdgeDistance = Math.min(localCentroid, 1 - localCentroid);
      const subjectMargin = clamp(centroidEdgeDistance / 0.16, 0, 1);

      let cutRisk = 0;
      if (start > 0) {
        cutRisk += rangeSum(
          priorityPrefix,
          Math.max(0, start - boundaryBand),
          Math.min(count, start + boundaryBand),
        ) / priorityTotal;
      }
      if (end < count) {
        cutRisk += rangeSum(
          priorityPrefix,
          Math.max(0, end - boundaryBand),
          Math.min(count, end + boundaryBand),
        ) / priorityTotal;
      }

      const score = (
        retainedSaliency * 0.38
        + retainedPriority * 0.42
        + compositionPreservation * 0.08
        + subjectMargin * 0.07
        + centerPreference * 0.05
        - cutRisk * 0.25
      );
      if (score > bestScore) {
        bestScore = score;
        bestStart = start;
      }
    }

    return clamp(bestStart / movable, 0, 1);
  }

  function buildPrefix(values) {
    const prefix = new Float64Array(values.length + 1);
    for (let index = 0; index < values.length; index += 1) {
      prefix[index + 1] = prefix[index] + values[index];
    }
    return prefix;
  }

  function rangeSum(prefix, start, end) {
    return prefix[end] - prefix[start];
  }

  function buildIntegral(values, width, height) {
    const stride = width + 1;
    const integral = new Float64Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y += 1) {
      let rowTotal = 0;
      for (let x = 0; x < width; x += 1) {
        rowTotal += values[y * width + x];
        integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowTotal;
      }
    }
    return integral;
  }

  function boxMean(integral, width, height, x, y, radius) {
    const x0 = Math.max(0, x - radius);
    const x1 = Math.min(width, x + radius + 1);
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height, y + radius + 1);
    const stride = width + 1;
    const sum = (
      integral[y1 * stride + x1]
      - integral[y0 * stride + x1]
      - integral[y1 * stride + x0]
      + integral[y0 * stride + x0]
    );
    return sum / Math.max(1, (x1 - x0) * (y1 - y0));
  }

  function boxBlur(values, width, height, radius) {
    const integral = buildIntegral(values, width, height);
    const blurred = new Float64Array(values.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        blurred[y * width + x] = boxMean(integral, width, height, x, y, radius);
      }
    }
    return blurred;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  window.GauntletArtworkCrop = Object.freeze({ apply, normalizeDirection });
})();
