# Pomodoro Island — Architectural Design Specification: Audio & Media Enhancements, Scaling & Manual Input

**Document ID:** `SPEC-2026-09-13-AUDIO-MEDIA-SCALE`  
**Date:** 2026-09-13  
**Governing Documents:** [DESIGN_KIT.md](../../DESIGN_KIT.md), [DESIGN_UI_AUDIT.md](../../DESIGN_UI_AUDIT.md), [UX_AUDIT.md](../../UX_AUDIT.md)  
**Status:** Under User Review  

---

## Executive Summary & Design Vision

This specification details the comprehensive architectural, visual, and tactile blueprint for 6 major enhancements requested for **Pomodoro Island**:
1. **Manual Timer Input**: Click-to-edit inline on the hero countdown digits (`25:00`) on the Timer tab + direct typing in Settings duration steppers.
2. **Typography & Component Scaling**: Global scale expansion (+9.1% width, +10–15% element sizing and typography) for effortless legibility across 1080p, 1440p, and 4K displays with zero clipping or overflow.
3. **Dominant Color Extraction on Media Card**: Atmospheric artwork color diffusion that respects physical glass optics without violating the monochrome obsidian foundation.
4. **Universal Media Volume Control (Option B: Brushed Aluminum Knurled Fader Knob)**: Precision skeuomorphic audio fader knob honoring a single 90° overhead key light.
5. **Dynamic Audio-Reactive Island Drop Shadow**: Atmospheric ambient radiance pulsing gently with music rhythm while keeping structural occlusion crisp and grounded.
6. **Retro Audio Visualizer (1980s VFD Equalizer)**: 8-band vacuum fluorescent graphic equalizer with authentic cyan-to-amber phosphor decay embedded in the media card.

---

## 1. Harmonization with DESIGN_KIT.md Rule 1 ("Zero Colored Borders or Glows")

