import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CompactView from './CompactView';
import ExpandedView from './ExpandedView';
import ReminderBanner from './ReminderBanner';
import styles from './Island.module.css';
import { SPRING, SPRING_CONTAINER } from '../../shared/constants';

// Apple Dynamic Island view entry/exit transitions (scale 0.98->1 over 180ms, 1->0.99 over 100ms)
const viewVariants = {
  initial: {
    opacity: 0,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    scale: 1.0,
    transition: {
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    transition: {
      duration: 0.10,
      ease: 'easeOut',
    },
  },
};

export default function Island({
  islandRef,
  islandState,
  onMouseEnter,
  onMouseLeave,
  onClick,
  // Timer props
  timeDisplay,
  percent,
  isRunning,
  isOvertime,
  onFinishOvertime,
  // Pomodoro props
  pomodoroState,
  color,
  label,
  sessionCount,
  // Action callbacks
  onPause,
  onResume,
  onSkip,
  onReset,
  // Custom timers
  customTimers,
  onAddCustomTimer,
  onRemoveCustomTimer,
  // Reminders
  onAddReminder,
  // Settings
  durations,
  onSetDuration,
  onSetPhase,
  autoStartBreaks,
  onSetAutoStartBreaks,
  autoStartFocus,
  onSetAutoStartFocus,
  activeReminder,
  onReminderStart,
  onReminderDismiss,
  nextReminder,
  // Tab + form mode
  activeTab,
  onTabChange,
  formMode,
  onFormMode,
  onCollapse,
  // Task & Scratchpad
  activeTask,
  onSetActiveTask,
  scratchpadNotes,
  onAddNote,
  onToggleNote,
  onRemoveNote,
  onClearCompletedNotes,
  // Stats
  stats,
  // Now playing music
  nowPlaying,
  // Wellness
  wellnessPrompt,
  // Notch settings
  notchSettings,
  onUpdateNotchSetting,
  onResetNotchSettings,
}) {
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [mins, secs] = (timeDisplay || '25:00').split(':');

  // Dynamic Island dimensions per state
  function getDims() {
    if (islandState === 'idle') {
      const mode = notchSettings?.idleDisplayMode ?? 'both';
      const baseWidth = mode === 'both' ? 184 : mode === 'bar' ? 124 : 108;
      const width = nowPlaying?.isPlaying ? baseWidth + (nowPlaying?.artwork ? 44 : 26) : baseWidth;
      return { width, height: notchSettings?.idleHeight ?? 32 };
    }
    if (islandState === 'compact') {
      return { width: nowPlaying?.isPlaying ? 450 : 430, height: 52 };
    }

    // Expanded state
    const width = 440;
    if (activeTab === 'tasks') return { width, height: 250 };
    if (activeTab === 'audio' || activeTab === 'music') return { width, height: nowPlaying?.isPlaying ? 230 : 165 };
    if (activeTab === 'stats') return { width, height: 245 };
    if (activeTab === 'settings') return { width, height: 285 };

    // Timer tab
    const isBreak = pomodoroState === 'SHORT_BREAK' || pomodoroState === 'LONG_BREAK';
    return { width, height: isBreak ? 260 : 240 };
  }

  const dims = getDims();
  const radius =
    islandState === 'idle'
      ? `0 0 ${notchSettings?.idleBottomRadius ?? 12}px ${notchSettings?.idleBottomRadius ?? 12}px`
      : islandState === 'compact'
      ? '0 0 20px 20px'
      : '0 0 26px 26px';

  const islandBg = islandState === 'expanded' ? 'var(--pill-bg-expanded)' : 'var(--pill-bg)';
  const borderColor = islandState !== 'idle' ? 'var(--pill-border)' : 'rgba(255, 255, 255, 0.08)';

  const earConfig =
    islandState === 'idle'
      ? {
          earWidth: notchSettings?.idleEarWidth ?? 10,
          earHeight: notchSettings?.idleEarHeight ?? 9,
        }
      : {
          earWidth: 15,
          earHeight: 14,
        };

  return (
    <motion.div
      ref={islandRef}
      className={styles.island}
      layout
      animate={{
        width: dims.width,
        height: dims.height,
      }}
      transition={SPRING_CONTAINER}
      style={{
        '--island-bg': islandBg,
        '--ear-border': borderColor,
        borderRadius: radius,
        boxShadow:
          islandState !== 'idle'
            ? '0 16px 36px rgba(0, 0, 0, 0.75)'
            : '0 4px 14px rgba(0, 0, 0, 0.4)',
        position: 'relative',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* ── Left Concave Ear (Smooth Tangent Flare into Screen Bezel) ── */}
      <motion.svg
        className={styles.notchEarLeft}
        viewBox="0 0 15 14"
        preserveAspectRatio="none"
        aria-hidden="true"
        animate={{
          width: earConfig.earWidth,
          height: earConfig.earHeight,
          left: -earConfig.earWidth + 1,
        }}
        transition={SPRING_CONTAINER}
      >
        <defs>
          <linearGradient id="earStrokeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ear-border)" />
            <stop offset="100%" stopColor="var(--ear-border)" />
          </linearGradient>
        </defs>
        <path d="M 0 0 C 7 0 14 7 14 14 L 15 14 L 15 0 Z" fill="var(--island-bg)" />
        <path d="M 0 0 C 7 0 14 7 14 14" stroke="url(#earStrokeLeft)" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
      </motion.svg>

      {/* ── Right Concave Ear (Smooth Tangent Flare into Screen Bezel) ── */}
      <motion.svg
        className={styles.notchEarRight}
        viewBox="0 0 15 14"
        preserveAspectRatio="none"
        aria-hidden="true"
        animate={{
          width: earConfig.earWidth,
          height: earConfig.earHeight,
          right: -earConfig.earWidth + 1,
        }}
        transition={SPRING_CONTAINER}
      >
        <defs>
          <linearGradient id="earStrokeRight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--ear-border)" />
            <stop offset="100%" stopColor="var(--ear-border)" />
          </linearGradient>
        </defs>
        <path d="M 15 0 C 8 0 1 7 1 14 L 0 14 L 0 0 Z" fill="var(--island-bg)" />
        <path d="M 15 0 C 8 0 1 7 1 14" stroke="url(#earStrokeRight)" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
      </motion.svg>

      {/* ── Inner Content Container ── */}
      <div
        className={styles.islandInner}
        style={{
          borderRadius: radius,
          background: islandBg,
          borderLeft: `1px solid ${borderColor}`,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
          borderTop: 'none',
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {islandState === 'idle' && (() => {
            const idleMode = notchSettings?.idleDisplayMode ?? 'both';
            const showTime = idleMode === 'both' || idleMode === 'time';
            const showBar = idleMode === 'both' || idleMode === 'bar';
            const remainingPct = Math.max(0, Math.min(1, percent));

            return (
              <motion.div
                key="idle"
                className={`${styles.idleContent} ${
                  idleMode === 'both' ? styles.idleContentBoth : styles.idleContentCenter
                }`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.12, ease: [0.16, 1, 0.3, 1] } }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.10, ease: 'easeIn' } }}
              >
                {nowPlaying?.isPlaying && nowPlaying?.artwork && (
                  <img
                    src={nowPlaying.artwork}
                    alt=""
                    className={styles.idleMusicThumb}
                    title={`Now Playing: ${nowPlaying.title}${nowPlaying.artist ? ` by ${nowPlaying.artist}` : ''}`}
                  />
                )}
                {showTime && (
                  <div className={styles.idleTimeWrapper}>
                    <span className={styles.idleDigits}>{mins}</span>
                    <span className={styles.idleColon}>:</span>
                    <span className={styles.idleDigits}>{secs}</span>
                  </div>
                )}
                {showBar && (
                  <div
                    className={`${styles.idleBarTrack} ${
                      idleMode === 'bar' ? styles.idleBarTrackCentered : ''
                    }`}
                  >
                    <div
                      className={styles.idleBarFill}
                      style={{ width: `${remainingPct * 100}%` }}
                    />
                  </div>
                )}
                {nowPlaying?.isPlaying && (
                  <div
                    className={styles.idleEqualizer}
                    title={`Now Playing: ${nowPlaying.title}${nowPlaying.artist ? ` by ${nowPlaying.artist}` : ''}`}
                  >
                    <span className={styles.idleEqBar} />
                    <span className={styles.idleEqBar} />
                    <span className={styles.idleEqBar} />
                  </div>
                )}
              </motion.div>
            );
          })()}

          {islandState === 'compact' && (
            <motion.div
              key="compact"
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.12, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.10, ease: 'easeIn' } }}
            >
              <CompactView
                timeDisplay={timeDisplay}
                percent={percent}
                color={color}
                label={label}
                isRunning={isRunning}
                isOvertime={isOvertime}
                onFinishOvertime={onFinishOvertime}
                nextReminder={nextReminder}
                activeTask={activeTask}
                nowPlaying={nowPlaying}
                onPause={onPause}
                onResume={onResume}
                onSkip={onSkip}
                onReset={onReset}
                onExpand={onClick}
              />
            </motion.div>
          )}

          {islandState === 'expanded' && (
            <motion.div
              key="expanded"
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <ExpandedView
                timeDisplay={timeDisplay}
                percent={percent}
                isRunning={isRunning}
                isOvertime={isOvertime}
                onFinishOvertime={onFinishOvertime}
                color={color}
                label={label}
                sessionCount={sessionCount}
                pomodoroState={pomodoroState}
                onPause={onPause}
                onResume={onResume}
                onSkip={onSkip}
                onReset={onReset}
                customTimers={customTimers}
                onAddCustomTimer={onAddCustomTimer}
                onRemoveCustomTimer={onRemoveCustomTimer}
                onAddReminder={onAddReminder}
                durations={durations}
                onSetDuration={onSetDuration}
                onSetPhase={onSetPhase}
                autoStartBreaks={autoStartBreaks}
                onSetAutoStartBreaks={onSetAutoStartBreaks}
                autoStartFocus={autoStartFocus}
                onSetAutoStartFocus={onSetAutoStartFocus}
                activeTab={activeTab}
                onTabChange={onTabChange}
                formMode={formMode}
                onFormMode={onFormMode}
                onCollapse={onCollapse}
                activeTask={activeTask}
                onSetActiveTask={onSetActiveTask}
                scratchpadNotes={scratchpadNotes}
                onAddNote={onAddNote}
                onToggleNote={onToggleNote}
                onRemoveNote={onRemoveNote}
                onClearCompletedNotes={onClearCompletedNotes}
                isScratchpadOpen={isScratchpadOpen}
                onToggleScratchpad={() => setIsScratchpadOpen(!isScratchpadOpen)}
                stats={stats}
                nowPlaying={nowPlaying}
                wellnessPrompt={wellnessPrompt}
                notchSettings={notchSettings}
                onUpdateNotchSetting={onUpdateNotchSetting}
                onResetNotchSettings={onResetNotchSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Reminder banner overlay ─────────────── */}
        <AnimatePresence>
          {activeReminder && (
            <ReminderBanner
              key="reminder-banner"
              reminder={activeReminder}
              onStart={onReminderStart}
              onDismiss={onReminderDismiss}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
