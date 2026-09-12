# Pomodoro Island — Design Kit & UI/UX Specification

> **The Single Source of Truth for Pomodoro Island Design System**  
> All agents, developers, and UI components must strictly adhere to the standards, tokens, constraints, and layout guidelines established in this document.

---

## 1. Core Philosophy & Golden Rules

Pomodoro Island is an ambient, desktop-integrated productivity companion inspired by Apple's Dynamic Island and WWDC *Designing Fluid Interfaces* principles. It lives quietly at the top of the user's display, transitioning between unobtrusive glances and actionable control without demanding undue attention.

### The 6 Non-Negotiables

| # | Rule | Strict Enforcement |
|---|---|---|
| **1** | **Zero Colored Borders or Glows** | No colored borders, no colored outlines, and no neon or saturated drop shadows (e.g. orange, green, or blue glows). All borders must be subtle, neutral monochrome hairlines (`rgba(255, 255, 255, 0.07)` to `rgba(255, 255, 255, 0.12)`). |
| **2** | **Zero Emojis Everywhere** | Emojis (e.g. 🎯, 🌿, 🧠, 🔥, 🔔, 📝, ★) are completely banned across the entire codebase, including UI, alerts, buttons, tabs, tooltips, and system notifications. All iconography must use bespoke, monochrome 12–14px SVG line or geometric fill glyphs. |
| **3** | **Universal Inter Typography** | **Inter** is the exclusive font family for all text elements—timer countdowns, headings, labels, buttons, and body copy. Timers and numerical readouts must use tabular numbers (`font-feature-settings: "tnum" 1`). No monospace font fallbacks (e.g. Azeret Mono) and no system sans fallbacks for primary text. |
| **4** | **No Capslocked Titles** | `text-transform: uppercase` is prohibited. All headings, section headers, badges, and button labels must use natural sentence case or calm title case (e.g., "Phase durations", "Today's activity", "Scratchpad notes"). UI text must feel quiet and conversational, never shouting. |
| **5** | **Deep Black Obsidian Color Space** | The visual foundation is pure, deep black (`#000000` / `#050508`). No muddy dark-gray or blue-slate washes. Elevated surfaces utilize translucent obsidian glass (`rgba(10, 10, 12, 0.85)` with `backdrop-filter: blur(28px) saturate(190%)`). |
| **6** | **Radically Simplified Component Placement** | Eliminate competing overlays, overlapping side-drawers, and cluttered button clusters. Components follow a predictable, three-tier state model (Idle → Compact → Expanded) with clear tabbed separation of secondary features (Tasks, Audio, Stats, Settings). |

---

## 2. Color System & Surface Hierarchy

Pomodoro Island uses a disciplined monochrome foundation where brightness and opacity encode depth and interactive state. Accent colors are strictly limited to tiny, borderless status indicators.

### Surface Elevation Tokens

```css
:root {
  /* Canvas & Obsidian Surfaces */
  --island-bg-idle: #000000;
  --island-bg-compact: rgba(6, 6, 8, 0.92);
  --island-bg-expanded: rgba(8, 8, 10, 0.94);
  --island-blur: blur(28px) saturate(190%);

  /* Hairline Borders (Monochrome only) */
  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-highlight: rgba(255, 255, 255, 0.16);
  --border-specular-top: inset 0 0.5px 0 0 rgba(255, 255, 255, 0.18);

  /* Elevated Containers & Control Cards */
  --surface-card: rgba(255, 255, 255, 0.04);
  --surface-card-hover: rgba(255, 255, 255, 0.08);
  --surface-card-active: rgba(255, 255, 255, 0.12);
  --surface-card-selected: rgba(255, 255, 255, 0.14);

  /* Shadow (Depth without color glow) */
  --island-shadow-compact: 0 10px 30px -5px rgba(0, 0, 0, 0.8);
  --island-shadow-expanded: 0 20px 48px -8px rgba(0, 0, 0, 0.9);
}
```

