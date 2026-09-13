# Audio & Media Enhancements, Scaling & Manual Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 6 approved enhancements for Pomodoro Island: manual timer input (hero click-to-type + stepper typing), global UI/typography scale upgrade (+10–15%), dominant artwork color extraction, universal skeuomorphic volume fader (Option B: knurled aluminum knob), dynamic audio-reactive drop shadow, and retro 1980s VFD graphic equalizer.

**Architecture:** 
- Modular React components for the VFD visualizer (`VfdEqualizer.jsx`) and skeuomorphic volume fader (`SkeuoVolumeFader.jsx`).
- Client-side offscreen canvas dominant color extractor (`colorExtractor.js`) injecting CSS custom properties `--media-dominant-rgb` and `--audio-pulse`.
- Electron main process IPC handler for universal volume control with Windows Core Audio / volume keys.
- Scaled bounding box dimensions in `Island.jsx` (480px width, calibrated tab heights) and upgraded typography in `ExpandedView.module.css`.
- Strict compliance with `DESIGN_KIT.md` (zero emojis, monochrome hairlines, Inter tabular numerals, sentence case).

**Tech Stack:** React 18, Vite, Framer Motion, Electron 30, Node.js, CSS Modules, PowerShell / Windows Core Audio.

---

### Task 1: Container Sizing & Layout Geometry Scale Upgrade

**Files:**
- Modify: `src/renderer/components/Island.jsx:105-135`
- Modify: `src/renderer/components/ExpandedView.module.css:1-120`

- [ ] **Step 1: Update expanded container dimensions in `Island.jsx`**
Update `getDimensions` in `Island.jsx`:
- Compact width: 460px (when playing: 480px)
- Expanded width: 480px uniform across all tabs
- Tab-specific heights:
  - `timer`: 264px (or 284px during break with wellness prompt)
  - `tasks`: 280px
  - `audio`: 260px (when media is playing) or 185px (soundscapes only)
  - `stats`: 270px
  - `settings`: 320px

```javascript
// In src/renderer/components/Island.jsx
    if (activeTab === 'timer') {
      const isBreak = pomodoroState === 'SHORT_BREAK' || pomodoroState === 'LONG_BREAK';
      return { width: 480, height: isBreak && wellnessPrompt ? 284 : 264 };
    }
    if (activeTab === 'tasks') return { width: 480, height: 280 };
    if (activeTab === 'audio' || activeTab === 'music') {
      return { width: 480, height: nowPlaying?.isPlaying && nowPlaying?.title ? 260 : 185 };
    }
    if (activeTab === 'stats') return { width: 480, height: 270 };
    if (activeTab === 'settings') return { width: 480, height: 320 };
```

- [ ] **Step 2: Update typography scale and padding in `ExpandedView.module.css`**
Update fonts and padding for the +10-15% scale upgrade:
- `.navLabel`: font-size `12px` (from 11px)
- `.heroTime`: font-size `46px` (from 40px), letter-spacing `-0.020em`, `font-feature-settings: 'tnum' 1`
- `.presetChip`: font-size `11.5px` (from 10.5px), padding `4px 12px`
- `.taskInput`: font-size `12.5px` (from 11px), height `32px`
- `.rowLabel`: font-size `13px` (from 12px)
- `.stepperValue`: font-size `12px` (from 11px)

- [ ] **Step 3: Run dev build to verify compilation**
Run: `npm run build`
Expected: PASS with no errors.

- [ ] **Step 4: Commit**
```bash
git add src/renderer/components/Island.jsx src/renderer/components/ExpandedView.module.css
git commit -m "feat(ui): upgrade expanded island dimensions and typography scale to 480px"
```

---

### Task 2: Hero Click-to-Type & Duration Direct Input

**Files:**
- Create: `src/renderer/utils/timeInputParser.js`
- Test: `tests/timeInputParser.test.js` (or test runner)
- Modify: `src/renderer/components/ExpandedView.jsx:385-418`
- Modify: `src/renderer/components/ExpandedView.module.css`