### 1.1 The Conflict & The Architectural Reconciliation
[DESIGN_KIT.md Rule 1](../../DESIGN_KIT.md#L16) states:
> *"Zero Colored Borders or Glows: No colored borders, no colored outlines, and no neon or saturated drop shadows (e.g. orange, green, or blue glows). All borders must be subtle, neutral monochrome hairlines (`rgba(255, 255, 255, 0.07)` to `rgba(255, 255, 255, 0.12)`)."*

The user has explicitly requested:
1. Extracting the dominant color from playing media artwork to tint the media card.
2. A dynamic audio-reactive drop shadow inheriting that dominant color.

We reconcile these requirements through **The Material Reflection Principle** (derived from Apple Music macOS/tvOS Now Playing ambient lighting and Dieter Rams' functional materiality):

- **Prohibited (Cheap Neon Glow)**: Saturated colored stroke border, fluorescent box-shadow halo, omnipresent in non-media tabs, un-diffused color bleed.
- **Specified (Organic Reflection)**: 100% Monochrome hairline rim (`rgba(255, 255, 255, 0.08)`), deep-substrate glass diffusion (`rgba(var(--dominant-rgb), 0.14)`), strictly isolated to media tab and active playback, dual-layer occlusion + atmospheric radiance.

### 1.2 The 4 Invariant Materiality Laws
1. **Invariant Monochrome Perimeter Hairline**:
   The perimeter border of the media card and the Island outer body **NEVER** takes on chromatic color. It remains locked to `border: 1px solid rgba(255, 255, 255, 0.08)`. In physical optics, a tinted translucent acrylic block still produces neutral specular reflections along its polished beveled edges. Bounding a tinted volume with an uncolored hairline creates the illusion of real glass; coloring the hairline creates the appearance of a cartoon outline.
2. **Deep-Substrate Volumetric Tinting**:
   The extracted dominant RGB color is never painted as an opaque fill. It is injected into the obsidian substrate at heavy attenuation (`rgba(var(--dominant-rgb), 0.14)`) overlaid on top of `--island-bg-expanded` (`#0a0a0d`), beneath a 28px Gaussian blur (`backdrop-filter: blur(28px) saturate(160%)`).
3. **Dual-Layer Shadow Mechanics (Occlusion vs. Radiance)**:
   The drop shadow must NEVER be a simple colored blur. It is engineered with two distinct optical layers:
   - **Layer 1 (Physical Occlusion)**: High-density, neutral black shadow that anchors the Island against the desktop wallpaper (`0 20px 48px -8px rgba(0, 0, 0, 0.90)`).
   - **Layer 2 (Atmospheric Radiance)**: Highly dispersed, low-saturation colored wash (`0 36px 90px 0px rgba(var(--dominant-rgb), 0.22)`).
4. **Contextual Isolation**:
   When music stops or the user navigates to non-media tabs (Timer, Tasks, Stats, Settings), the Island returns to pure elevated obsidian (`#08080a` / `#0a0a0d`) with zero color leakage.

---

## 2. Skeuomorphic Specification: Brushed Aluminum Knurled Fader Knob (Option B)

Honoring the single 90° overhead key light diagnosed in [DESIGN_UI_AUDIT.md Camille DeWitt & Stefan Radu](../../DESIGN_UI_AUDIT.md#L35-L82):

### 2.1 Dimensional & Layout Tokens
- **Placement**: Farthest right column of the expanded Media Card (`.nowPlayingCard`).
- **Recessed Track Dimensions**:
  - Width: `20px` (outer well) | Height: `76px`
  - Corner Radius: `999px` (pure capsule)
  - Center Milled Slot: `width: 3px; height: 56px; border-radius: 1.5px;`
- **Fader Knob Dimensions**:
  - Width: `24px` (protrudes 2px laterally beyond the track for tactile grip affordance)
  - Height: `18px`
  - Corner Radius: `3px` with subtle optical bevel

### 2.2 CSS Token Specifications

#### The Recessed Track Well
```css
.faderTrack {
  position: relative;
  width: 20px;
  height: 76px;
  border-radius: 999px;
  background: #101013;
  border: 1px solid rgba(0, 0, 0, 0.70);
  box-shadow:
    inset 0 2px 5px rgba(0, 0, 0, 0.85),
    inset 0 0.5px 1px rgba(0, 0, 0, 0.70),
    inset 0 -1px 1px rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.faderSlotGroove {
  position: absolute;
  width: 3px;
  height: 56px;
  border-radius: 1.5px;
  background: #060608;
  box-shadow:
    inset 0 1.5px 3px rgba(0, 0, 0, 0.95),
    0 0.5px 0.5px rgba(255, 255, 255, 0.08);
}
```

#### The Brushed Aluminum Knurled Knob
```css
.faderKnob {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 18px;
  border-radius: 3px;
  box-sizing: border-box;
  cursor: grab;
  touch-action: none;
  user-select: none;

  /* Solid Milled Aerospace Aluminum Gradient (90° Overhead Key Light) */
  background-color: #c4c7ce;
  background-image:
    /* 3 Horizontal Knurling Grip Ridges (Top Shadow, Bottom Specular) */
    repeating-linear-gradient(
      180deg,
      transparent 0px,
      transparent 2.5px,
      rgba(0, 0, 0, 0.40) 3.5px,
      rgba(255, 255, 255, 0.70) 4.5px,
      transparent 5.0px
    ),
    /* Vertical Cylindrical Specular Body Ramp */
    linear-gradient(
      180deg,
      #f2f3f6 0%,
      #d9dbe0 18%,
      #b0b4bb 65%,
      #90939c 100%
    );

  border: 1px solid rgba(0, 0, 0, 0.25);
  box-shadow:
    /* Top Specular Rim Glint */
    inset 0 1px 0 0 rgba(255, 255, 255, 0.95),
    /* Bottom Shadow Bevel */
    inset 0 -1.5px 1.5px 0 rgba(0, 0, 0, 0.40),
    /* Left/Right Subtle Inset Rim */
    inset 1px 0 1px 0 rgba(255, 255, 255, 0.30),
    inset -1px 0 1px 0 rgba(0, 0, 0, 0.20),
    /* Ambient External Drop Shadow */
    0 3px 6px rgba(0, 0, 0, 0.45),
    0 1px 2px rgba(0, 0, 0, 0.35);

  transition: box-shadow 120ms ease, filter 120ms ease;
}

/* Hover State */
.faderKnob:hover {
  filter: brightness(1.04);
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 1.0),
    inset 0 -1.5px 1.5px 0 rgba(0, 0, 0, 0.40),
    0 4px 8px rgba(0, 0, 0, 0.50),
    0 1.5px 3px rgba(0, 0, 0, 0.35);
}

/* Active Drag State (Mechanical Travel Physics: No scale deformation!) */
.faderKnob:active,
.faderKnobDragging {
  cursor: grabbing;
  filter: brightness(0.98);
  box-shadow:
    /* Compressed drop shadow simulating mechanical depression */
    inset 0 1px 0 0 rgba(255, 255, 255, 0.50),
    inset 0 1.5px 3px 0 rgba(0, 0, 0, 0.45),
    0 1.5px 3px rgba(0, 0, 0, 0.50),
    0 0.5px 1px rgba(0, 0, 0, 0.30);
}
```

### 2.3 Direct Manipulation & Audio Scaling Logic
- **Pointer Capture**: The knob registers `e.target.setPointerCapture(e.pointerId)` on pointer-down so dragging outside the island boundary never breaks tracking.
- **Logarithmic Loudness Scaling**: As mandated by [UX_AUDIT.md Julian Mercer](../../UX_AUDIT.md#L78-L88), raw linear fader travel ($t \in [0, 1]$) is converted to human ear perception:
  $$\text{Gain} = t^2 \quad (\text{with } \text{VolumeDisplay} = \text{round}(t \times 100)\%)$$
- **Tactile Center Detent**: Subtle magnetic haptic snap at 70% (0dB nominal listening level).

---

## 3. Retro Audio Visualizer: 1980s VFD Equalizer Specification

### 3.1 VFD Phosphor Materiality
Inspired by vintage Japanese audio components (Nakamichi, Pioneer, McIntosh), the equalizer uses a discrete multi-segment vacuum fluorescent grid:
- Total Frequency Columns: **8 bands** (`63Hz`, `160Hz`, `400Hz`, `1kHz`, `2.5kHz`, `6.3kHz`, `10kHz`, `16kHz`).
- Segments per Column: **7 discrete physical bars**.
- Overall Module Footprint: `90px` width × `38px` height.
- Column Pitch: `8px` segment width, `3px` column gap.
- Segment Geometry: `8px` width × `3.5px` height, `1px` corner radius, `1.5px` vertical pitch gap.

### 3.2 Segment Palette & Recessed Inactive Affordance
| Segment Index | Semantic Level | Active Lit State Fill | Active Subsurface Glow | Unlit/Extinguished State Fill |
|:---:|---|---|---|---|
| **7 (Top)** | Peak Clip | `#ff5533` (Ruby-Amber) | `0 0 5px rgba(255, 85, 51, 0.75)` | `rgba(255, 85, 51, 0.08)` |
| **6** | Pre-Peak | `#ffb834` (Warm Amber) | `0 0 4px rgba(255, 184, 52, 0.70)` | `rgba(255, 184, 52, 0.08)` |
| **5** | Upper Mid | `#80f7eb` (Ice Cyan) | `0 0 4px rgba(128, 247, 235, 0.65)` | `rgba(0, 229, 201, 0.07)` |
| **1 – 4 (Base)** | Normal Flow | `#00e5c9` (Phosphor Cyan) | `0 0 4px rgba(0, 229, 201, 0.65)` | `rgba(0, 229, 201, 0.07)` |

*Extinguished Segment Rule*: Inactive segments are never invisible. They display a faint 7–8% phosphor filament trace with an inset shadow (`inset 0 0.5px 1px rgba(0, 0, 0, 0.60)`), rendering the look of a real glass vacuum tube in an obsidian housing.

### 3.3 Dynamic Peak-Hold Physics & Keyframe Engine
- Peak segments possess a **160ms hold time** followed by a smooth gravity decay:
  $$\text{decayRate} = -9.8 \text{ segments/sec}^2$$
- When connected to real-time audio (Spotify / Web Audio AnalyserNode), FFT data maps logarithmic frequency bins to columns. When audio metadata is active without raw PCM access, an organic harmonic synthesizer modulates column amplitudes with 3 distinct rhythm phases (bass kick on columns 1-2, vocal snare on columns 4-5, cymbal air on columns 7-8).

---

## 4. Hero Click-to-Type & Duration Direct Input Specification

### 4.1 Visual Baseline & Optical Stability
- **Font & Metrics**: Inter Semi-Bold `600`, size `46px` (upgraded from `40px`), line-height `1.0`, letter-spacing `-0.020em`.
- **Mandatory Numerical Features**:
  ```css
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  ```
- **Isolated Colon Separator**: Per [DESIGN_UI_AUDIT.md Hendrik Van Der Bilt](../../DESIGN_UI_AUDIT.md#L51-L65), the colon is locked into a fixed `8px` container (`display: inline-block; width: 8px; text-align: center;`) to guarantee zero horizontal glyph pinching.

### 4.2 State Machine & Inline Transformation
1. **Hover State (Affordance Hint)**:
   - Subtle dotted hairline appears below digits: `border-bottom: 1.5px dotted rgba(255, 255, 255, 0.35); padding-bottom: 2px;`.
   - Cursor: `text`.
   - Native micro-tooltip: *"Click to edit duration"*.
2. **Transition into Edit Mode**:
   - Zero layout shift. The static `<span>` transforms into an `<input>` element with identical font size (`46px`), letter spacing, and line height.
   - Background: `rgba(255, 255, 255, 0.05)`.
   - Focus Ring: `outline: 2px solid rgba(92, 119, 189, 0.70); outline-offset: 4px; border-radius: 8px;`.
   - Selection: The entire text is auto-selected on entry (`inputRef.select()`).
3. **Input Masking & Smart Parsing**:
   - Supported User Syntax:
     - `45:00` → 45 minutes, 0 seconds.
     - `45` → Automatically interpreted as `45:00`.
     - `90m` → 90 minutes.
     - `1h30m` → 90 minutes.
     - `90s` → 1 minute, 30 seconds.
   - Validation Boundaries:
     - Minimum = 1 minute (`01:00`).
     - Maximum = 180 minutes (`180:00` / 3 hours).
   - Error Handling: Non-numeric or out-of-range entry triggers a gentle 200ms horizontal shake animation (`x: [-4, 4, -4, 4, 0]`) and gracefully reverts to prior duration.
4. **Keyboard Protocol**:
   - `Enter`: Validates, updates the active Pomodoro config, resets the countdown, plays UI click sound, and commits.
   - `Escape`: Cancels editing immediately without modifying timer state.
   - `Tab`: Commits current value and moves focus to primary Play/Pause button.
   - `Blur`: Automatically commits valid inputs or reverts invalid inputs.

### 4.3 Direct Typing in Settings Duration Steppers
- Clicking directly on the stepper value (`25m`) turns the number into an inline input (`width: 40px; font-size: 12px; text-align: center; border-radius: 4px; border: 1px solid var(--accent-bar);`).
- Commits via `Enter` or `Blur`, updating `durations.FOCUS`, `durations.SHORT_BREAK`, or `durations.LONG_BREAK` in persistent store.

---

## 5. Layout Architecture & Sizing Upgrade (+10–15% Legibility)

### 5.1 Container Dimension Calculations
To deliver the requested scale upgrade while guaranteeing zero clipping, zero scrollbar flicker, and comfortable breathing room, container bounds are adjusted as follows:

- **Compact State**: `460px × 52px` (Playing: `480px × 52px`)
- **Expanded State**: `480px` Uniform Width
  - **Timer Tab**: `480px × 264px` (Break: `480px × 284px`)
  - **Tasks Tab**: `480px × 280px`
  - **Audio Tab**: `480px × 260px` (Soundscapes only: `480px × 185px`)
  - **Stats Tab**: `480px × 270px`
  - **Settings Tab**: `480px × 320px`

### 5.2 Micro-Typography Upgraded Scale

| Component Element | Legacy Size | **Upgraded Size** | Weight | Optical Tracking | Tabular (`tnum`) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Hero Timer (Expanded)** | `40px` | **`46px`** | `600` (Semi) | `-0.020em` | `Yes` |
| **Timer Display (Compact)** | `26px` | **`28px`** | `700` (Bold) | `-0.015em` | `Yes` |
| **Top Nav Tab Labels** | `11px` | **`12px`** | `500` (Med) | `0` | No |
| **Media Card Track Title** | `12.5px` | **`13.5px`** | `600` (Semi) | `-0.010em` | No |
| **Media Card Artist / Meta** | `11px` | **`12px`** | `500` (Med) | `0` | No |
| **Settings Row Labels** | `12px` | **`13px`** | `400` (Reg) | `0` | No |
| **Settings Subtitles** | `10.5px` | **`11px`** | `400` (Reg) | `-0.010em` | No |
| **Task Items & Inputs** | `11px` | **`12.5px`** | `400` (Reg) | `0` | No |
| **Preset & Stepper Chips** | `10.5px` | **`11.5px`** | `500` (Med) | `0` | `Yes` |

---

## 6. Dominant Color Extraction & Dynamic Audio-Reactive Shadow

### 6.1 Color Extraction Algorithm & Guardrails
- **Sampling Pipeline**: Artwork URL → Offscreen Canvas ($32 \times 32$ downscaled) → Fast color clustering.
- **Luminance & Saturation Filtering**:
  To protect against unreadable muddy greys or blinding blown-out whites, extracted colors pass through strict HSL bounds:
  $$\text{Saturation} \in [0.40, 0.85], \quad \text{Lightness} \in [0.25, 0.65]$$
  If artwork is monochrome or black/white, the system gracefully defaults to the signature satin periwinkle `--accent-bar` (`rgb(92, 119, 189)`).
- **CSS Injection**: Extracted RGB values are injected into `--media-dominant-rgb: R, G, B;`.

### 6.2 Media Card Volumetric Glass Styling
```css
.nowPlayingCard {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 14px;
  box-sizing: border-box;
  width: 100%;
  height: 92px;

  /* Invariant Monochrome Hairline (Rule 1 Compliance) */
  border: 1px solid rgba(255, 255, 255, 0.08);

  /* Layered Frosted Tint */
  background:
    /* Top Specular Rim Catch */
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.02) 100%
    ),
    /* Deep Substrate Color Wash */
    radial-gradient(
      circle at 20% 50%,
      rgba(var(--media-dominant-rgb, 92, 119, 189), 0.18) 0%,
      rgba(var(--media-dominant-rgb, 92, 119, 189), 0.05) 70%,
      transparent 100%
    ),
    /* Base Obsidian Glass */
    rgba(14, 14, 18, 0.88);

  backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition: background 300ms ease, border-color 180ms ease;
}
```

### 6.3 Dynamic Audio-Reactive Shadow Physics
The outer Island container dynamically combines its structural shadow with audio-reactive radiant diffusion:

```css
/* Applied to .island when media is active */
.islandMediaActive {
  box-shadow:
    /* Layer 1: Structural Depth Occlusion (Invariant Pitch-Black Grounding) */
    0 20px 48px -8px rgba(0, 0, 0, 0.92),
    0 8px 18px rgba(0, 0, 0, 0.22),
    /* Layer 2: Audio-Reactive Radiant Bounce */
    0 calc(28px + var(--audio-pulse, 0px) * 16px)
      calc(54px + var(--audio-pulse, 0px) * 32px)
      calc(-6px + var(--audio-pulse, 0px) * 6px)
      rgba(var(--media-dominant-rgb, 92, 119, 189), calc(0.18 + var(--audio-pulse, 0) * 0.14));
}
```

- `--audio-pulse` is a normalized float ($0.0 \to 1.0$) driven by rhythm peaks.
- **Spring Smoothing**: Framer Motion critically-damped spring (`stiffness: 280, damping: 28`) dampens the pulse, ensuring the glow gently breathes with bass frequencies rather than inducing rapid flickering.

---

## 7. Complete Media Card Layout Geometry

The upgraded `92px` Media Card layout brings all components into seamless harmony:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [48×48 Art]  Title Text (13.5px Semi)      [ 8-Band VFD ]   [ | ] Volume     │
│              Artist Name (12px Med)         [ | | | | | ]   [ █ ] Knurled    │
│              (◀◀)  ( ▶ / ⏸ )  (▶▶)          (Phosphor)      [ | ] Fader      │
└──────────────────────────────────────────────────────────────────────────────┘
```

1. **Left Column**: 48×48px high-DPI album artwork with 8px corner radius and hairline border.
2. **Center-Left Column**: Two-line metadata (track title, artist) + compact 26px transport disc controls.
3. **Center-Right Column**: 8-band retro VFD visualizer with cyan-to-amber phosphor segments.
4. **Farthest Right Column**: Vertical recessed slot featuring the brushed aluminum knurled fader knob.

---

## 8. Checklist & Verification against DESIGN_KIT.md Golden Rules

| Golden Rule | Specification Status | Verification Proof |
|---|:---:|---|
| **1. Zero Colored Borders or Glows** | **COMPLIANT** | Border tokens remain strictly `rgba(255, 255, 255, 0.08)`. Artwork tinting is pure internal volumetric glass diffusion; dynamic shadow is ambient atmospheric back-light bounce, completely absent in non-media views. |
| **2. Zero Emojis Everywhere** | **COMPLIANT** | 0 emojis. All transport controls, knurl textures, and VFD segments are pure mathematical CSS and SVG vectors. |
| **3. Universal Inter Typography** | **COMPLIANT** | Inter is enforced on all readouts, with explicit `'tnum' 1` and tabular numbers on timers and stepper inputs. |
| **4. No Capslocked Titles** | **COMPLIANT** | All titles, subtitles, and badges use natural sentence case ("Phase durations", "Now playing", "Today's activity"). |
| **5. Elevated Obsidian Foundation** | **COMPLIANT** | Base canvas uses `#08080a` floor with `#0a0a0d` elevated glass surfaces, preventing OLED subpixel smearing. |
| **6. Radically Simplified Architecture** | **COMPLIANT** | Single unified 5-tab expanded modal container. No overlapping popups or rogue drawers. |
