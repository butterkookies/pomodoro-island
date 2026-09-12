import { useState, useCallback, useEffect } from 'react';
import { DURATIONS, COLORS } from '../../shared/constants';

const SESSIONS_BEFORE_LONG_BREAK = 4;

function getConfig(state, durations) {
  switch (state) {
    case 'SHORT_BREAK': return { duration: durations.SHORT_BREAK, color: COLORS.SHORT_BREAK, label: 'Short Break' };
    case 'LONG_BREAK': return { duration: durations.LONG_BREAK, color: COLORS.LONG_BREAK, label: 'Long Break' };
    default: return { duration: durations.FOCUS, color: COLORS.FOCUS, label: 'Focus' };
  }
}

export function usePomodoro() {
  const [state, setState] = useState('FOCUS');
  const [sessionCount, setSessionCount] = useState(
    () => window.electronAPI?.store?.get('sessionCount') ?? 0
  );
  const [durations, setDurationsState] = useState(() => {
    const stored = window.electronAPI?.store?.get('durations');
    if (stored && typeof stored.FOCUS === 'number' && typeof stored.SHORT_BREAK === 'number' && typeof stored.LONG_BREAK === 'number') {
      // Validate stored values - reset if corrupted by the 120m clamping bug
      const isCorrupted = stored.SHORT_BREAK >= 7200000 || stored.SHORT_BREAK > 30 * 60 * 1000 || stored.LONG_BREAK > 60 * 60 * 1000;
      if (!isCorrupted) {
        return stored;
      }
    }
    return {
      FOCUS: DURATIONS.FOCUS,
      SHORT_BREAK: DURATIONS.SHORT_BREAK,
      LONG_BREAK: DURATIONS.LONG_BREAK,
    };
  });

  const [autoStartBreaks, setAutoStartBreaks] = useState(
    () => window.electronAPI?.store?.get('autoStartBreaks') ?? false
  );
  const [autoStartFocus, setAutoStartFocus] = useState(
    () => window.electronAPI?.store?.get('autoStartFocus') ?? false
  );

  useEffect(() => {
    window.electronAPI?.store?.set('sessionCount', sessionCount);
  }, [sessionCount]);

  useEffect(() => {
    window.electronAPI?.store?.set('durations', durations);
  }, [durations]);

  useEffect(() => {
    window.electronAPI?.store?.set('autoStartBreaks', autoStartBreaks);
  }, [autoStartBreaks]);

  useEffect(() => {
    window.electronAPI?.store?.set('autoStartFocus', autoStartFocus);
  }, [autoStartFocus]);

  const next = useCallback(() => {
    if (state === 'FOCUS') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      setState(newCount % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'LONG_BREAK' : 'SHORT_BREAK');
    } else {
      setState('FOCUS');
    }
  }, [state, sessionCount]);

  const reset = useCallback(() => {
    setState('FOCUS');
    setSessionCount(0);
  }, []);

  const setPhase = useCallback((newPhase) => {
    if (newPhase === 'FOCUS' || newPhase === 'SHORT_BREAK' || newPhase === 'LONG_BREAK') {
      setState(newPhase);
    }
  }, []);

  const setDuration = useCallback((key, value) => {
    // If value >= 1000, treat as milliseconds; otherwise treat as minutes
    const ms = value >= 1000 ? value : value * 60 * 1000;
    const clampedMs = Math.max(60 * 1000, Math.min(120 * 60 * 1000, ms));
    setDurationsState(prev => ({ ...prev, [key]: clampedMs }));
  }, []);

  return {
    state,
    sessionCount,
    config: getConfig(state, durations),
    durations,
    setDuration,
    setPhase,
    next,
    reset,
    autoStartBreaks,
    setAutoStartBreaks,
    autoStartFocus,
    setAutoStartFocus,
  };
}
