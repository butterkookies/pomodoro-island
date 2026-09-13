import { useEffect, useState, useCallback, useRef } from 'react';
import Island from './components/Island';
import { useTimer } from './hooks/useTimer';
import { usePomodoro } from './hooks/usePomodoro';
import { useIslandState } from './hooks/useIslandState';
import { useCustomTimers } from './hooks/useCustomTimers';
import { useReminders } from './hooks/useReminders';
import { useTasks } from './hooks/useTasks';
import { useStats } from './hooks/useStats';
import { useNotchSettings } from './hooks/useNotchSettings';
import { useNowPlaying } from './hooks/useNowPlaying';
import { playReminder, getWellnessPrompt } from './utils/soundManager';
import { getCurrentSound, play as ambientPlay, stop as ambientStop } from './utils/ambientPlayer';
import { notifyPhaseComplete, notifyReminder } from './utils/notificationManager';
import { extractDominantColor, DEFAULT_RGB } from './utils/colorExtractor';
import DevFeedbackOverlay from './components/DevFeedback/DevFeedbackOverlay';
import styles from './App.module.css';

// Set to true to re-enable in-app visual pin drops & dev comments overlay
const ENABLE_DEV_FEEDBACK = false;

export default function App() {
  const pomodoro = usePomodoro();
  const tasks = useTasks();
  const stats = useStats();
  const notch = useNotchSettings();
  const nowPlaying = useNowPlaying();
  const [wellnessPrompt, setWellnessPrompt] = useState(() => getWellnessPrompt());
  const [isFeedbackActive, setIsFeedbackActive] = useState(false);

  const handlePhaseComplete = useCallback((recordedDuration) => {
    notifyPhaseComplete(pomodoro.state);
    if (pomodoro.state === 'FOCUS') {
      stats.recordSession(recordedDuration || pomodoro.config.duration, tasks.activeTask);
    }
    pomodoro.next();
  }, [pomodoro.state, pomodoro.config.duration, pomodoro.next, stats, tasks.activeTask]);

  const [isOnboarding, setIsOnboarding] = useState(() => {
    const hasCompleted = window.electronAPI?.store?.get('hasCompletedOnboarding', false);
    return !hasCompleted;
  });

  const timer = useTimer(handlePhaseComplete);
  const island = useIslandState({ preventIdle: isFeedbackActive, isOnboarding });
  const { timers: customTimers, addTimer, removeTimer } = useCustomTimers();

  const handleCompleteOnboarding = useCallback((startTimer = false) => {
    window.electronAPI?.store?.set('hasCompletedOnboarding', true);
    setIsOnboarding(false);
    if (startTimer) {
      timer.start(pomodoro.config.duration, true);
      island.setState('compact');
    } else {
      island.setState('expanded');
    }
  }, [timer, pomodoro.config.duration, island]);

  const handleStartFirstSession = useCallback(() => {
    handleCompleteOnboarding(true);
  }, [handleCompleteOnboarding]);

  const handleSkipOnboarding = useCallback(() => {
    handleCompleteOnboarding(false);
  }, [handleCompleteOnboarding]);

  const handleReplayOnboarding = useCallback(() => {
    setIsOnboarding(true);
    island.setState('expanded');
  }, [island]);

  // Which tab is active in ExpandedView: 'timer' | 'stats' | 'music' | 'settings'
  const [activeTab, setActiveTab] = useState('timer');

  // Which form panel is open in ExpandedView: null | 'timer' | 'reminder'
  const [formMode, setFormMode] = useState(null);

  // The currently-firing reminder (shows ReminderBanner overlay)
  const [activeReminder, setActiveReminder] = useState(null);

  // Restore user's saved island opacity on launch
  useEffect(() => {
    const savedOpacity = window.electronAPI?.store?.get('islandOpacity') ?? 95;
    document.documentElement.style.setProperty('--island-opacity', (savedOpacity / 100).toString());
  }, []);

  // Refresh wellness prompt on entering a break phase
  useEffect(() => {
    if (pomodoro.state === 'SHORT_BREAK' || pomodoro.state === 'LONG_BREAK') {
      setWellnessPrompt(getWellnessPrompt());
    }
  }, [pomodoro.state]);

  // ── Reminder callbacks ───────────────────────────────────
  const handleReminderFire = useCallback((reminder) => {
    playReminder();
    notifyReminder(reminder.name);
    setActiveReminder(reminder);
    island.setState('expanded');        // force island open
    setFormMode(null);                  // close any open form
  }, [island]);

  const { reminders, addReminder, removeReminder: removeReminderById, dismissReminder }
    = useReminders(handleReminderFire);

  const remindersRef = useRef(reminders);
  useEffect(() => { remindersRef.current = reminders; }, [reminders]);

  // User clicks "Start Now" or countdown expires
  const handleReminderStart = useCallback((reminder) => {
    addTimer(reminder.name, reminder.durationMs / 60000);
    setActiveReminder(null);
    if (!reminder.daily) dismissReminder(reminder.id);
  }, [addTimer, dismissReminder]);

  // User clicks "Dismiss"
  const handleReminderDismiss = useCallback((id) => {
    setActiveReminder(null);
    if (!remindersRef.current.find(r => r.id === id)?.daily) dismissReminder(id);
  }, [dismissReminder]);

  // Earliest pending reminder (used for compact badge)
  const nextReminder = (Array.isArray(reminders) ? reminders : [])
    .filter(r => r.status === 'pending' && r.fireAt > Date.now())
    .sort((a, b) => a.fireAt - b.fireAt)[0] ?? null;

  // ── Pomodoro Auto-start & Phase transitions ──────────────
  const isInitialMount = useRef(true);
  const isRunningRef = useRef(timer.isRunning);
  useEffect(() => {
    isRunningRef.current = timer.isRunning;
  }, [timer.isRunning]);

  useEffect(() => {
    const isBreak = pomodoro.state === 'SHORT_BREAK' || pomodoro.state === 'LONG_BREAK';
    const isFocus = pomodoro.state === 'FOCUS';

    if (isInitialMount.current) {
      isInitialMount.current = false;
      const shouldAuto = isBreak ? pomodoro.autoStartBreaks : pomodoro.autoStartFocus;
      if (shouldAuto) {
        timer.start(pomodoro.config.duration, isFocus);
      } else {
        timer.set(pomodoro.config.duration, isFocus);
      }
      return;
    }

    const shouldAutoStart = isBreak ? pomodoro.autoStartBreaks : pomodoro.autoStartFocus;
    const wasRunning = isRunningRef.current;

    if (shouldAutoStart || wasRunning) {
      timer.start(pomodoro.config.duration, isFocus);
    } else {
      timer.set(pomodoro.config.duration, isFocus);
    }
  }, [pomodoro.state, pomodoro.config.duration, pomodoro.autoStartBreaks, pomodoro.autoStartFocus]);

  // ── Global media hotkey: toggle focus sound ───────────────
  useEffect(() => {
    const unsub = window.electronAPI?.onMediaToggle(() => {
      if (getCurrentSound()) {
        ambientStop();
      } else {
        ambientPlay('rain');
      }
    });
    return () => {
      window.electronAPI?.removeAllListeners?.('media-toggle');
    };
  }, []);

  // ── Sync live status to System Tray ───────────────────────
  useEffect(() => {
    const taskSuffix = tasks.activeTask?.trim() ? ` • ${tasks.activeTask.trim()}` : '';
    window.electronAPI?.updateStatus?.({
      text: `${pomodoro.config.label}${taskSuffix}`,
      time: timer.timeDisplay,
    });
  }, [pomodoro.config.label, timer.timeDisplay, tasks.activeTask]);

  // ── Media artwork dominant color extraction ────────────────
  useEffect(() => {
    let isMounted = true;

    if (nowPlaying?.isPlaying && nowPlaying?.artwork) {
      extractDominantColor(nowPlaying.artwork).then((rgb) => {
        if (isMounted) {
          document.documentElement.style.setProperty('--media-dominant-rgb', rgb);
        }
      });
    } else {
      document.documentElement.style.setProperty('--media-dominant-rgb', DEFAULT_RGB);
    }

    return () => {
      isMounted = false;
      document.documentElement.style.setProperty('--media-dominant-rgb', DEFAULT_RGB);
    };
  }, [nowPlaying?.artwork, nowPlaying?.isPlaying]);

  return (
    <div className={styles.app}>
      <Island
        islandRef={island.islandRef}
        islandState={island.state}
        reportBounds={island.reportBounds}
        onMouseEnter={island.handleMouseEnter}
        onMouseLeave={island.handleMouseLeave}
        onClick={island.handleClick}
        timeDisplay={timer.timeDisplay}
        percent={timer.percent}
        isRunning={timer.isRunning}
        isOvertime={timer.isOvertime}
        onFinishOvertime={timer.finishOvertime}
        pomodoroState={pomodoro.state}
        color={pomodoro.config.color}
        label={pomodoro.config.label}
        sessionCount={pomodoro.sessionCount}
        onPause={timer.pause}
        onResume={timer.resume}
        onSkip={() => {
          if (timer.isOvertime) {
            timer.finishOvertime();
            return;
          }
          timer.reset();
          if (pomodoro.state === 'FOCUS') {
            stats.recordSession(pomodoro.config.duration, tasks.activeTask);
          }
          pomodoro.next();
        }}
        onReset={() => timer.start(pomodoro.config.duration)}
        customTimers={customTimers}
        onAddCustomTimer={addTimer}
        onRemoveCustomTimer={removeTimer}
        onAddReminder={addReminder}
        durations={pomodoro.durations}
        onSetDuration={pomodoro.setDuration}
        onSetPhase={pomodoro.setPhase}
        autoStartBreaks={pomodoro.autoStartBreaks}
        onSetAutoStartBreaks={pomodoro.setAutoStartBreaks}
        autoStartFocus={pomodoro.autoStartFocus}
        onSetAutoStartFocus={pomodoro.setAutoStartFocus}
        activeReminder={activeReminder}
        onReminderStart={handleReminderStart}
        onReminderDismiss={handleReminderDismiss}
        nextReminder={nextReminder}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        formMode={formMode}
        onFormMode={setFormMode}
        onCollapse={() => island.setState('compact')}
        // Task & Scratchpad props
        activeTask={tasks.activeTask}
        onSetActiveTask={tasks.setActiveTask}
        scratchpadNotes={tasks.scratchpadNotes}
        onAddNote={tasks.addNote}
        onToggleNote={tasks.toggleNote}
        onRemoveNote={tasks.removeNote}
        onClearCompletedNotes={tasks.clearCompletedNotes}
        // Stats props
        stats={stats}
        // Now playing music
        nowPlaying={nowPlaying}
        // Wellness prompt
        wellnessPrompt={wellnessPrompt}
        // Notch settings props
        notchSettings={notch.settings}
        onUpdateNotchSetting={notch.updateSetting}
        onResetNotchSettings={notch.resetToDefaults}
        // Onboarding
        isOnboarding={isOnboarding}
        onCompleteOnboarding={() => handleCompleteOnboarding(false)}
        onStartFirstSession={handleStartFirstSession}
        onSkipOnboarding={handleSkipOnboarding}
        onReplayOnboarding={handleReplayOnboarding}
      />
      {ENABLE_DEV_FEEDBACK && (
        <DevFeedbackOverlay
          islandRef={island.islandRef}
          islandState={island.state}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          setIslandState={island.setState}
          onActiveChange={setIsFeedbackActive}
        />
      )}
    </div>
  );
}
