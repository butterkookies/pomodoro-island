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
  EXPANDED_TASKS: { width: 440, height: 250 },
  EXPANDED_MUSIC: { width: 440, height: 165 },
  EXPANDED_STATS: { width: 440, height: 245 },
  EXPANDED_SETTINGS: { width: 440, height: 285 },
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
  TOGGLE_PAUSE: 'CommandOrControl+Alt+P',
  SKIP: 'CommandOrControl+Alt+S',
  MEDIA_TOGGLE: 'CommandOrControl+Alt+M',
  TOGGLE_EXPAND: 'CommandOrControl+Alt+I',
  // Legacy hotkeys for backward compatibility
  LEGACY_TOGGLE_PAUSE: 'CommandOrControl+Shift+Space',
  LEGACY_TOGGLE_EXPAND: 'CommandOrControl+Shift+E',
};

// ── Apple Fluid Spring Configs ───────────────────────
// Systemic 2-spring hierarchy (smooth container bounds vs crisp tactile controls)
export const SPRING_CONTAINER = {
  type: 'spring',
  stiffness: 420,
  damping: 41,
  mass: 0.8,
};

export const SPRING_INTERACTIVE = {
  type: 'spring',
  stiffness: 480,
  damping: 36,
  mass: 0.6,
};

// Default spring alias for backward compatibility
export const SPRING = SPRING_CONTAINER;

// ── Display Foundation Tokens (Elevated Obsidian) ────
// #08080a prevents OLED subpixel diode shutoff (no purple smearing) & Mini-LED blooming
export const OBSIDIAN = {
  FLOOR: '#08080a',
  GLASS_COMPACT: 'rgba(8, 8, 10, 0.92)',
  GLASS_EXPANDED: 'rgba(10, 10, 13, 0.95)',
};

// ── App Accent Tokens (Sampled from the Frosted Time Bar) ────
export const ACCENT = {
  PRIMARY: '#5c77bd',
  PRIMARY_HOVER: '#6d88ce',
  LIGHT: '#d0d9ee',
  GRADIENT: 'linear-gradient(135deg, #485c8e 0%, #768ebd 100%)',
  GLOW: 'rgba(92, 119, 189, 0.35)',
};
