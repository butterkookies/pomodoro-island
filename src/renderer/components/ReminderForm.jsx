import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './ReminderForm.module.css';

/**
 * ReminderForm — inline form for scheduling a reminder.
 *
 * Trigger modes:
 *   'delay' → "In X minutes" (Model B)
 *   'time'  → "At HH:MM"    (Model A)
 */
export default function ReminderForm({ onAdd, onCancel }) {
    const [name, setName] = useState('');
    const [duration, setDuration] = useState('');
    const [triggerType, setTriggerType] = useState('delay');
    const [delayMinutes, setDelayMinutes] = useState('');
    const [atTime, setAtTime] = useState('');
    const [daily, setDaily] = useState(false);

    function handleSubmit(e) {
        e.preventDefault();
        const trimmedName = name.trim();
        const durationMins = parseFloat(duration);
        if (!trimmedName || !durationMins || durationMins <= 0) return;

        if (triggerType === 'delay') {
            const delay = parseFloat(delayMinutes);
            if (!delay || delay <= 0) return;
            onAdd({ name: trimmedName, durationMinutes: durationMins, triggerType: 'delay', triggerValue: delay, daily });
        } else {
            if (!atTime) return;
            onAdd({ name: trimmedName, durationMinutes: durationMins, triggerType: 'time', triggerValue: atTime, daily });
        }
    }

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit}
        >
            {/* Name */}
            <input
                className={styles.input}
                type="text"
                placeholder="Reminder name…"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
            />

            {/* Trigger type toggle */}
            <div className={styles.modeRow}>
                <button
                    type="button"
                    className={`${styles.modeBtn} ${triggerType === 'delay' ? styles.modeBtnActive : ''}`}
                    onClick={() => setTriggerType('delay')}
                >
                    {triggerType === 'delay' && (
                        <motion.div
                            layoutId="reminderModeIndicator"
                            className={styles.modeIndicator}
                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                    )}
                    <span className={styles.modeLabel}>In X min</span>
                </button>
                <button
                    type="button"
                    className={`${styles.modeBtn} ${triggerType === 'time' ? styles.modeBtnActive : ''}`}
                    onClick={() => setTriggerType('time')}
                >
                    {triggerType === 'time' && (
                        <motion.div
                            layoutId="reminderModeIndicator"
                            className={styles.modeIndicator}
                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                    )}
                    <span className={styles.modeLabel}>At time</span>
                </button>
            </div>

            {/* Trigger value */}
            <div className={styles.valueRow}>
                {triggerType === 'delay' ? (
                    <input
                        className={`${styles.input} ${styles.inputSmall}`}
                        type="number"
                        placeholder="min"
                        min="1"
                        step="1"
                        value={delayMinutes}
                        onChange={e => setDelayMinutes(e.target.value)}
                    />
                ) : (
                    <input
                        className={`${styles.input} ${styles.inputTime}`}
                        type="time"
                        value={atTime}
                        onChange={e => setAtTime(e.target.value)}
                    />
                )}

                <input
                    className={`${styles.input} ${styles.inputSmall}`}
                    type="number"
                    placeholder="dur"
                    min="1"
                    step="1"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    title="Timer duration in minutes"
                />

                <label className={styles.dailyLabel}>
                    <input
                        type="checkbox"
                        checked={daily}
                        onChange={e => setDaily(e.target.checked)}
                        className={styles.checkbox}
                    />
                    daily
                </label>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
                <motion.button
                    type="submit"
                    className={styles.btnSet}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                >
                    Set Reminder
                </motion.button>
                <button type="button" className={styles.btnCancel} onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </form>
    );
}
