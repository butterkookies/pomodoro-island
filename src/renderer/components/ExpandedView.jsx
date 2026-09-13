import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import StatsTab from './StatsTab';
import VfdEqualizer from './VfdEqualizer';
import SkeuoVolumeFader from './SkeuoVolumeFader';
import styles from './ExpandedView.module.css';
import {
  SOUND_LIST,
  play as ambientPlay,
  stop as ambientStop,
  setVolume as ambientSetVolume,
  getCurrentSound,
  getVolume,
  isPlaying as ambientIsPlaying,
  getFrequencyLevels as ambientGetFrequencyLevels,
} from '../utils/ambientPlayer';
import { initSystemAudio, getFrequencyLevels as getSystemAudioLevels } from '../utils/systemAudioListener';
import { playUiClick } from '../utils/soundManager';
import { parseTimeInput } from '../utils/timeInputParser';
import { THEME_PALETTES } from '../../shared/constants';

const TAB_ORDER = ['timer', 'tasks', 'audio', 'stats', 'settings'];

function getTabIndex(tab) {
  const normalized = tab === 'music' ? 'audio' : tab;
  const idx = TAB_ORDER.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

// Clean spring crossfade transition (avoids blank-frame flicker during tab navigation)
const tabVariants = {
  enter: {
    opacity: 0,
    y: 3,
  },
  center: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.14,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -2,
    transition: {
      duration: 0.07,
      ease: 'easeIn',
    },
  },
};

/**
 * Isolated, memoized Now Playing Card to prevent root re-render cascades
 * during rapid volume fader dragging and audio state subscriptions.
 */
const NowPlayingCard = memo(function NowPlayingCard({ nowPlaying, soundEnabled, playUiClick }) {
  const [mediaVolume, setMediaVolumeState] = useState(0.70);
  const [artworkError, setArtworkError] = useState(false);

  useEffect(() => {
    setArtworkError(false);
  }, [nowPlaying?.artwork]);

  useEffect(() => {
    let isMounted = true;
    window.electronAPI?.getMediaVolume?.()
      ?.then((vol) => {
        if (isMounted && typeof vol === 'number') setMediaVolumeState(vol);
      })
      ?.catch(() => {});

    const unsubscribe = window.electronAPI?.onMediaVolumeUpdate?.((vol) => {
      if (isMounted && typeof vol === 'number') setMediaVolumeState(vol);
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (nowPlaying?.isPlaying) {
      initSystemAudio()?.catch?.(() => {});
    }
  }, [nowPlaying?.isPlaying]);

  const handleMediaVolumeChange = useCallback((vol) => {
    setMediaVolumeState(vol);
    window.electronAPI?.setMediaVolume?.(vol);
  }, []);

  const getAudioLevels = useCallback(() => {
    const sysLevels = getSystemAudioLevels();
    if (sysLevels) return sysLevels;
    if (ambientIsPlaying?.()) {
      return ambientGetFrequencyLevels?.();
    }
    return null;
  }, []);

  if (!nowPlaying?.title) return null;

  const isEqActive = Boolean(nowPlaying?.isPlaying || ambientIsPlaying?.());

  return (
    <div className={styles.nowPlayingCard}>
      {/* Column 1: Artwork (Scaled to anchor the media card) */}
      <div className={styles.nowPlayingArtCol}>
        {nowPlaying.artwork && !artworkError ? (
          <img
            src={nowPlaying.artwork}
            alt={nowPlaying.title ? `Album art for ${nowPlaying.title}` : 'Album art'}
            className={`${styles.nowPlayingThumb} ${nowPlaying?.isPlaying ? styles.nowPlayingThumbActive : ''}`}
            onError={() => setArtworkError(true)}
          />
        ) : (
          <div className={styles.nowPlayingThumbPlaceholder}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        )}
      </div>

      {/* Column 2: Track Metadata & Transport Controls */}
      <div className={styles.nowPlayingMetaCol}>
        <div className={styles.nowPlayingMeta}>
          <div className={styles.nowPlayingTitleWrapper}>
            <span className={styles.nowPlayingTitle} title={nowPlaying.title}>
              {nowPlaying.title}
            </span>
          </div>
          <span className={styles.nowPlayingArtist} title={nowPlaying.artist || 'Media Audio'}>
            {nowPlaying.artist || 'Media Audio'}
          </span>
        </div>

        <div className={styles.nowPlayingControls}>
          <button
            type="button"
            className={styles.mediaNavBtn}
            onClick={() => {
              if (soundEnabled) playUiClick?.();
              nowPlaying.prev?.();
            }}
            title="Previous track"
            aria-label="Previous track"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </button>

          <button
            type="button"
            className={`${styles.mediaPlayBtn} ${nowPlaying?.isPlaying ? styles.mediaPlayBtnActive : ''}`}
            onClick={() => {
              if (soundEnabled) playUiClick?.();
              nowPlaying.playPause?.();
            }}
            title={nowPlaying?.isPlaying ? 'Pause track' : 'Play track'}
            aria-label={nowPlaying?.isPlaying ? 'Pause track' : 'Play track'}
          >
            {nowPlaying?.isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1.2" />
                <rect x="14" y="4" width="4" height="16" rx="1.2" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '1.5px' }}>
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className={styles.mediaNavBtn}
            onClick={() => {
              if (soundEnabled) playUiClick?.();
              nowPlaying.next?.();
            }}
            title="Next track"
            aria-label="Next track"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Column 3: VFD Equalizer */}
      <div className={styles.nowPlayingEqCol}>
        <VfdEqualizer
          isPlaying={isEqActive}
          volume={mediaVolume}
          getExternalLevels={getAudioLevels}
        />
      </div>

      {/* Column 4: Hairline Divider & Skeuomorphic Volume Fader */}
      <div className={styles.nowPlayingFaderCol}>
        <div className={styles.mediaCardDivider} />
        <SkeuoVolumeFader initialVolume={mediaVolume} onChange={handleMediaVolumeChange} />
      </div>
    </div>
  );
});

