/**
 * Dominant color extraction utility from media artwork for Pomodoro Island.
 * Downscales artwork onto an offscreen canvas, filters out transparent/near-black/blown-out pixels,
 * and clamps HSL saturation [0.40, 0.85] and lightness [0.25, 0.65] for optimal substrate readability.
 * Follows DESIGN_KIT.md: default fallback is signature steel-periwinkle '92, 119, 189'.
 */

export const DEFAULT_RGB = '92, 119, 189';

export const colorCache = new Map();

/**
 * Clears the in-memory color cache. Useful for test suites and memory cleanup.
 */
export function clearColorCache() {
  colorCache.clear();
}

/**
 * Converts RGB values [0, 255] to HSL values:
 * h in [0, 1], s in [0, 1], l in [0, 1].
 */
export function rgbToHsl(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / delta + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / delta + 4) / 6;
        break;
    }
  }

  return { h, s, l };
}

/**
 * Converts HSL values (h in [0, 1], s in [0, 1], l in [0, 1])
 * to RGB integers [0, 255].
 */
export function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = Math.round(l * 255);
  } else {
    const hue2rgb = (p, q, t) => {
      let val = t;
      if (val < 0) val += 1;
      if (val > 1) val -= 1;
      if (val < 1 / 6) return p + (q - p) * 6 * val;
      if (val < 1 / 2) return q;
      if (val < 2 / 3) return p + (q - p) * (2 / 3 - val) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    g = Math.round(hue2rgb(p, q, h) * 255);
    b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  }

  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
  };
}

/**
 * Clamps saturation and lightness of an RGB color to safe visual ranges
 * to ensure colors are never muddy greys or blinding whites on obsidian surfaces.
 *
 * @param {number} r - Red channel [0, 255]
 * @param {number} g - Green channel [0, 255]
 * @param {number} b - Blue channel [0, 255]
 * @param {number} [minS=0.40] - Minimum saturation
 * @param {number} [maxS=0.85] - Maximum saturation
 * @param {number} [minL=0.25] - Minimum lightness
 * @param {number} [maxL=0.65] - Maximum lightness
 * @returns {{ r: number, g: number, b: number }}
 */
export function clampHsl(
  r,
  g,
  b,
  minS = 0.40,
  maxS = 0.85,
  minL = 0.25,
  maxL = 0.65
) {
  const { h, s, l } = rgbToHsl(r, g, b);
  const clampedS = Math.max(minS, Math.min(maxS, s));
  const clampedL = Math.max(minL, Math.min(maxL, l));
  return hslToRgb(h, clampedS, clampedL);
}

/**
 * Extracts the dominant RGB color from an image URL using offscreen canvas downscaling.
 *
 * @param {string} imageUrl - URL or data URI of the artwork
 * @param {Object} [options] - Optional overrides for testing/mocking
 * @returns {Promise<string>} Resolves to 'R, G, B' formatted string
 */
export async function extractDominantColor(imageUrl, options = {}) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return DEFAULT_RGB;
  }

  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl);
  }

  const doc = options.document || (typeof document !== 'undefined' ? document : null);
  const ImgConstructor = options.Image || (typeof Image !== 'undefined' ? Image : null);

  // Fallback cleanly in non-browser/test environments without canvas support
  if (!doc || !ImgConstructor) {
    return DEFAULT_RGB;
  }

  return new Promise((resolve) => {
    let settled = false;
    const safeResolve = (val) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };

    try {
      const img = new ImgConstructor();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        try {
          const canvas = doc.createElement('canvas');
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            colorCache.set(imageUrl, DEFAULT_RGB);
            return safeResolve(DEFAULT_RGB);
          }

          ctx.drawImage(img, 0, 0, 32, 32);
          const { data } = ctx.getImageData(0, 0, 32, 32);

          let totalR = 0;
          let totalG = 0;
          let totalB = 0;
          let count = 0;

          // Sample pixels every 4th pixel (16 bytes per step) across 32x32 canvas
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Ignore transparent pixels
            if (a < 128) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);

            // Ignore near-blacks and blown-out whites
            if (max < 30 || min > 225) continue;

            totalR += r;
            totalG += g;
            totalB += b;
            count++;
          }

          if (count === 0) {
            colorCache.set(imageUrl, DEFAULT_RGB);
            return safeResolve(DEFAULT_RGB);
          }

          const avgR = Math.round(totalR / count);
          const avgG = Math.round(totalG / count);
          const avgB = Math.round(totalB / count);

          const clamped = clampHsl(avgR, avgG, avgB);
          const result = `${clamped.r}, ${clamped.g}, ${clamped.b}`;

          colorCache.set(imageUrl, result);
          safeResolve(result);
        } catch {
          colorCache.set(imageUrl, DEFAULT_RGB);
          safeResolve(DEFAULT_RGB);
        }
      };

      img.onerror = () => {
        colorCache.set(imageUrl, DEFAULT_RGB);
        safeResolve(DEFAULT_RGB);
      };

      img.src = imageUrl;
    } catch {
      colorCache.set(imageUrl, DEFAULT_RGB);
      safeResolve(DEFAULT_RGB);
    }
  });
}

export default extractDominantColor;
