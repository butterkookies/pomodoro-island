import { motion } from 'framer-motion';
import styles from './CustomTimerBar.module.css';

/**
 * A single custom timer displayed as a horizontal draining bar with label.
 * The bar drains smoothly from right-to-left as time runs out.
 */
export default function CustomTimerBar({ timer, onRemove }) {
    const mins = Math.floor(timer.remaining / 60000);
    const secs = Math.floor((timer.remaining % 60000) / 1000);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Dynamic Apple tint based on remaining time percentage
    const fillColor = timer.percent > 0.25
        ? '#ff9500' // Apple Orange
        : timer.percent > 0.10
            ? '#ff9f0a' // Warning Amber
            : '#ff453a'; // Critical Red

    return (
        <motion.div
            className={styles.timerBar}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className={styles.info}>
                <span className={styles.name}>{timer.name}</span>
                <span className={styles.time}>{timer.isRunning ? timeStr : 'Done!'}</span>
            </div>
            <div className={styles.track}>
                <motion.div
                    className={styles.fill}
                    style={{ background: fillColor }}
                    animate={{ width: `${Math.max(0, Math.min(1, timer.percent)) * 100}%` }}
                    transition={{ duration: 0.12, ease: 'linear' }}
                />
            </div>
            <button
                className={styles.removeBtn}
                onClick={(e) => { e.stopPropagation(); onRemove(timer.id); }}
                title="Remove timer"
            >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </motion.div>
    );
}
