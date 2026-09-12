import { motion } from 'framer-motion';
import styles from './StatsTab.module.css';

export default function StatsTab({ stats, color }) {
  const { todayMinutes, todayCount, streak, weeklyData } = stats;

  const hours = Math.floor(todayMinutes / 60);
  const remainingMins = todayMinutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`;

  const maxMinutes = Math.max(60, ...weeklyData.map((d) => d.minutes));

  return (
    <motion.div
      className={styles.statsContainer}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      style={{ '--phase-color': color }}
    >
      {/* ── Metric Telemetry Bar (Flat unified strip, no cards) ── */}
      <div className={styles.telemetryStrip}>
        <div className={styles.telemetryItem}>
          <span className={styles.metricLabel}>Today</span>
          <span className={styles.metricValue}>{timeDisplay}</span>
        </div>
        <div className={styles.telemetryDivider} />
        <div className={styles.telemetryItem}>
          <span className={styles.metricLabel}>Sessions</span>
          <span className={styles.metricValue}>{todayCount}</span>
        </div>
        <div className={styles.telemetryDivider} />
        <div className={styles.telemetryItem}>
          <span className={styles.metricLabel}>Streak</span>
          <div className={styles.streakValRow}>
            {streak > 0 && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3 }}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            )}
            <span className={styles.metricValue}>{streak}d</span>
          </div>
        </div>
      </div>

      {/* ── 7-Day Activity Chart (Flat, no card shell) ── */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <span className={styles.chartTitle}>7-day activity</span>
          <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
            Peak: {maxMinutes}m
          </span>
        </div>
        <div className={styles.barsRow}>
          {weeklyData.map((d) => {
            const heightPct = Math.min(100, Math.round((d.minutes / maxMinutes) * 100));
            return (
              <div key={d.date} className={styles.barCol} title={`${d.date}: ${d.minutes}m`}>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${d.isToday ? styles.barFillToday : ''}`}
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                  />
                </div>
                <span
                  className={`${styles.barLabel} ${d.isToday ? styles.barLabelToday : ''}`}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
