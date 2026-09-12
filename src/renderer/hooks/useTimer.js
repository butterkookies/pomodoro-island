import { useState, useEffect, useRef, useCallback } from 'react';
import { playPhaseComplete } from '../utils/soundManager';

export function useTimer(onComplete) {
  const [remaining, setRemaining] = useState(0);
  const [percent, setPercent] = useState(1);
  const [isRunning, setIsRunning] = useState(false);

  const workerRef = useRef(null);
  const remainingRef = useRef(0);
  const isRunningRef = useRef(false);
  const durationRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

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
        setIsRunning(false);
        isRunningRef.current = false;
        playPhaseComplete();
        onCompleteRef.current?.();
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
      worker.postMessage({ type: 'RESET' });
      setIsRunning(false);
      isRunningRef.current = false;
      setPercent(1);
      setRemaining(0);
      remainingRef.current = 0;
      onCompleteRef.current?.();
    });

    return () => {
      worker.terminate();
      window.electronAPI?.removeAllListeners('toggle-pause');
      window.electronAPI?.removeAllListeners('skip-phase');
    };
  }, []);

  const start = useCallback((duration) => {
    durationRef.current = duration;
    remainingRef.current = duration;
    setRemaining(duration);
    setPercent(1);
    setIsRunning(true);
    isRunningRef.current = true;
    workerRef.current.postMessage({ type: 'START', duration });
  }, []);

  const pause = useCallback(() => {
    workerRef.current.postMessage({ type: 'PAUSE' });
    setIsRunning(false);
    isRunningRef.current = false;
  }, []);

  const resume = useCallback(() => {
    workerRef.current.postMessage({ type: 'RESUME', remaining: remainingRef.current });
    setIsRunning(true);
    isRunningRef.current = true;
  }, []);

  const set = useCallback((duration) => {
    durationRef.current = duration;
    remainingRef.current = duration;
    setRemaining(duration);
    setPercent(1);
    setIsRunning(false);
    isRunningRef.current = false;
    workerRef.current?.postMessage({ type: 'RESET' });
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.postMessage({ type: 'RESET' });
    setIsRunning(false);
    isRunningRef.current = false;
    setRemaining(durationRef.current);
    remainingRef.current = durationRef.current;
    setPercent(1);
  }, []);

  return {
    remaining,
    percent,
    isRunning,
    timeDisplay: formatTime(remaining),
    start,
    set,
    pause,
    resume,
    reset,
  };
}

function formatTime(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '00:00';
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}
