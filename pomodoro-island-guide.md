# Pomodoro Island Timer — Complete Development Guide

## What You're Building

A Windows desktop overlay inspired by **Notchflow** (macOS) — a Dynamic Island-style
productivity hub that floats at the top-center of your screen. It features a **three-state
interaction model** (idle → compact → expanded), smooth spring animations via Framer Motion,
a Pomodoro timer with coffee break reminders, media controls, built-in focus sounds, and
session statistics — all inside a dark, glassy pill.

---

## Tech Stack (Final Decision)

| Layer | Tool | Why |
|---|---|---|
| Desktop shell | **Electron v31.x** | Reliable transparent overlay on Windows |
| UI | **React 18 (JSX)** | Component-based UI with hooks for clean state management |
| Animation | **Framer Motion** | Spring physics, layout transitions, gesture support |
| Styling | **CSS Modules** | Scoped styles per component, full CSS animation control |
| Timer | **Web Worker** | Isolated from UI thread, no drift |
| Audio | **Web Audio API** | Built-in focus sounds and notification chimes |
| Media | **Windows Media Transport** + optional Spotify Web API | Now-playing info and playback control |
| Build | **Vite** (electron-vite or vite-plugin-electron) | Fast HMR, modern bundling |
| Packaging | **electron-forge** | Standard scaffolding, handles distribution |

No Vue. No Angular. No Tailwind. React + Framer Motion gives you a Notchflow-quality UI
with fluid, physics-based animations.

---

## Project File Structure

```
pomodoro-island/
├── src/
│   ├── main/
│   │   ├── main.js                ← Electron main process
│   │   ├── windowManager.js       ← Creates + configures overlay window
│   │   ├── monitorManager.js      ← Detects active monitor, computes position
│   │   ├── mediaController.js     ← Windows system media integration
│   │   └── preload.js             ← contextBridge for IPC
│   ├── renderer/
│   │   ├── index.html             ← HTML shell (mounts React root)
│   │   ├── main.jsx               ← React entry point (renders <App />)
│   │   ├── App.jsx                ← Root component, manages global state
│   │   ├── App.module.css
│   │   ├── components/
│   │   │   ├── Island.jsx         ← Three-state pill container
│   │   │   ├── Island.module.css
│   │   │   ├── CompactView.jsx    ← Hover-glance: mini timer or now-playing
│   │   │   ├── CompactView.module.css
│   │   │   ├── ExpandedView.jsx   ← Full controls: timer, media, actions
│   │   │   ├── ExpandedView.module.css
│   │   │   ├── ProgressRing.jsx   ← Progress indicator (bar or ring)
│   │   │   ├── ProgressRing.module.css
│   │   │   ├── MediaControls.jsx  ← Play/pause/skip + track info + album art
│   │   │   ├── MediaControls.module.css
│   │   │   ├── FocusSounds.jsx    ← Ambient sound selector
│   │   │   ├── FocusSounds.module.css
│   │   │   ├── SessionStats.jsx   ← Daily focus time, session count
│   │   │   ├── SessionStats.module.css
│   │   │   ├── Settings.jsx       ← Slide-down settings panel
│   │   │   └── Settings.module.css
│   │   ├── hooks/
│   │   │   ├── useTimer.js        ← Custom hook wrapping the Web Worker
│   │   │   ├── usePomodoro.js     ← State machine (focus/break/coffee-break)
│   │   │   ├── useMediaController.js  ← System media / Spotify controls
│   │   │   ├── useFocusSounds.js  ← Web Audio ambient playback
│   │   │   ├── useIslandState.js  ← Manages idle/compact/expanded transitions
│   │   │   └── useSessionStats.js ← Tracks daily focus time
│   │   ├── workers/
│   │   │   └── timerWorker.js     ← Web Worker: timer engine
│   │   ├── audio/
│   │   │   ├── rain.mp3
│   │   │   ├── lofi.mp3
│   │   │   ├── whitenoise.mp3
│   │   │   └── chime.mp3
│   │   └── styles/
│   │       └── global.css         ← CSS custom properties, glass effects, resets
│   └── shared/
│       └── constants.js
├── package.json
├── vite.config.js
└── forge.config.js
```

---

## Architecture (How the Pieces Talk)

