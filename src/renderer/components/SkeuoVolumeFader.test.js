import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically load and transpile SkeuoVolumeFader.jsx for Node test execution
const jsxPath = path.resolve(__dirname, 'SkeuoVolumeFader.jsx');
const rawCode = fs.readFileSync(jsxPath, 'utf8');

// Replace CSS module import with mock class name map
const mockStyles = `
const styles = {
  faderChassis: 'faderChassis',
  faderTrack: 'faderTrack',
  faderSlotGroove: 'faderSlotGroove',
  faderKnob: 'faderKnob',
  dragging: 'dragging',
  volTag: 'volTag',
};
`;

const transformed = esbuild.transformSync(rawCode, {
  loader: 'jsx',
  format: 'esm',
  jsx: 'automatic',
});

const codeWithMock = transformed.code.replace(
  /import styles from ['"][^'"]+['"];/,
  mockStyles
);

const tmpJsPath = path.resolve(__dirname, '.tmp.skeuofader.js');
fs.writeFileSync(tmpJsPath, codeWithMock, 'utf8');

let mod;
try {
  mod = await import('./.tmp.skeuofader.js');
} finally {
  try {
    fs.unlinkSync(tmpJsPath);
  } catch (e) {}
}

const {
  default: SkeuoVolumeFader,
  TRACK_HEIGHT,
  KNOB_HEIGHT,
  TRACK_PADDING,
  USABLE_TRAVEL,
  SNAP_MIN,
  SNAP_MAX,
  SNAP_TARGET,
  clampVolume,
  applyMagneticSnap,
  calculateGain,
  calculateKnobTop,
  calculateTravelFromY,
  formatPercentage,
} = mod;