### Typography Color Tokens

```css
:root {
  /* High contrast white down to quiet tertiary */
  --text-primary: rgba(255, 255, 255, 0.96);      /* Timer numbers, active headings */
  --text-secondary: rgba(255, 255, 255, 0.62);    /* Labels, descriptions, inactive tabs */
  --text-tertiary: rgba(255, 255, 255, 0.38);     /* Microcopy, empty states, shortcuts */
  --text-quaternary: rgba(255, 255, 255, 0.20);   /* Disabled controls, dividers */
}
```

### Phase Status Representation (Borderless)

Phase status must **never** tint island borders or create drop-shadow halos. Status is communicated with subtlety via a minimal 4px dot or a delicate background badge fill:

| Phase | Accent Color Token | Usage | Prohibited Usage |
|---|---|---|---|
| **Focus** | `#f5a623` (Warm Amber) | 4px status dot or `rgba(245, 166, 35, 0.12)` pill chip | ❌ Border outlines, card glows, neon shadows |
| **Short Break** | `#30d158` (Apple Mint) | 4px status dot or `rgba(48, 209, 88, 0.12)` pill chip | ❌ Border outlines, card glows, neon shadows |
| **Long Break** | `#0a84ff` (Apple Blue) | 4px status dot or `rgba(10, 132, 255, 0.12)` pill chip | ❌ Border outlines, card glows, neon shadows |
| **Custom / Idle** | `#e5e5ea` (Neutral Silver) | 4px status dot or `rgba(255, 255, 255, 0.10)` pill chip | ❌ Border outlines, card glows, neon shadows |

---

## 3. Typography System (Inter Exclusive)

Pomodoro Island uses **Inter** throughout the entire application. We honor Apple's optical sizing, tracking, and leading principles (WWDC 2020 *The Details of UI Typography*).

```css
/* Typography Baseline */
body, button, input, select, textarea {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Typography Scale & Optical Tracking

| Level | Size | Weight | Line Height | Letter Spacing | Feature Settings | Example Usage |
|---|---|---|---|---|---|---|
| **Timer Display (Hero)** | `44px` | `600` (Semi) | `1.0` | `-0.035em` | `'tnum' 1` | `24:58` in Expanded view |
| **Timer Display (Compact)** | `18px` | `600` (Semi) | `1.0` | `-0.025em` | `'tnum' 1` | `24:58` in Compact bar |
| **Title / Major Heading** | `15px` | `600` (Semi) | `1.2` | `-0.015em` | Normal | Modal headers, view title |
| **Section Header** | `13px` | `500` (Med) | `1.3` | `-0.010em` | Normal | "Phase durations", "Activity" |
| **Body / Inputs** | `12px` | `400` (Reg) | `1.4` | `0` | Normal | Task title, notes, settings text |
| **Tab / Button Label** | `12px` | `500` (Med) | `1.2` | `0` | Normal | "Timer", "Tasks", "Audio" |
| **Micro / Sub-label** | `10.5px`| `500` (Med) | `1.2` | `+0.015em` | Normal | "Session 1 of 4", "Shortcut" |

### Tabular Numerals Rule
All countdown timers, session counters, duration metrics, and streak tallies **must** have:
```css
font-variant-numeric: tabular-nums;
font-feature-settings: 'tnum' 1;
```
This guarantees that numbers do not jitter horizontally as seconds change.

### Sentence Case Rule
Never use `text-transform: uppercase`.
```css
/* ❌ Prohibited */
.title { text-transform: uppercase; letter-spacing: 0.1em; } /* "PHASE DURATIONS" */

