# AI Prompt — Pomodoro Island Timer (Windows, Electron + React)

Use this prompt with Claude, Claude Code, or any AI assistant.
Paste the entire block below. Replace [PHASE X] with the phase you are currently on.

---

## PROMPT (paste this)

---

You are helping me build a Windows desktop overlay app called "Pomodoro Island Timer."
It is inspired by the macOS app **Notchflow** — a Dynamic Island-style productivity hub
that floats at the top-center of the screen. It features a three-state interaction model
(idle → compact → expanded), smooth spring animations, a Pomodoro timer, media controls,
and built-in focus sounds — all inside a dark, glassy pill.

Here is everything you need to know. Do not deviate from these decisions.

---

### STACK (do not suggest alternatives)
- Electron (v31.x) with electron-forge
- React 18 (with JSX) bundled via Vite (electron-vite or vite-plugin-electron)
- **Framer Motion** for all animations (spring physics, layout transitions, gestures)
- CSS Modules for scoped component styling
- Web Worker for the timer engine
- Web Audio API for focus sounds and notification chimes
- No Vue, no Tailwind, no Angular — only React
- TypeScript is optional — use it only if I ask

---

### FILE STRUCTURE
```
pomodoro-island/
├── src/
│   ├── main/
│   │   ├── main.js
│   │   ├── windowManager.js
│   │   ├── monitorManager.js
│   │   ├── mediaController.js      ← Windows system media integration (optional Spotify)
│   │   └── preload.js
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.jsx                ← React entry point (renders <App />)
│   │   ├── App.jsx                 ← Root component, manages global state
│   │   ├── App.module.css
│   │   ├── components/
│   │   │   ├── Island.jsx          ← Three-state pill container (idle/compact/expanded)
│   │   │   ├── Island.module.css
│   │   │   ├── CompactView.jsx     ← Hover-glance: mini timer or now-playing
│   │   │   ├── CompactView.module.css
│   │   │   ├── ExpandedView.jsx    ← Full controls: timer, media, actions
│   │   │   ├── ExpandedView.module.css
│   │   │   ├── ProgressRing.jsx    ← Circular or linear progress indicator
│   │   │   ├── ProgressRing.module.css
│   │   │   ├── MediaControls.jsx   ← Play/pause/skip + track info + album art
│   │   │   ├── MediaControls.module.css
│   │   │   ├── FocusSounds.jsx     ← Ambient sound selector (rain, lo-fi, white noise)
│   │   │   ├── FocusSounds.module.css
│   │   │   ├── SessionStats.jsx    ← Daily focus time, session count
│   │   │   ├── SessionStats.module.css
│   │   │   ├── Settings.jsx        ← Slide-down settings panel
│   │   │   └── Settings.module.css
│   │   ├── hooks/
│   │   │   ├── useTimer.js         ← Custom hook wrapping the Web Worker
│   │   │   ├── usePomodoro.js      ← State machine for focus/break/coffee-break cycles
│   │   │   ├── useMediaController.js  ← Hook for system media / Spotify controls
│   │   │   ├── useFocusSounds.js   ← Hook for Web Audio ambient playback
│   │   │   ├── useIslandState.js   ← Manages idle/compact/expanded transitions
│   │   │   └── useSessionStats.js  ← Tracks daily focus time, persists to file
│   │   ├── workers/
│   │   │   └── timerWorker.js      ← Web Worker: timer engine (framework-agnostic)
│   │   ├── audio/
│   │   │   ├── rain.mp3
│   │   │   ├── lofi.mp3
│   │   │   ├── whitenoise.mp3
│   │   │   └── chime.mp3           ← Notification sound
│   │   └── styles/
│   │       └── global.css          ← CSS custom properties, glass effects, resets
│   └── shared/
│       └── constants.js
├── package.json
├── vite.config.js
└── forge.config.js
```

---

### ARCHITECTURE RULES
- Main process: window creation, screen API, globalShortcut, ipcMain, media integration only
- Renderer process: all UI logic via React components, timer worker, DOM updates through React state
- Timer runs in a Web Worker using performance.now() delta — never setInterval accumulation
- IPC bridge via contextBridge in preload.js
- MonitorManager lives in Main, not Renderer
- **Three-state interaction model:**
  - `idle` — pill is minimal, nearly invisible (subtle dark shape, no text)
  - `compact` — on hover approach, pill gently expands showing timer progress OR now-playing info
  - `expanded` — on click or hover-hold, full pill with timer display, media controls, action buttons
  - Transitions managed by `useIslandState` hook with Framer Motion `AnimatePresence`
