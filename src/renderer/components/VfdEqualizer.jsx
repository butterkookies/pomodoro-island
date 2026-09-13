import { useEffect, useState, useRef, memo } from 'react';
import styles from './VfdEqualizer.module.css';

export const BANDS = 8;
export const SEGMENTS = 7;
export const FREQUENCY_BANDS = [
  '63Hz',
  '160Hz',
  '400Hz',
  '1kHz',
  '2.5kHz',
  '6.3kHz',
  '10kHz',
  '16kHz',
];

export const HOLD_TIME_MS = 160;
export const STEP_INTERVAL_MS = 85;

/**
 * Calculates raw rhythmic frequency levels for the 8 VFD columns.
 * Implements 3 distinct rhythm phases:
 *  - Columns 1-2 (63Hz, 160Hz): Bass kick / low thump (prominent pulses)
 *  - Columns 4-5 (1kHz, 2.5kHz): Mid vocal / snare frequencies
 *  - Columns 7-8 (10kHz, 16kHz): High treble / cymbal sizzle
 *
 * @param {number} t Time in seconds
 * @returns {number[]} Array of 8 segment heights clamped between 1 and 7
 */
export function calculateFrequencyLevels(t = 0, volume = 1.0) {
  // Volume scalar: logarithmic loudness curve
  const vol = Math.max(0.05, Math.min(1.0, volume));
  const energy = 0.35 + 0.65 * vol;

  // Snappy, agile transients: 128 BPM rhythmic base, sharp attacks and instantaneous release
  // Phase 1: Bass Kick / Low Thump (Bands 1-2: 63Hz, 160Hz)
  const kick = Math.pow(Math.max(0, Math.sin(t * 5.2)), 5.0);
  const bassBounce = Math.max(0, Math.sin(t * 5.2 + 0.3)) * 1.5;

  // Phase 2: Mid Vocal / Snare (Bands 4-5: 1kHz, 2.5kHz)
  const snare = Math.pow(Math.max(0, Math.sin(t * 5.2 + Math.PI)), 4.5);
  const vocalLead = Math.max(0, Math.sin(t * 3.7)) * 1.6;

  // Phase 3: High Treble / Cymbal Sizzle (Bands 7-8: 10kHz, 16kHz)
  const hihat = Math.pow(Math.max(0, Math.sin(t * 10.4)), 3.0);
  const shimmer = Math.max(0, Math.sin(t * 15.6)) * 1.2;

  // Intermediate body frequencies
  const lowMidBody = Math.max(0, Math.sin(t * 4.1)) * 1.4;
  const presence = Math.max(0, Math.sin(t * 6.8)) * 1.5;

  const nextLevels = [];

  for (let i = 0; i < BANDS; i++) {
    // Fast, agile jitter to keep bars dancing on the spot
    const microJitter = Math.sin(t * 26.5 + i * 41.3) * 0.45;
    let raw = 1.0;

    switch (i) {
      case 0:
        // Column 1 (63Hz): Heavy sub-bass kick
        raw = 1.1 + kick * 5.4 * energy + bassBounce * 0.5 * energy + microJitter;
        break;
      case 1:
        // Column 2 (160Hz): Bass thump & punch
        raw = 1.1 + kick * 4.9 * energy + bassBounce * 0.8 * energy + microJitter;
        break;
      case 2:
        // Column 3 (400Hz): Low-mid warmth
        raw = 1.2 + lowMidBody * 2.2 * energy + kick * 1.5 * energy + microJitter;
        break;
      case 3:
        // Column 4 (1kHz): Mid vocal fundamental & snare crack
        raw = 1.1 + snare * 4.6 * energy + vocalLead * 1.6 * energy + microJitter;
        break;
      case 4:
        // Column 5 (2.5kHz): Upper mid vocal articulation & snare attack
        raw = 1.1 + snare * 4.3 * energy + presence * 1.4 * energy + microJitter;
        break;
      case 5:
        // Column 6 (6.3kHz): Presence & guitar harmonics
        raw = 1.2 + presence * 2.0 * energy + hihat * 1.6 * energy + microJitter;
        break;
      case 6:
        // Column 7 (10kHz): Treble / hi-hat sizzle
        raw = 1.1 + hihat * 4.4 * energy + shimmer * 1.2 * energy + microJitter;
        break;
      case 7:
        // Column 8 (16kHz): Air & high cymbal shimmer
        raw = 1.1 + hihat * 4.1 * energy + shimmer * 1.5 * energy + microJitter;
        break;
      default:
        raw = 1.2;
    }

    const clamped = Math.max(1, Math.min(SEGMENTS, Math.round(raw)));
    nextLevels.push(clamped);
  }

  return nextLevels;
}