/* ✅ Required */
.title { font-size: 13px; font-weight: 500; color: var(--text-secondary); } /* "Phase durations" */
```

---

## 4. Iconography System (No Emojis)

Every emoji in the application is replaced with an SVG icon conforming to Apple's SF Symbols geometric grammar:
- **Default dimensions**: `12px × 12px` or `14px × 14px` (touch targets padded to at least `28px × 28px`).
- **Stroke characteristics**: `stroke-width: 1.75px`, `stroke-linecap: round`, `stroke-linejoin: round`, `fill: none`.
- **Solid glyphs** (play/pause/stop): Clean rounded corners (`rx="1.2"` or `rx="1.5"`).
- **Color behavior**: Use `currentColor` so icons effortlessly inherit the parent's monochrome text hierarchy.

### Standard Icon Mappings

| Feature | Deprecated Emoji | Apple-Grade Minimal SVG Equivalent |
|---|:---:|---|
| **Active Task / Goal** | 🎯 | Rounded target icon: `<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />` |
| **Scratchpad Notes** | 🧠 / 📝 | Clean document icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>` |
| **Streak / Momentum** | 🔥 | Minimal pulse/flame chevron: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />` |
| **Wellness / Break** | 🌿 / ☕ | Minimalist tea cup or leaf outline SVG |
| **Reminders** | 🔔 | Minimal bell: `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>` |
| **Audio / Soundscapes** | 🎵 | Minimal headphones or sound waves SVG |
| **Settings** | ⚙️ | Modern 6-spoke gear SVG |
| **Primary Display** | ★ | Minimal monitor / display SVG: `<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>` |

---

## 5. Simplified Layout Architecture & Placements

The user found the previous UI overwhelming due to competing drawers, popups, and crowded button groups. The revised architecture enforces strict spatial hierarchy and progressive disclosure.

```
┌─────────────────────────────────────────────────────────────┐
│                    Top Screen Notch Anchor                  │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   [ 1. IDLE ]          [ 2. COMPACT ]       [ 3. EXPANDED ]
  Tiny subtle pill     Single sleek line    Focused modal panel
  (100px × 26px)       (240px × 34px)       (390px × auto)
```

### 1. Idle State (Background Awareness)
- **Dimensions**: ~`100px` to `120px` width, `26px` height.
- **Visuals**: Anchored seamlessly to the screen notch. Pure `#000000` fill with subtle hairline bottom border.
- **Content**:
  - Left: 4px phase dot (warm amber for focus, green for break, or soft white).
  - Right: Remaining time in calm Inter (`24m` or `24:58`).
- **Interaction**: Approaching mouse seamlessly expands to Compact state.

### 2. Compact State (Active Glance — 3-Button Tactile Layout)
- **Dimensions**: `430px` width, `52px` height, anchored to the monitor bezel with concave notch ears and bottom corner radius (`20px`).
- **Visual Design (Exact Style Specification)**:
  - Pure `#000000` obsidian island body with a subtle hairline border, top specular light catch, and smooth concave ears flaring outward into the screen bezel.
  - **Left (2 Tactile 3D Circular Buttons)**:
    - Pause button: 3D ceramic disc (`28px × 28px`), white when active, dimmed when paused, top specular highlight (`inset 0 1px 1px rgba(255,255,255,0.95)`), bottom bevel (`inset 0 -1.5px 2px rgba(0,0,0,0.15)`), and physical drop shadow (`0 3px 6px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.30)`).
    - Play button: Matching 3D ceramic disc (`28px × 28px`), white when paused, dimmed when running.
  - **Center (Countdown Readout)**:
    - Bold Inter `26px` tabular numerals (`font-weight: 700`, `letter-spacing: -0.04em`, line-height `1`).
    - Tabular spacing (`font-variant-numeric: tabular-nums`, `font-feature-settings: 'tnum' 1`) preventing horizontal jitter.
  - **Center-Right (Satin Frosted-Glass Time Bar)**:
    - Matte charcoal recessed track (`background: #2b2b2e`, height `32px`, `max-width: 175px`, `min-width: 120px`, `border-radius: 11px`, deep inset shadows `inset 0 2.5px 5px rgba(0,0,0,0.85), inset 0 1px 2px rgba(0,0,0,0.6)`).
    - Satin frosted-glass gradient fill bar representing the **remaining time left** (drains smoothly from right to left as countdown progresses).
    - Multi-stop diffuse gradient: `#3a4369` (deep muted navy) to `#d0d9ee` (silver ice-blue) with a 3D cylindrical lighting bevel and a signature white specular bulb endcap on the leading right tip (`radial-gradient(ellipse 65% 85% at 94% 50%, rgba(255,255,255,0.88) 0%, transparent 75%)`).
    - Rounded cap corners (`border-radius: 9px`) conforming smoothly within the track.
  - **Right (1 Tactile 3D Circular Button)**:
    - Skip button: Matching 3D ceramic disc (`28px × 28px`) with fast-forward icon; right-click / context menu triggers timer reset.