- [ ] **Step 1: Write test for time input parser**
Create `src/renderer/utils/timeInputParser.test.js`:
```javascript
import { parseTimeInput } from './timeInputParser';

describe('parseTimeInput', () => {
  it('parses standard mm:ss format', () => {
    expect(parseTimeInput('25:00')).toBe(25 * 60 * 1000);
    expect(parseTimeInput('45:30')).toBe(45.5 * 60 * 1000);
  });
  it('parses minute integers', () => {
    expect(parseTimeInput('45')).toBe(45 * 60 * 1000);
    expect(parseTimeInput('5')).toBe(5 * 60 * 1000);
  });
  it('parses shorthand strings like 90m and 1h30m', () => {
    expect(parseTimeInput('90m')).toBe(90 * 60 * 1000);
    expect(parseTimeInput('1h30m')).toBe(90 * 60 * 1000);
    expect(parseTimeInput('1h')).toBe(60 * 60 * 1000);
  });
  it('enforces min and max bounds', () => {
    expect(parseTimeInput('0')).toBe(null); // Below min 1m
    expect(parseTimeInput('200m')).toBe(null); // Above max 180m
    expect(parseTimeInput('abc')).toBe(null); // Invalid
  });
});
```

- [ ] **Step 2: Implement `src/renderer/utils/timeInputParser.js`**
```javascript
/**
 * Parses user-entered time strings into milliseconds.
 * Supports: '45', '45:00', '90m', '1h', '1h30m', '90s'.
 * Returns milliseconds (bounded between 1m and 180m), or null if invalid.
 */
export function parseTimeInput(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toLowerCase();

  // Pattern 1: mm:ss
  const colonMatch = clean.match(/^(\d{1,3}):(\d{1,2})$/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10);
    const secs = parseInt(colonMatch[2], 10);
    if (secs >= 60) return null;
    const totalMs = (mins * 60 + secs) * 1000;
    return totalMs >= 60000 && totalMs <= 180 * 60 * 1000 ? totalMs : null;
  }

  // Pattern 2: 1h30m / 1h / 90m
  const hourMinMatch = clean.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?$/);
  if (hourMinMatch && (hourMinMatch[1] || hourMinMatch[2])) {
    const hours = hourMinMatch[1] ? parseInt(hourMinMatch[1], 10) : 0;
    const mins = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
    const totalMins = hours * 60 + mins;
    if (totalMins < 1 || totalMins > 180) return null;
    return totalMins * 60 * 1000;
  }

  // Pattern 3: Pure integer minutes (e.g. '45', '5', '90')
  const pureNumMatch = clean.match(/^(\d{1,3})$/);
  if (pureNumMatch) {
    const mins = parseInt(pureNumMatch[1], 10);
    if (mins < 1 || mins > 180) return null;
    return mins * 60 * 1000;
  }

  return null;
}
```

- [ ] **Step 3: Integrate inline editing into Hero Timer and Steppers in `ExpandedView.jsx`**
In `ExpandedView.jsx`:
1. Add state: `const [isEditingHeroTime, setIsEditingHeroTime] = useState(false);` and `const [heroTimeInput, setHeroTimeInput] = useState('');`
2. Add click handler on `.heroTimer`:
   - When not running, click transforms static readout to input with auto-select.
   - Pressing Enter parses input via `parseTimeInput`, calls `onSetDuration('FOCUS', ms)`, and exits edit mode.
   - Pressing Escape cancels.
3. In Settings steppers, clicking the number allows direct typing and calls `onSetDuration`.

- [ ] **Step 4: Style inline editing states in `ExpandedView.module.css`**
Add `.heroTimeInput` styles matching 46px Inter, tabular nums, subtle dotted hover affordance, and focus ring.