```
Main Process
  │
  ├── windowManager.js       Creates the BrowserWindow overlay
  ├── monitorManager.js      Reads screen API, calculates x/y position
  ├── mediaController.js     Windows system media transport + optional Spotify
  └── ipcMain listeners      Receives messages from renderer
          │
          │ IPC bridge (contextBridge / preload.js)
          │
Renderer Process (React + Framer Motion)
  │
  ├── App.jsx                Root component, owns all state
  ├── Island.jsx             Three-state pill (idle/compact/expanded)
  │   ├── CompactView.jsx    Mini timer or now-playing
  │   └── ExpandedView.jsx   Full timer + media + controls + stats
  ├── useIslandState.js      Idle ↔ compact ↔ expanded transitions
  ├── useTimer.js            Wraps timerWorker via Web Worker
  ├── usePomodoro.js         Focus/break state machine + coffee break
  ├── useMediaController.js  System media controls via IPC
  ├── useFocusSounds.js      Web Audio ambient loops
  ├── useSessionStats.js     Daily focus tracking
  └── timerWorker.js         Web Worker — runs timer, posts tick messages
```

**Key rules:**
- Screen/window APIs live in **Main**. Timer and UI live in **Renderer** (as React components)
- All state transitions use **Framer Motion** — no raw CSS transitions for layout changes
- The three-state model is managed by `useIslandState` with `AnimatePresence`

---

## Three-State Interaction Model

This is the defining feature that makes Pomodoro Island feel like Notchflow.

### State Definitions

| State | Dimensions | Background | Content | Click-Through |
|---|---|---|---|---|
| **Idle** | ~120×8px | #0a0a0a, 60% opacity | Nothing — just a dark sliver | Yes (fully) |
| **Compact** | ~280×44px | rgba(17,17,17,0.85) | Mini timer OR now-playing | No (clickable) |
| **Expanded** | ~480×160px+ | rgba(17,17,17,0.9) + blur(20px) | Timer + media + controls | No (interactive) |

### Transition Logic

```
idle ──[mouse approaches top-center]──→ compact
compact ──[click / hover-hold 300ms]──→ expanded
expanded ──[mouse leaves for 300ms]──→ idle
compact ──[mouse leaves]──→ idle
```

### Framer Motion Config

```jsx
// Shared spring config for all pill transitions
const springConfig = { type: 'spring', stiffness: 300, damping: 25 };

// In Island.jsx
<motion.div
  layout
  animate={{
    width: state === 'idle' ? 120 : state === 'compact' ? 280 : 480,
    height: state === 'idle' ? 8 : state === 'compact' ? 44 : 160,
    opacity: state === 'idle' ? 0.6 : 1,
  }}
  transition={springConfig}
  style={{
    borderRadius: 999,
    background: state === 'expanded'
      ? 'rgba(17, 17, 17, 0.9)'
      : 'rgba(17, 17, 17, 0.85)',
    backdropFilter: state === 'expanded' ? 'blur(20px)' : 'none',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: isTimerActive ? `0 0 20px ${glowColor}` : 'none',
  }}
>
  <AnimatePresence mode="wait">
    {state === 'compact' && <CompactView key="compact" ... />}
    {state === 'expanded' && <ExpandedView key="expanded" ... />}
  </AnimatePresence>
</motion.div>
```

### useIslandState Hook

```jsx
// hooks/useIslandState.js
import { useState, useCallback, useRef } from 'react';

export function useIslandState() {
  const [state, setState] = useState('idle');   // 'idle' | 'compact' | 'expanded'
  const leaveTimerRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(leaveTimerRef.current);
    if (state === 'idle') setState('compact');
  }, [state]);

  const handleClick = useCallback(() => {
    if (state === 'compact') setState('expanded');
  }, [state]);

  const handleMouseLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => setState('idle'), 300);
  }, []);

  return { state, handleMouseEnter, handleClick, handleMouseLeave };
}
```

**Success check:** Hovering near the pill transitions from idle → compact with a smooth spring.
Clicking expands to full view. Moving away collapses back to idle after 300ms.

---

## Phase-by-Phase Build Plan

---

### PHASE 1 — Electron + React + Vite + Framer Motion Scaffold

**Goal:** See the idle-state dark sliver on your screen, rendered by React with Framer Motion
installed. Click-through active. Vite hot-reload working.

BrowserWindow config:

```js
{
  width: 480,
  height: 80,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  hasShadow: false,
  backgroundColor: '#00000000'
}
win.setAlwaysOnTop(true, 'screen-saver');
win.setIgnoreMouseEvents(true, { forward: true });
```

Position at top-center:

```js
const { screen } = require('electron');
const display = screen.getPrimaryDisplay();
const x = Math.floor(display.bounds.x + display.bounds.width / 2 - 240);
const y = display.bounds.y + 8;
win.setPosition(x, y);
```

The idle `<Island />`:

```jsx
import { motion } from 'framer-motion';
import styles from './Island.module.css';

export default function Island() {
  return (
    <motion.div
      className={styles.island}
      initial={{ width: 120, height: 8, opacity: 0.6 }}
      animate={{ width: 120, height: 8, opacity: 0.6 }}
      style={{
        borderRadius: 999,
        background: '#0a0a0a',
      }}
    />
  );
}
```

**Success check:** A subtle dark sliver sits at top-center. Clicks pass through. Editing a
component triggers Vite hot-reload.

---

### PHASE 2 — Three-State Transitions (useIslandState)

**Goal:** The pill transitions between idle → compact → expanded with Framer Motion springs.

Implement `useIslandState` hook (see above). Wire mouse events and click-through IPC:

```jsx
// In Island.jsx
const { state, handleMouseEnter, handleClick, handleMouseLeave } = useIslandState();

useEffect(() => {
  if (state === 'idle') {
    window.electronAPI?.setClickThrough(true);
  } else {
    window.electronAPI?.setClickThrough(false);
  }
}, [state]);
```

In `main.js`:

```js
ipcMain.on('set-click-through', (event, value) => {
  win.setIgnoreMouseEvents(value, { forward: true });
});
```

**Success check:** Hover near pill → expands to compact. Click → expands to full. Leave → 
collapses to idle. Click-through toggles correctly per state.

---

### PHASE 3 — Timer Engine + useTimer Hook

**Goal:** Accurate timer in a Web Worker, wrapped in a React hook.

Timer worker uses `performance.now()` delta (same as before — see timerWorker.js in File Structure).

The `useTimer` hook:

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(onComplete) {
  const workerRef = useRef(null);
  const [remaining, setRemaining] = useState(0);
  const [percent, setPercent] = useState(1);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/timerWorker.js', import.meta.url)
    );
    workerRef.current.onmessage = ({ data }) => {
      if (data.type === 'TICK') {
        setRemaining(data.remaining);
        setPercent(data.percent);
      }
      if (data.type === 'COMPLETE') {
        setIsRunning(false);
        onComplete?.();
      }
    };
    return () => workerRef.current?.terminate();
  }, [onComplete]);

  const start = useCallback((duration) => {
    workerRef.current?.postMessage({ type: 'START', duration });
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    workerRef.current?.postMessage({ type: 'PAUSE' });
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    workerRef.current?.postMessage({ type: 'RESUME', remaining });
    setIsRunning(true);
  }, [remaining]);

  const reset = useCallback(() => {
    workerRef.current?.postMessage({ type: 'RESET' });
    setIsRunning(false);
    setPercent(1);
    setRemaining(0);
  }, []);

  return { remaining, percent, isRunning, start, pause, resume, reset };
}
```

**Success check:** Start a 60-second timer in console. Ticks are accurate. Compare to phone
over 5 minutes.

---

### PHASE 4 — Wire Timer to CompactView & ExpandedView

**Goal:** Timer digits show in compact view. Full timer + progress in expanded. Hotkey works.

`<CompactView />` — minimal display:

```jsx
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
  <span className={styles.miniTime}>{timeDisplay}</span>
  <div className={styles.thinProgress} style={{ width: `${percent * 100}%` }} />
</motion.div>
```

`<ExpandedView />` — full display:

```jsx
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
  <ProgressRing percent={percent} color={stateColor} />
  <span className={styles.timerText}>{timeDisplay}</span>
  <div className={styles.controls}>
    <button onClick={onPause}>{isRunning ? '⏸' : '▶'}</button>
    <button onClick={onSkip}>⏭</button>
    <button onClick={onReset}>⟲</button>
  </div>