- **React-specific rules:**
  - All UI is composed of React functional components with hooks
  - All animations use Framer Motion (`motion.div`, `AnimatePresence`, spring configs)
  - Timer state (remaining, percent, pomodoroState) lives in `App.jsx` and passes via props
  - The Web Worker is wrapped in `useTimer` — never call `postMessage` directly inside components
  - Avoid `document.querySelector` — use refs (`useRef`) when direct DOM access is truly needed
- **Media integration:**
  - Windows system media transport controls via Main process IPC
  - Optional Spotify Web API for richer track info
  - `useMediaController` hook exposes: `{ track, isPlaying, play(), pause(), next(), prev(), volume }`

---

### OVERLAY WINDOW REQUIREMENTS
```js
{
  width: 480,       // wider to accommodate media controls
  height: 80,       // taller for three-state content
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  hasShadow: false,
  backgroundColor: '#00000000'
}
win.setAlwaysOnTop(true, 'screen-saver');
win.setIgnoreMouseEvents(true, { forward: true }); // click-through in idle state
```

---

### VISUAL DESIGN (Notchflow-Inspired)

#### Three-State Pill
- **Idle:** width ~120px, height ~8px, background #0a0a0a, border-radius 999px, opacity 0.6
  - Barely visible dark sliver at top-center — like the Mac notch
  - No text, no icons — just a subtle presence
- **Compact:** width ~280px, height ~44px, background rgba(17, 17, 17, 0.85)
  - Shows either: mini timer (`12:34` + thin progress bar) OR now-playing (`♪ Song — Artist`)
  - Transitions with Framer Motion spring: `{ type: 'spring', stiffness: 300, damping: 25 }`
- **Expanded:** width ~480px, height ~160px+, background rgba(17, 17, 17, 0.9)
  - Full timer display, progress indicator, media controls, action buttons
  - `backdrop-filter: blur(20px)` for glass depth effect
  - Subtle border: `1px solid rgba(255, 255, 255, 0.08)`

#### Ambient Glow
- Active timer emits a soft `box-shadow` glow matching the state color
- Focus: `0 0 20px rgba(224, 112, 0, 0.3)` (orange)
- Break: `0 0 20px rgba(26, 140, 255, 0.3)` (blue)
- Long break: `0 0 20px rgba(34, 197, 94, 0.3)` (green)
- Glow pulses gently using Framer Motion `animate` with `repeat: Infinity`

#### Progress Indicator
- Shrinking block or thin bar that shrinks as time elapses
- Width formula in compact: `calc(percent * 100%)`
- In expanded view: larger block or circular ring option
- State colors: focus = #e07000, short break = #1a8cff, long break = #22c55e

#### Typography
- Use system font stack or Inter/SF Mono for timer digits
- Timer text: monospace, 20px expanded / 14px compact
- Labels: sans-serif, 11px, rgba(255,255,255,0.5)

#### Click-Through Behavior
- Idle state: fully click-through
- Compact state: click-through disabled on hover (allow click-to-expand)
- Expanded state: click-through disabled (interactive)
- `onMouseLeave` on expanded → return to idle after 300ms delay

---

### POMODORO LOGIC
- Focus: 25 minutes
- Short break: 5 minutes
- Long break: 15 minutes (after every 4 focus sessions)
- **Coffee Break:** configurable "stand up" reminder (default every 2 hours), separate from Pomodoro breaks
- Cycle: FOCUS → SHORT_BREAK → FOCUS → ... → LONG_BREAK → repeat
- State changes trigger: color update, glow color change, timer restart, optional chime
- Managed by `usePomodoro` hook: `{ state, sessionCount, next(), reset(), coffeeBreakDue }`

---

### TIMER ENGINE (Web Worker)
- Uses performance.now() delta from a fixed origin point
- Ticks every 100ms
- Posts: { type: 'TICK', remaining: ms, percent: 0.0-1.0 }
- Posts: { type: 'COMPLETE' } when done
- Accepts messages: START, PAUSE, RESUME (with remaining ms), RESET
- Wrapped by `useTimer` hook: `{ remaining, percent, isRunning, start(), pause(), resume(), reset() }`

---

