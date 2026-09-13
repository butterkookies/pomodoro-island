import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDominantColor,
  rgbToHsl,
  hslToRgb,
  clampHsl,
  DEFAULT_RGB,
  colorCache,
  clearColorCache,
} from './colorExtractor.js';

describe('colorExtractor', () => {
  beforeEach(() => {
    clearColorCache();
  });

  describe('RGB to HSL and HSL to RGB conversion', () => {
    it('converts pure primary colors accurately and preserves roundtrip', () => {
      // Red
      const redHsl = rgbToHsl(255, 0, 0);
      assert.equal(Math.round(redHsl.h * 360), 0);
      assert.equal(redHsl.s, 1);
      assert.equal(redHsl.l, 0.5);
      const redRgb = hslToRgb(redHsl.h, redHsl.s, redHsl.l);
      assert.deepEqual(redRgb, { r: 255, g: 0, b: 0 });

      // Green
      const greenHsl = rgbToHsl(0, 255, 0);
      assert.equal(Math.round(greenHsl.h * 360), 120);
      assert.equal(greenHsl.s, 1);
      assert.equal(greenHsl.l, 0.5);
      const greenRgb = hslToRgb(greenHsl.h, greenHsl.s, greenHsl.l);
      assert.deepEqual(greenRgb, { r: 0, g: 255, b: 0 });

      // Blue
      const blueHsl = rgbToHsl(0, 0, 255);
      assert.equal(Math.round(blueHsl.h * 360), 240);
      assert.equal(blueHsl.s, 1);
      assert.equal(blueHsl.l, 0.5);
      const blueRgb = hslToRgb(blueHsl.h, blueHsl.s, blueHsl.l);
      assert.deepEqual(blueRgb, { r: 0, g: 0, b: 255 });
    });

    it('handles achromatic colors with s = 0', () => {
      const grayHsl = rgbToHsl(128, 128, 128);
      assert.equal(grayHsl.s, 0);
      const grayRgb = hslToRgb(grayHsl.h, grayHsl.s, grayHsl.l);
      assert.deepEqual(grayRgb, { r: 128, g: 128, b: 128 });
    });

    it('roundtrips signature steel-periwinkle color', () => {
      const orig = { r: 92, g: 119, b: 189 };
      const hsl = rgbToHsl(orig.r, orig.g, orig.b);
      const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
      assert.deepEqual(rgb, orig);
    });
  });

  describe('clampHsl', () => {
    it('clamps saturation to [0.40, 0.85]', () => {
      // Over-saturated pure red (s = 1.0) gets clamped to s = 0.85
      const clampedHigh = clampHsl(255, 0, 0);
      const highHsl = rgbToHsl(clampedHigh.r, clampedHigh.g, clampedHigh.b);
      assert.ok(highHsl.s <= 0.86 && highHsl.s >= 0.84);

      // Desaturated muddy color gets clamped up to min saturation 0.40
      const clampedLow = clampHsl(110, 100, 100);
      const lowHsl = rgbToHsl(clampedLow.r, clampedLow.g, clampedLow.b);
      assert.ok(lowHsl.s >= 0.39 && lowHsl.s <= 0.42);
    });

    it('clamps lightness to [0.25, 0.65]', () => {
      // Very dark color (e.g. l < 0.25) gets boosted to l >= 0.25
      const darkColor = clampHsl(32, 32, 40);
      const darkHsl = rgbToHsl(darkColor.r, darkColor.g, darkColor.b);
      assert.ok(darkHsl.l >= 0.24 && darkHsl.l <= 0.26);

      // Blindingly bright color (e.g. l > 0.65) gets tamed down to l <= 0.65
      const brightColor = clampHsl(220, 210, 150);
      const brightHsl = rgbToHsl(brightColor.r, brightColor.g, brightColor.b);
      assert.ok(brightHsl.l >= 0.64 && brightHsl.l <= 0.66);
    });

    it('leaves already-balanced colors unchanged', () => {
      // Signature periwinkle: s ~ 0.42, l ~ 0.55
      const periwinkle = clampHsl(92, 119, 189);
      assert.deepEqual(periwinkle, { r: 92, g: 119, b: 189 });
    });

    it('always outputs bounded integers in [0, 255]', () => {
      const result = clampHsl(255, 255, 255);
      assert.ok(Number.isInteger(result.r) && result.r >= 0 && result.r <= 255);
      assert.ok(Number.isInteger(result.g) && result.g >= 0 && result.g <= 255);
      assert.ok(Number.isInteger(result.b) && result.b >= 0 && result.b <= 255);
    });
  });

  describe('extractDominantColor', () => {
    it('returns DEFAULT_RGB for missing, null, or invalid inputs', async () => {
      assert.equal(await extractDominantColor(''), DEFAULT_RGB);
      assert.equal(await extractDominantColor(null), DEFAULT_RGB);
      assert.equal(await extractDominantColor(undefined), DEFAULT_RGB);
      assert.equal(await extractDominantColor(123), DEFAULT_RGB);
    });

    it('falls back to DEFAULT_RGB in Node environment without DOM', async () => {
      const color = await extractDominantColor('https://example.com/cover.jpg');
      assert.equal(color, DEFAULT_RGB);
    });

    it('returns pre-cached value immediately', async () => {
      colorCache.set('https://example.com/cached.jpg', '16, 185, 129');
      const result = await extractDominantColor('https://example.com/cached.jpg');
      assert.equal(result, '16, 185, 129');
    });

    it('extracts balanced dominant color with mocked canvas and image', async () => {
      // 32x32 pixels = 1024 pixels * 4 = 4096 bytes
      const pixelData = new Uint8ClampedArray(4096);
      // Fill with balanced emerald green (16, 185, 129, alpha: 255)
      for (let i = 0; i < pixelData.length; i += 4) {
        pixelData[i] = 16;
        pixelData[i + 1] = 185;
        pixelData[i + 2] = 129;
        pixelData[i + 3] = 255;
      }

      const mockCtx = {
        drawImage: () => {},
        getImageData: () => ({ data: pixelData }),
      };

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: (type) => (type === '2d' ? mockCtx : null),
      };

      const mockDoc = {
        createElement: (tag) => (tag === 'canvas' ? mockCanvas : null),
      };

      class MockImage {
        constructor() {
          this.crossOrigin = '';
          this._src = '';
        }
        set src(value) {
          this._src = value;
          // Trigger onload asynchronously
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
        get src() {
          return this._src;
        }
      }

      const result = await extractDominantColor('https://example.com/emerald.jpg', {
        document: mockDoc,
        Image: MockImage,
      });

      assert.equal(result, '16, 185, 129');
      // Should be stored in cache
      assert.equal(colorCache.get('https://example.com/emerald.jpg'), '16, 185, 129');
    });

    it('ignores transparent, near-black, and blown-out white pixels', async () => {
      const pixelData = new Uint8ClampedArray(4096);
      // Fill majority with:
      // - transparent pixels (alpha < 128)
      // - near black pixels (max < 30)
      // - blown-out white pixels (min > 225)
      for (let i = 0; i < pixelData.length; i += 16) {
        // Pixel 0: transparent
        pixelData[i] = 255;
        pixelData[i + 1] = 0;
        pixelData[i + 2] = 0;
        pixelData[i + 3] = 50; // alpha < 128

        // Pixel 1: near black
        pixelData[i + 4] = 10;
        pixelData[i + 5] = 15;
        pixelData[i + 6] = 20;
        pixelData[i + 7] = 255; // max < 30

        // Pixel 2: blown out white
        pixelData[i + 8] = 240;
        pixelData[i + 9] = 245;
        pixelData[i + 10] = 250;
        pixelData[i + 11] = 255; // min > 225

        // Pixel 3: valid color: blue (0, 100, 200)
        pixelData[i + 12] = 0;
        pixelData[i + 13] = 100;
        pixelData[i + 14] = 200;
        pixelData[i + 15] = 255;
      }

      const mockCtx = {
        drawImage: () => {},
        getImageData: () => ({ data: pixelData }),
      };

      const mockDoc = {
        createElement: () => ({
          width: 0,
          height: 0,
          getContext: () => mockCtx,
        }),
      };

      class MockImage {
        set src(v) {
          setTimeout(() => this.onload?.(), 0);
        }
      }

      const result = await extractDominantColor('https://example.com/blue-sample.jpg', {
        document: mockDoc,
        Image: MockImage,
      });

      // The valid pixel was (0, 100, 200). After clampHsl, it should be a balanced blue
      const [r, g, b] = result.split(',').map((s) => parseInt(s.trim(), 10));
      assert.ok(b > r && b > g, 'Blue channel should dominate');
      assert.ok(r >= 0 && r <= 255);
      assert.ok(g >= 0 && g <= 255);
      assert.ok(b >= 0 && b <= 255);
    });

    it('falls back to DEFAULT_RGB when all pixels are filtered out', async () => {
      const pixelData = new Uint8ClampedArray(4096);
      // All near black (0, 0, 0)
      for (let i = 0; i < pixelData.length; i += 4) {
        pixelData[i] = 5;
        pixelData[i + 1] = 5;
        pixelData[i + 2] = 5;
        pixelData[i + 3] = 255;
      }

      const mockCtx = {
        drawImage: () => {},
        getImageData: () => ({ data: pixelData }),
      };

      const mockDoc = {
        createElement: () => ({
          width: 0,
          height: 0,
          getContext: () => mockCtx,
        }),
      };

      class MockImage {
        set src(v) {
          setTimeout(() => this.onload?.(), 0);
        }
      }

      const result = await extractDominantColor('https://example.com/all-black.jpg', {
        document: mockDoc,
        Image: MockImage,
      });

      assert.equal(result, DEFAULT_RGB);
    });

    it('falls back to DEFAULT_RGB on image load error (onerror)', async () => {
      class MockBrokenImage {
        set src(v) {
          setTimeout(() => this.onerror?.(), 0);
        }
      }

      const mockDoc = {
        createElement: () => ({}),
      };

      const result = await extractDominantColor('https://example.com/missing.jpg', {
        document: mockDoc,
        Image: MockBrokenImage,
      });

      assert.equal(result, DEFAULT_RGB);
      assert.equal(colorCache.get('https://example.com/missing.jpg'), DEFAULT_RGB);
    });

    it('falls back to DEFAULT_RGB on canvas/CORS exception', async () => {
      const mockCtx = {
        drawImage: () => {},
        getImageData: () => {
          throw new Error('SecurityError: The canvas has been tainted by cross-origin data.');
        },
      };

      const mockDoc = {
        createElement: () => ({
          getContext: () => mockCtx,
        }),
      };

      class MockImage {
        set src(v) {
          setTimeout(() => this.onload?.(), 0);
        }
      }

      const result = await extractDominantColor('https://example.com/cors.jpg', {
        document: mockDoc,
        Image: MockImage,
      });

      assert.equal(result, DEFAULT_RGB);
      assert.equal(colorCache.get('https://example.com/cors.jpg'), DEFAULT_RGB);
    });
  });
});
