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

// Fluid liquid spring for organic dragging, rubber-banding, and magnetic snapping
export const SPRING_LIQUID = {
  type: 'spring',
  stiffness: 360,
  damping: 26,
  mass: 0.7,
};

// Default spring alias for backward compatibility
export const SPRING = SPRING_CONTAINER;

// ── Bezel Drag & Magnetic Snap Config ─────────────────
export const BEZEL_SNAP_THRESHOLD = 30; // px around center for magnetic snap
export const HOVER_DWELL_DELAY_MS = 180; // ms intent buffer before waking idle notch

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

// ── Selectable Color Accent Gradient Themes ───────────
export const THEME_PALETTES = {
  classic: {
    id: 'classic',
    name: 'Classic Periwinkle',
    stops: ['#485c8e', '#5c77bd', '#6d88ce', '#768ebd'],
    primary: '#5c77bd',
    hover: '#6d88ce',
    light: '#d0d9ee',
    gradient: 'linear-gradient(135deg, #485c8e 0%, #768ebd 100%)',
    swatchGradient: 'linear-gradient(90deg, #485c8e 0%, #5c77bd 40%, #768ebd 100%)',
    glow: 'rgba(92, 119, 189, 0.35)',
  },
  'violet-haze': {
    id: 'violet-haze',
    name: 'Violet Haze',
    stops: ['#00716F', '#169DB0', '#B2D3F2', '#FCFFFF'],
    primary: '#169DB0',
    hover: '#21b3c7',
    light: '#B2D3F2',
    gradient: 'linear-gradient(135deg, #00716F 0%, #169DB0 35%, #B2D3F2 70%, #FCFFFF 100%)',
    swatchGradient: 'linear-gradient(90deg, #00716F 0%, #169DB0 35%, #B2D3F2 70%, #FCFFFF 100%)',
    glow: 'rgba(22, 157, 176, 0.35)',
  },
  'solar-flame': {
    id: 'solar-flame',
    name: 'Solar Flame',
    stops: ['#FD1B00', '#FC5200', '#F68C25', '#FDC02A'],
    primary: '#FC5200',
    hover: '#ff681a',
    light: '#FDC02A',
    gradient: 'linear-gradient(135deg, #FD1B00 0%, #FC5200 35%, #F68C25 70%, #FDC02A 100%)',
    swatchGradient: 'linear-gradient(90deg, #FD1B00 0%, #FC5200 35%, #F68C25 70%, #FDC02A 100%)',
    glow: 'rgba(252, 82, 0, 0.35)',
  },
  'ocean-breeze': {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    stops: ['#0B3C65', '#1A9CC8', '#27AED2', '#AFE4F6'],
    primary: '#27AED2',
    hover: '#39c0e4',
    light: '#AFE4F6',
    gradient: 'linear-gradient(135deg, #0B3C65 0%, #1A9CC8 35%, #27AED2 70%, #AFE4F6 100%)',
    swatchGradient: 'linear-gradient(90deg, #0B3C65 0%, #1A9CC8 35%, #27AED2 70%, #AFE4F6 100%)',
    glow: 'rgba(39, 174, 210, 0.35)',
  },
  'meadow-glow': {
    id: 'meadow-glow',
    name: 'Meadow Glow',
    stops: ['#263D26', '#6F9435', '#A7B92A', '#EDD330'],
    primary: '#6F9435',
    hover: '#81aa3e',
    light: '#EDD330',
    gradient: 'linear-gradient(135deg, #263D26 0%, #6F9435 35%, #A7B92A 70%, #EDD330 100%)',
    swatchGradient: 'linear-gradient(90deg, #263D26 0%, #6F9435 35%, #A7B92A 70%, #EDD330 100%)',
    glow: 'rgba(111, 148, 53, 0.35)',
  },
  'rose-blush': {
    id: 'rose-blush',
    name: 'Rose Blush',
    stops: ['#EB4E70', '#FD9799', '#FDE5E7', '#FCFBFC'],
    primary: '#EB4E70',
    hover: '#f06382',
    light: '#FD9799',
    gradient: 'linear-gradient(135deg, #EB4E70 0%, #FD9799 35%, #FDE5E7 70%, #FCFBFC 100%)',
    swatchGradient: 'linear-gradient(90deg, #EB4E70 0%, #FD9799 35%, #FDE5E7 70%, #FCFBFC 100%)',
    glow: 'rgba(235, 78, 112, 0.35)',
  },
};

export const DEFAULT_THEME_ID = 'classic';

