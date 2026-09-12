import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatsTab from './StatsTab';
import styles from './ExpandedView.module.css';
import {
  SOUND_LIST,
  play as ambientPlay,
  stop as ambientStop,
  setVolume as ambientSetVolume,
  getCurrentSound,
  getVolume,
} from '../utils/ambientPlayer';
import { playUiClick } from '../utils/soundManager';

export default function ExpandedView({
  timeDisplay,
  percent,
  isRunning,
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
  // Wellness
  wellnessPrompt,
  // Custom timers
  customTimers = [],
  onAddCustomTimer,
  onRemoveCustomTimer,
}) {
  const [newNoteText, setNewNoteText] = useState('');
  const [customTimerName, setCustomTimerName] = useState('');
  const [customTimerMins, setCustomTimerMins] = useState('');

  // Audio state
  const [currentSound, setCurrentSound] = useState(() => getCurrentSound());
  const [volume, setVolumeState] = useState(() => getVolume());

  // Settings: Displays & UI sounds
  const [displays, setDisplays] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return window.electronAPI?.store?.get('soundEffectsEnabled') ?? true;
  });

  useEffect(() => {
    window.electronAPI?.getDisplays?.().then((res) => {
      if (Array.isArray(res)) setDisplays(res);
    });
  }, []);

  function handleTabClick(tab) {
    if (soundEnabled) playUiClick();
    onTabChange?.(tab);
  }

  function handleSoundSelect(soundId) {
    if (soundEnabled) playUiClick();
    if (soundId === currentSound) {
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
        {/* TAB 1: TIMER (Hero Pomodoro) */}
        {activeTab === 'timer' && (
          <div className={styles.timerTab}>
            {/* Hero Countdown Readout */}
            <div className={styles.heroTimer}>
              <span className={styles.heroTime}>{timeDisplay}</span>
              <div className={styles.phaseSubtitle}>
                <span className={styles.statusDot} style={{ background: color }} />
                <span className={styles.phaseName}>{label}</span>
                <span className={styles.sessionCountText}>• Session {(sessionCount % 4) + 1} of 4</span>
              </div>
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
                const isActive = durations[p.phase] === p.ms;
                return (
                  <button
                    key={p.label}
                    className={`${styles.presetChip} ${isActive ? styles.presetChipActive : ''}`}
                    onClick={() => {
                      if (soundEnabled) playUiClick();
                      onSetDuration?.(p.phase, p.ms);
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
            <span className={styles.sectionTitle}>Soundscapes</span>
            <div className={styles.soundGrid}>
              {SOUND_LIST.map((sound) => {
                const isSelected = currentSound === sound.id;
                return (
                  <button
                    key={sound.id}
                    className={`${styles.soundCard} ${isSelected ? styles.soundCardActive : ''}`}
                    onClick={() => handleSoundSelect(sound.id)}
                  >
                    <div className={styles.soundCardHeader}>
                      <span className={styles.soundName}>{sound.name}</span>
                      {isSelected && (
                        <div className={styles.soundPlayingWave}>
                          <span />
                          <span />
                          <span />
                        </div>
                      )}
                    </div>
                    <span className={styles.soundDesc}>{sound.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Volume Control */}
            <div className={styles.volumeRow}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              />
              <span className={styles.volumeVal}>{Math.round(volume * 100)}%</span>
            </div>
          </div>
        )}

        {/* TAB 4: STATS */}
        {activeTab === 'stats' && stats && (
          <StatsTab stats={stats} color={color} />
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className={styles.settingsTab}>
            {/* Phase Durations */}
            <div className={styles.settingsSection}>
              <span className={styles.sectionTitle}>Phase durations</span>
              <div className={styles.durationSettingsRow}>
                <div className={styles.durationItem}>
                  <span className={styles.durationLabel}>Focus</span>
                  <div className={styles.stepperPill}>
                    <button
                      onClick={() => onSetDuration?.('FOCUS', Math.max(5 * 60 * 1000, (durations.FOCUS || 25 * 60 * 1000) - 5 * 60 * 1000))}
                    >
                      -
                    </button>
                    <span>{Math.round((durations.FOCUS || 25 * 60 * 1000) / 60000)}m</span>
                    <button
                      onClick={() => onSetDuration?.('FOCUS', (durations.FOCUS || 25 * 60 * 1000) + 5 * 60 * 1000)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className={styles.durationItem}>
                  <span className={styles.durationLabel}>Short break</span>
                  <div className={styles.stepperPill}>
                    <button
                      onClick={() => onSetDuration?.('SHORT_BREAK', Math.max(1 * 60 * 1000, (durations.SHORT_BREAK || 5 * 60 * 1000) - 1 * 60 * 1000))}
                    >
                      -
                    </button>
                    <span>{Math.round((durations.SHORT_BREAK || 5 * 60 * 1000) / 60000)}m</span>
                    <button
                      onClick={() => onSetDuration?.('SHORT_BREAK', (durations.SHORT_BREAK || 5 * 60 * 1000) + 1 * 60 * 1000)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className={styles.durationItem}>
                  <span className={styles.durationLabel}>Long break</span>
                  <div className={styles.stepperPill}>
                    <button
                      onClick={() => onSetDuration?.('LONG_BREAK', Math.max(5 * 60 * 1000, (durations.LONG_BREAK || 15 * 60 * 1000) - 5 * 60 * 1000))}
                    >
                      -
                    </button>
                    <span>{Math.round((durations.LONG_BREAK || 15 * 60 * 1000) / 60000)}m</span>
                    <button
                      onClick={() => onSetDuration?.('LONG_BREAK', (durations.LONG_BREAK || 15 * 60 * 1000) + 5 * 60 * 1000)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Automation Toggles */}
            <div className={styles.settingsSection}>
              <span className={styles.sectionTitle}>Automation & audio</span>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Auto-start breaks</span>
                <button
                  className={`${styles.toggleSwitch} ${autoStartBreaks ? styles.toggleOn : ''}`}
                  onClick={() => onSetAutoStartBreaks?.(!autoStartBreaks)}
                >
                  <div className={styles.toggleThumb} />
                </button>
              </div>

              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Auto-start focus sessions</span>
                <button
                  className={`${styles.toggleSwitch} ${autoStartFocus ? styles.toggleOn : ''}`}
                  onClick={() => onSetAutoStartFocus?.(!autoStartFocus)}
                >
                  <div className={styles.toggleThumb} />
                </button>
              </div>

              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>UI click sounds</span>
                <button
                  className={`${styles.toggleSwitch} ${soundEnabled ? styles.toggleOn : ''}`}
                  onClick={handleSoundToggle}
                >
                  <div className={styles.toggleThumb} />
                </button>
              </div>
            </div>

            {/* Display Target */}
            {displays.length > 1 && (
              <div className={styles.settingsSection}>
                <span className={styles.sectionTitle}>Display monitor</span>
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