- **Tactile Toggle Switches (Settings Tab)**:
  - Recessed track (`44px × 22px`, `border-radius: 999px`, `#2b2c32` dark charcoal OFF / `#84d600` Apple green ON) with deep inner shadow (`inset 0 2.5px 5px rgba(0,0,0,0.75)`).
  - Raised 3D ceramic pill thumb (`23px × 18px`, `border-radius: 999px`) with soft drop shadow and top specular rim.
  - Center 5 embossed vertical tactile grip ribs (`repeating-linear-gradient` in 1px steps).
- **Interactions**:
  - Clicking transport buttons triggers actions with instant tactile press response (`:active` scales down to `0.92`).
  - Clicking the progress bar, time, or island body smoothly springs open the 5-tab expanded hub.
- **Zero Clutter**: Pure visual feedback with no colored neon glow, no uppercase text, and no emojis.

### 3. Expanded State (Focused Control Hub)
- **Dimensions**: `390px` width, bounded auto-height (`max-height: 380px`), rounded bottom corners (`20px`).
- **Layout Architecture (Top to Bottom)**:

```
┌─────────────────────────────────────────────────────────────────┐
│ [Timer]  [Tasks]  [Audio]  [Stats]  [Settings]   │  [Collapse] │ Top Navigation
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                             24:58                               │ Hero Countdown
│                     • Focus (Session 1 of 4)                    │ Phase Subtitle
│                                                                 │
│                 [ Reset ]    ( ▶ )    [ Skip ]                  │ Transport Controls
│                                                                 │
│               [ 25m ]   [ 50m ]   [ 5m ]   [ 15m ]              │ Phase Presets
│                                                                 │
│         [ Focus task: Finalizing Q3 architecture...         ]   │ Quick Task Bar
└─────────────────────────────────────────────────────────────────┘
```

#### Layer 1: Top Navigation Bar
- Clean segmented control with 5 clear sections:
  1. **Timer**: The hero Pomodoro control center.
  2. **Tasks**: Dedicated task list & scratchpad notes (clean unified list, no weird popout drawers).
  3. **Audio**: Ambient soundscapes (Rain, Brown noise, White noise, Wind) and volume slider.
  4. **Stats**: Focus tally, streak count, and 7-day focus chart.
  5. **Settings**: Phase durations, auto-start options, display selectors.
- Right end: A single **Collapse** chevron/close button.
- Active tab pill uses Apple `layoutId="activeTabIndicator"` spring transition.

#### Layer 2: Hero Content Area (Timer Tab Default)
1. **Hero Countdown**: Large `44px` Inter display numerals with tabular spacing.
2. **Phase Status Subtitle**: Clean `11.5px` secondary label with a 4px status dot.
3. **Primary Transport Controls**:
   - Left: Reset button (`28px × 28px` rounded pill).
   - Center: Hero Play/Pause button (`40px × 40px` circular white or high-contrast button).
   - Right: Skip button (`28px × 28px` rounded pill).
4. **Duration Presets Row**: 4 segmented chips (`25m`, `50m`, `5m`, `15m`) with subtle active state.
5. **Quick Task Bar**: A single minimal input field ("What are you working on?") that links directly to the current session.

