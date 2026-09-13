/**
 * Parses user-entered time strings into milliseconds.
 * Supports:
 *   - 'mm:ss' (e.g. '25:00', '45:30', '1:30')
 *   - Pure integer minutes (e.g. '45', '5', '90')
 *   - Shorthand '90m', '1h', '1h30m', '1h 30m', '2h', '3h'
 *
 * Enforces bounds: min 1 minute (60,000ms), max 180 minutes (10,800,000ms) by default.
 * Returns milliseconds or null if invalid or out of bounds.
 */
export function parseTimeInput(input, options = {}) {
  if (input == null) return null;
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : String(input).trim().toLowerCase();
  if (!raw) return null;

  const minMs = options.minMs ?? (options.minMinutes != null ? options.minMinutes * 60 * 1000 : 60 * 1000);
  const maxMs = options.maxMs ?? (options.maxMinutes != null ? options.maxMinutes * 60 * 1000 : 180 * 60 * 1000);

  let totalMs = null;

  // Pattern 1: mm:ss (or m:ss)
  const colonMatch = raw.match(/^(\d{1,4}):(\d{1,2})$/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10);
    const secs = parseInt(colonMatch[2], 10);
    if (secs >= 60) return null;
    totalMs = (mins * 60 + secs) * 1000;
  } else {
    // Pattern 2: 1h30m / 1h 30m / 1h / 90m
    const hourMinMatch = raw.match(/^(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+)m)?$/);
    if (hourMinMatch && (hourMinMatch[1] || hourMinMatch[2])) {
      const hours = hourMinMatch[1] ? parseFloat(hourMinMatch[1]) : 0;
      const mins = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
      totalMs = Math.round((hours * 60 + mins) * 60 * 1000);
    } else {
      // Pattern 3: Pure integer minutes (e.g. '45', '5', '90')
      const pureNumMatch = raw.match(/^(\d{1,4})$/);
      if (pureNumMatch) {
        const mins = parseInt(pureNumMatch[1], 10);
        totalMs = mins * 60 * 1000;
      }
    }
  }

  if (totalMs === null || isNaN(totalMs)) {
    return null;
  }

  if (totalMs < minMs || totalMs > maxMs) {
    return null;
  }

  return totalMs;
}

export default parseTimeInput;