### MEDIA & MUSIC INTEGRATION
- **Windows System Media:** Use Electron's Main process to read system media transport controls (now-playing info, playback state). Expose via IPC to renderer.
- **Spotify Web API (optional):** OAuth flow → fetch current track, control playback. Runs in Main process.
- **Built-in Focus Sounds:** Web Audio API plays ambient loops (rain, lo-fi beats, white noise). Managed by `useFocusSounds` hook.
- **UI:** `<MediaControls />` shows album art thumbnail, track title, artist, play/pause/skip buttons. `<FocusSounds />` shows sound selector with volume slider.

---

### SESSION STATS
- Track total focus time per day, number of completed sessions
- Persist to a local JSON file via Main process IPC
- `useSessionStats` hook: `{ todayMinutes, todaySessions, addSession(minutes) }`
- Displayed in `<SessionStats />` component within the expanded view

---

### HOTKEYS
- CommandOrControl+Shift+Space = toggle pause/resume
- CommandOrControl+Shift+S = skip current phase
- CommandOrControl+Shift+M = toggle media play/pause
- Registered via globalShortcut in Main

---

### MULTI-MONITOR
- On timer start, detect the monitor under the cursor using screen.getDisplayNearestPoint()
- Position overlay at: x = display.bounds.x + display.bounds.width/2 - 240, y = display.bounds.y + 8
- Do NOT reposition while timer is running

---

### PHASES — build in this exact order

**Phase 1:** Scaffold Electron + React + Vite + Framer Motion. Render the `<Island />` in idle state — a subtle dark sliver at top-center. Click-through active. Confirm hot-reload works.

**Phase 2:** Implement `useIslandState` hook. Three-state transitions: idle → compact (on hover) → expanded (on click). Framer Motion spring animations between states. Click-through toggles per state.

**Phase 3:** Timer engine in timerWorker.js. `useTimer` hook wraps it. Tested in isolation. Accurate over 5 minutes.

**Phase 4:** Wire `useTimer` to `<CompactView />` and `<ExpandedView />`. Timer displays in both views. Hotkey pauses/resumes. Progress indicator shrinks.

**Phase 5:** `usePomodoro` hook implements the state machine. Focus → Break cycles. Color and glow change per state. Coffee break reminders.

**Phase 6:** `<MediaControls />` + `useMediaController` hook. Windows system media integration. Show now-playing in compact view. Play/pause/skip in expanded view.

**Phase 7:** `<FocusSounds />` + `useFocusSounds` hook. Built-in ambient audio (rain, lo-fi, white noise). Volume control. Sound selector UI.

**Phase 8:** `<SessionStats />` + `useSessionStats` hook. Track daily focus time. Persist to JSON. Display in expanded view.

**Phase 9:** Multi-monitor positioning on timer start.

**Phase 10:** `<Settings />` panel. Configurable durations, sound preferences, hotkeys. Slide-down from expanded pill.

**Phase 11:** Polish — notification chimes, ambient glow pulse, glass blur refinements, micro-animations on buttons, overall UX review.

---

### CURRENT TASK

I am on [PHASE X]. 

[DESCRIBE WHAT YOU NEED HERE — example options below:]

Option A (starting fresh):
"Generate all files needed to complete Phase 1. Include package.json with correct
dependencies (Electron, React, Vite, Framer Motion), vite.config.js, forge.config.js,
src/main/main.js, src/main/windowManager.js, src/renderer/index.html, src/renderer/main.jsx,
src/renderer/App.jsx, and src/renderer/components/Island.jsx with the idle dark sliver.
Explain each file briefly."

Option B (continuing):
"Phase [X] is complete. Now generate the code for Phase [X+1]. Show me only the files
that change or are new. Explain what each piece does."

Option C (debugging):
"I am on Phase [X]. Here is my current code: [paste your code]. Here is the problem
I am experiencing: [describe exact symptom]. Diagnose and fix it."

Option D (explanation):
"Explain how [specific part] works before writing any code. I want to understand it first."

---

### RULES FOR YOUR RESPONSE
1. Write working, complete code — no placeholders, no "add your logic here" comments
2. If something has a known Windows-specific gotcha, warn me before I hit it
3. Do not suggest changing the stack, architecture, or file structure
4. If I ask for one phase, do not implement future phases
5. After each phase, tell me exactly how to test it and what success looks like
6. All animations must use Framer Motion — no raw CSS transitions for state changes
7. The three-state model (idle/compact/expanded) is non-negotiable — match Notchflow's feel

---