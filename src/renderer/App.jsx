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
import { playReminder, getWellnessPrompt } from './utils/soundManager';
import { getCurrentSound, play as ambientPlay, stop as ambientStop } from './utils/ambientPlayer';
import { notifyPhaseComplete, notifyReminder } from './utils/notificationManager';
import styles from './App.module.css';

export default function App() {
  const pomodoro = usePomodoro();
  const tasks = useTasks();
  const stats = useStats();
  const notch = useNotchSettings();
  const [wellnessPrompt, setWellnessPrompt] = useState(() => getWellnessPrompt());

  const handlePhaseComplete = useCallback(() => {
    notifyPhaseComplete(pomodoro.state);
    if (pomodoro.state === 'FOCUS') {
      stats.recordSession(pomodoro.config.duration);
    }
    pomodoro.next();
  }, [pomodoro.state, pomodoro.config.duration, pomodoro.next, stats]);

  const timer = useTimer(handlePhaseComplete);
  const island = useIslandState();
  const { timers: customTimers, addTimer, removeTimer } = useCustomTimers();

  // Which tab is active in ExpandedView: 'timer' | 'stats' | 'music' | 'settings'
  const [activeTab, setActiveTab] = useState('timer');

  // Which form panel is open in ExpandedView: null | 'timer' | 'reminder'
  const [formMode, setFormMode] = useState(null);

  // The currently-firing reminder (shows ReminderBanner overlay)
  const [activeReminder, setActiveReminder] = useState(null);

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

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      timer.start(pomodoro.config.duration);
      return;
    }

    const isBreak = pomodoro.state === 'SHORT_BREAK' || pomodoro.state === 'LONG_BREAK';
    const shouldAutoStart = isBreak ? pomodoro.autoStartBreaks : pomodoro.autoStartFocus;

    if (shouldAutoStart) {
      timer.start(pomodoro.config.duration);
    } else {
      timer.set(pomodoro.config.duration);
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
    const taskSuffix = tasks.activeTask ? ` • ${tasks.activeTask}` : '';
    window.electronAPI?.updateStatus?.({
      text: `${pomodoro.config.label}${taskSuffix}`,
      time: timer.timeDisplay,
    });
  }, [pomodoro.config.label, timer.timeDisplay, tasks.activeTask]);

  return (
    <div className={styles.app}>
      <Island
        islandRef={island.islandRef}
        islandState={island.state}
        onMouseEnter={island.handleMouseEnter}
        onMouseLeave={island.handleMouseLeave}
        onClick={island.handleClick}
        timeDisplay={timer.timeDisplay}
        percent={timer.percent}
        isRunning={timer.isRunning}
        pomodoroState={pomodoro.state}
        color={pomodoro.config.color}
        label={pomodoro.config.label}
        sessionCount={pomodoro.sessionCount}
        onPause={timer.pause}
        onResume={timer.resume}
        onSkip={() => {
          timer.reset();
          if (pomodoro.state === 'FOCUS') {
            stats.recordSession(pomodoro.config.duration);
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
        // Wellness prompt
        wellnessPrompt={wellnessPrompt}
        // Notch settings props
        notchSettings={notch.settings}
        onUpdateNotchSetting={notch.updateSetting}
        onResetNotchSettings={notch.resetToDefaults}
      />
    </div>
  );
}
