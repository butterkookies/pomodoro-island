import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * useReminders — manages scheduled reminder timers.
 *
 * Each reminder has:
 *   id, name, durationMs, triggerType, triggerValue, daily, status
 *
 *   triggerType: 'delay'   → fire after N minutes from now
 *                'time'    → fire at a specific HH:MM time-of-day
 *   triggerValue: ms timestamp (when to fire — computed on add)
 *   daily: boolean         → reschedule same time next day after firing
 *   status: 'pending' | 'dismissed'
 */
export function useReminders(onFire) {
    const [reminders, setReminders] = useState(() => {
        const stored = window.electronAPI?.store?.get('reminders');
        return Array.isArray(stored) ? stored.filter(r => r.status === 'pending') : [];
    });
    const onFireRef = useRef(onFire);
    const firedRef = useRef(new Set()); // guard against double-firing within same second

    useEffect(() => { onFireRef.current = onFire; }, [onFire]);

    useEffect(() => {
        window.electronAPI?.store?.set(
            'reminders',
            Array.isArray(reminders) ? reminders.filter(r => r.status === 'pending') : []
        );
    }, [reminders]);

    // ── Add reminder ────────────────────────────────────────
    const addReminder = useCallback(({
        name,
        durationMinutes,
        triggerType,   // 'delay' | 'time'
        triggerValue,  // minutes (delay) | "HH:MM" string (time)
        daily = false,
    }) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const durationMs = durationMinutes * 60 * 1000;
        const fireAt = computeFireAt(triggerType, triggerValue);

        setReminders(prev => [...prev, {
            id,
            name,
            durationMs,
            triggerType,
            triggerValue,
            daily,
            fireAt,
            status: 'pending',
        }]);
    }, []);

    // ── Remove reminder ─────────────────────────────────────
    const removeReminder = useCallback((id) => {
        setReminders(prev => prev.filter(r => r.id !== id));
        firedRef.current.delete(id);
    }, []);

    // ── Dismiss a fired reminder ────────────────────────────
    const dismissReminder = useCallback((id) => {
        setReminders(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'dismissed' } : r
        ));
    }, []);

    // ── Tick: check every second if any reminder should fire ─
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setReminders(prev => {
                let changed = false;
                const updated = prev.map(r => {
                    if (r.status !== 'pending') return r;
                    if (now < r.fireAt) return r;
                    if (firedRef.current.has(r.id)) return r;

                    // Fire it
                    firedRef.current.add(r.id);
                    changed = true;
                    onFireRef.current?.({ ...r });

                    if (r.daily) {
                        // Reschedule for same time tomorrow
                        const nextFireAt = r.fireAt + 24 * 60 * 60 * 1000;
                        firedRef.current.delete(r.id);
                        return { ...r, fireAt: nextFireAt };
                    }

                    return { ...r, status: 'dismissed' };
                });
                return changed ? updated : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return { reminders, addReminder, removeReminder, dismissReminder };
}

// ── Helpers ──────────────────────────────────────────────────

function computeFireAt(type, value) {
    if (type === 'delay') {
        // value = minutes from now
        return Date.now() + parseFloat(value) * 60 * 1000;
    }

    if (type === 'time') {
        // value = "HH:MM" string
        const [hh, mm] = value.split(':').map(Number);
        const now = new Date();
        const target = new Date(now);
        target.setHours(hh, mm, 0, 0);

        // If that time already passed today, schedule for tomorrow
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }

        return target.getTime();
    }

    return Date.now();
}
