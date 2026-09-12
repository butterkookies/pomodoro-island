import { motion } from 'framer-motion';
import styles from './CompactView.module.css';

/**
 * Compact view: active island state.
 * Implements exact reference style: bold tabular countdown on the left
 * and a satin frosted-glass pill bar on the right showing remaining time left.
 */
export default function CompactView({
  timeDisplay,
  percent = 1,
  color,
  label,
  isRunning,
  nextReminder,
  activeTask,
  onPause,
  onResume,
  onSkip,
  onReset,
  onExpand,
}) {
  // Clamp percent between 0 and 1 (represents remaining time left)
  const remainingPct = Math.max(0, Math.min(1, percent));

  return (
    <div
      className={styles.compact}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      title="Click to expand island"
    >
      {/* ── Left: Pause & Play Tactile 3D Buttons ──────────── */}
      <div className={styles.leftButtonGroup}>
        <button
          type="button"
          className={`${styles.tactileBtn} ${isRunning ? styles.tactileBtnActive : styles.tactileBtnDimmed}`}
          onClick={(e) => {
            e.stopPropagation();
            onPause?.();
          }}
          title="Pause timer"
          aria-label="Pause"
        >
          <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor">
            <rect x="0" y="0" width="3" height="10" rx="1.2" />
            <rect x="5.5" y="0" width="3" height="10" rx="1.2" />
          </svg>
        </button>

        <button
          type="button"
          className={`${styles.tactileBtn} ${!isRunning ? styles.tactileBtnActive : styles.tactileBtnDimmed}`}
          onClick={(e) => {
            e.stopPropagation();
            onResume?.();
          }}
          title="Start / Resume timer"
          aria-label="Play"
        >
          <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor" style={{ marginLeft: 1 }}>
            <polygon points="1 0.75 8.5 5 1 9.25" />
          </svg>
        </button>
      </div>

      {/* ── Center: Bold Inter Time Readout ────────────────── */}
      <div className={styles.timeWrapper}>
        <span className={styles.time}>{timeDisplay}</span>
      </div>

      {/* ── Center-Right: Satin Frosted Progress Pill ───────── */}
      <div
        className={styles.progressTrack}
        title={`Remaining: ${Math.round(remainingPct * 100)}%`}
      >
        <motion.div
          className={styles.progressFill}
          style={{ width: `${remainingPct * 100}%` }}
          transition={{ duration: 0.15, ease: 'linear' }}
        />
      </div>

      {/* ── Right: Skip Tactile 3D Button ──────────────────── */}
      <div className={styles.rightButtonGroup}>
        <button
          type="button"
          className={`${styles.tactileBtn} ${styles.tactileBtnActive}`}
          onClick={(e) => {
            e.stopPropagation();
            onSkip?.();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReset?.();
          }}
          title="Skip to next phase (Right-click to reset)"
          aria-label="Skip"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" stroke="currentColor">
            <polygon points="1.5 1 6.5 5 1.5 9" strokeWidth="0.5" />
            <line x1="8.5" y1="1" x2="8.5" y2="9" strokeWidth="1.8" strokeLinecap="round" />
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
    </div>
  );
}