describe('SkeuoVolumeFader Component & Audio Math Engine', () => {
  describe('Constants and Specifications', () => {
    it('defines trackHeight = 76px, knobHeight = 18px, padding = 4px', () => {
      assert.equal(TRACK_HEIGHT, 76);
      assert.equal(KNOB_HEIGHT, 18);
      assert.equal(TRACK_PADDING, 4);
    });

    it('defines usable travel = 54px (76 - 18 - 4)', () => {
      assert.equal(USABLE_TRAVEL, 54);
    });

    it('defines magnetic snap window between 0.68 and 0.72 with target 0.70', () => {
      assert.equal(SNAP_MIN, 0.68);
      assert.equal(SNAP_MAX, 0.72);
      assert.equal(SNAP_TARGET, 0.70);
    });
  });

  describe('clampVolume (Boundary Clamping [0.0, 1.0])', () => {
    it('clamps negative values to 0.0', () => {
      assert.equal(clampVolume(-0.5), 0.0);
      assert.equal(clampVolume(-0.001), 0.0);
    });

    it('clamps values above 1.0 to 1.0', () => {
      assert.equal(clampVolume(1.05), 1.0);
      assert.equal(clampVolume(2.0), 1.0);
    });

    it('preserves valid values between 0.0 and 1.0', () => {
      assert.equal(clampVolume(0.0), 0.0);
      assert.equal(clampVolume(0.42), 0.42);
      assert.equal(clampVolume(0.70), 0.70);
      assert.equal(clampVolume(1.0), 1.0);
    });

    it('handles non-number or NaN input defensively', () => {
      assert.equal(clampVolume(NaN), 0.0);
      assert.equal(clampVolume('invalid'), 0.0);
      assert.equal(clampVolume(null), 0.0);
    });
  });

  describe('calculateGain (Logarithmic Loudness Scaling: Gain = t^2)', () => {
    it('calculates 0% gain at t = 0.0', () => {
      assert.equal(calculateGain(0.0), 0.0);
    });

    it('calculates 100% gain at t = 1.0', () => {
      assert.equal(calculateGain(1.0), 1.0);
    });

    it('calculates 25% gain at t = 0.5', () => {
      assert.equal(calculateGain(0.5), 0.25);
    });

    it('calculates 49% gain at t = 0.70', () => {
      const gain = calculateGain(0.70);
      assert.ok(Math.abs(gain - 0.49) < 0.0001);
    });

    it('clamps out of range input before computing gain', () => {
      assert.equal(calculateGain(-0.2), 0.0);
      assert.equal(calculateGain(1.5), 1.0);
    });
  });

  describe('applyMagneticSnap (Haptic Snap around 0.70)', () => {
    it('snaps values inside [0.68, 0.72] to 0.70', () => {
      assert.equal(applyMagneticSnap(0.68), 0.70);
      assert.equal(applyMagneticSnap(0.69), 0.70);
      assert.equal(applyMagneticSnap(0.70), 0.70);
      assert.equal(applyMagneticSnap(0.71), 0.70);
      assert.equal(applyMagneticSnap(0.72), 0.70);
    });

    it('leaves values outside [0.68, 0.72] unaltered', () => {
      assert.equal(applyMagneticSnap(0.67), 0.67);
      assert.equal(applyMagneticSnap(0.73), 0.73);
      assert.equal(applyMagneticSnap(0.0), 0.0);
      assert.equal(applyMagneticSnap(0.5), 0.5);
      assert.equal(applyMagneticSnap(1.0), 1.0);
    });
  });

  describe('calculateKnobTop (Linear Travel to Y Position)', () => {
    it('positions knob at 2px when t = 1.0 (top/100%)', () => {
      assert.equal(calculateKnobTop(1.0), 2.0);
    });

    it('positions knob at 56px when t = 0.0 (bottom/mute)', () => {
      assert.equal(calculateKnobTop(0.0), 56.0);
    });

    it('positions knob at 29px when t = 0.5 (midpoint)', () => {
      assert.equal(calculateKnobTop(0.5), 29.0);
    });

    it('positions knob at 18.2px when t = 0.70', () => {
      const top = calculateKnobTop(0.70);
      assert.ok(Math.abs(top - 18.2) < 0.001);
    });
  });

  describe('calculateTravelFromY (Pointer Y to t Conversion)', () => {
    it('computes t = 1.0 when pointer is at top knob center (11px)', () => {
      assert.equal(calculateTravelFromY(11, false), 1.0);
    });

    it('computes t = 0.0 when pointer is at bottom knob center (65px)', () => {
      assert.equal(calculateTravelFromY(65, false), 0.0);
    });

    it('computes t = 0.5 when pointer is at midpoint (38px)', () => {
      assert.equal(calculateTravelFromY(38, false), 0.5);
    });

    it('clamps values when pointer is dragged outside track bounds', () => {
      assert.equal(calculateTravelFromY(-10, false), 1.0);
      assert.equal(calculateTravelFromY(100, false), 0.0);
    });

    it('applies magnetic snap at 0.70 when enabled', () => {
      // At t = 0.71, travelY = 0.29 * 54 = 15.66. relativeY = 11 + 15.66 = 26.66
      const snapped = calculateTravelFromY(26.66, true);
      assert.equal(snapped, 0.70);
    });
  });

  describe('formatPercentage (Readout Formatting)', () => {
    it('formats 0 as "0%"', () => {
      assert.equal(formatPercentage(0.0), '0%');
    });

    it('formats 0.7 as "70%"', () => {
      assert.equal(formatPercentage(0.70), '70%');
    });

    it('formats 1 as "100%"', () => {
      assert.equal(formatPercentage(1.0), '100%');
    });

    it('rounds fractional percentages accurately', () => {
      assert.equal(formatPercentage(0.426), '43%');
      assert.equal(formatPercentage(0.424), '42%');
    });
  });

  describe('DOM Rendering & Accessibility', () => {
    it('renders chassis with track, slot groove, knob, and percentage tag', () => {
      const html = renderToStaticMarkup(React.createElement(SkeuoVolumeFader));
      assert.ok(html.includes('faderChassis'));
      assert.ok(html.includes('faderTrack'));
      assert.ok(html.includes('faderSlotGroove'));
      assert.ok(html.includes('faderKnob'));
      assert.ok(html.includes('volTag'));
    });

    it('renders with accessibility attributes: role="slider", tabIndex=0, aria labels', () => {
      const html = renderToStaticMarkup(React.createElement(SkeuoVolumeFader));
      assert.ok(html.includes('role="slider"'));
      assert.ok(html.includes('tabindex="0"'));
      assert.ok(html.includes('aria-label="Media volume"'));
      assert.ok(html.includes('aria-valuemin="0"'));
      assert.ok(html.includes('aria-valuemax="100"'));
      assert.ok(html.includes('aria-valuenow="70"'));
      assert.ok(html.includes('aria-valuetext="70%"'));
    });

    it('renders default 70% volume tag and corresponding knobTop (18.2px)', () => {
      const html = renderToStaticMarkup(React.createElement(SkeuoVolumeFader));
      assert.ok(html.includes('70%'));
      assert.ok(html.includes('top:18.2px') || html.includes('top: 18.2px'));
    });

    it('renders custom initialVolume accurately', () => {
      const html = renderToStaticMarkup(React.createElement(SkeuoVolumeFader, { initialVolume: 0.4 }));
      assert.ok(html.includes('40%'));
      assert.ok(html.includes('aria-valuenow="40"'));
      assert.ok(html.includes('top:34.4px') || html.includes('top: 34.4px'));
    });

    it('attaches custom className to chassis', () => {
      const html = renderToStaticMarkup(React.createElement(SkeuoVolumeFader, { className: 'customAudioSlider' }));
      assert.ok(html.includes('customAudioSlider'));
    });

    it('maintains strict zero emoji compliance', () => {
      const html = renderToStaticMarkup(React.createElement(SkeuoVolumeFader));
      // Regex checking for common emoji ranges
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      assert.equal(emojiRegex.test(html), false);
    });
  });
});
