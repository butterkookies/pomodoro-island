import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './ReminderBanner.module.css';

const COUNTDOWN = 5;

export default function ReminderBanner({ reminder, onStart, onDismiss }) {
    const [seconds, setSeconds] = useState(COUNTDOWN);

    useEffect(() => {
        if (seconds <= 0) { onStart(reminder); return; }
        const t = setTimeout(() => setSeconds(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [seconds, onStart, reminder]);

    const fillPct = ((COUNTDOWN - seconds) / COUNTDOWN) * 100;

    return (
        <motion.div
            className={styles.banner}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
        >
            {/* Icon + name */}
            <div className={styles.header}>
                <div className={styles.iconCircle}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                </div>
                <span className={styles.name}>{reminder.name}</span>
                <span className={styles.dur}>{Math.round(reminder.durationMs / 60000)}m</span>
            </div>

            {/* Countdown bar */}
            <div className={styles.countdownTrack}>
                <motion.div
                    className={styles.countdownFill}
                    animate={{ width: `${fillPct}%` }}
                    transition={{ duration: 0.9, ease: 'linear' }}
                />
            </div>
            <p className={styles.sub}>Starting automatically in {seconds}s…</p>

            {/* Actions */}
            <div className={styles.actions}>
                <button className={styles.btnStart} onClick={() => onStart(reminder)}>
                    Start Now
                </button>
                <button className={styles.btnDismiss} onClick={() => onDismiss(reminder.id)}>
                    Dismiss
                </button>
            </div>
        </motion.div>
    );
}
