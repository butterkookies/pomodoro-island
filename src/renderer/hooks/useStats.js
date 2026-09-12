import { useState, useCallback, useEffect, useMemo } from 'react';

function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * useStats — tracks completed Pomodoro focus sessions, daily streaks, and weekly activity.
 */
export function useStats() {
  const [sessions, setSessionsState] = useState(() => {
    const stored = window.electronAPI?.store?.get('pomodoroStats');
    return Array.isArray(stored) ? stored : [];
  });

  useEffect(() => {
    window.electronAPI?.store?.set('pomodoroStats', sessions);
  }, [sessions]);

  // Record a completed focus block
  const recordSession = useCallback((durationMs, taskName = '') => {
    const mins = Math.max(1, Math.round(durationMs / 60000));
    const newSession = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      date: getTodayString(),
      minutes: mins,
      task: taskName?.trim() || null,
    };
    setSessionsState((prev) => [newSession, ...prev]);
  }, []);

  const todayStr = getTodayString();

  // Today metrics
  const todaySessions = useMemo(() => {
    return sessions.filter((s) => s.date === todayStr);
  }, [sessions, todayStr]);

  const todayMinutes = useMemo(() => {
    return todaySessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
  }, [todaySessions]);

  const todayCount = todaySessions.length;

  // Streak calculation: consecutive days with >= 1 session
  const streak = useMemo(() => {
    if (sessions.length === 0) return 0;
    const uniqueDates = Array.from(new Set(sessions.map((s) => s.date))).sort().reverse();
    if (uniqueDates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let checkDate = new Date(today);

    // If no session today yet, check if there was one yesterday to keep streak alive
    const hasToday = uniqueDates.includes(getTodayString());
    if (!hasToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (uniqueDates.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return currentStreak;
  }, [sessions]);

  // Last 7 days distribution
  const weeklyData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayMins = sessions
        .filter((s) => s.date === dateStr)
        .reduce((acc, s) => acc + (s.minutes || 0), 0);

      result.push({
        label: dayNames[d.getDay()],
        date: dateStr,
        minutes: dayMins,
        isToday: i === 0,
      });
    }

    return result;
  }, [sessions]);

  // Helper to count completed sessions for a specific task
  const getTaskSessionCount = useCallback((taskTitle) => {
    if (!taskTitle) return 0;
    return sessions.filter((s) => s.task && s.task.toLowerCase() === taskTitle.toLowerCase()).length;
  }, [sessions]);

  return {
    sessions,
    recordSession,
    getTaskSessionCount,
    todayMinutes,
    todayCount,
    streak,
    weeklyData,
  };
}
