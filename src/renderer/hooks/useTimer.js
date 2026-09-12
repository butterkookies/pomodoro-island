import { useState, useEffect, useRef, useCallback } from 'react';
import { playPhaseComplete } from '../utils/soundManager';

export function useTimer(onComplete) {
  const [remaining, setRemaining] = useState(0);
  const [percent, setPercent] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const [overtimeMs, setOvertimeMs] = useState(0);

  const workerRef = useRef(null);
  const remainingRef = useRef(0);
  const isRunningRef = useRef(false);
  const durationRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const allowOvertimeRef = useRef(true);
  const overtimeTimerRef = useRef(null);
  const overtimeMsRef = useRef(0);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finishOvertime = useCallback(() => {
    if (overtimeTimerRef.current) clearInterval(overtimeTimerRef.current);
    const totalDuration = durationRef.current + overtimeMsRef.current;
    setIsOvertime(false);
    setOvertimeMs(0);
    overtimeMsRef.current = 0;
    setIsRunning(false);
    isRunningRef.current = false;
    setPercent(1);
    workerRef.current?.postMessage({ type: 'RESET' });
    onCompleteRef.current?.(totalDuration);
  }, []);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/timerWorker.js', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = ({ data }) => {
      if (data.type === 'TICK') {
        setRemaining(data.remaining);
        setPercent(data.percent);
        remainingRef.current = data.remaining;
      }
      if (data.type === 'COMPLETE') {
        if (allowOvertimeRef.current) {
          // Enter calm Flow Overtime mode
          setIsRunning(true);
          isRunningRef.current = true;
          setIsOvertime(true);
          setOvertimeMs(0);
          overtimeMsRef.current = 0;
          setPercent(0);
          playPhaseComplete();

          if (overtimeTimerRef.current) clearInterval(overtimeTimerRef.current);
          overtimeTimerRef.current = setInterval(() => {
            overtimeMsRef.current += 1000;
            setOvertimeMs(overtimeMsRef.current);
          }, 1000);
        } else {
          setIsRunning(false);
          isRunningRef.current = false;
          playPhaseComplete();
          onCompleteRef.current?.(durationRef.current);
        }
      }
    };

    // Hotkey: toggle pause/resume
    window.electronAPI?.onTogglePause(() => {
      if (isRunningRef.current) {
        worker.postMessage({ type: 'PAUSE' });
        setIsRunning(false);
        isRunningRef.current = false;
      } else if (remainingRef.current > 0) {
        worker.postMessage({ type: 'RESUME', remaining: remainingRef.current });
        setIsRunning(true);
        isRunningRef.current = true;
      }
    });

    // Hotkey: skip current phase
    window.electronAPI?.onSkipPhase(() => {
      if (overtimeTimerRef.current) clearInterval(overtimeTimerRef.current);
      worker.postMessage({ type: 'RESET' });
      setIsRunning(false);
      isRunningRef.current = false;
      setIsOvertime(false);
      setOvertimeMs(0);
      overtimeMsRef.current = 0;
      setPercent(1);
      setRemaining(0);
      remainingRef.current = 0;
      onCompleteRef.current?.(durationRef.current);
    });

    return () => {
      worker.terminate();
      if (overtimeTimerRef.current) clearInterval(overtimeTimerRef.current);
      window.electronAPI?.removeAllListeners('toggle-pause');
      window.electronAPI?.removeAllListeners('skip-phase');
    };
  }, []);

  const start = useCallback((duration, enableOvertime = true) => {
    if (overtimeTimerRef.current) clearInterval(overtimeTimerRef.current);
    setIsOvertime(false);
    setOvertimeMs(0);
    overtimeMsRef.current = 0;
    allowOvertimeRef.current = enableOvertime;
    durationRef.current = duration;
    remainingRef.current = duration;
    setRemaining(duration);
    setPercent(1);
    setIsRunning(true);
    isRunningRef.current = true;
    workerRef.current?.postMessage({ type: 'START', duration });
  }, []);

  const pause = useCallback(() => {
    if (isOvertime) return;
    workerRef.current?.postMessage({ type: 'PAUSE' });
    setIsRunning(false);
    isRunningRef.current = false;
  }, [isOvertime]);

  const resume = useCallback(() => {
    if (isOvertime) return;
    workerRef.current?.postMessage({ type: 'RESUME', remaining: remainingRef.current });
    setIsRunning(true);
    isRunningRef.current = true;
  }, [isOvertime]);

  const set = useCallback((duration, enableOvertime = true) => {
    if (overtimeTimerRef.current) clearInterval(overtimeTimerRef.current);
    setIsOvertime(false);
    setOvertimeMs(0);
    overtimeMsRef.current = 0;
    allowOvertimeRef.current = enableOvertime;
    durationRef.current = duration;
    remainingRef.current = duration;
    setRemaining(duration);
    setPercent(1);
    setIsRunning(false);
    isRunningRef.current = false;
    workerRef.current?.postMessage({ type: 'RESET' });
  }, []);

  const reset = useCallback(() => {
    if (overtimeTimerRef.current) clearInterval(overtimeTimerRef.current);
    workerRef.current?.postMessage({ type: 'RESET' });
    setIsOvertime(false);
    setOvertimeMs(0);
    overtimeMsRef.current = 0;
    setIsRunning(false);
    isRunningRef.current = false;
    setRemaining(durationRef.current);
    remainingRef.current = durationRef.current;
    setPercent(1);
  }, []);

  const timeDisplay = isOvertime
    ? `+${formatTime(overtimeMs)}`
    : formatTime(remaining);

  return {
    remaining,
    percent,
    isRunning,
    isOvertime,
    timeDisplay,
    start,
    set,
    pause,
    resume,
    reset,
    finishOvertime,
  };
}

function formatTime(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '00:00';
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}
