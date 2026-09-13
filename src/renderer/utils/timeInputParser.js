/**
 * Parses user-entered time strings into milliseconds.
 * Supports:
 *   - 'hh:mm:ss' (e.g. '1:30:00', '01:15:30')
 *   - 'mm:ss' or 'm:ss' (e.g. '25:00', '45:30', '1:30', '0:45', '0:30')
 *   - ':ss' (e.g. ':30', ':45')
 *   - Shorthand & colloquial units in any order/combination:
 *       - Seconds: '30s', '45sec', '10secs', '15 seconds', '90s'
 *       - Minutes: '25m', '5min', '90mins', '45 minutes', '1.5m'
 *       - Hours: '1h', '2hr', '1.5h', '2 hrs', '3 hours'
 *       - Mixed: '1h30m', '1h 30m', '1h 15m 30s', '1m30s', '2m 45s', '1hr 30min 45sec'
 *   - Pure integer (e.g. '45', '5', '90') -> interpreted as minutes (canonical Pomodoro)
 *
 * Enforces bounds:
 *   minMs: default 1,000ms (1 second) unless options.minMs/minSeconds/minMinutes is specified
 *   maxMs: default 12 hours (43,200,000ms) unless options.maxMs/maxMinutes/maxHours is specified
 * Returns milliseconds or null if invalid or out of bounds.
 */
export function parseTimeInput(input, options = {}) {
  if (input == null) return null;
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : String(input).trim().toLowerCase();
  if (!raw) return null;

  const minMs = options.minMs ?? (
    options.minSeconds != null ? options.minSeconds * 1000 :
    options.minMinutes != null ? options.minMinutes * 60 * 1000 :
    1000
  );
  const maxMs = options.maxMs ?? (
    options.maxHours != null ? options.maxHours * 3600 * 1000 :
    options.maxMinutes != null ? options.maxMinutes * 60 * 1000 :
    options.maxSeconds != null ? options.maxSeconds * 1000 :
    12 * 3600 * 1000
  );

  let totalMs = null;

  // Pattern 1: hh:mm:ss (e.g. '1:30:00', '01:15:30')
  const hmsMatch = raw.match(/^(\d{1,4})\s*:\s*(\d{1,2})\s*:\s*(\d{1,2})$/);
  if (hmsMatch) {
    const hours = parseInt(hmsMatch[1], 10);
    const mins = parseInt(hmsMatch[2], 10);
    const secs = parseInt(hmsMatch[3], 10);
    if (mins >= 60 || secs >= 60) return null;
    totalMs = (hours * 3600 + mins * 60 + secs) * 1000;
  }

  // Pattern 2: mm:ss or m:ss (e.g. '25:00', '45:30', '0:45', '0:30')
  if (totalMs === null) {
    const colonMatch = raw.match(/^(\d{1,4})\s*:\s*(\d{1,2})$/);
    if (colonMatch) {
      const mins = parseInt(colonMatch[1], 10);
      const secs = parseInt(colonMatch[2], 10);
      if (secs >= 60) return null;
      totalMs = (mins * 60 + secs) * 1000;
    }
  }

  // Pattern 3: :ss (e.g. ':30', ':45')
  if (totalMs === null) {
    const secOnlyMatch = raw.match(/^:\s*(\d{1,2})$/);
    if (secOnlyMatch) {
      const secs = parseInt(secOnlyMatch[1], 10);
      if (secs >= 60) return null;
      totalMs = secs * 1000;
    }
  }

  // Pattern 4: Unit tokens with hours, minutes, and/or seconds
  if (totalMs === null && /[hms]/i.test(raw)) {
    const tokenRegex = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)(?=[^a-z]|$)/gi;
    let calcMs = 0;
    let matchedAny = false;

    // Stripping recognized tokens to ensure no invalid characters exist
    const remainder = raw.replace(tokenRegex, (_full, valStr, unit) => {
      matchedAny = true;
      const val = parseFloat(valStr);
      const u = unit.toLowerCase();
      if (u.startsWith('h')) {
        calcMs += val * 3600 * 1000;
      } else if (u.startsWith('m')) {
        calcMs += val * 60 * 1000;
      } else if (u.startsWith('s')) {
        calcMs += val * 1000;
      }
      return '';
    }).trim();

    if (matchedAny && remainder === '') {
      totalMs = Math.round(calcMs);
    }
  }

  // Pattern 5: Pure integer (e.g. '45', '5', '90') -> interpreted as minutes
  if (totalMs === null) {
    const pureNumMatch = raw.match(/^(\d{1,4})$/);
    if (pureNumMatch) {
      const mins = parseInt(pureNumMatch[1], 10);
      totalMs = mins * 60 * 1000;
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

/**
 * Formats a duration in milliseconds into a concise, human-friendly label.
 * e.g. 45000 -> "45s", 1500000 -> "25m", 5400000 -> "1h 30m", 90000 -> "1m 30s"
 */
export function formatDurationLabel(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || ms <= 0) return '0s';
  const totalSecs = Math.round(ms / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const remSecs = totalSecs % 3600;
  const mins = Math.floor(remSecs / 60);
  const secs = remSecs % 60;

  if (hrs > 0 && mins === 0 && secs === 0) return `${hrs}h`;
  if (hrs > 0 && secs === 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0 && secs === 0) return `${mins}m`;
  if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default parseTimeInput;
