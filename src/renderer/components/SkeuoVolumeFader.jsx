import { useState, useRef, useEffect, useCallback, memo } from 'react';
import styles from './SkeuoVolumeFader.module.css';

export const TRACK_HEIGHT = 76;
export const KNOB_HEIGHT = 18;
export const TRACK_PADDING = 4; // 2px top + 2px bottom
export const USABLE_TRAVEL = TRACK_HEIGHT - KNOB_HEIGHT - TRACK_PADDING; // 54px
export const SNAP_MIN = 0.68;
export const SNAP_MAX = 0.72;
export const SNAP_TARGET = 0.70;

/**
 * Clamps fader travel parameter t between 0.0 and 1.0.
 *
 * @param {number} t
 * @returns {number}
 */
export function clampVolume(t) {
  if (typeof t !== 'number' || Number.isNaN(t)) return 0;
  return Math.max(0, Math.min(1, t));
}

/**
 * Applies magnetic haptic snap. If t is between 0.68 and 0.72, snap to 0.70.
 *
 * @param {number} t
 * @returns {number}
 */
export function applyMagneticSnap(t) {
  if (t >= SNAP_MIN && t <= SNAP_MAX) {
    return SNAP_TARGET;
  }
  return t;
}

/**
 * Logarithmic loudness formula: Gain = t^2.
 *
 * @param {number} t Fader travel parameter [0.0, 1.0]
 * @returns {number} Gain [0.0, 1.0]
 */
export function calculateGain(t) {
  const clamped = clampVolume(t);
  return clamped * clamped;
}

/**
 * Linear travel to knob Y position within track.
 * Formula: knobTop = (1 - t) * 54 + 2px
 *
 * @param {number} t
 * @returns {number} Top coordinate in pixels
 */
export function calculateKnobTop(t) {
  const clamped = clampVolume(t);
  const rawTop = (1 - clamped) * USABLE_TRAVEL + (TRACK_PADDING / 2);
  return Math.round(rawTop * 100) / 100;
}

/**
 * Converts pointer Y relative to the track bounds into travel parameter t [0.0, 1.0].
 * Usable travel is 54px, with knob center positioned at 11px when t = 1.0 and 65px when t = 0.0.
 *
 * @param {number} relativeY Pointer Y relative to top of track
 * @param {boolean} [withSnap=true] Whether to apply magnetic snap around 0.70
 * @returns {number} Travel t in [0.0, 1.0]
 */
export function calculateTravelFromY(relativeY, withSnap = true) {
  const knobCenterOffset = (TRACK_PADDING / 2) + (KNOB_HEIGHT / 2); // 2 + 9 = 11px
  const travelY = relativeY - knobCenterOffset;
  const rawT = 1 - (travelY / USABLE_TRAVEL);
  const clamped = clampVolume(rawT);
  return withSnap ? applyMagneticSnap(clamped) : clamped;
}

/**
 * Formats travel percentage readout.
 *
 * @param {number} t
 * @returns {string}
 */
export function formatPercentage(t) {
  return `${Math.round(clampVolume(t) * 100)}%`;
}

/**
 * Skeuomorphic Volume Fader Component
 * Direct-manipulation vertical fader with knurled ridges, physical key lighting,
 * magnetic snap at 70%, mouse wheel support, and full keyboard accessibility.
 */
function SkeuoVolumeFader({
  initialVolume = 0.7,
  onChange,
  className = '',
}) {
  const [volume, setVolume] = useState(() => applyMagneticSnap(clampVolume(initialVolume)));
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (typeof initialVolume === 'number' && !isDraggingRef.current) {
      setVolume(applyMagneticSnap(clampVolume(initialVolume)));
    }
  }, [initialVolume]);

  const updateFromPointer = useCallback((clientY) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const nextT = calculateTravelFromY(relativeY, true);
    setVolume(nextT);
    onChange?.(nextT);
  }, [onChange]);

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    setIsDragging(true);

    try {
      if (e.target?.setPointerCapture) {
        e.target.setPointerCapture(e.pointerId);
      } else if (e.currentTarget?.setPointerCapture) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch {}

    updateFromPointer(e.clientY);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    updateFromPointer(e.clientY);
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      if (e.target?.releasePointerCapture && e.target?.hasPointerCapture?.(e.pointerId)) {
        e.target.releasePointerCapture(e.pointerId);
      } else if (e.currentTarget?.releasePointerCapture && e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    updateFromPointer(e.clientY);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.02 : -0.02;
    const nextT = applyMagneticSnap(clampVolume(Math.round((volume + step) * 100) / 100));
    setVolume(nextT);
    onChange?.(nextT);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    const resetVol = SNAP_TARGET;
    setVolume(resetVol);
    onChange?.(resetVol);
  };

  const handleKeyDown = (e) => {
    let nextT = volume;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      nextT = clampVolume(Math.round((volume + 0.05) * 100) / 100);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nextT = clampVolume(Math.round((volume - 0.05) * 100) / 100);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      nextT = clampVolume(Math.round((volume + 0.10) * 100) / 100);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      nextT = clampVolume(Math.round((volume - 0.10) * 100) / 100);
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextT = 0.0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextT = 1.0;
    } else {
      return;
    }
    nextT = applyMagneticSnap(nextT);
    setVolume(nextT);
    onChange?.(nextT);
  };

  const knobTop = calculateKnobTop(volume);
  const percentText = formatPercentage(volume);

  return (
    <div className={`${styles.faderChassis} ${className}`.trim()}>
      <div
        ref={trackRef}
        className={styles.faderTrack}
        tabIndex={0}
        role="slider"
        aria-label="Media volume"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(volume * 100)}
        aria-valuetext={percentText}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
      >
        <div className={styles.faderSlotGroove} />
        <div
          className={`${styles.faderKnob} ${isDragging ? styles.dragging : ''}`}
          style={{ top: `${knobTop}px` }}
        />
      </div>
      <div className={styles.volTag}>
        {percentText}
      </div>
    </div>
  );
}

export default memo(SkeuoVolumeFader);
