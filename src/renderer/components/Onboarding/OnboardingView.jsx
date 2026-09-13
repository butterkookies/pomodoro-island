import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './OnboardingView.module.css';
import { playUiClick, playSnapHaptic } from '../../utils/soundManager';

const TOTAL_STEPS = 3;

// Fluid spring variants for sliding between onboarding steps
const slideVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 30 : -30,
    scale: 0.98,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -30 : 30,
    scale: 0.98,
    transition: {
      duration: 0.14,
      ease: 'easeIn',
    },
  }),
};

export default function OnboardingView({
  onComplete,
  onStartFirstSession,
  onSkip,
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [previewState, setPreviewState] = useState('compact'); // 'idle' | 'compact' | 'expanded'

  const soundEnabled =
    typeof window !== 'undefined'
      ? window.electronAPI?.store?.get?.('soundEffectsEnabled') ?? true
      : true;

  const goToStep = useCallback(
    (newStep) => {
      if (newStep === step) return;
      if (soundEnabled) playUiClick();
      setDirection(newStep > step ? 1 : -1);
      setStep(newStep);
    },
    [step, soundEnabled]
  );

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      goToStep(step + 1);
    }
  }, [step, goToStep]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      goToStep(step - 1);
    }
  }, [step, goToStep]);

  const handleSkip = useCallback(() => {
    if (soundEnabled) playUiClick();
    onSkip?.();
  }, [onSkip, soundEnabled]);

  const handleStartFocus = useCallback(() => {
    playSnapHaptic();
    onStartFirstSession?.();
  }, [onStartFirstSession]);

  const handleExplore = useCallback(() => {
    playSnapHaptic();
    onComplete?.();
  }, [onComplete]);

  // Keyboard navigation: Arrow keys & Enter/Escape
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function handleKeyDown(e) {
      if (e.key === 'ArrowRight') {
        if (step < TOTAL_STEPS - 1) handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (step > 0) handlePrev();
      } else if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'Enter') {
        if (step < TOTAL_STEPS - 1) {
          handleNext();
        } else {
          handleStartFocus();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, handleNext, handlePrev, handleSkip, handleStartFocus]);

  return (
    <div className={styles.container} role="region" aria-label="Welcome to Pomodoro Island">
      {/* Top Header Bar */}
      <header className={styles.header}>
        <div className={styles.stepperPills} aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.stepDot} ${idx === step ? styles.stepDotActive : ''} ${
                idx < step ? styles.stepDotPassed : ''
              }`}
              onClick={() => goToStep(idx)}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
          <span className={styles.stepCounter}>
            {step + 1} of {TOTAL_STEPS}
          </span>
        </div>

        <button
          type="button"
          className={styles.skipBtn}
          onClick={handleSkip}
          title="Skip introduction"
          aria-label="Skip introduction"
        >
          Skip
        </button>
      </header>

      {/* Main Slide Carousel Area */}
      <div className={styles.slideArea}>
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="step-0"
              className={styles.slide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className={styles.slideBadge}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                </svg>
                <span>Introduction</span>
              </div>

              <h2 className={styles.slideTitle}>Welcome to Pomodoro Island</h2>
              <p className={styles.slideSubtitle}>
                A tactile focus companion anchored flush against your screen's top bezel. Always ambient, zero desktop clutter.
              </p>

              {/* Interactive State Simulator */}
              <div className={styles.simulatorBox}>
                <div className={styles.simulatorControls}>
                  {[
                    { id: 'idle', label: '1. Idle' },
                    { id: 'compact', label: '2. Compact' },
                    { id: 'expanded', label: '3. Expanded' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`${styles.simulatorTab} ${previewState === mode.id ? styles.simulatorTabActive : ''}`}
                      onClick={() => {
                        if (soundEnabled) playUiClick();
                        setPreviewState(mode.id);
                      }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className={styles.simulatorStage}>
                  <div className={styles.screenBezelIndicator}>
                    <div className={styles.bezelLine} />
                    <motion.div
                      className={styles.miniPill}
                      animate={{
                        width: previewState === 'idle' ? 90 : previewState === 'compact' ? 180 : 250,
                        height: previewState === 'idle' ? 14 : previewState === 'compact' ? 30 : 64,
                        borderRadius: previewState === 'idle' ? '0 0 6px 6px' : previewState === 'compact' ? '0 0 10px 10px' : '0 0 14px 14px',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    >
                      {previewState === 'idle' && (
                        <div className={styles.miniIdleContent}>
                          <span className={styles.miniDot} />
                          <span className={styles.miniText}>25:00</span>
                        </div>
                      )}

                      {previewState === 'compact' && (
                        <div className={styles.miniCompactContent}>
                          <span className={styles.miniDisc}>▶</span>
                          <span className={styles.miniTrack}>
                            <span className={styles.miniTrackFill} />
                          </span>
                          <span className={styles.miniDigits}>25:00</span>
                        </div>
                      )}

                      {previewState === 'expanded' && (
                        <div className={styles.miniExpandedContent}>
                          <div className={styles.miniExpHeader}>
                            <span>Focus</span>
                            <span className={styles.miniDigitsBold}>25:00</span>
                          </div>
                          <div className={styles.miniExpBar} />
                          <div className={styles.miniExpTabs}>
                            <span>Timer</span>
                            <span>Tasks</span>
                            <span>Audio</span>
                            <span>Stats</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>

                <span className={styles.simulatorCaption}>
                  {previewState === 'idle' && 'Idle: Unobtrusive background sliver with click-through enabled.'}
                  {previewState === 'compact' && 'Compact: Quick glance on hover with timer controls and progress.'}
                  {previewState === 'expanded' && 'Expanded: Full workspace with tasks, audio, stats & custom timers.'}
                </span>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              className={styles.slide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className={styles.slideBadge}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>Gestures & Glances</span>
              </div>

              <h2 className={styles.slideTitle}>Natural gestures & muscle memory</h2>
              <p className={styles.slideSubtitle}>
                Crafted to feel like a hardware component of your display.
              </p>

              <div className={styles.gestureGrid}>
                <div className={styles.gestureCard}>
                  <div className={styles.gestureIconWrap}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                      <path d="m13 13 6 6" />
                    </svg>
                  </div>
                  <div className={styles.gestureContent}>
                    <span className={styles.gestureTitle}>Hover near the top</span>
                    <span className={styles.gestureDesc}>
                      Moving your cursor towards the top-center wakes up the compact timer glance.
                    </span>
                  </div>
                </div>

                <div className={styles.gestureCard}>
                  <div className={styles.gestureIconWrap}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className={styles.gestureContent}>
                    <span className={styles.gestureTitle}>Click center to expand</span>
                    <span className={styles.gestureDesc}>
                      Click the countdown or bar to open full controls. Press Esc to collapse anytime.
                    </span>
                  </div>
                </div>

                <div className={styles.gestureCard}>
                  <div className={styles.gestureIconWrap}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="5 9 2 12 5 15" />
                      <polyline points="9 5 12 2 15 5" />
                      <polyline points="15 19 12 22 9 19" />
                      <polyline points="19 9 22 12 19 15" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <line x1="12" y1="2" x2="12" y2="22" />
                    </svg>
                  </div>
                  <div className={styles.gestureContent}>
                    <span className={styles.gestureTitle}>Drag to position & snap</span>
                    <span className={styles.gestureDesc}>
                      Drag horizontally along your monitor edge. Snaps back to center with haptic feedback.
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              className={styles.slide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className={styles.slideBadge}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Speed & Flow</span>
              </div>

              <h2 className={styles.slideTitle}>Power shortcuts & system flow</h2>
              <p className={styles.slideSubtitle}>
                Control your deep work sessions from anywhere in Windows.
              </p>

              <div className={styles.shortcutCard}>
                <div className={styles.shortcutRow}>
                  <div className={styles.keyCombo}>
                    <kbd className={styles.kbd}>Ctrl</kbd>
                    <span className={styles.keyPlus}>+</span>
                    <kbd className={styles.kbd}>Shift</kbd>
                    <span className={styles.keyPlus}>+</span>
                    <kbd className={styles.kbd}>Space</kbd>
                  </div>
                  <span className={styles.keyDesc}>Summon or collapse island</span>
                </div>

                <div className={styles.shortcutRow}>
                  <div className={styles.keyCombo}>
                    <kbd className={styles.kbd}>Ctrl</kbd>
                    <span className={styles.keyPlus}>+</span>
                    <kbd className={styles.kbd}>Alt</kbd>
                    <span className={styles.keyPlus}>+</span>
                    <kbd className={styles.kbd}>P</kbd>
                  </div>
                  <span className={styles.keyDesc}>Play / Pause focus countdown</span>
                </div>

                <div className={styles.shortcutRow}>
                  <div className={styles.keyCombo}>
                    <kbd className={styles.kbd}>Esc</kbd>
                  </div>
                  <span className={styles.keyDesc}>Collapse expanded workspace</span>
                </div>
              </div>

              <div className={styles.trayNotice}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="10" r="8" />
                  <polygon points="12 2 15 8 9 8 12 2" />
                </svg>
                <span>Look for the Pomodoro icon in your Windows System Tray to show or hide the notch anytime.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Action Footer */}
      <footer className={styles.footer}>
        {step > 0 ? (
          <button
            type="button"
            className={styles.backBtn}
            onClick={handlePrev}
            aria-label="Previous step"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back</span>
          </button>
        ) : (
          <div className={styles.footerPlaceholder} />
        )}

        <div className={styles.footerActionGroup}>
          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleNext}
              aria-label="Next step"
            >
              <span>Continue</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : (
            <div className={styles.completionBtns}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleExplore}
                aria-label="Explore workspace"
              >
                Explore Island
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleStartFocus}
                aria-label="Begin 25-minute focus session"
              >
                <span>Start 25m Focus</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