</motion.div>
```

Global hotkey in `main.js`:

```js
globalShortcut.register('CommandOrControl+Shift+Space', () => {
  win.webContents.send('toggle-pause');
});
```

**Success check:** Timer counts down in both views. Hotkey pauses/resumes. Progress indicator
shrinks.

---

### PHASE 5 — Pomodoro State Machine (usePomodoro)

**Goal:** Focus → Break cycles with color changes, glow, and coffee break reminders.

```jsx
export function usePomodoro() {
  const [state, setState] = useState('FOCUS');
  const [sessionCount, setSessionCount] = useState(0);
  const [coffeeBreakDue, setCoffeeBreakDue] = useState(false);
  const startTimeRef = useRef(Date.now());

  const next = useCallback(() => {
    if (state === 'FOCUS') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      setState(newCount % 4 === 0 ? 'LONG_BREAK' : 'SHORT_BREAK');

      // Check coffee break (every 2 hours of elapsed time)
      if (Date.now() - startTimeRef.current > 2 * 60 * 60 * 1000) {
        setCoffeeBreakDue(true);
        startTimeRef.current = Date.now();
      }
    } else {
      setState('FOCUS');
      setCoffeeBreakDue(false);
    }
  }, [state, sessionCount]);

  // ... reset, config object with colors
}
```

State colors applied via Framer Motion `animate`:

```jsx
// In Island.jsx
const glowColor = {
  FOCUS: 'rgba(224, 112, 0, 0.3)',
  SHORT_BREAK: 'rgba(26, 140, 255, 0.3)',
  LONG_BREAK: 'rgba(34, 197, 94, 0.3)',
}[pomodoroState];
```

Ambient glow pulse:

```jsx
<motion.div
  animate={{ boxShadow: [`0 0 20px ${glowColor}`, `0 0 30px ${glowColor}`, `0 0 20px ${glowColor}`] }}
  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
/>
```

**Success check:** Timer transitions between focus/break. Colors change. Glow pulses. Coffee
break triggers after 2 hours of cumulative focus (test with shorter interval).

---

### PHASE 6 — Media Controls

**Goal:** Show now-playing in compact view. Play/pause/skip in expanded view.

In `mediaController.js` (Main process):

```js
// Use Windows system media transport or Spotify Web API
// Expose via IPC: getCurrentTrack, play, pause, next, prev
ipcMain.handle('media:getCurrentTrack', async () => { /* ... */ });
ipcMain.handle('media:play', async () => { /* ... */ });
ipcMain.handle('media:pause', async () => { /* ... */ });
ipcMain.handle('media:next', async () => { /* ... */ });
```

`useMediaController` hook wraps IPC calls. `<MediaControls />` renders:

```jsx
<div className={styles.mediaControls}>
  <img src={track.albumArt} className={styles.albumArt} />
  <div className={styles.trackInfo}>
    <span className={styles.title}>{track.title}</span>
    <span className={styles.artist}>{track.artist}</span>
  </div>
  <button onClick={prev}>⏮</button>
  <button onClick={isPlaying ? pause : play}>{isPlaying ? '⏸' : '▶'}</button>
  <button onClick={next}>⏭</button>
</div>
```

**Success check:** Now-playing info appears in compact view. Media buttons work in expanded view.

---

### PHASE 7 — Focus Sounds

**Goal:** Built-in ambient audio via Web Audio API.

`useFocusSounds` hook:

```jsx
export function useFocusSounds() {
  const [currentSound, setCurrentSound] = useState(null); // 'rain' | 'lofi' | 'whitenoise'
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef(null);

  const play = useCallback((sound) => {
    audioRef.current?.pause();
    audioRef.current = new Audio(`/audio/${sound}.mp3`);
    audioRef.current.loop = true;
    audioRef.current.volume = volume;
    audioRef.current.play();
    setCurrentSound(sound);
  }, [volume]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setCurrentSound(null);
  }, []);

  // ... volume control, cleanup
}
```

`<FocusSounds />` renders a sound picker with volume slider.

**Success check:** Select rain/lo-fi/white noise. Audio plays and loops. Volume adjustable.

---

### PHASE 8 — Session Stats

**Goal:** Track and display daily focus time.

`useSessionStats` hook persists to JSON via Main process IPC:

```jsx
export function useSessionStats() {
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);

  const addSession = useCallback((minutes) => {
    setTodayMinutes(prev => prev + minutes);
    setTodaySessions(prev => prev + 1);
    window.electronAPI?.saveStats({ minutes, date: new Date().toISOString() });
  }, []);

  // Load on mount via IPC
  useEffect(() => { /* ... */ }, []);

  return { todayMinutes, todaySessions, addSession };
}
```

`<SessionStats />` displays in expanded view: "Today: 2h 15m · 5 sessions"

**Success check:** Complete a focus session. Stats update. Restart app — stats persist.

---

### PHASE 9 — Multi-Monitor Support

**Goal:** Overlay positions on the monitor under the cursor when timer starts.

```js
// monitorManager.js
function repositionWindow(win) {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const x = Math.floor(display.bounds.x + display.bounds.width / 2 - 240);
  const y = display.bounds.y + 8;
  win.setPosition(x, y);
}
```

**Success check:** Start timer on Monitor 2. Pill appears on Monitor 2.

---

### PHASE 10 — Settings Panel

**Goal:** Configurable durations, sound preferences, hotkeys.

`<Settings />` slides down from expanded pill using Framer Motion:

```jsx
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={springConfig}
>
  {/* Duration inputs, sound toggles, hotkey display */}