#### Layer 3: Secondary Views (Accessed via Top Tabs, NOT Drawers)
- **Tasks Tab**:
  - Single view with two tidy sections: "Current Tasks" and "Scratchpad".
  - Quick inline add input.
  - Checkboxes with instant strike-through and quiet delete actions.
- **Audio Tab**:
  - Soundscape selector grid/list (Off, Rain, Brown Noise, White Noise, Wind).
  - Minimal horizontal volume slider with live 1:1 pointer tracking.
- **Stats Tab**:
  - 3 metric cards in a row: "Today" (mins), "Completed" (sessions), "Streak" (days).
  - Minimal 7-day activity bar chart with monochrome fills.
- **Settings Tab**:
  - Clean rows with duration steppers (Focus, Short Break, Long Break).
  - Direct toggle switches for "Auto-start breaks" and "Auto-start focus".
  - Display selector dropdown.

---

## 6. Motion, Physics & Tactile Feedback

Derived from Apple WWDC 2018 *Designing Fluid Interfaces*:

### Spring Physics Configurations

```js
// Standard Apple critically-damped spring (smooth settle, zero overshoot)
export const APPLE_SPRING_DEFAULT = {
  type: 'spring',
  damping: 1.0,
  stiffness: 380,
  mass: 0.85,
};

// Snappy control interaction (switches, buttons, active tab pill)
export const APPLE_SPRING_SNAPPY = {
  type: 'spring',
  damping: 1.0,
  stiffness: 500,
  mass: 0.7,
};

// Physical drag / flick release (slight natural settle)
export const APPLE_SPRING_MOMENTUM = {
  type: 'spring',
  damping: 0.82,
  stiffness: 320,
  mass: 0.9,
};
```

### Tactile Feedback (Kill Latency)
- **Pointer-down reaction**: Buttons must scale down on pointer-down (`:active`), not on mouse-up.
  ```css
  button:active {
    transform: scale(0.96);
    transition: transform 60ms ease-out;
  }
  ```
- **Direct 1:1 manipulation**: Sliders and drag handles track pointer coordinates 1:1 using `setPointerCapture`.
- **Interruptible state transitions**: If the user hovers into the island and immediately hovers out, the Framer Motion spring must reverse from the current presentation value without completing the opening animation first.

---

## 7. Accessibility & Preference Support

```css
/* Reduced Motion: replace spring morphs with crisp opacity cross-fades */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Reduced Transparency: switch frosted glass to solid deep black */
@media (prefers-reduced-transparency: reduce) {
  :root {
    --island-bg-compact: #000000;
    --island-bg-expanded: #000000;
    --island-blur: none;
    --surface-card: #121216;
  }
}

/* High Contrast: crisper hairlines */
@media (prefers-contrast: more) {
  :root {
    --border-subtle: rgba(255, 255, 255, 0.25);
    --border-default: rgba(255, 255, 255, 0.40);
  }
}
```

---

## 8. Agent Implementation Checklist

Before declaring any feature, fix, or UI refactor complete, the agent must verify every item:

- [ ] **No Emojis**: Grep search confirms 0 emoji characters in code, JSX, labels, tooltips, or tests.
- [ ] **No Colored Borders**: No `border: 1px solid var(--phase-color)` or colored box-shadow glows.
- [ ] **No Uppercase Titles**: No `text-transform: uppercase` in CSS modules; titles are sentence-cased.
- [ ] **Inter Font Exclusively**: Inter is imported and applied to root and all components; timers use tabular figures.
- [ ] **Deep Black Background**: Backgrounds use `#000000` / `#060608` with subtle monochrome hairlines.
- [ ] **Placement Simplicity**: Components live in their dedicated tab views; no overlapping multi-drawer chaos.
- [ ] **Apple Springs**: Motion transitions use critically damped springs without distracting cartoon bounce.
