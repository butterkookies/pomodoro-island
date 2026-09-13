# Visualizer Movement, Acoustic Accuracy & Media Card Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the frozen/inaccurate VFD visualizer, integrate real Web Audio analysis with volume scaling, and resolve the media card layout, hierarchy, and materiality issues based on a comprehensive 10-tester QA audit.

**Architecture:** 
1. Eliminate the `prefers-reduced-motion` dead-freeze bug in `VfdEqualizer.jsx` and replace static freezes with graceful low-energy rhythmic breathing.
2. Wire `ambientPlayer.js` Web Audio `AnalyserNode` to supply real-time FFT frequency bin levels to `VfdEqualizer` when soundscapes are active, and implement dynamic volume/beat-reactive synthesis when external media plays.
3. Overhaul `NowPlayingCard` in `ExpandedView.jsx` and `ExpandedView.module.css` to fix column cramping, enlarge artwork, elevate transport controls to primary/secondary tactile hierarchy, add marquee hover on long titles, and harmonize the skeuomorphic volume fader.

**Tech Stack:** React 18, Web Audio API (`AudioContext`, `AnalyserNode`), CSS Modules, Framer Motion, Node.js Test Runner (`node:test`, `esbuild`).

---

## 1. 10-Tester QA Simulation & Diagnostic Findings