</motion.div>
```

Persisted via `settings.json` in Main process.

**Success check:** Open settings → change focus duration to 30 min → close → timer uses new
value. Restart app — settings persist.

---

### PHASE 11 — Polish

Only after everything above works:

- **Notification chime:** Play `chime.mp3` on phase completion
- **Glow pulse refinement:** Adjust spring tension/frequency for premium feel
- **Glass blur tuning:** Dial in `backdrop-filter` values for depth without performance loss
- **Button micro-animations:** Scale on hover (`whileHover={{ scale: 1.1 }}`)
- **Smooth content swaps:** `AnimatePresence` crossfade between compact views (timer ↔ now-playing)
- **Overall UX review:** Test full session flow, adjust timings, verify click-through reliability

---

## Critical Rules to Follow While Building

1. **Never test overlay behavior in a browser.** Use `npm run dev` every time.
2. **Build phases in order.** Phases have dependencies.
3. **Timer accuracy test:** After Phase 3, run for 5 real minutes vs. phone. Must match within 1 second.
4. **Three-state system is mandatory.** The idle → compact → expanded model is the core UX.
5. **All animations via Framer Motion.** No raw CSS transitions for layout changes.
6. **Keep `main.js` thin.** UI logic = renderer. Main = window, screen, shortcuts, IPC, media.
7. **No `document.querySelector` in React.** Use `useRef`. Use React state/props for all updates.
8. **Web Worker access goes through `useTimer` only.** No direct `postMessage` from components.

---

## Common Problems and Fixes

| Problem | Cause | Fix |
|---|---|---|
| Window appears on wrong monitor | Using `getPrimaryDisplay()` always | Use `getDisplayNearestPoint(cursor)` |
| Buttons don't respond to clicks | `setIgnoreMouseEvents` still active | Toggle per island state in `useIslandState` |
| Timer drifts after a few minutes | Counter accumulation | Use `performance.now()` delta in Web Worker |
| Overlay disappears behind apps | Wrong `alwaysOnTop` level | Use `win.setAlwaysOnTop(true, 'screen-saver')` |
| Window shows taskbar icon | Missing `skipTaskbar: true` | Add to BrowserWindow config |
| Transparent window has white bg | Missing `backgroundColor: '#00000000'` | Add to BrowserWindow config |
| Vite HMR not working | Wrong Vite config for Electron | Use `electron-vite` or `vite-plugin-electron` |
| Worker import fails in Vite | Old `new Worker('./path')` syntax | Use `new URL('../workers/timerWorker.js', import.meta.url)` |
| React state not updating timer | Worker `onmessage` outside `useEffect` | Wrap worker setup in `useEffect` with cleanup |
| Framer Motion flickers | Missing `layout` prop or key | Add `layout` to `motion.div`, unique `key` in `AnimatePresence` |
| Backdrop blur not rendering | Electron transparency issue | Ensure `transparent: true` + no `backgroundColor` on window |
| Focus sounds don't loop | Missing `.loop = true` | Set on Audio element before `.play()` |

---

## MVP Definition (Strict)

Ship this before media, focus sounds, and stats:

- [ ] Three-state pill (idle → compact → expanded) with Framer Motion springs
- [ ] 25-minute countdown displays in compact and expanded views
- [ ] Progress indicator shrinks in real time
- [ ] Hotkey pauses and resumes
- [ ] Pomodoro cycles with color and glow changes
- [ ] Ambient glow pulse on active timer

Everything else — media, focus sounds, stats, settings, multi-monitor — is post-MVP.

---

## Dependency Versions (Use These Exactly)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "framer-motion": "^11.0.0"
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^31.0.0",
    "vite": "^5.4.0",
    "vite-plugin-electron": "^0.28.0",
    "vite-plugin-electron-renderer": "^0.14.0"
  }
}
```

Do not use Electron 32+ until you confirm overlay transparency still works on your Windows
version. Stick to 31.x for stability.

---