export default function ExpandedView({
  timeDisplay,
  percent,
  isRunning,
  isOvertime,
  onFinishOvertime,
  color,
  label,
  sessionCount = 0,
  pomodoroState,
  onPause,
  onResume,
  onSkip,
  onReset,
  durations = {},
  onSetDuration,
  onSetPhase,
  autoStartBreaks,
  onSetAutoStartBreaks,
  autoStartFocus,
  onSetAutoStartFocus,
  activeTab = 'timer',
  onTabChange,
  onCollapse,
  // Tasks & Scratchpad
  activeTask = '',
  onSetActiveTask,
  scratchpadNotes = [],
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
  // Custom timers
  customTimers = [],
  onAddCustomTimer,
  onRemoveCustomTimer,
  // Notch settings
  notchSettings = {},
  onUpdateNotchSetting,
  onResetNotchSettings,
  // Accent theme
  accentTheme = 'classic',
  onSetAccentTheme,
  horizontalOffset = 0,
  onResetPosition,
  onReplayOnboarding,
  onContentHeightChange,
}) {
  const timerMeasurerRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'timer') {
      onContentHeightChange?.(null);
      return;
    }
    const el = timerMeasurerRef.current;
    if (!el || typeof onContentHeightChange !== 'function') return;

    const measure = () => {
      const naturalHeight = el.offsetHeight;
      if (naturalHeight > 50) {
        // 28px navBar + 8px nav margin + 20px container padding = 56px chrome
        onContentHeightChange(naturalHeight + 56);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [
    activeTab,
    isOvertime,
    pomodoroState,
    wellnessPrompt,
    activeTask,
    onContentHeightChange,
  ]);

  const [newNoteText, setNewNoteText] = useState('');
  const [customTimerName, setCustomTimerName] = useState('');
  const [customTimerMins, setCustomTimerMins] = useState('');

  // Hero time inline editing
  const [isEditingHeroTime, setIsEditingHeroTime] = useState(false);
  const [heroTimeInput, setHeroTimeInput] = useState('');
  const heroInputRef = useRef(null);
  const isCancellingHeroRef = useRef(false);
  const committingHeroRef = useRef(false);

  // Settings steppers inline editing ('FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK' | null)
  const [editingStepper, setEditingStepper] = useState(null);
  const [stepperInputVal, setStepperInputVal] = useState('');
  const stepperInputRef = useRef(null);
  const isCancellingStepperRef = useRef(false);
  const committingStepperRef = useRef(false);

  useEffect(() => {
    if (isEditingHeroTime && heroInputRef.current) {
      heroInputRef.current.focus();
      heroInputRef.current.select();
    }
  }, [isEditingHeroTime]);

  useEffect(() => {
    if (editingStepper && stepperInputRef.current) {
      stepperInputRef.current.focus();
      stepperInputRef.current.select();
    }
  }, [editingStepper]);

  useEffect(() => {
    if (isRunning && isEditingHeroTime) {
      isCancellingHeroRef.current = true;
      setIsEditingHeroTime(false);
    }
  }, [isRunning, isEditingHeroTime]);

  const handleStartEditHeroTime = () => {
    if (isRunning) return;
    const currentMinutes = Math.round(
      ((durations && (durations[pomodoroState] || durations.FOCUS)) || 25 * 60 * 1000) / 60000
    );
    setHeroTimeInput(String(currentMinutes));
    isCancellingHeroRef.current = false;
    setIsEditingHeroTime(true);
  };

  const handleCommitHeroTime = () => {
    if (isCancellingHeroRef.current) {
      isCancellingHeroRef.current = false;
      return;
    }
    if (committingHeroRef.current) return;
    committingHeroRef.current = true;

    const ms = parseTimeInput(heroTimeInput);
    if (ms) {
      const targetPhase = (pomodoroState === 'SHORT_BREAK' || pomodoroState === 'LONG_BREAK') ? pomodoroState : 'FOCUS';
      onSetDuration?.(targetPhase, ms);
    }
    setIsEditingHeroTime(false);
    setTimeout(() => {
      committingHeroRef.current = false;
    }, 50);
  };

  const handleHeroKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleCommitHeroTime();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      isCancellingHeroRef.current = true;
      setIsEditingHeroTime(false);
    }
  };

  const handleStartEditStepper = (phase, currentMinutes) => {
    setStepperInputVal(String(currentMinutes));
    isCancellingStepperRef.current = false;
    setEditingStepper(phase);
  };

  const handleCommitStepper = () => {
    if (isCancellingStepperRef.current) {
      isCancellingStepperRef.current = false;
      return;
    }
    if (committingStepperRef.current) return;
    committingStepperRef.current = true;

    const currentEditing = editingStepper;
    if (currentEditing) {
      const isFocus = currentEditing === 'FOCUS';
      const ms = parseTimeInput(stepperInputVal, {
        minMinutes: 1,
        maxMinutes: isFocus ? 180 : 60,
      });
      if (ms) {
        onSetDuration?.(currentEditing, ms);
      }
    }
    setEditingStepper(null);
    setTimeout(() => {
      committingStepperRef.current = false;
    }, 50);
  };

  const handleStepperKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleCommitStepper();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      isCancellingStepperRef.current = true;
      setEditingStepper(null);
    }
  };

  // Directional tab switching mechanics
  const activeTabIndex = getTabIndex(activeTab);
  const [prevTabIndex, setPrevTabIndex] = useState(activeTabIndex);
  const [direction, setDirection] = useState(1);

  if (activeTabIndex !== prevTabIndex) {
    setDirection(activeTabIndex > prevTabIndex ? 1 : -1);
    setPrevTabIndex(activeTabIndex);
  }

  // Audio state
  const [currentSound, setCurrentSound] = useState(() => getCurrentSound());
  const [volume, setVolumeState] = useState(() => getVolume());

  // Settings: Displays, UI sounds, Startup & Top Margin
  const [displays, setDisplays] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return window.electronAPI?.store?.get('soundEffectsEnabled') ?? true;
  });
  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [topMargin, setTopMarginState] = useState(() => {
    return window.electronAPI?.store?.get('topMargin') ?? 0;
  });
  const [islandOpacity, setIslandOpacityState] = useState(() => {
    return window.electronAPI?.store?.get('islandOpacity') ?? 95;
  });
  const [includeInRecordings, setIncludeInRecordings] = useState(() => {
    return window.electronAPI?.store?.get('includeInRecordings', true) ?? true;
  });
  const [includeInScreenshots, setIncludeInScreenshots] = useState(() => {
    return window.electronAPI?.store?.get('includeInScreenshots', true) ?? true;
  });

  useEffect(() => {
    window.electronAPI?.getDisplays?.().then((res) => {
      if (Array.isArray(res)) setDisplays(res);
    });
    window.electronAPI?.getLoginItem?.().then((val) => {
      if (typeof val === 'boolean') setOpenAtLogin(val);
    });
  }, []);

  function handleTabClick(tab) {
    if (soundEnabled) playUiClick();
    onTabChange?.(tab);
  }

  // Keyboard navigation: 1-5 to switch tabs when not typing
  useEffect(() => {
    function onKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === '1') handleTabClick('timer');
      else if (e.key === '2') handleTabClick('tasks');
      else if (e.key === '3') handleTabClick('audio');
      else if (e.key === '4') handleTabClick('stats');
      else if (e.key === '5') handleTabClick('settings');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [soundEnabled, onTabChange]);

  function handleStartupToggle() {
    const next = !openAtLogin;
    setOpenAtLogin(next);
    window.electronAPI?.setLoginItem?.(next);
    if (soundEnabled) playUiClick();
  }

  function handleTopMarginChange(delta) {
    const next = Math.max(0, Math.min(24, topMargin + delta));
    setTopMarginState(next);
    window.electronAPI?.setTopMargin?.(next);
    if (soundEnabled) playUiClick();
  }

  function handleOpacityChange(val) {
    const clamped = Math.max(60, Math.min(100, val));
    setIslandOpacityState(clamped);
    window.electronAPI?.store?.set('islandOpacity', clamped);
    document.documentElement.style.setProperty('--island-opacity', (clamped / 100).toString());
    if (soundEnabled) playUiClick();
  }

  function handleSoundSelect(soundId) {
    if (soundEnabled) playUiClick();
    if (soundId === 'none' || soundId === currentSound) {
      ambientStop();
      setCurrentSound(null);
    } else {
      ambientPlay(soundId);
      setCurrentSound(soundId);
    }
  }

  function handleVolumeChange(e) {
    const val = parseFloat(e.target.value);
    setVolumeState(val);
    ambientSetVolume(val);
  }

  function handleSoundToggle() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    window.electronAPI?.store?.set('soundEffectsEnabled', next);
    if (next) playUiClick();
  }

  function handleToggleRecordings() {
    const next = !includeInRecordings;
    setIncludeInRecordings(next);
    window.electronAPI?.setCaptureVisibility?.('recordings', next);
    if (soundEnabled) playUiClick();
  }

  function handleToggleScreenshots() {
    const next = !includeInScreenshots;
    setIncludeInScreenshots(next);
    window.electronAPI?.setCaptureVisibility?.('screenshots', next);
    if (soundEnabled) playUiClick();
  }

  function handleCapturePreset(mode) {
    if (soundEnabled) playUiClick();
    if (mode === 'both') {
      setIncludeInRecordings(true);
      setIncludeInScreenshots(true);
      window.electronAPI?.setCaptureVisibility?.('both', true);
    } else if (mode === 'recordings') {
      setIncludeInRecordings(true);
      setIncludeInScreenshots(false);
      window.electronAPI?.setCaptureVisibility?.('recordings', true);
      window.electronAPI?.setCaptureVisibility?.('screenshots', false);
    } else if (mode === 'screenshots') {
      setIncludeInRecordings(false);
      setIncludeInScreenshots(true);
      window.electronAPI?.setCaptureVisibility?.('recordings', false);
      window.electronAPI?.setCaptureVisibility?.('screenshots', true);
    } else if (mode === 'none') {
      setIncludeInRecordings(false);
      setIncludeInScreenshots(false);
      window.electronAPI?.setCaptureVisibility?.('both', false);
    }
  }

  function handleDisplayChange(e) {
    const id = parseInt(e.target.value, 10);
    window.electronAPI?.setDisplay?.(id);
  }

  function handleAddNoteSubmit(e) {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    if (soundEnabled) playUiClick();
    onAddNote?.(newNoteText.trim());
    setNewNoteText('');
  }

  function handleAddCustomTimerSubmit(e) {
    e.preventDefault();
    const name = customTimerName.trim();
    const mins = parseFloat(customTimerMins);
    if (!name || !mins || mins <= 0) return;
    if (soundEnabled) playUiClick();
    onAddCustomTimer?.(name, mins);
    setCustomTimerName('');
    setCustomTimerMins('');
  }

  const isBreak = pomodoroState === 'SHORT_BREAK' || pomodoroState === 'LONG_BREAK';

  return (
    <div className={styles.expanded}>
      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <div className={styles.navBar}>
        <div className={styles.segmentedControl}>
          <button
            className={`${styles.navBtn} ${activeTab === 'timer' ? styles.navBtnActive : ''}`}
            onClick={() => handleTabClick('timer')}
          >
            {activeTab === 'timer' && (
              <motion.div
                layoutId="activeTabIndicator"
                className={styles.segmentIndicator}
                transition={{ type: 'spring', damping: 36, stiffness: 450 }}
              />
            )}
            <span className={styles.navLabel}>Timer</span>
          </button>

          <button
            className={`${styles.navBtn} ${activeTab === 'tasks' ? styles.navBtnActive : ''}`}
            onClick={() => handleTabClick('tasks')}
          >
            {activeTab === 'tasks' && (
              <motion.div
                layoutId="activeTabIndicator"
                className={styles.segmentIndicator}
                transition={{ type: 'spring', damping: 36, stiffness: 450 }}
              />
            )}
            <span className={styles.navLabel}>
              Tasks
              {scratchpadNotes.filter((n) => !n.done).length > 0 && (
                <span className={styles.countBadge}>
                  {scratchpadNotes.filter((n) => !n.done).length}
                </span>
              )}
            </span>
          </button>

          <button
            className={`${styles.navBtn} ${activeTab === 'audio' ? styles.navBtnActive : ''}`}
            onClick={() => handleTabClick('audio')}
          >
            {activeTab === 'audio' && (
              <motion.div
                layoutId="activeTabIndicator"
                className={styles.segmentIndicator}
                transition={{ type: 'spring', damping: 36, stiffness: 450 }}
              />
            )}
            <span className={styles.navLabel}>Audio</span>
          </button>

          <button
            className={`${styles.navBtn} ${activeTab === 'stats' ? styles.navBtnActive : ''}`}
            onClick={() => handleTabClick('stats')}
          >
            {activeTab === 'stats' && (
              <motion.div
                layoutId="activeTabIndicator"
                className={styles.segmentIndicator}
                transition={{ type: 'spring', damping: 36, stiffness: 450 }}
              />
            )}
            <span className={styles.navLabel}>Stats</span>
          </button>

          <button
            className={`${styles.navBtn} ${activeTab === 'settings' ? styles.navBtnActive : ''}`}
            onClick={() => handleTabClick('settings')}
          >
            {activeTab === 'settings' && (
              <motion.div
                layoutId="activeTabIndicator"
                className={styles.segmentIndicator}
                transition={{ type: 'spring', damping: 36, stiffness: 450 }}
              />
            )}
            <span className={styles.navLabel}>Settings</span>
          </button>
        </div>

        <div className={styles.navSpacer} />

        <button
          className={styles.collapseBtn}
          onClick={() => {
            if (soundEnabled) playUiClick();
            onCollapse?.();
          }}
          title="Collapse Island"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>

      {/* ── Content View Area ──────────────────────────────── */}
      <div className={styles.viewContent}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className={styles.tabContentWrapper}
          >
            {/* TAB 1: TIMER (Hero Pomodoro) */}
        {activeTab === 'timer' && (
          <div ref={timerMeasurerRef} className={styles.timerTab}>
            {/* Hero Countdown Readout */}
            <div className={styles.heroTimer}>
              {isEditingHeroTime ? (
                <input
                  ref={heroInputRef}
                  type="text"
                  className={styles.heroTimeInput}
                  value={heroTimeInput}
                  onChange={(e) => setHeroTimeInput(e.target.value)}
                  onKeyDown={handleHeroKeyDown}
                  onBlur={handleCommitHeroTime}
                  placeholder="mm:ss"
                  aria-label="Timer duration input"
                />
              ) : (
                <span
                  className={`${styles.heroTime} ${!isRunning ? styles.heroTimeEditable : ''}`}
                  onClick={handleStartEditHeroTime}
                  onKeyDown={(e) => {
                    if (!isRunning && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleStartEditHeroTime();
                    }
                  }}
                  tabIndex={!isRunning ? 0 : undefined}
                  role={!isRunning ? 'button' : undefined}
                  aria-label={!isRunning ? 'Edit timer duration' : 'Timer countdown'}
                  title={!isRunning ? 'Click to edit duration' : undefined}
                >
                  {timeDisplay}
                </span>
              )}
              <div className={styles.phaseSubtitle}>
                <span
                  className={styles.statusDot}
                  style={{
                    background: isOvertime ? '#ff9500' : color,
                    boxShadow: isOvertime ? '0 0 6px rgba(255, 149, 0, 0.6)' : 'none',
                  }}
                />
                <span className={styles.phaseName}>{isOvertime ? 'Flow overtime' : label}</span>
                {!isOvertime && (
                  <span className={styles.sessionCountText}>• Session {(sessionCount % 4) + 1} of 4</span>
                )}
              </div>
              {isOvertime && (
                <button
                  type="button"
                  className={styles.overtimeWrapBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (soundEnabled) playUiClick();
                    onFinishOvertime?.();
                  }}
                  title="Conclude focus session and begin break"
                >
                  Wrap up & start break
                </button>
              )}
            </div>

            {/* Transport Controls */}
            <div className={styles.transportRow}>
              <button
                className={styles.secondaryActionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (soundEnabled) playUiClick();
                  onReset();
                }}
                title="Reset session"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 2v6h6" />
                  <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
                </svg>
              </button>

              <button
                className={styles.primaryPlayBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (soundEnabled) playUiClick();
                  isRunning ? onPause() : onResume();
                }}
                title={isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? (
                  <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
                    <rect x="1" y="1" width="4" height="14" rx="1.5" />
                    <rect x="9" y="1" width="4" height="14" rx="1.5" />
                  </svg>
                ) : (
                  <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" style={{ marginLeft: 2 }}>
                    <path d="M2 1.5l10 6.5-10 6.5V1.5z" />
                  </svg>
                )}
              </button>

              <button
                className={styles.secondaryActionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (soundEnabled) playUiClick();
                  onSkip();
                }}
                title="Skip to next phase"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
                  <line x1="19" y1="5" x2="19" y2="19" strokeWidth="2.5" />
                </svg>
              </button>
            </div>

            {/* Quick Duration Presets */}
            <div className={styles.presetsRow}>
              {[
                { label: '25m', ms: 25 * 60 * 1000, phase: 'FOCUS' },
                { label: '50m', ms: 50 * 60 * 1000, phase: 'FOCUS' },
                { label: '5m', ms: 5 * 60 * 1000, phase: 'SHORT_BREAK' },
                { label: '15m', ms: 15 * 60 * 1000, phase: 'LONG_BREAK' },
              ].map((p) => {
                const isActive = pomodoroState === p.phase && durations[p.phase] === p.ms;
                return (
                  <button
                    key={p.label}
                    className={`${styles.presetChip} ${isActive ? styles.presetChipActive : ''}`}
                    onClick={() => {
                      if (soundEnabled) playUiClick();
                      onSetDuration?.(p.phase, p.ms);
                      if (pomodoroState !== p.phase) {
                        onSetPhase?.(p.phase);
                      }
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Active Task Bar */}
            <div className={styles.taskBar}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.taskIcon}>
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <input
                className={styles.taskInput}
                type="text"
                placeholder="Focus goal..."
                value={activeTask}
                onChange={(e) => onSetActiveTask?.(e.target.value)}
              />
              {activeTask && (
                <button
                  className={styles.taskClearBtn}
                  onClick={() => onSetActiveTask?.('')}
                  title="Clear focus goal"
                >
                  ×
                </button>
              )}
            </div>

            {/* Wellness Prompt during Breaks */}
            {isBreak && wellnessPrompt && (
              <div className={styles.wellnessRow}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.wellnessIcon}>
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
                <span className={styles.wellnessText}>{wellnessPrompt}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TASKS & SCRATCHPAD */}
        {activeTab === 'tasks' && (
          <div className={styles.tasksTab}>
            {/* Focus Goal Section */}
            <div className={styles.sectionBlock}>
              <span className={styles.sectionTitle}>Current focus goal</span>
              <div className={styles.taskBar}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.taskIcon}>
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <input
                  className={styles.taskInput}
                  type="text"
                  placeholder="Set your main objective..."
                  value={activeTask}
                  onChange={(e) => onSetActiveTask?.(e.target.value)}
                />
                {activeTask && (
                  <button
                    className={styles.taskClearBtn}
                    onClick={() => onSetActiveTask?.('')}
                    title="Clear goal"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Scratchpad Section */}
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeaderRow}>
                <span className={styles.sectionTitle}>Scratchpad notes</span>
                {scratchpadNotes.some((n) => n.done) && (
                  <button
                    className={styles.textActionBtn}
                    onClick={() => {
                      if (soundEnabled) playUiClick();
                      onClearCompletedNotes?.();
                    }}
                  >
                    Clear completed
                  </button>
                )}
              </div>

              {/* Add Note Form */}
              <form className={styles.addNoteForm} onSubmit={handleAddNoteSubmit}>
                <input
                  className={styles.noteInput}
                  type="text"
                  placeholder="Quick thought or sub-task..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                />
                <button type="submit" className={styles.noteSubmitBtn}>
                  Add
                </button>
              </form>

              {/* Notes List */}
              <div className={styles.notesList}>
                {scratchpadNotes.length === 0 ? (
                  <div className={styles.emptyState}>No notes yet. Capture quick thoughts here.</div>
                ) : (
                  scratchpadNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`${styles.noteItem} ${note.done ? styles.noteDone : ''}`}
                    >
                      <button
                        className={styles.checkboxBtn}
                        onClick={() => {
                          if (soundEnabled) playUiClick();
                          onToggleNote?.(note.id);
                        }}
                      >
                        <div className={`${styles.checkbox} ${note.done ? styles.checkboxChecked : ''}`}>
                          {note.done && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </button>

                      <span
                        className={styles.noteText}
                        onClick={() => {
                          if (soundEnabled) playUiClick();
                          onToggleNote?.(note.id);
                        }}
                      >
                        {note.text}
                        {stats?.getTaskSessionCount && stats.getTaskSessionCount(note.text) > 0 && (
                          <span
                            className={styles.taskPips}
                            title={`${stats.getTaskSessionCount(note.text)} focus block(s) completed`}
                          >
                            {Array.from({
                              length: Math.min(4, stats.getTaskSessionCount(note.text)),
                            }).map((_, i) => (
                              <span
                                key={i}
                                className={`${styles.taskPipDot} ${styles.taskPipDotActive}`}
                              />
                            ))}
                          </span>
                        )}
                      </span>

                      <button
                        className={styles.noteDeleteBtn}
                        onClick={() => {
                          if (soundEnabled) playUiClick();
                          onRemoveNote?.(note.id);
                        }}
                        title="Delete note"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AMBIENT AUDIO */}
        {activeTab === 'audio' && (
          <div className={styles.audioTab}>
            {/* Live Now Playing Track (Spotify / System Audio) */}
            {Boolean(nowPlaying?.title) && (
              <NowPlayingCard
                nowPlaying={nowPlaying}
                soundEnabled={soundEnabled}
                playUiClick={playUiClick}
              />
            )}

            <div className={styles.flatSection}>
              <div className={styles.sectionHeaderRow}>
                <span className={styles.sectionTitle}>Soundscapes</span>
                {currentSound && (
                  <span className={styles.soundPlayingIndicator}>
                    <span className={styles.soundWaveSmall}>
                      <span />
                      <span />
                      <span />
                    </span>
                    Playing
                  </span>
                )}
              </div>
              <div className={styles.soundSegmentedGroup}>
                <button
                  type="button"
                  className={`${styles.soundChip} ${!currentSound ? styles.soundChipActive : ''}`}
                  onClick={() => handleSoundSelect('none')}
                >
                  Off
                </button>
                {SOUND_LIST.map((sound) => {
                  const isSelected = currentSound === sound.id;
                  return (
                    <button
                      key={sound.id}
                      type="button"
                      className={`${styles.soundChip} ${isSelected ? styles.soundChipActive : ''}`}
                      onClick={() => handleSoundSelect(sound.id)}
                    >
                      {sound.label || sound.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Volume Control - Flat row */}
            <div className={styles.volumeFlatRow}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.volumeIcon}>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <input
                className={styles.volumeSlider}
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={volume}
                onChange={handleVolumeChange}
                aria-label="Soundscape volume"
              />
              <span className={styles.volumeVal}>{Math.round(volume * 100)}%</span>
            </div>
          </div>
        )}

        {/* TAB 4: STATS */}
        {activeTab === 'stats' && stats && (
          <StatsTab stats={stats} color={color} />
        )}

        {/* TAB 5: SETTINGS (Apple Inset Grouped Architecture) */}
        {activeTab === 'settings' && (
          <div className={styles.settingsTab}>
            {/* GROUP 1: TIMER & FLOW */}
            <div className={styles.settingsGroup}>
              <div className={styles.settingsGroupHeader}>
                <span>Timer & flow</span>
              </div>
              <div className={styles.settingsGroupCard}>
                {/* Focus Duration */}
                <div className={styles.settingsRow}>
                  <span className={styles.rowLabel}>Focus duration</span>
                  <div className={styles.rowControl}>
                    <div className={styles.stepperPill}>
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => {
                          if (soundEnabled) playUiClick();
                          onSetDuration?.('FOCUS', Math.max(5 * 60 * 1000, (durations.FOCUS || 25 * 60 * 1000) - 5 * 60 * 1000));
                        }}
                        title="Decrease focus duration by 5m"
                        aria-label="Decrease focus duration"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      {editingStepper === 'FOCUS' ? (
                        <input
                          ref={stepperInputRef}
                          type="text"
                          className={styles.stepperValueInput}
                          value={stepperInputVal}
                          onChange={(e) => setStepperInputVal(e.target.value)}
                          onKeyDown={handleStepperKeyDown}
                          onBlur={handleCommitStepper}
                          aria-label="Focus duration in minutes"
                        />
                      ) : (
                        <span
                          className={`${styles.stepperValue} ${styles.stepperValueEditable}`}
                          onClick={() => {
                            const mins = Math.round((durations.FOCUS || 25 * 60 * 1000) / 60000);
                            handleStartEditStepper('FOCUS', mins);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              const mins = Math.round((durations.FOCUS || 25 * 60 * 1000) / 60000);
                              handleStartEditStepper('FOCUS', mins);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label="Edit focus duration"
                          title="Click to edit focus duration"
                        >
                          {Math.round((durations.FOCUS || 25 * 60 * 1000) / 60000)}m
                        </span>
                      )}
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => {
                          if (soundEnabled) playUiClick();
                          onSetDuration?.('FOCUS', (durations.FOCUS || 25 * 60 * 1000) + 5 * 60 * 1000);
                        }}
                        title="Increase focus duration by 5m"
                        aria-label="Increase focus duration"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Short Break Duration */}
                <div className={styles.settingsRow}>
                  <span className={styles.rowLabel}>Short break</span>
                  <div className={styles.rowControl}>
                    <div className={styles.stepperPill}>
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => {
                          if (soundEnabled) playUiClick();
                          onSetDuration?.('SHORT_BREAK', Math.max(1 * 60 * 1000, (durations.SHORT_BREAK || 5 * 60 * 1000) - 1 * 60 * 1000));
                        }}
                        title="Decrease short break by 1m"
                        aria-label="Decrease short break"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      {editingStepper === 'SHORT_BREAK' ? (
                        <input
                          ref={stepperInputRef}
                          type="text"
                          className={styles.stepperValueInput}
                          value={stepperInputVal}
                          onChange={(e) => setStepperInputVal(e.target.value)}
                          onKeyDown={handleStepperKeyDown}
                          onBlur={handleCommitStepper}
                          aria-label="Short break duration in minutes"
                        />
                      ) : (
                        <span
                          className={`${styles.stepperValue} ${styles.stepperValueEditable}`}
                          onClick={() => {
                            const mins = Math.round((durations.SHORT_BREAK || 5 * 60 * 1000) / 60000);
                            handleStartEditStepper('SHORT_BREAK', mins);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              const mins = Math.round((durations.SHORT_BREAK || 5 * 60 * 1000) / 60000);
                              handleStartEditStepper('SHORT_BREAK', mins);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label="Edit short break duration"
                          title="Click to edit short break duration"
                        >
                          {Math.round((durations.SHORT_BREAK || 5 * 60 * 1000) / 60000)}m
                        </span>
                      )}
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => {
                          if (soundEnabled) playUiClick();
                          onSetDuration?.('SHORT_BREAK', (durations.SHORT_BREAK || 5 * 60 * 1000) + 1 * 60 * 1000);
                        }}
                        title="Increase short break by 1m"
                        aria-label="Increase short break"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Long Break Duration */}
                <div className={styles.settingsRow}>
                  <span className={styles.rowLabel}>Long break</span>
                  <div className={styles.rowControl}>
                    <div className={styles.stepperPill}>
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => {
                          if (soundEnabled) playUiClick();
                          onSetDuration?.('LONG_BREAK', Math.max(5 * 60 * 1000, (durations.LONG_BREAK || 15 * 60 * 1000) - 5 * 60 * 1000));
                        }}
                        title="Decrease long break by 5m"
                        aria-label="Decrease long break"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      {editingStepper === 'LONG_BREAK' ? (
                        <input
                          ref={stepperInputRef}
                          type="text"
                          className={styles.stepperValueInput}
                          value={stepperInputVal}
                          onChange={(e) => setStepperInputVal(e.target.value)}
                          onKeyDown={handleStepperKeyDown}
                          onBlur={handleCommitStepper}
                          aria-label="Long break duration in minutes"
                        />
                      ) : (
                        <span
                          className={`${styles.stepperValue} ${styles.stepperValueEditable}`}
                          onClick={() => {
                            const mins = Math.round((durations.LONG_BREAK || 15 * 60 * 1000) / 60000);
                            handleStartEditStepper('LONG_BREAK', mins);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              const mins = Math.round((durations.LONG_BREAK || 15 * 60 * 1000) / 60000);
                              handleStartEditStepper('LONG_BREAK', mins);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label="Edit long break duration"
                          title="Click to edit long break duration"
                        >
                          {Math.round((durations.LONG_BREAK || 15 * 60 * 1000) / 60000)}m
                        </span>
                      )}
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => {
                          if (soundEnabled) playUiClick();
                          onSetDuration?.('LONG_BREAK', (durations.LONG_BREAK || 15 * 60 * 1000) + 5 * 60 * 1000);
                        }}
                        title="Increase long break by 5m"
                        aria-label="Increase long break"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Auto-start Breaks */}
                <div className={styles.settingsRow}>
                  <span className={styles.rowLabel}>Auto-start breaks</span>
                  <div className={styles.rowControl}>
                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${autoStartBreaks ? styles.toggleOn : ''}`}
                      onClick={() => onSetAutoStartBreaks?.(!autoStartBreaks)}
                      aria-label="Auto-start breaks"
                    >
                      <div className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {/* Auto-start Focus Sessions */}
                <div className={styles.settingsRow}>
                  <span className={styles.rowLabel}>Auto-start focus sessions</span>
                  <div className={styles.rowControl}>
                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${autoStartFocus ? styles.toggleOn : ''}`}
                      onClick={() => onSetAutoStartFocus?.(!autoStartFocus)}
                      aria-label="Auto-start focus sessions"
                    >
                      <div className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* GROUP 2: DISPLAY & NOTCH APPEARANCE */}
            <div className={styles.settingsGroup}>
              <div className={styles.settingsGroupHeader}>
                <span>Display & notch</span>
              </div>
              <div className={styles.settingsGroupCard}>
                {/* Display Monitor (Conditional Multi-Monitor) */}
                {displays.length > 1 && (
                  <div className={styles.settingsRow}>
                    <span className={styles.rowLabel}>Display monitor</span>
                    <div className={styles.rowControl}>
                      <div className={styles.displaySelectWrapper}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.displayIcon}>
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        <select
                          className={styles.displaySelect}
                          onChange={handleDisplayChange}
                          defaultValue={window.electronAPI?.store?.get('selectedDisplayId')}
                        >
                          {displays.map((d, i) => (
                            <option key={d.id} value={d.id}>
                              {d.label || `Display ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Idle Notch Display Mode */}
                <div className={styles.settingsRow}>
                  <span className={styles.rowLabel}>Idle notch display</span>
                  <div className={styles.rowControl}>
                    <div className={styles.segmentedControlSmall}>
                      {[
                        { id: 'both', label: 'Both' },
                        { id: 'time', label: 'Time' },
                        { id: 'bar', label: 'Bar' },
                      ].map((opt) => {
                        const currentMode = notchSettings?.idleDisplayMode ?? 'both';
                        const isActive = currentMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={`${styles.segmentedBtnSmall} ${isActive ? styles.segmentedBtnSmallActive : ''}`}
                            onClick={() => {
                              if (soundEnabled) playUiClick();
                              onUpdateNotchSetting?.('idleDisplayMode', opt.id);
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Accent Theme Gradient Swatch Selector */}
                <div className={`${styles.settingsRow} ${styles.settingsRowTwoLine}`}>
                  <div className={styles.rowLabelGroup}>
                    <span className={styles.rowLabel}>Accent theme</span>
                    <span className={styles.rowSubtitle}>
                      {THEME_PALETTES[accentTheme]?.name ?? 'Classic Periwinkle'}
                    </span>
                  </div>
                  <div className={styles.rowControl}>
                    <div className={styles.themeSwatchRow} role="radiogroup" aria-label="Accent theme">
                      {Object.values(THEME_PALETTES).map((palette) => {
                        const isActive = (accentTheme || 'classic') === palette.id;
                        return (
                          <button
                            key={palette.id}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            aria-label={palette.name}
                            title={palette.name}
                            className={`${styles.themeSwatchBtn} ${isActive ? styles.themeSwatchBtnActive : ''}`}
                            style={{ background: palette.swatchGradient }}
                            onClick={() => {
                              if (soundEnabled) playUiClick();
                              onSetAccentTheme?.(palette.id);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Island Opacity (Unified Segmented Control, Dieter Rams Restraint) */}
                <div className={styles.settingsRow}>
                  <span className={styles.rowLabel}>Island opacity</span>
                  <div className={styles.rowControl}>
                    <div className={styles.segmentedControlSmall}>
                      {[75, 85, 95, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`${styles.segmentedBtnSmall} ${islandOpacity === preset ? styles.segmentedBtnSmallActive : ''}`}
                          onClick={() => handleOpacityChange(preset)}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Bezel Offset */}
                <div className={styles.settingsRow}>
                  <span className={styles.rowLabel}>Top bezel offset</span>
                  <div className={styles.rowControl}>
                    <div className={styles.stepperPill}>
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => handleTopMarginChange(-2)}
                        title="Decrease top margin"
                        aria-label="Decrease top margin"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      <span className={styles.stepperValue}>{topMargin}px</span>
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => handleTopMarginChange(2)}
                        title="Increase top margin"
                        aria-label="Increase top margin"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Horizontal Position & Polite Snap to Center */}
                <div className={`${styles.settingsRow} ${styles.settingsRowTwoLine}`}>
                  <div className={styles.rowLabelGroup}>
                    <span className={styles.rowLabel}>Horizontal position</span>
                    <span className={styles.rowSubtitle}>
                      {Math.round(horizontalOffset) === 0
                        ? 'Centered along monitor bezel'
                        : `${Math.abs(Math.round(horizontalOffset))}px ${horizontalOffset > 0 ? 'offset to right' : 'offset to left'}`}
                    </span>
                  </div>
                  <div className={styles.rowControl}>
                    <button
                      type="button"
                      className={styles.resetActionBtn}
                      onClick={() => {
                        if (soundEnabled) playUiClick();
                        onResetPosition?.();
                      }}
                      disabled={Math.round(horizontalOffset) === 0}
                      title="Snap island back to center"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      Center
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* GROUP 3: SYSTEM & CAPTURE PRIVACY */}
            <div className={styles.settingsGroup}>
              <div className={styles.settingsGroupHeader}>
                <span>System & privacy</span>
                <div className={styles.segmentedControlSmall}>
                  {[
                    { id: 'both', label: 'Both', active: includeInRecordings && includeInScreenshots },
                    { id: 'recordings', label: 'Rec', active: includeInRecordings && !includeInScreenshots },
                    { id: 'screenshots', label: 'Shot', active: !includeInRecordings && includeInScreenshots },
                    { id: 'none', label: 'None', active: !includeInRecordings && !includeInScreenshots },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`${styles.segmentedBtnSmall} ${preset.active ? styles.segmentedBtnSmallActive : ''}`}
                      onClick={() => handleCapturePreset(preset.id)}
                      title={`Quick preset: ${preset.label}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.settingsGroupCard}>
                {/* Launch on Startup */}
                <div className={styles.settingsRow}>
                  <span className={styles.rowLabel}>Launch on Windows startup</span>
                  <div className={styles.rowControl}>
                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${openAtLogin ? styles.toggleOn : ''}`}
                      onClick={handleStartupToggle}
                      aria-label="Launch on Windows startup"
                    >
                      <div className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {/* UI Click Sounds */}
                <div className={styles.settingsRow}>
                  <span className={styles.rowLabel}>UI click sounds</span>
                  <div className={styles.rowControl}>
                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${soundEnabled ? styles.toggleOn : ''}`}
                      onClick={handleSoundToggle}
                      aria-label="UI click sounds"
                    >
                      <div className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {/* Include in Screen Recordings */}
                <div className={`${styles.settingsRow} ${styles.settingsRowTwoLine}`}>
                  <div className={styles.rowLabelGroup}>
                    <span className={styles.rowLabel}>Include in screen recordings</span>
                    <span className={styles.rowSubtitle}>
                      OBS, Discord, Zoom, Teams & Loom streams
                    </span>
                  </div>
                  <div className={styles.rowControl}>
                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${includeInRecordings ? styles.toggleOn : ''}`}
                      onClick={handleToggleRecordings}
                      aria-label="Include in screen recordings"
                    >
                      <div className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {/* Include in Screenshots */}
                <div className={`${styles.settingsRow} ${styles.settingsRowTwoLine}`}>
                  <div className={styles.rowLabelGroup}>
                    <span className={styles.rowLabel}>Include in screenshots</span>
                    <span className={styles.rowSubtitle}>
                      Snipping Tool, Win+Shift+S & PrintScreen
                    </span>
                  </div>
                  <div className={styles.rowControl}>
                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${includeInScreenshots ? styles.toggleOn : ''}`}
                      onClick={handleToggleScreenshots}
                      aria-label="Include in screenshots"
                    >
                      <div className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {/* Welcome Onboarding Tour Replay */}
                <div className={`${styles.settingsRow} ${styles.settingsRowTwoLine}`}>
                  <div className={styles.rowLabelGroup}>
                    <span className={styles.rowLabel}>Welcome introduction</span>
                    <span className={styles.rowSubtitle}>
                      Review gestures, glances, and shortcuts
                    </span>
                  </div>
                  <div className={styles.rowControl}>
                    <button
                      type="button"
                      className={styles.resetActionBtn}
                      onClick={() => {
                        if (soundEnabled) playUiClick();
                        onReplayOnboarding?.();
                      }}
                      title="Replay onboarding tour"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      Replay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
