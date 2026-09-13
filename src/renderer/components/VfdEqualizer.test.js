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

// Dynamically load and transpile VfdEqualizer.jsx for Node test execution
const jsxPath = path.resolve(__dirname, 'VfdEqualizer.jsx');
const rawCode = fs.readFileSync(jsxPath, 'utf8');

// Replace CSS module import with mock class name map
const mockStyles = `
const styles = {
  vfdContainer: 'vfdContainer',
  vfdColumn: 'vfdColumn',
  vfdSegment: 'vfdSegment',
  lit: 'lit',
  base: 'base',
  mid: 'mid',
  warn: 'warn',
  peak: 'peak',
  peakHold: 'peakHold',
  resting: 'resting',
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

const tmpJsPath = path.resolve(__dirname, '.tmp.vfd.js');
fs.writeFileSync(tmpJsPath, codeWithMock, 'utf8');

let mod;
try {
  mod = await import('./.tmp.vfd.js');
} finally {
  try {
    fs.unlinkSync(tmpJsPath);
  } catch (e) {}
}

const {
  default: VfdEqualizer,
  BANDS,
  SEGMENTS,
  FREQUENCY_BANDS,
  HOLD_TIME_MS,
  STEP_INTERVAL_MS,
  calculateFrequencyLevels,
  calculateNextPeaks,
  getSegmentTypeClass,
} = mod;

describe('VfdEqualizer Component & Engine', () => {
  describe('Constants and Specifications', () => {
    it('defines exactly 8 frequency bands with correct labels', () => {
      assert.equal(BANDS, 8);
      assert.deepEqual(FREQUENCY_BANDS, [
        '63Hz',
        '160Hz',
        '400Hz',
        '1kHz',
        '2.5kHz',
        '6.3kHz',
        '10kHz',
        '16kHz',
      ]);
    });

    it('defines 7 discrete physical segments per column', () => {
      assert.equal(SEGMENTS, 7);
    });

    it('defines ~160ms peak hold time and ~85ms step interval', () => {
      assert.equal(HOLD_TIME_MS, 160);
      assert.ok(STEP_INTERVAL_MS >= 80 && STEP_INTERVAL_MS <= 90);
    });
  });

  describe('calculateFrequencyLevels (Multi-phase Rhythm Synthesizer)', () => {
    it('produces 8 bands clamped within [1, 7]', () => {
      for (let t = 0; t <= 5; t += 0.05) {
        const levels = calculateFrequencyLevels(t);
        assert.equal(levels.length, 8);
        for (let i = 0; i < 8; i++) {
          assert.ok(
            Number.isInteger(levels[i]),
            `Level at col ${i} must be integer, got ${levels[i]}`
          );
          assert.ok(
            levels[i] >= 1 && levels[i] <= 7,
            `Level at col ${i} (${levels[i]}) out of bounds [1, 7]`
          );
        }
      }
    });

    it('handles default parameter t = 0 defensively', () => {
      const levels = calculateFrequencyLevels();
      assert.equal(levels.length, 8);
      for (let i = 0; i < 8; i++) {
        assert.ok(levels[i] >= 1 && levels[i] <= 7);
      }
    });

    it('implements Phase 1: Bass Kick / Low Thump on Columns 1-2 (63Hz, 160Hz)', () => {
      let maxBass = 0;
      let minBass = 7;
      for (let t = 0; t < 2; t += 0.02) {
        const levels = calculateFrequencyLevels(t);
        const bassVal = Math.max(levels[0], levels[1]);
        if (bassVal > maxBass) maxBass = bassVal;
        if (bassVal < minBass) minBass = bassVal;
      }
      assert.ok(maxBass >= 6, `Bass kick should reach high segments (>= 6), got ${maxBass}`);
      assert.ok(minBass <= 3, `Bass kick should decay between pulses (<= 3), got ${minBass}`);
    });

    it('implements Phase 2: Mid Vocal / Snare on Columns 4-5 (1kHz, 2.5kHz)', () => {
      let maxMid = 0;
      let minMid = 7;
      for (let t = 0; t < 2; t += 0.02) {
        const levels = calculateFrequencyLevels(t);
        const midVal = Math.max(levels[3], levels[4]);
        if (midVal > maxMid) maxMid = midVal;
        if (midVal < minMid) minMid = midVal;
      }
      assert.ok(maxMid >= 5, `Mid snare/vocal should spike (>= 5), got ${maxMid}`);
      assert.ok(minMid <= 3, `Mid snare/vocal should modulate down (<= 3), got ${minMid}`);
    });

    it('implements Phase 3: High Treble / Cymbal Sizzle on Columns 7-8 (10kHz, 16kHz)', () => {
      let maxTreble = 0;
      let minTreble = 7;
      for (let t = 0; t < 2; t += 0.02) {
        const levels = calculateFrequencyLevels(t);
        const trebleVal = Math.max(levels[6], levels[7]);
        if (trebleVal > maxTreble) maxTreble = trebleVal;
        if (trebleVal < minTreble) minTreble = trebleVal;
      }
      assert.ok(maxTreble >= 5, `Treble sizzle should reach upper segments (>= 5), got ${maxTreble}`);
      assert.ok(minTreble <= 3, `Treble sizzle should dip (<= 3), got ${minTreble}`);
    });
  });

  describe('calculateNextPeaks (Peak-Hold Physics)', () => {
    it('latches peaks when levels rise and holds for HOLD_TIME_MS', () => {
      const currentLevels = [6, 5, 4, 3, 2, 2, 1, 1];
      const prevPeaks = [0, 0, 0, 0, 0, 0, 0, 0];
      const prevTimers = [0, 0, 0, 0, 0, 0, 0, 0];

      const { nextPeaks, nextTimers } = calculateNextPeaks(
        currentLevels,
        prevPeaks,
        prevTimers,
        85,
        160
      );

      assert.deepEqual(nextPeaks, [6, 5, 4, 3, 2, 2, 1, 1]);
      assert.deepEqual(nextTimers, [160, 160, 160, 160, 160, 160, 160, 160]);

      // Verify hold for 85ms (timer drops to 75ms, peak remains unchanged)
      const droppedLevels = [1, 1, 1, 1, 1, 1, 1, 1];
      const heldStep = calculateNextPeaks(droppedLevels, nextPeaks, nextTimers, 85, 160);
      assert.deepEqual(heldStep.nextPeaks, [6, 5, 4, 3, 2, 2, 1, 1]);
      assert.equal(heldStep.nextTimers[0], 75);
    });

    it('decays downwards by 1 segment per step once hold timer expires', () => {
      const currentLevels = [2, 2, 2, 2, 2, 2, 2, 2];
      const prevPeaks = [6, 5, 4, 3, 3, 2, 2, 2];
      const prevTimers = [0, 0, 0, 0, 0, 0, 0, 0]; // Timer already expired

      const step1 = calculateNextPeaks(currentLevels, prevPeaks, prevTimers, 85, 160);
      assert.deepEqual(step1.nextPeaks, [5, 4, 3, 2, 2, 2, 2, 2]);

      const step2 = calculateNextPeaks(currentLevels, step1.nextPeaks, step1.nextTimers, 85, 160);
      assert.deepEqual(step2.nextPeaks, [4, 3, 2, 2, 2, 2, 2, 2]);

      const step3 = calculateNextPeaks(currentLevels, step2.nextPeaks, step2.nextTimers, 85, 160);
      assert.deepEqual(step3.nextPeaks, [3, 2, 2, 2, 2, 2, 2, 2]);

      // Catches and clamps at current level (2)
      const step4 = calculateNextPeaks(currentLevels, step3.nextPeaks, step3.nextTimers, 85, 160);
      assert.deepEqual(step4.nextPeaks, [2, 2, 2, 2, 2, 2, 2, 2]);
    });

    it('handles missing or empty arguments with safe defaults', () => {
      const res = calculateNextPeaks();
      assert.equal(res.nextPeaks.length, 8);
      assert.equal(res.nextTimers.length, 8);
      assert.deepEqual(res.nextPeaks, [0, 0, 0, 0, 0, 0, 0, 0]);
    });
  });

  describe('getSegmentTypeClass (Color Ramp Mapping)', () => {
    it('correctly maps indices 0-3 to "base", 4 to "mid", 5 to "warn", 6 to "peak"', () => {
      assert.equal(getSegmentTypeClass(0), 'base');
      assert.equal(getSegmentTypeClass(1), 'base');
      assert.equal(getSegmentTypeClass(2), 'base');
      assert.equal(getSegmentTypeClass(3), 'base');
      assert.equal(getSegmentTypeClass(4), 'mid');
      assert.equal(getSegmentTypeClass(5), 'warn');
      assert.equal(getSegmentTypeClass(6), 'peak');
    });
  });

  describe('DOM Rendering & Visual Hierarchy', () => {
    it('renders with title="Graphic equalizer" and role="img"', () => {
      const html = renderToStaticMarkup(React.createElement(VfdEqualizer, { isPlaying: false }));
      assert.ok(html.includes('title="Graphic equalizer"'), 'Should have accessible tooltip');
      assert.ok(html.includes('role="img"'), 'Should have role="img"');
      assert.ok(html.includes('aria-label="Graphic equalizer"'), 'Should have aria-label');
    });

    it('renders exactly 8 columns corresponding to the 8 frequency bands', () => {
      const html = renderToStaticMarkup(React.createElement(VfdEqualizer, { isPlaying: false }));
      for (const band of FREQUENCY_BANDS) {
        assert.ok(html.includes(`data-band="${band}"`), `Should include band ${band}`);
      }
    });

    it('renders exactly 7 segments per column (56 total segments)', () => {
      const html = renderToStaticMarkup(React.createElement(VfdEqualizer, { isPlaying: false }));
      const segmentMatches = html.match(/class="[^"]*vfdSegment[^"]*"/g);
      assert.equal(segmentMatches?.length, 56, 'Must render exactly 56 physical segments (8x7)');
    });

    it('applies resting state to lowest segment (segIdx 0) when isPlaying is false', () => {
      const html = renderToStaticMarkup(React.createElement(VfdEqualizer, { isPlaying: false }));
      const restingMatches = html.match(/class="[^"]*resting[^"]*"/g);
      assert.equal(restingMatches?.length, 8, 'Exactly 8 base segments illuminated in resting state');

      const litMatches = html.match(/class="[^"]*lit[^"]*"/g);
      assert.equal(litMatches, null, 'No active lit segments when not playing');
    });

    it('appends custom className to container', () => {
      const html = renderToStaticMarkup(
        React.createElement(VfdEqualizer, { isPlaying: false, className: 'customMediaVfd' })
      );
      assert.ok(html.includes('customMediaVfd'));
      assert.ok(html.includes('vfdContainer'));
    });

    it('renders active lit segments and peak-hold dots when isPlaying is true', () => {
      const html = renderToStaticMarkup(React.createElement(VfdEqualizer, { isPlaying: true }));
      const litMatches = html.match(/class="[^"]*lit[^"]*"/g);
      assert.ok(litMatches && litMatches.length > 0, 'Should have lit segments when playing');

      const peakHoldMatches = html.match(/class="[^"]*peakHold[^"]*"/g);
      assert.ok(
        peakHoldMatches && peakHoldMatches.length > 0,
        'Should display peak-hold segments when holding above bar'
      );

      assert.ok(html.includes('lit base'), 'Should include lit base segment');
      assert.ok(html.includes('lit mid') || html.includes('lit warn'), 'Should include higher frequency segment');
    });
  });
});
