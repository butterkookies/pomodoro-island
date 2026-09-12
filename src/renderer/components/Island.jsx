import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CompactView from './CompactView';
import ExpandedView from './ExpandedView';
import ReminderBanner from './ReminderBanner';
import styles from './Island.module.css';
import { SPRING } from '../../shared/constants';

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
  // Wellness
  wellnessPrompt,
  // Notch settings
  notchSettings,
  onUpdateNotchSetting,
  onResetNotchSettings,
}) {
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  // Dynamic Island dimensions per state
  function getDims() {
    if (islandState === 'idle') {
      return { width: 170, height: notchSettings?.idleHeight ?? 30 };
    }
    if (islandState === 'compact') {
      return { width: 430, height: 52 };
    }

    // Expanded state
    const width = 440;
    if (activeTab === 'tasks') return { width, height: 260 };
    if (activeTab === 'audio' || activeTab === 'music') return { width, height: 190 };
    if (activeTab === 'stats') return { width, height: 250 };
    if (activeTab === 'settings') return { width, height: 305 };

    // Timer tab
    const isBreak = pomodoroState === 'SHORT_BREAK' || pomodoroState === 'LONG_BREAK';
    return { width, height: isBreak ? 235 : 205 };
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
      transition={SPRING}
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
        transition={SPRING}
      >
        <path d="M 0 0 C 7 0 14 7 14 14 L 15 14 L 15 0 Z" fill="var(--island-bg)" />
        <path d="M 0 0 C 7 0 14 7 14 14" stroke="var(--ear-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
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
        }}
        transition={SPRING}
      >
        <path d="M 15 0 C 8 0 1 7 1 14 L 0 14 L 0 0 Z" fill="var(--island-bg)" />
        <path d="M 15 0 C 8 0 1 7 1 14" stroke="var(--ear-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
      </motion.svg>

      {/* ── Top Specular Light Catch ── */}
      <motion.div
        className={styles.specularTop}
        animate={{
          left: -earConfig.earWidth + 1,
          right: -earConfig.earWidth + 1,
        }}
        transition={SPRING}
      />

      {/* ── Inner Content Container ── */}
      <div
        className={styles.islandInner}
        style={{
          borderRadius: radius,
          background: islandBg,
          border: `1px solid ${borderColor}`,
          borderTop: 'none',
        }}
      >
        <AnimatePresence initial={false}>
          {islandState === 'idle' && (
            <motion.div
              key="idle"
              className={styles.idleContent}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <div className={styles.idleRow}>
                <div
                  className={styles.idleDot}
                  style={{ background: color }}
                />
                <span className={styles.idleTime}>{timeDisplay}</span>
              </div>
              {(isRunning || percent < 1) && (
                <div className={styles.idleProgressTrack}>
                  <motion.div
                    className={styles.idleProgressBar}
                    style={{ background: color }}
                    animate={{ width: `${(1 - percent) * 100}%` }}
                    transition={{ duration: 0.12, ease: 'linear' }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {islandState === 'compact' && (
            <motion.div
              key="compact"
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <CompactView
                timeDisplay={timeDisplay}
                percent={percent}
                color={color}
                label={label}
                isRunning={isRunning}
                nextReminder={nextReminder}
                activeTask={activeTask}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <ExpandedView
                timeDisplay={timeDisplay}
                percent={percent}
                isRunning={isRunning}
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
