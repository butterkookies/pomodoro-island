import { useEffect, useState, useRef } from 'react';
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
export function calculateFrequencyLevels(t = 0) {
  // Phase 1: Bass Kick / Low Thump (Bands 1-2: 63Hz, 160Hz)
  const kick = Math.pow(Math.max(0, Math.sin(t * 4.4)), 3.5);
  const bassRhythm = Math.sin(t * 2.2) * 1.2;

  // Phase 2: Mid Vocal / Snare (Bands 4-5: 1kHz, 2.5kHz)
  const snare = Math.pow(Math.max(0, Math.sin(t * 4.4 + Math.PI)), 3.0);
  const vocalLead = Math.sin(t * 2.8) * 1.5 + Math.cos(t * 1.4) * 0.9;

  // Phase 3: High Treble / Cymbal Sizzle (Bands 7-8: 10kHz, 16kHz)
  const hihat = Math.pow(Math.max(0, Math.sin(t * 8.8)), 2.2);
  const cymbalShimmer = Math.sin(t * 11.2) * 1.3 + Math.cos(t * 15.7) * 0.8;

  // Intermediate frequencies:
  // Band 3 (400Hz): warm low-mid body
  const lowMidBody = Math.sin(t * 3.1 + 0.6) * 1.5 + Math.cos(t * 1.8) * 0.9;
  // Band 6 (6.3kHz): harmonic presence
  const presence = Math.sin(t * 4.5 + 1.2) * 1.6 + Math.cos(t * 7.2) * 0.8;

  const nextLevels = [];

  for (let i = 0; i < BANDS; i++) {
    let raw = 2.0;
    const jitter = Math.sin(t * 19.3 + i * 37.7) * 0.4;

    switch (i) {
      case 0:
        // Column 1 (63Hz): Heavy sub-bass kick
        raw = 1.8 + kick * 4.8 + bassRhythm * 0.8 + jitter;
        break;
      case 1:
        // Column 2 (160Hz): Bass thump & punch
        raw = 2.0 + kick * 4.2 + Math.cos(t * 2.2) * 1.2 + jitter;
        break;
      case 2:
        // Column 3 (400Hz): Low-mid warmth
        raw = 2.6 + lowMidBody + jitter;
        break;
      case 3:
        // Column 4 (1kHz): Mid vocal fundamental & snare crack
        raw = 2.0 + snare * 3.8 + vocalLead + jitter;
        break;
      case 4:
        // Column 5 (2.5kHz): Upper mid vocal articulation & snare attack
        raw = 1.8 + snare * 3.4 + Math.cos(t * 3.2) * 1.4 + jitter;
        break;
      case 5:
        // Column 6 (6.3kHz): Presence & guitar harmonics
        raw = 2.3 + presence + hihat * 1.2 + jitter;
        break;
      case 6:
        // Column 7 (10kHz): Treble / hi-hat sizzle
        raw = 1.8 + hihat * 3.6 + cymbalShimmer * 0.9 + jitter;
        break;
      case 7:
        // Column 8 (16kHz): Air & high cymbal shimmer
        raw = 1.5 + hihat * 3.2 + Math.sin(t * 13.5) * 1.2 + jitter;
        break;
      default:
        raw = 2.0;
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

export default function VfdEqualizer({ isPlaying = false, className = '' }) {
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

    const startAnimation = () => {
      stopAnimation();
      let t = timeRef.current;
      intervalId = setInterval(() => {
        t += STEP_INTERVAL_MS / 1000;
        timeRef.current = t;

        const nextLevels = calculateFrequencyLevels(t);
        const { nextPeaks, nextTimers } = calculateNextPeaks(
          nextLevels,
          peaksRef.current,
          timersRef.current,
          STEP_INTERVAL_MS,
          HOLD_TIME_MS
        );

        peaksRef.current = nextPeaks;
        timersRef.current = nextTimers;

        setLevels(nextLevels);
        setPeaks(nextPeaks);
      }, STEP_INTERVAL_MS);
    };

    const applyReducedMotion = () => {
      stopAnimation();
      const calmLevels = [2, 3, 4, 3, 3, 2, 2, 1];
      peaksRef.current = calmLevels;
      timersRef.current = Array(BANDS).fill(0);
      setLevels(calmLevels);
      setPeaks(calmLevels);
    };

    const mediaQuery =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    if (mediaQuery?.matches) {
      applyReducedMotion();
    } else {
      startAnimation();
    }

    const handleMotionChange = (e) => {
      if (e.matches) {
        applyReducedMotion();
      } else {
        startAnimation();
      }
    };

    mediaQuery?.addEventListener?.('change', handleMotionChange);

    return () => {
      stopAnimation();
      mediaQuery?.removeEventListener?.('change', handleMotionChange);
    };
  }, [isPlaying]);

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