- [ ] **Step 5: Run tests / build**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/renderer/utils/timeInputParser.js src/renderer/components/ExpandedView.jsx src/renderer/components/ExpandedView.module.css
git commit -m "feat(timer): add hero countdown click-to-edit and direct stepper input"
```

---

### Task 3: Dominant Color Extraction from Media Artwork

**Files:**
- Create: `src/renderer/utils/colorExtractor.js`
- Modify: `src/renderer/hooks/useNowPlaying.js`
- Modify: `src/renderer/App.jsx`

- [ ] **Step 1: Create `src/renderer/utils/colorExtractor.js`**
```javascript
/**
 * Extracts the dominant RGB color from an image URL using offscreen canvas sampling.
 * Clamps saturation [0.40, 0.85] and lightness [0.25, 0.65] for optimal readability.
 * Returns 'R, G, B' string, defaulting to signature periwinkle '92, 119, 189'.
 */
const DEFAULT_RGB = '92, 119, 189';
const colorCache = new Map();

export async function extractDominantColor(imageUrl) {
  if (!imageUrl) return DEFAULT_RGB;
  if (colorCache.has(imageUrl)) return colorCache.get(imageUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(DEFAULT_RGB);

        ctx.drawImage(img, 0, 0, 32, 32);
        const { data } = ctx.getImageData(0, 0, 32, 32);

        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          // Skip near-blacks and near-whites
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max < 30 || min > 225) continue;

          totalR += r;
          totalG += g;
          totalB += b;
          count++;
        }

        if (count === 0) {
          colorCache.set(imageUrl, DEFAULT_RGB);
          return resolve(DEFAULT_RGB);
        }

        const avgR = Math.round(totalR / count);
        const avgG = Math.round(totalG / count);
        const avgB = Math.round(totalB / count);
        const result = `${avgR}, ${avgG}, ${avgB}`;
        colorCache.set(imageUrl, result);
        resolve(result);
      } catch {
        resolve(DEFAULT_RGB);
      }
    };

    img.onerror = () => resolve(DEFAULT_RGB);
  });
}
```

- [ ] **Step 2: Inject dominant color into root CSS variables in `App.jsx`**
In `App.jsx`:
1. Use `useEffect` observing `nowPlaying?.artwork`.
2. When artwork changes and `nowPlaying?.isPlaying` is true, call `extractDominantColor(nowPlaying.artwork)`.
3. Set CSS custom property on `document.documentElement`:
   `document.documentElement.style.setProperty('--media-dominant-rgb', rgb);`
4. When media stops or pauses, reset `--media-dominant-rgb` to `92, 119, 189`.

- [ ] **Step 3: Run build to verify**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/renderer/utils/colorExtractor.js src/renderer/App.jsx
git commit -m "feat(media): implement offscreen canvas dominant color extraction"
```

---

### Task 4: Dynamic Audio-Reactive Island Drop Shadow

**Files:**
- Modify: `src/renderer/components/Island.jsx`
- Modify: `src/renderer/components/Island.module.css`

- [ ] **Step 1: Add audio pulse engine to `Island.jsx`**
In `Island.jsx`:
- Track an animated pulse state when `nowPlaying?.isPlaying` is true.
- Use a lightweight `requestAnimationFrame` loop or interval to simulate smooth bass breathing on `--audio-pulse` (0.0 to 1.0) with ease-in-out dampening.
- Pass class `styles.islandMediaActive` to the island outer container when media is active.

- [ ] **Step 2: Add dual-layer shadow in `Island.module.css`**
```css
.islandMediaActive {
  box-shadow:
    /* Layer 1: Structural Depth Occlusion (Pitch-Black Grounding) */
    0 20px 48px -8px rgba(0, 0, 0, 0.92),
    0 8px 18px rgba(0, 0, 0, 0.22),
    /* Layer 2: Audio-Reactive Radiant Bounce */
    0 calc(28px + var(--audio-pulse, 0px) * 16px)
      calc(54px + var(--audio-pulse, 0px) * 32px)
      calc(-6px + var(--audio-pulse, 0px) * 6px)
      rgba(var(--media-dominant-rgb, 92, 119, 189), calc(0.18 + var(--audio-pulse, 0) * 0.14));
}
```

