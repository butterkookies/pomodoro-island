import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './CompactView.module.css';

/**
 * Compact view: active island state.
 * Refined per 20-point UX/Design audit:
 * - Single morphing Play/Pause 28px ceramic disc
 * - Isolated expand click target on center cluster (gutters are dead zones)
 * - Harmonized 28px heights across horizontal centerline
 * - Optical centroid compensation on Play icon (+1.5px X-offset)
 * - Relaxed tabular tracking with dedicated colon cell to prevent numeral jitter
 * - Continuous satin frosted-glass pill capsule on progress track
 * - Press-and-hold (750ms) to reset with circular progress feedback on Skip button
 * - Semantic W3C a11y DOM with :focus-visible and screen-reader announcements
 */
export default function CompactView({
  timeDisplay = '25:00',
  percent = 1,
  color,
  label,
  isRunning,
  nextReminder,
  activeTask,
  nowPlaying,
  onPause,
  onResume,
  onSkip,
  onReset,
  onExpand,
}) {
  // Clamp percent between 0 and 1 (represents remaining time left)
  const remainingPct = Math.max(0, Math.min(1, percent));

  // Split digits to eliminate colon-digit tracking overlap
  const [mins, secs] = (timeDisplay || '25:00').split(':');

  // Press-and-hold reset mechanics on Skip button
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef(null);
  const holdStartRef = useRef(0);
  const isHoldingRef = useRef(false);

  function handleSkipPointerDown(e) {
    if (e.button !== 0) return; // only primary mouse button
    e.stopPropagation();
    isHoldingRef.current = true;
    holdStartRef.current = Date.now();
    setHoldProgress(0);

    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    holdTimerRef.current = setInterval(() => {
      if (!isHoldingRef.current) {
        clearInterval(holdTimerRef.current);
        return;
      }
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(1, elapsed / 750);
      setHoldProgress(progress);

      if (progress >= 1) {
        clearInterval(holdTimerRef.current);
        isHoldingRef.current = false;
        setHoldProgress(0);
        onReset?.();
      }
    }, 25);
  }

  function handleSkipPointerUp(e) {
    if (!isHoldingRef.current) return;
    e.stopPropagation();
    const elapsed = Date.now() - holdStartRef.current;
    isHoldingRef.current = false;
    clearInterval(holdTimerRef.current);
    setHoldProgress(0);

    // If released before 750ms threshold, treat as normal Skip
    if (elapsed < 750) {
      onSkip?.();
    }
  }

  function handleSkipPointerLeave() {
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      clearInterval(holdTimerRef.current);
      setHoldProgress(0);
    }
  }

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  return (
    <section className={styles.compact} aria-label="Pomodoro Island Compact Bar">
      {/* Screen reader live notification */}
      <div aria-live="polite" className="sr-only">
        {`Timer: ${timeDisplay}, ${isRunning ? 'running' : 'paused'}`}
      </div>

      {/* ── Left: Single Morphing Play/Pause 3D Ceramic Disc ── */}
      <div className={styles.leftButtonGroup}>
        <button
          type="button"
          className={`${styles.tactileBtn} ${styles.tactileBtnActive}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isRunning) {
              onPause?.();
            } else {
              onResume?.();
            }
          }}
          title={isRunning ? 'Pause timer' : 'Start / Resume timer'}
          aria-label={isRunning ? 'Pause' : 'Play'}
        >
          {isRunning ? (
            <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor">
              <rect x="1" y="0.5" width="2.5" height="10" rx="1" />
              <rect x="6.5" y="0.5" width="2.5" height="10" rx="1" />
            </svg>
          ) : (
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              fill="currentColor"
              style={{ transform: 'translateX(0.5px)' }}
            >
              <path d="M 3 1.2 C 3 0.65 3.6 0.3 4.1 0.6 L 9.4 4.85 C 9.85 5.15 9.85 5.85 9.4 6.15 L 4.1 10.4 C 3.6 10.7 3 10.35 3 9.8 Z" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Center: Isolated Expandable Cluster (Time + Progress) ── */}
      <div
        className={styles.centerCluster}
        onClick={onExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onExpand?.();
          }
        }}
        title="Click to expand island"
        aria-label="Expand Island"
      >
        {/* Bold Inter Time Readout with Isolated Colon */}
        <div className={styles.timeWrapper}>
          <span className={styles.timeDigits}>{mins}</span>
          <span className={styles.timeColon}>:</span>
          <span className={styles.timeDigits}>{secs}</span>
        </div>

        {/* Satin Frosted Progress Track (28px Harmonized Height) */}
        <div
          className={styles.progressTrack}
          title={`Remaining: ${Math.round(remainingPct * 100)}%`}
        >
          <div
            className={styles.progressFill}
            style={{ width: `${remainingPct * 100}%` }}
          />
        </div>

        {/* Active Focus Goal Glance Pill */}
        {activeTask?.trim() && (
          <div
            className={styles.taskGlancePill}
            title={`Focus Goal: ${activeTask.trim()}`}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.taskGlanceIcon}
            >
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className={styles.taskGlanceText}>{activeTask.trim()}</span>
          </div>
        )}

        {/* Active Now Playing Music Pill (Spotify / System Audio) */}
        {nowPlaying?.isPlaying && nowPlaying?.title && (
          <div
            className={styles.musicGlancePill}
            title={`Now Playing: ${nowPlaying.title}${nowPlaying.artist ? ` by ${nowPlaying.artist}` : ''}`}
          >
            {nowPlaying.artwork ? (
              <img
                src={nowPlaying.artwork}
                alt=""
                className={styles.musicThumb}
              />
            ) : null}
            <span className={styles.equalizerWave}>
              <span className={styles.eqBar} />
              <span className={styles.eqBar} />
              <span className={styles.eqBar} />
            </span>
            <span className={styles.musicGlanceText}>
              {nowPlaying.title}{nowPlaying.artist ? ` • ${nowPlaying.artist}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Right: Skip Tactile 3D Button with Hold-to-Reset ── */}
      <div className={styles.rightButtonGroup}>
        <button
          type="button"
          className={`${styles.tactileBtn} ${styles.tactileBtnActive}`}
          onPointerDown={handleSkipPointerDown}
          onPointerUp={handleSkipPointerUp}
          onPointerLeave={handleSkipPointerLeave}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReset?.();
          }}
          title="Click to skip • Hold 750ms to reset (or right-click)"
          aria-label="Skip phase (hold to reset)"
        >
          {/* Circular Hold Progress Wipe */}
          {holdProgress > 0 && (
            <svg className={styles.holdProgressRing} viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="rgba(255, 149, 0, 0.9)"
                strokeWidth="2.5"
                strokeDasharray="87.96"
                strokeDashoffset={87.96 * (1 - holdProgress)}
                strokeLinecap="round"
                transform="rotate(-90 16 16)"
              />
            </svg>
          )}

          {/* Calibrated 1.5px Skip Glyph */}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
            <path d="M 1.5 1.5 C 1.5 1 2.1 0.7 2.5 1 L 7.5 5 C 7.9 5.3 7.9 5.7 7.5 6 L 2.5 10 C 2.1 10.3 1.5 10 1.5 9.5 Z" />
            <rect x="8.5" y="1" width="1.5" height="9" rx="0.75" />
          </svg>
        </button>
      </div>

      {/* ── Optional Reminder Capsule Badge ────────────────── */}
      {nextReminder && (() => {
        const minsLeft = Math.max(0, Math.round((nextReminder.fireAt - Date.now()) / 60000));
        if (minsLeft > 60) return null;
        return (
          <div
            className={styles.reminderBadge}
            onClick={(e) => {
              e.stopPropagation();
              onExpand?.();
            }}
          >
            <div className={styles.reminderDot} />
            <span>{nextReminder.name} {minsLeft === 0 ? 'now' : `in ${minsLeft}m`}</span>
          </div>
        );
      })()}
    </section>
  );
}
