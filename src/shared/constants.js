// ── Durations (ms) ──────────────────────────────────
export const DURATIONS = {
  FOCUS: 25 * 60 * 1000,
  SHORT_BREAK: 5 * 60 * 1000,
  LONG_BREAK: 15 * 60 * 1000,
  COFFEE_BREAK: 2 * 60 * 60 * 1000,
};

// ── Notchflow-inspired Apple HIG colors ─────────────
export const COLORS = {
  FOCUS: '#ff9500',        // Apple System Orange
  SHORT_BREAK: '#007aff',  // Apple System Blue
  LONG_BREAK: '#34c759',   // Apple System Green
};

export const REMINDER_COLOR = '#30b0c7'; // Apple System Teal

export const GLOW = {
  FOCUS: 'none',
  SHORT_BREAK: 'none',
  LONG_BREAK: 'none',
};

// ── Dynamic Island dimensions per state ─────────────
// Shape: rectangle with continuous rounded bottom corners, top flush with bezel
export const ISLAND = {
  IDLE: { width: 170, height: 30 },
  COMPACT: { width: 360, height: 52 },
  EXPANDED: { width: 440, height: 160 },
  EXPANDED_TASKS: { width: 440, height: 260 },
  EXPANDED_MUSIC: { width: 440, height: 190 },
  EXPANDED_STATS: { width: 440, height: 250 },
  EXPANDED_SETTINGS: { width: 440, height: 280 },
};

// ── Notch & Flared Ears Configuration ───────────────
export const NOTCH_CONFIG = {
  // Idle (minimized) scaled-down ear dimensions in pixels
  IDLE: {
    earWidth: 10,
    earHeight: 9,
  },
  // Active (compact & expanded) ear dimensions in pixels
  ACTIVE: {
    earWidth: 15,
    earHeight: 14,
  },
};

// ── Corner Radii per State ──────────────────────────
// CSS border-radius format: 'top-left top-right bottom-right bottom-left'
// Flat top ('0 0') flush with bezel across all states to preserve identical notch silhouette
export const BORDER_RADIUS = {
  IDLE: '0 0 12px 12px',       // Proportional scaled bottom radius for minimized state
  COMPACT: '0 0 20px 20px',
  EXPANDED: '0 0 26px 26px',
};

// ── Hotkeys ─────────────────────────────────────────
export const HOTKEYS = {
  TOGGLE_PAUSE: 'CommandOrControl+Shift+Space',
  SKIP: 'CommandOrControl+Shift+S',
  MEDIA_TOGGLE: 'CommandOrControl+Shift+M',
};

// ── Apple Fluid Spring Config (Critically Damped) ───
// Follows Apple WWDC Designing Fluid Interfaces:
// Snappy response (~0.35s), damping ratio 1.0 (no oscillation, zero bounce)
export const SPRING = {
  type: 'spring',
  stiffness: 380,
  damping: 38,
  mass: 0.85,
};