/**
 * Updates peak levels and hold timers based on new frequency levels.
 * Peak holds for ~160ms before decaying downwards towards current level.
 *
 * @param {number[]} currentLevels Array of 8 current levels (1 to 7)
 * @param {number[]} prevPeaks Array of 8 previous peak levels
 * @param {number[]} prevTimers Array of 8 previous hold countdown timers in ms
 * @param {number} elapsedMs Time elapsed since last update in ms (default: STEP_INTERVAL_MS)
 * @param {number} holdTimeMs Hold duration in ms (default: HOLD_TIME_MS)
 * @returns {{ nextPeaks: number[], nextTimers: number[] }}
 */
export function calculateNextPeaks(
  currentLevels = [],
  prevPeaks = [],
  prevTimers = [],
  elapsedMs = STEP_INTERVAL_MS,
  holdTimeMs = HOLD_TIME_MS
) {
  const nextPeaks =
    Array.isArray(prevPeaks) && prevPeaks.length === BANDS
      ? [...prevPeaks]
      : Array(BANDS).fill(0);
  const nextTimers =
    Array.isArray(prevTimers) && prevTimers.length === BANDS
      ? [...prevTimers]
      : Array(BANDS).fill(0);

  for (let i = 0; i < BANDS; i++) {
    const lvl = Array.isArray(currentLevels) ? currentLevels[i] || 0 : 0;
    if (lvl >= nextPeaks[i]) {
      // Level hits or exceeds previous peak -> latch peak and reset hold timer
      nextPeaks[i] = lvl;
      nextTimers[i] = holdTimeMs;
    } else {
      // Level is below previous peak -> hold or decay
      if (nextTimers[i] > 0) {
        nextTimers[i] -= elapsedMs;
      } else {
        // Hold expired -> decay downwards by 1 segment towards current level
        nextPeaks[i] = Math.max(lvl, nextPeaks[i] - 1);
      }
    }
  }

  return { nextPeaks, nextTimers };
}

/**
 * Maps 0-indexed segment position to semantic style class.
 * Index 0-3: Base (Phosphor Cyan)
 * Index 4: Upper Mid (Ice Cyan)
 * Index 5: Warning (Warm Amber)
 * Index 6: Peak (Ruby-Amber Peak)
 *
 * @param {number} segIdx 0-based index (0 to 6)
 * @returns {string} CSS module class
 */
export function getSegmentTypeClass(segIdx) {
  if (segIdx === 6) return styles.peak;
  if (segIdx === 5) return styles.warn;
  if (segIdx === 4) return styles.mid;
  return styles.base;
}

