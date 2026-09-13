import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useMotionValue, animate } from 'framer-motion';
import CompactView from './CompactView';
import ExpandedView from './ExpandedView';
import ReminderBanner from './ReminderBanner';
import OnboardingView from './Onboarding/OnboardingView';
import styles from './Island.module.css';
import { SPRING, SPRING_CONTAINER, SPRING_LIQUID, BEZEL_SNAP_THRESHOLD } from '../../shared/constants';
import { playSnapHaptic } from '../utils/soundManager';

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
  reportBounds,
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
  // Accent theme
  accentTheme,
  onSetAccentTheme,
  // Onboarding
  isOnboarding = false,
  onCompleteOnboarding,
  onStartFirstSession,
  onSkipOnboarding,
  onReplayOnboarding,
}) {
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [mins, secs] = (timeDisplay || '25:00').split(':');
  const isMediaActive = Boolean(nowPlaying?.isPlaying && nowPlaying?.title);

  // Dynamic audio-reactive pulse animation for active media playback
  useEffect(() => {
    if (!isMediaActive) {
      islandRef?.current?.style.setProperty('--audio-pulse', '0');
      return;
    }

    const mediaQuery = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    let frameId = null;

    const stopAnimation = (fallbackValue = '0') => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      islandRef?.current?.style.setProperty('--audio-pulse', fallbackValue);
    };

    const startAnimation = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      const startTime = performance.now();
      const animatePulse = (currentTime) => {
        const elapsed = (currentTime - startTime) / 1000;
        // Smooth rhythmic pulse: composite sine waves simulating musical breathing
        const pulse = 0.5 + 0.35 * Math.sin(elapsed * 4.2) + 0.15 * Math.sin(elapsed * 8.4);
        const clampedPulse = Math.max(0, Math.min(1, pulse));
        islandRef?.current?.style.setProperty('--audio-pulse', clampedPulse.toFixed(3));
        frameId = requestAnimationFrame(animatePulse);
      };
      frameId = requestAnimationFrame(animatePulse);
    };

    if (mediaQuery?.matches) {
      stopAnimation('0.5');
    } else {
      startAnimation();
    }

    const handleMotionChange = (e) => {
      if (e.matches) {
        stopAnimation('0.5');
      } else {
        startAnimation();
      }
    };

    mediaQuery?.addEventListener?.('change', handleMotionChange);

    return () => {
      mediaQuery?.removeEventListener?.('change', handleMotionChange);
      stopAnimation('0');
    };
  }, [isMediaActive, islandRef]);

  const [expandedContentHeight, setExpandedContentHeight] = useState(null);

  // Reset measured height when tab or island state changes so base calculations take immediate priority
  useEffect(() => {
    setExpandedContentHeight(null);
  }, [activeTab, islandState]);

  const handleContentHeightChange = useCallback((newHeight) => {
    if (typeof newHeight === 'number' && newHeight > 50) {
      setExpandedContentHeight((prev) => {
        if (prev && Math.abs(prev - newHeight) < 2) return prev;
        return newHeight;
      });
    }
  }, []);

  // Dynamic Island dimensions per state
  function getDimensions() {
    if (isOnboarding) {
      return { width: 480, height: 350 };
    }

    if (islandState === 'idle') {
      const mode = notchSettings?.idleDisplayMode ?? 'both';
      const baseWidth = mode === 'both' ? 184 : mode === 'bar' ? 124 : 108;
      const width = nowPlaying?.isPlaying ? baseWidth + (nowPlaying?.artwork ? 44 : 26) : baseWidth;
      return { width, height: notchSettings?.idleHeight ?? 32 };
    }
    if (islandState === 'compact') {
      const isMedia = Boolean(nowPlaying?.isPlaying && nowPlaying?.title);
      return { width: isMedia ? 480 : 460, height: 52 };
    }

    // Expanded state — safe boundary bounded within Electron overlay (460px max)
    const width = 480;
    const MAX_EXPANDED_HEIGHT = 420;

    if (activeTab === 'timer') {
      const isBreak = pomodoroState === 'SHORT_BREAK' || pomodoroState === 'LONG_BREAK';
      let baseHeight = 264;
      if (isOvertime) baseHeight += 44; // Flow overtime "Wrap up & start break" button + margin
      if (isBreak && wellnessPrompt) baseHeight += 28;
      const computed = expandedContentHeight ? Math.max(baseHeight, expandedContentHeight) : baseHeight;
      return { width, height: Math.min(MAX_EXPANDED_HEIGHT, computed) };
    }
    if (activeTab === 'tasks') return { width, height: 280 };
    if (activeTab === 'audio' || activeTab === 'music') {
      return { width, height: nowPlaying?.title ? 272 : 185 };
    }
    if (activeTab === 'stats') return { width, height: 270 };
    if (activeTab === 'settings') return { width, height: 320 };

    // Timer tab fallback
    const isBreak = pomodoroState === 'SHORT_BREAK' || pomodoroState === 'LONG_BREAK';
    let baseHeight = 264;
    if (isOvertime) baseHeight += 44;
    if (isBreak && wellnessPrompt) baseHeight += 28;
    const computed = expandedContentHeight ? Math.max(baseHeight, expandedContentHeight) : baseHeight;
    return { width, height: Math.min(MAX_EXPANDED_HEIGHT, computed) };
  }

  const dims = getDimensions();
  const radius =
    islandState === 'idle' && !isOnboarding
      ? `0 0 ${notchSettings?.idleBottomRadius ?? 12}px ${notchSettings?.idleBottomRadius ?? 12}px`
      : islandState === 'compact' && !isOnboarding
      ? '0 0 20px 20px'
      : '0 0 26px 26px';

  const islandBg = (islandState === 'expanded' || isOnboarding) ? 'var(--pill-bg-expanded)' : 'var(--pill-bg)';
  const borderColor = (islandState !== 'idle' || isOnboarding) ? 'var(--pill-border)' : 'rgba(255, 255, 255, 0.08)';

  const earConfig =
    islandState === 'idle' && !isOnboarding
      ? {
          earWidth: notchSettings?.idleEarWidth ?? 10,
          earHeight: notchSettings?.idleEarHeight ?? 9,
        }
      : {
          earWidth: 15,
          earHeight: 14,
        };

  // Persisted horizontal offset along top monitor bezel
  const savedOffset = window.electronAPI?.store?.get('horizontalOffset', 0) ?? 0;
  const x = useMotionValue(savedOffset);
  const [currentOffsetX, setCurrentOffsetX] = useState(savedOffset);
  const [isSnapped, setIsSnapped] = useState(Math.abs(savedOffset) <= BEZEL_SNAP_THRESHOLD);
  const [isDragging, setIsDragging] = useState(false);
  const isSnappedRef = useRef(Math.abs(savedOffset) <= BEZEL_SNAP_THRESHOLD);
  const isDraggingRef = useRef(false);

  // Sync motion value if currentOffsetX changes programmatically
  useEffect(() => {
    x.set(currentOffsetX);
  }, [currentOffsetX, x]);

  // Max horizontal drag boundary (leaves comfortable margin from screen edge)
  const maxDrag = Math.max(120, Math.floor((window.innerWidth || 1920) / 2 - dims.width / 2 - 16));

  const handleResetPosition = useCallback(() => {
    animate(x, 0, {
      ...SPRING_LIQUID,
      onComplete: () => {
        reportBounds?.();
      },
    });
    setCurrentOffsetX(0);
    setIsSnapped(true);
    isSnappedRef.current = true;
    window.electronAPI?.store?.set('horizontalOffset', 0);
    playSnapHaptic();
    setTimeout(() => {
      reportBounds?.();
    }, 250);
  }, [x, reportBounds]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handleDrag = () => {
    const curX = x.get();
    const distToCenter = Math.abs(curX);

    if (distToCenter <= BEZEL_SNAP_THRESHOLD) {
      if (!isSnappedRef.current) {
        isSnappedRef.current = true;
        setIsSnapped(true);
        playSnapHaptic();
      }
    } else {
      if (isSnappedRef.current) {
        isSnappedRef.current = false;
        setIsSnapped(false);
      }
    }
    reportBounds?.();
  };

  const handleDragEnd = (_event, info) => {
    isDraggingRef.current = false;
    setIsDragging(false);

    const curX = x.get();
    const velocityX = info?.velocity?.x || 0;
    const projected = curX + velocityX * 0.12;

    // Magnetic snap to center if released near or thrown toward center
    if (Math.abs(curX) <= BEZEL_SNAP_THRESHOLD || Math.abs(projected) <= BEZEL_SNAP_THRESHOLD) {
      animate(x, 0, {
        ...SPRING_LIQUID,
        velocity: velocityX,
        onComplete: () => {
          reportBounds?.();
        },
      });
      if (!isSnappedRef.current) {
        playSnapHaptic();
      }
      isSnappedRef.current = true;
      setIsSnapped(true);
      setCurrentOffsetX(0);
      window.electronAPI?.store?.set('horizontalOffset', 0);
    } else {
      const clamped = Math.max(-maxDrag, Math.min(maxDrag, Math.round(curX)));
      animate(x, clamped, {
        ...SPRING_LIQUID,
        velocity: velocityX,
        onComplete: () => {
          reportBounds?.();
        },
      });
      isSnappedRef.current = false;
      setIsSnapped(false);
      setCurrentOffsetX(clamped);
      window.electronAPI?.store?.set('horizontalOffset', clamped);
    }

    setTimeout(() => {
      reportBounds?.();
    }, 200);
  };

  return (
    <motion.div
      ref={islandRef}
      className={`${styles.island} ${isMediaActive ? styles.islandMediaActive : ''}`}
      layout
      drag="x"
      dragConstraints={{ left: -maxDrag, right: maxDrag }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={{
        width: dims.width,
        height: dims.height,
        scaleX: isDragging ? 1.015 : 1,
        scaleY: isDragging ? 0.985 : 1,
      }}
      transition={SPRING_CONTAINER}
      style={{
        x,
        '--island-bg': islandBg,
        '--ear-border': borderColor,
        borderRadius: radius,
        boxShadow: isMediaActive
          ? undefined
          : islandState !== 'idle'
          ? '0 2px 5px rgba(0, 0, 0, 0.08), 0 8px 18px rgba(0, 0, 0, 0.16), 0 18px 36px rgba(0, 0, 0, 0.22), 0 32px 64px rgba(0, 0, 0, 0.16)'
          : '0 2px 5px rgba(0, 0, 0, 0.08), 0 6px 16px rgba(0, 0, 0, 0.14), 0 12px 28px rgba(0, 0, 0, 0.10)',
        position: 'relative',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onDoubleClick={handleResetPosition}
    >
      {/* ── Magnetic Center Alignment Tick ── */}
      <motion.div
        className={styles.magneticGuideTick}
        initial={false}
        animate={{
          opacity: isSnapped && isDragging ? 1 : 0,
          scaleY: isSnapped && isDragging ? 1 : 0.3,
        }}
        transition={{ duration: 0.15 }}
      />
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
        style={{
          opacity: 'var(--island-opacity, 0.95)',
        }}
      >
        <defs>
          <linearGradient id="earStrokeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ear-border)" />
            <stop offset="100%" stopColor="var(--ear-border)" />
          </linearGradient>
        </defs>
        <path className={styles.earFill} d="M 0 0 C 7 0 14 7 14 14 L 15 14 L 15 0 Z" fill="#000000" />
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
        style={{
          opacity: 'var(--island-opacity, 0.95)',
        }}
      >
        <defs>
          <linearGradient id="earStrokeRight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--ear-border)" />
            <stop offset="100%" stopColor="var(--ear-border)" />
          </linearGradient>
        </defs>
        <path className={styles.earFill} d="M 15 0 C 8 0 1 7 1 14 L 0 14 L 0 0 Z" fill="#000000" />
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
          {isOnboarding && (
            <motion.div
              key="onboarding"
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <OnboardingView
                onComplete={onCompleteOnboarding}
                onStartFirstSession={onStartFirstSession}
                onSkip={onSkipOnboarding}
              />
            </motion.div>
          )}

          {!isOnboarding && islandState === 'idle' && (() => {
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

          {!isOnboarding && islandState === 'compact' && (
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

          {!isOnboarding && islandState === 'expanded' && (
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
                accentTheme={accentTheme}
                onSetAccentTheme={onSetAccentTheme}
                horizontalOffset={currentOffsetX}
                onResetPosition={handleResetPosition}
                onReplayOnboarding={onReplayOnboarding}
                onContentHeightChange={handleContentHeightChange}
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