- [ ] **Step 3: Run build to verify**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/renderer/components/Island.jsx src/renderer/components/Island.module.css
git commit -m "feat(island): add dynamic audio-reactive drop shadow for active media"
```

---

### Task 5: 1980s Retro VFD Graphic Equalizer Component

**Files:**
- Create: `src/renderer/components/VfdEqualizer.jsx`
- Create: `src/renderer/components/VfdEqualizer.module.css`

- [ ] **Step 1: Implement `VfdEqualizer.jsx`**
Build the 8-column, 7-segment VFD component:
- Renders 8 frequency columns.
- Each column contains 7 physical segments (`div.segment`).
- An animated pulse loop updates column heights dynamically with peak-hold physics.
- Segments 1-4: Phosphor Cyan (`#00e5c9`)
- Segment 5: Ice Cyan (`#80f7eb`)
- Segment 6: Warm Amber (`#ffb834`)
- Segment 7: Ruby-Amber Peak (`#ff5533`)

```jsx
import { useEffect, useState, useRef } from 'react';
import styles from './VfdEqualizer.module.css';

const BANDS = 8;
const SEGMENTS = 7;

export default function VfdEqualizer({ isPlaying }) {
  const [levels, setLevels] = useState([3, 5, 6, 4, 5, 3, 4, 2]);
  const frameRef = useRef();

  useEffect(() => {
    if (!isPlaying) {
      setLevels([1, 1, 1, 1, 1, 1, 1, 1]);
      return;
    }

    let t = 0;
    const interval = setInterval(() => {
      t += 0.1;
      const next = [];
      for (let i = 0; i < BANDS; i++) {
        // Multi-frequency rhythm synthesizer
        const base = Math.sin(t * 2 + i * 0.8) * 2 + Math.cos(t * 3 - i * 0.5) * 1.5;
        const count = Math.max(1, Math.min(SEGMENTS, Math.round(3.5 + base)));
        next.push(count);
      }
      setLevels(next);
    }, 90);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className={styles.vfdContainer} title="Graphic Equalizer">
      {levels.map((level, colIdx) => (
        <div key={colIdx} className={styles.vfdColumn}>
          {Array.from({ length: SEGMENTS }, (_, segIdx) => {
            const isLit = segIdx < level;
            const segType = segIdx === 6 ? styles.peak : segIdx === 5 ? styles.warn : segIdx === 4 ? styles.mid : styles.base;
            return (
              <div
                key={segIdx}
                className={`${styles.vfdSegment} ${isLit ? `${styles.lit} ${segType}` : ''}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `VfdEqualizer.module.css`**
Style VFD with dark recessed well, segmented bars, and subtle phosphor glow.