### Tester 1: Liam O'Connor (Animation Lifecycle & Performance QA)
- **Issue:** The visualizer does not move at all—it is completely frozen.
- **Root Cause:** In [`VfdEqualizer.jsx`](src/renderer/components/VfdEqualizer.jsx#L227-L245), `mediaQuery.matches` for `(prefers-reduced-motion: reduce)` triggers `applyReducedMotion()`, which calls `stopAnimation()` (clearing the `setInterval`) and hardcodes static levels `[2, 3, 4, 3, 3, 2, 2, 1]`. On Windows, reduced motion is often enabled system-wide by default, killing the equalizer immediately.
- **Improvement:** Audio visualizers are dynamic indicators, not gratuitous UI transitions. Replace the dead freeze with an organic, low-amplitude rhythmic breathing mode if reduced motion is requested, and ensure the default active state runs a smooth 60fps requestAnimationFrame / 80ms interval engine.

### Tester 2: Takashi Sorayama (Acoustic Fidelity & Audio Analysis QA)
- **Issue:** The visualizer is "nor accurate"—it does not reflect the audio actually playing.
- **Root Cause:** `VfdEqualizer` currently calculates levels using hardcoded mathematical sine waves (`Math.sin(t * 4.4)...`) completely detached from sound. When soundscapes (White, Brown, Rain, Wind) play, the visualizer ignores them.
- **Improvement:** Attach an `AnalyserNode` to `ambientPlayer`'s `AudioContext` to feed real FFT frequency bin data (63Hz–16kHz) to `VfdEqualizer` when soundscapes are active. When external media is playing, scale the synthesis by `mediaVolume`, track playback state, and introduce dynamic peak variation.

### Tester 3: Elena Rostova (Spatial Geometry & Layout Architecture QA)
- **Issue:** The Media Card layout is horizontally cramped into 4 rigid columns, causing extreme text clipping.
- **Root Cause:** In [`ExpandedView.module.css`](src/renderer/components/ExpandedView.module.css#L562-L680), the card is divided into Artwork (Col 1), Meta + Controls (Col 2), Equalizer (Col 3), and Fader (Col 4). Column 2 is squeezed into ~130px, forcing the track title to truncate after only 20-25 characters (`Watch Chad Powers S2 Episod...`).
- **Improvement:** Re-architect the card layout: expand Column 2 width, allow the title to occupy a generous horizontal span with subtle auto-marquee on hover, and vertically harmonize artwork, controls, equalizer, and volume fader.

### Tester 4: Marcus Vance (Tactile Materiality & VFD Phosphor Optics QA)
- **Issue:** VFD unlit segments are barely perceptible, making the visualizer look like disconnected floating teeth rather than an authentic 1980s vacuum fluorescent display.
- **Root Cause:** [`.vfdSegment:not(.lit)`](src/renderer/components/VfdEqualizer.module.css#L38) uses `rgba(0, 229, 201, 0.07)`, which lacks contrast against the dark background. The peak-hold dots use `filter: brightness(1.1)` which is visually indistinguishable from active lit bars.
- **Improvement:** Increase unlit segment trace to `rgba(0, 229, 201, 0.14)` with subtle phosphor grid lines, render peak-hold segments with a distinct ruby-amber hue and specular glow, and add a delicate glass faceplate bezel with top specular light reflection.

### Tester 5: Jonas Lindemann (Braun/Rams Minimalist Card Hierarchy QA)
- **Issue:** The Media Card looks like a heavy "box inside a box" floating awkwardly on top of the obsidian island.
- **Root Cause:** The card uses an opaque border (`border: 1px solid rgba(255, 255, 255, 0.08)`) and high-contrast background that fights against the surrounding obsidian island surface.
- **Improvement:** Soften the card boundary using volumetric frosted glass (`backdrop-filter: blur(24px)`), integrate a subtle top hairline highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.10)`), and tint the card with the sampled dominant album artwork color (`var(--media-dominant-rgb)`).

### Tester 6: Sylvia Chen (Iconography & Button Ergonomics QA)
- **Issue:** Transport buttons are all identical 26px circles with tiny 10px icons; Play/Pause lacks visual primacy.
- **Root Cause:** All three buttons use `.mediaMiniBtn` (`width: 26px; height: 26px;`).
- **Improvement:** Establish a clear visual hierarchy:
  - Play/Pause: Primary 30px circular disc with prominent high-contrast glyph.
  - Previous / Next: Secondary 24px discs with refined 11px glyphs.
  - Add physical actuation travel (`translateY(1px)`) rather than rubber-stamp scaling (`scale(1.06)`).

### Tester 7: Sophie Dubois (Micro-Typography & Metadata Legibility QA)
- **Issue:** Long track titles are permanently truncated with no way to read the full episode or song name; subtitle "Media Audio" is bland.
- **Root Cause:** Fixed `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` with no hover interaction or tooltips.
- **Improvement:** Add smooth CSS marquee scrolling on hover for truncated titles, display clean artist info or source app badges ("Spotify", "Browser"), and format typography with tabular numeral support.

### Tester 8: Stefan Radu (Skeuomorphic Fader Alignment QA)
- **Issue:** The volume fader knob hits the top edge of the track at 100%, the "100%" label is cramped against the card bottom, and the 1px divider is harsh.
- **Root Cause:** `SkeuoVolumeFader` has fixed 76px height in a 104px card, and `.mediaCardDivider` is a solid 60px line.
- **Improvement:** Soften the divider into a subtle diffuse gradient, calibrate fader vertical padding so the knurled knob never clips past the chassis, and cleanly format the percentage readout tag.

### Tester 9: Kavita Patel (Cross-Source Audio State & Soundscape Routing QA)
- **Issue:** When external media is paused, but a soundscape (like "Wind" at 26% in the screenshot) is playing, the equalizer is dormant.
- **Root Cause:** `VfdEqualizer` is only rendered inside `NowPlayingCard`, which hides completely or stops when `nowPlaying.isPlaying` is false.
- **Improvement:** Support dual audio visualization: if external media is playing, visualize media; if media is paused/absent but a soundscape is active, visualize the real-time soundscape frequency spectrum.

### Tester 10: Devon Brooks (Accessibility & Screen Reader QA)
- **Issue:** Screen readers do not announce media playback state changes; the visualizer lacks descriptive text.
- **Root Cause:** No `aria-live` region on the card and generic `role="img"` on the visualizer.
- **Improvement:** Add `aria-live="polite"` announcing "Playing [Title] by [Artist]", give `VfdEqualizer` an informative `aria-label="Audio visualizer: [Active / Idle]"`, and guarantee full keyboard navigation.

---

## 2. File Structure & Responsibilities

| File Path | Role & Responsibilities |
|---|---|
| `src/renderer/utils/ambientPlayer.js` | Create and expose `AnalyserNode` on Web Audio context; export `getFrequencyLevels()` for soundscapes. |
| `src/renderer/components/VfdEqualizer.jsx` | Fix reduced motion freeze, integrate real FFT soundscape data + dynamic media synthesis, improve peak decay. |
| `src/renderer/components/VfdEqualizer.module.css` | Enhance phosphor cyan/amber/ruby colors, unlit segment contrast, and glass faceplate bezel. |
| `src/renderer/components/ExpandedView.jsx` | Restructure `NowPlayingCard` layout, hierarchy of transport buttons, and audio state routing. |
| `src/renderer/components/ExpandedView.module.css` | Card styling, typography, marquee hover, primary/secondary buttons, and fader alignment. |
| `src/renderer/components/VfdEqualizer.test.js` | Unit tests for real frequency input, reduced-motion graceful fallback, and peak physics. |

---

## 3. Step-by-Step Implementation Tasks

### Task 1: Add Real-Time Audio Analysis to `ambientPlayer.js`

**Files:**
- Modify: `src/renderer/utils/ambientPlayer.js`

- [ ] **Step 1: Connect `AnalyserNode` to `_masterGain` in `ambientPlayer.js`**
- [ ] **Step 2: Export `getFrequencyData()` mapping FFT bins to 8 frequency bands**
- [ ] **Step 3: Verify with Node test**

### Task 2: Eliminate Dead Freeze & Enhance Engine in `VfdEqualizer.jsx`

**Files:**
- Modify: `src/renderer/components/VfdEqualizer.jsx`
- Modify: `src/renderer/components/VfdEqualizer.module.css`
- Test: `src/renderer/components/VfdEqualizer.test.js`

- [ ] **Step 1: Remove hardcoded `applyReducedMotion` freeze in `VfdEqualizer.jsx`; replace with gentle low-amplitude ambient animation**
- [ ] **Step 2: Accept `frequencyData` prop to render real FFT levels when available, falling back to volume-scaled rhythmic synthesis**
- [ ] **Step 3: Update `VfdEqualizer.module.css` with improved unlit segment contrast, peak-hold ruby glow, and faceplate bezel**
- [ ] **Step 4: Update and run `VfdEqualizer.test.js`**

### Task 3: Redesign `NowPlayingCard` Layout & Hierarchy in `ExpandedView.jsx`

**Files:**
- Modify: `src/renderer/components/ExpandedView.jsx`
- Modify: `src/renderer/components/ExpandedView.module.css`

- [ ] **Step 1: Re-structure `NowPlayingCard` columns to grant ample width for track titles and prevent aggressive truncation**
- [ ] **Step 2: Upgrade transport buttons: 30px primary Play/Pause disc + 24px secondary Prev/Next with tactile travel**
- [ ] **Step 3: Add marquee animation on title hover when text overflows**
- [ ] **Step 4: Align SkeuoVolumeFader and vertical hairline divider to eliminate boundary clipping**
- [ ] **Step 5: Connect `VfdEqualizer` to active audio (soundscape FFT when soundscapes play, media synthesis when external media plays)**
- [ ] **Step 6: Elevate card background styling with dominant-color volumetric glass**

### Task 4: Comprehensive Verification & Regression Suite

**Files:**
- Run: Full repository test suite (`VfdEqualizer.test.js`, `CompactView.test.js`, `SkeuoVolumeFader.test.js`, etc.)
- Run: `npm run build`

- [ ] **Step 1: Run all unit tests**
- [ ] **Step 2: Run production Vite + Electron build**
- [ ] **Step 3: Verify visual alignment against user screenshot**