function VfdEqualizer({
  isPlaying = false,
  getExternalLevels = null,
  volume = 1.0,
  className = '',
}) {
  // Resting state: 0 active levels (base segment illuminated faintly via resting class)
  const [levels, setLevels] = useState(() =>
    isPlaying ? [3, 4, 5, 4, 3, 4, 3, 2] : Array(BANDS).fill(0)
  );
  const [peaks, setPeaks] = useState(() =>
    isPlaying ? [5, 6, 6, 5, 4, 5, 4, 3] : Array(BANDS).fill(0)
  );

  const peaksRef = useRef(peaks);
  peaksRef.current = peaks;

  const timersRef = useRef(Array(BANDS).fill(0));
  const timeRef = useRef(0);
  const isRestingRef = useRef(!isPlaying);

  useEffect(() => {
    if (!isPlaying) {
      if (!isRestingRef.current) {
        setLevels(Array(BANDS).fill(0));
        setPeaks(Array(BANDS).fill(0));
        peaksRef.current = Array(BANDS).fill(0);
        timersRef.current = Array(BANDS).fill(0);
        timeRef.current = 0;
        isRestingRef.current = true;
      }
      return;
    }

    isRestingRef.current = false;

    let intervalId = null;

    const stopAnimation = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const mediaQuery =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const startAnimation = () => {
      stopAnimation();
      const isReduced = Boolean(mediaQuery?.matches);
      const stepInterval = isReduced ? 160 : 40;

      let t = timeRef.current;
      intervalId = setInterval(() => {
        t += stepInterval / 1000;
        timeRef.current = t;

        // Try getting real audio levels first (e.g. from Web Audio AnalyserNode)
        let nextLevels = typeof getExternalLevels === 'function' ? getExternalLevels() : null;

        if (!Array.isArray(nextLevels) || nextLevels.length !== BANDS) {
          if (isReduced) {
            // Gentle, low-energy breathing motion: avoids rapid strobing while remaining alive
            const breath = 0.5 + 0.5 * Math.sin(t * 1.5);
            nextLevels = [
              Math.round(2 + breath),
              Math.round(2 + breath * 1.5),
              Math.round(3 + breath),
              Math.round(3 + breath * 1.2),
              Math.round(2 + breath),
              Math.round(2 + breath * 0.8),
              Math.round(2 + breath * 0.5),
              1,
            ];
          } else {
            nextLevels = calculateFrequencyLevels(t, volume);
          }
        }

        const { nextPeaks, nextTimers } = calculateNextPeaks(
          nextLevels,
          peaksRef.current,
          timersRef.current,
          stepInterval,
          HOLD_TIME_MS
        );

        peaksRef.current = nextPeaks;
        timersRef.current = nextTimers;

        setLevels(nextLevels);
        setPeaks(nextPeaks);
      }, stepInterval);
    };

    startAnimation();

    const handleMotionChange = () => {
      startAnimation();
    };

    mediaQuery?.addEventListener?.('change', handleMotionChange);

    return () => {
      stopAnimation();
      mediaQuery?.removeEventListener?.('change', handleMotionChange);
    };
  }, [isPlaying, getExternalLevels, volume]);

  return (
    <div
      className={`${styles.vfdContainer} ${className}`.trim()}
      title="Graphic equalizer"
      role="img"
      aria-label="Graphic equalizer"
    >
      {levels.map((level, colIdx) => {
        const peak = peaks[colIdx] || 0;
        return (
          <div
            key={colIdx}
            className={styles.vfdColumn}
            data-band={FREQUENCY_BANDS[colIdx]}
            aria-hidden="true"
          >
            {Array.from({ length: SEGMENTS }, (_, segIdx) => {
              const isBaseResting = !isPlaying && segIdx === 0;
              const isBarLit = isPlaying && segIdx < level;
              const isPeakHold = isPlaying && !isBarLit && segIdx === peak - 1;
              const isLit = isBarLit || isPeakHold;
              const segType = getSegmentTypeClass(segIdx);

              let segClass = styles.vfdSegment;
              if (isBaseResting) {
                segClass += ` ${styles.resting}`;
              } else if (isLit) {
                segClass += ` ${styles.lit} ${segType}`;
                if (isPeakHold) {
                  segClass += ` ${styles.peakHold}`;
                }
              } else {
                segClass += ` ${segType}`;
              }

              return (
                <div
                  key={segIdx}
                  className={segClass}
                  data-segment={segIdx + 1}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default memo(VfdEqualizer);