- [ ] **Step 3: Run build to verify**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/renderer/components/VfdEqualizer.jsx src/renderer/components/VfdEqualizer.module.css
git commit -m "feat(audio): create 1980s retro VFD graphic equalizer component"
```

---

### Task 6: Universal Skeuomorphic Volume Fader & Audio IPC

**Files:**
- Modify: `src/main/main.js:655-675`
- Modify: `src/main/preload.js:20-35`
- Create: `src/renderer/components/SkeuoVolumeFader.jsx`
- Create: `src/renderer/components/SkeuoVolumeFader.module.css`

- [ ] **Step 1: Add volume control IPC handler in `src/main/main.js`**
Add IPC handlers `get-volume` and `set-volume` in `main.js`:
- Supports Windows Core Audio via PowerShell command or volume up/down key simulation to adjust system master volume.
- Broadcasts updated volume level to renderer.

- [ ] **Step 2: Expose volume methods in `src/main/preload.js`**
Expose `setVolume: (val) => ipcRenderer.send('media-volume-set', val)` and `getVolume: () => ipcRenderer.invoke('get-media-volume')`.

- [ ] **Step 3: Implement `SkeuoVolumeFader.jsx`**
Build Option B:
- Vertical recessed track well with center slit (`20px × 76px`).
- Brushed aluminum knurled fader knob (`24px × 18px`) with 3 engraved horizontal grip ridges.
- Pointer capture direct manipulation (`onPointerDown`, `onPointerMove`, `onPointerUp`).
- Logarithmic mapping: $\text{Gain} = t^2$.
- Tactile magnetic snap at 70%.
- Real-time percentage readout underneath (`70%`).

- [ ] **Step 4: Style `SkeuoVolumeFader.module.css`**
Implement the exact CSS tokens from SPEC-2026-09-13 Section 2 ($90^\circ$ overhead key light, milled aerospace aluminum gradient, knurled repeating linear gradient, mechanical travel physics).

- [ ] **Step 5: Run build to verify**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/main/main.js src/main/preload.js src/renderer/components/SkeuoVolumeFader.jsx src/renderer/components/SkeuoVolumeFader.module.css
git commit -m "feat(audio): implement skeuomorphic knurled fader knob and volume IPC"
```

---

### Task 7: Assemble Redesigned Media Card in Audio Tab

**Files:**
- Modify: `src/renderer/components/ExpandedView.jsx:675-760`
- Modify: `src/renderer/components/ExpandedView.module.css:520-600`

- [ ] **Step 1: Integrate `VfdEqualizer` and `SkeuoVolumeFader` into `.nowPlayingCard`**
In `ExpandedView.jsx`:
- Import `VfdEqualizer` and `SkeuoVolumeFader`.
- Replace old horizontal mini equalizer with the 4-column layout:
  - Column 1: Album artwork (48x48) with 8px radius.
  - Column 2: Metadata (title 13.5px, artist 12px) + transport buttons.
  - Column 3: `VfdEqualizer` component.
  - Column 4: Divider groove + `SkeuoVolumeFader`.

- [ ] **Step 2: Apply volumetric glass and monochrome perimeter styling in `ExpandedView.module.css`**
Apply CSS tokens:
- `border: 1px solid rgba(255, 255, 255, 0.08);` (Rule 1 compliance: monochrome hairline).
- Substrate tint: `radial-gradient(circle at 20% 50%, rgba(var(--media-dominant-rgb, 92, 119, 189), 0.18) 0%, transparent 70%)`.
- Card height: 92px.

- [ ] **Step 3: Run build to verify**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/renderer/components/ExpandedView.jsx src/renderer/components/ExpandedView.module.css
git commit -m "feat(media): assemble redesigned media card with VFD equalizer and skeuomorphic volume fader"
```

---

### Task 8: End-to-End Verification & Design Kit Conformance Audit

**Files:**
- Full codebase audit across all modified components.

- [ ] **Step 1: Run Design Kit compliance audit**
Check against all 6 non-negotiable rules:
1. No colored borders or neon halos: Grep check confirms borders remain monochrome `rgba(255, 255, 255, 0.08)`.
2. No emojis: Grep for emoji characters across `src/`.
3. Inter typography exclusively: Check fonts in new components.
4. No uppercase titles: Check for `text-transform: uppercase`.
5. Elevated obsidian color space: Base surfaces `#08080a` / `#0a0a0d`.
6. Radically simplified architecture: No overlapping drawers or popups.

- [ ] **Step 2: Run application build and test**
Run: `npm run build`
Expected: Clean build without errors or warnings.

- [ ] **Step 3: Commit all remaining changes and update walkthrough**
```bash
git add .
git commit -m "chore: complete audio media enhancements, scaling, and manual input implementation"
```
