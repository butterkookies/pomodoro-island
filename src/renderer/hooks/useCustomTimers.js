import { useState, useCallback, useEffect, useRef } from 'react';
import { playCustomTimerComplete } from '../utils/soundManager';

/**
 * Manages a list of custom named timers that run independently.
 * Each timer has: id, name, duration (ms), remaining (ms), percent, isRunning.
 *
 * Example: "Coffee Time" → 15 minutes
 * Each timer runs its own requestAnimationFrame loop for accuracy.
 */
export function useCustomTimers() {
    const [timers, setTimers] = useState([]);
    const originsRef = useRef({});   // { [id]: performance.now() origin }
    const rafRef = useRef(null);
    const soundFiredRef = useRef(new Set());

    // Add a new custom timer
    const addTimer = useCallback((name, durationMinutes) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const durationMs = durationMinutes * 60 * 1000;

        setTimers(prev => [...prev, {
            id,
            name,
            duration: durationMs,
            remaining: durationMs,
            percent: 1,
            isRunning: true,
        }]);

        originsRef.current[id] = performance.now();
    }, []);

    // Remove a custom timer
    const removeTimer = useCallback((id) => {
        setTimers(prev => prev.filter(t => t.id !== id));
        delete originsRef.current[id];
    }, []);

    // Tick loop — only runs while timers are active
    useEffect(() => {
        if (timers.length === 0) return;

        function tick() {
            setTimers(prev => {
                let changed = false;
                const updated = prev.map(timer => {
                    if (!timer.isRunning) return timer;

                    const origin = originsRef.current[timer.id];
                    if (!origin) return timer;

                    const elapsed = performance.now() - origin;
                    const remaining = Math.max(0, timer.duration - elapsed);
                    const percent = remaining / timer.duration;
                    const isRunning = remaining > 0;

                    if (!isRunning) {
                        delete originsRef.current[timer.id];
                    }

                    changed = true;
                    return { ...timer, remaining, percent, isRunning };
                });

                return changed ? updated : prev;
            });

            rafRef.current = requestAnimationFrame(tick);
        }

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [timers.length]);

    // Play sound and auto-remove completed timers after 3 seconds
    useEffect(() => {
        const completedTimers = timers.filter(t => !t.isRunning && t.remaining === 0);
        if (completedTimers.length === 0) return;

        completedTimers.forEach(t => {
            if (!soundFiredRef.current.has(t.id)) {
                soundFiredRef.current.add(t.id);
                playCustomTimerComplete();
            }
        });

        const timeout = setTimeout(() => {
            completedTimers.forEach(t => soundFiredRef.current.delete(t.id));
            setTimers(prev => prev.filter(t => t.isRunning || t.remaining > 0));
        }, 3000);

        return () => clearTimeout(timeout);
    }, [timers]);

    return { timers, addTimer, removeTimer };
}
