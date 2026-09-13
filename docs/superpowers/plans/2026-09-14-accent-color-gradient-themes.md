# Color Accent Gradient Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to choose from 6 signature color accent gradient themes (Classic Periwinkle, Violet Haze, Solar Flame, Ocean Breeze, Meadow Glow, and Rose Blush) that dynamically update UI accents and progress bars across the application while preserving the obsidian glass background and Dieter Rams / Apple HIG design principles.

**Architecture:** Define theme tokens in `src/shared/constants.js`. Manage active theme and CSS variable injection (`--accent-bar`, `--accent-bar-gradient`, `--accent-bar-hover`, `--accent-bar-light`, `--accent-bar-glow`) via `useAccentTheme.js` hook backed by `electron-store`. Expose an accessible, tactile horizontal gradient swatch strip in `ExpandedView` Settings under "Display & notch".

**Tech Stack:** React 18, CSS Custom Properties, Framer Motion, Electron Store, Node Test Runner (`node:test`).

---

### Task 1: Declare Theme Palettes & Token Constants

**Files:**
- Modify: `src/shared/constants.js`
- Test: `src/shared/themeConstants.test.js`

- [ ] **Step 1: Write unit tests for theme constants**

Create `src/shared/themeConstants.test.js`:
```javascript
import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { THEME_PALETTES, DEFAULT_THEME_ID } from './constants.js';

describe('THEME_PALETTES', () => {
  it('defines default theme as classic', () => {
    assert.equal(DEFAULT_THEME_ID, 'classic');
    assert.ok(THEME_PALETTES.classic);
  });

  it('contains all 6 expected palettes', () => {
    const expectedKeys = ['classic', 'violet-haze', 'solar-flame', 'ocean-breeze', 'meadow-glow', 'rose-blush'];
    assert.deepEqual(Object.keys(THEME_PALETTES), expectedKeys);
  });

  it('each palette has valid stops, primary, hover, light, gradient, swatchGradient, and glow', () => {
    for (const [id, palette] of Object.entries(THEME_PALETTES)) {
      assert.equal(palette.id, id);
      assert.ok(palette.name, `Missing name for ${id}`);
      assert.ok(Array.isArray(palette.stops) && palette.stops.length === 4, `${id} must have 4 stops`);
      assert.ok(palette.primary.startsWith('#'), `${id} primary must be hex`);
      assert.ok(palette.hover.startsWith('#'), `${id} hover must be hex`);
      assert.ok(palette.light.startsWith('#'), `${id} light must be hex`);
      assert.ok(palette.gradient.includes('linear-gradient'), `${id} gradient must be linear-gradient`);
      assert.ok(palette.swatchGradient.includes('linear-gradient'), `${id} swatchGradient must be linear-gradient`);
      assert.ok(palette.glow.startsWith('rgba'), `${id} glow must be rgba string`);
    }
  });

  it('has exact hex codes matching user requirements for image sets', () => {
    assert.deepEqual(THEME_PALETTES['violet-haze'].stops, ['#00716F', '#169DB0', '#B2D3F2', '#FCFFFF']);
    assert.deepEqual(THEME_PALETTES['solar-flame'].stops, ['#FD1B00', '#FC5200', '#F68C25', '#FDC02A']);
    assert.deepEqual(THEME_PALETTES['ocean-breeze'].stops, ['#0B3C65', '#1A9CC8', '#27AED2', '#AFE4F6']);
    assert.deepEqual(THEME_PALETTES['meadow-glow'].stops, ['#263D26', '#6F9435', '#A7B92A', '#EDD330']);
    assert.deepEqual(THEME_PALETTES['rose-blush'].stops, ['#EB4E70', '#FD9799', '#FDE5E7', '#FCFBFC']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/shared/themeConstants.test.js`  
Expected: FAIL (`THEME_PALETTES` not exported)

- [ ] **Step 3: Update `src/shared/constants.js` with `THEME_PALETTES` and `DEFAULT_THEME_ID`**

Add to `src/shared/constants.js`:
```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/shared/themeConstants.test.js`  
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/shared/constants.js src/shared/themeConstants.test.js
git commit -m "feat(theme): add THEME_PALETTES constants with 6 gradient combinations"
```

---

### Task 2: Create `useAccentTheme` Hook with CSS Injection and Tests

**Files:**
- Create: `src/renderer/hooks/useAccentTheme.js`
- Create: `src/renderer/hooks/useAccentTheme.test.js`

- [ ] **Step 1: Write unit tests for `useAccentTheme` logic**

Create `src/renderer/hooks/useAccentTheme.test.js`:
```javascript
import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { THEME_PALETTES, DEFAULT_THEME_ID } from '../../shared/constants.js';
import { applyThemeTokensToElement, getValidTheme } from './useAccentTheme.js';

describe('useAccentTheme helpers', () => {
  it('getValidTheme returns matching theme or falls back to classic', () => {
    assert.equal(getValidTheme('solar-flame').id, 'solar-flame');
    assert.equal(getValidTheme('non-existent').id, DEFAULT_THEME_ID);
    assert.equal(getValidTheme(null).id, DEFAULT_THEME_ID);
  });

  it('applyThemeTokensToElement sets all 5 CSS custom properties', () => {
    const mockStyle = {};
    const mockElement = {
      style: {
        setProperty: (key, val) => {
          mockStyle[key] = val;
        },
      },
    };

    const theme = THEME_PALETTES['ocean-breeze'];
    applyThemeTokensToElement(mockElement, theme);

    assert.equal(mockStyle['--accent-bar'], theme.primary);
    assert.equal(mockStyle['--accent-bar-hover'], theme.hover);
    assert.equal(mockStyle['--accent-bar-light'], theme.light);
    assert.equal(mockStyle['--accent-bar-gradient'], theme.gradient);
    assert.equal(mockStyle['--accent-bar-glow'], theme.glow);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/renderer/hooks/useAccentTheme.test.js`  
Expected: FAIL (`useAccentTheme.js` not found)

- [ ] **Step 3: Implement `src/renderer/hooks/useAccentTheme.js`**

Create `src/renderer/hooks/useAccentTheme.js`:
```javascript
import { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { THEME_PALETTES, DEFAULT_THEME_ID } from '../../shared/constants.js';

export function getValidTheme(themeId) {
  if (themeId && THEME_PALETTES[themeId]) {
    return THEME_PALETTES[themeId];
  }
  return THEME_PALETTES[DEFAULT_THEME_ID];
}

export function applyThemeTokensToElement(element, theme) {
  if (!element?.style?.setProperty || !theme) return;
  element.style.setProperty('--accent-bar', theme.primary);
  element.style.setProperty('--accent-bar-hover', theme.hover);
  element.style.setProperty('--accent-bar-light', theme.light);
  element.style.setProperty('--accent-bar-gradient', theme.gradient);
  element.style.setProperty('--accent-bar-glow', theme.glow);
}

export function useAccentTheme() {
  const [themeId, setThemeIdState] = useState(() => {
    const stored = window.electronAPI?.store?.get('accentTheme');
    return stored && THEME_PALETTES[stored] ? stored : DEFAULT_THEME_ID;
  });

  const activeTheme = getValidTheme(themeId);

  // Apply CSS custom properties synchronously before DOM paint
  useLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      applyThemeTokensToElement(document.documentElement, activeTheme);
    }
  }, [activeTheme]);

  const setAccentTheme = useCallback((newId) => {
    if (THEME_PALETTES[newId]) {
      setThemeIdState(newId);
      window.electronAPI?.store?.set('accentTheme', newId);
    }
  }, []);

  return {
    themeId,
    theme: activeTheme,
    setAccentTheme,
    themes: THEME_PALETTES,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/renderer/hooks/useAccentTheme.test.js`  
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/renderer/hooks/useAccentTheme.js src/renderer/hooks/useAccentTheme.test.js
git commit -m "feat(theme): implement useAccentTheme hook with CSS custom property injection"
```

---

### Task 3: Wire `useAccentTheme` into `App.jsx` and `Island.jsx`

**Files:**
- Modify: `src/renderer/App.jsx`
- Modify: `src/renderer/components/Island.jsx`

- [ ] **Step 1: Update `App.jsx` to call `useAccentTheme`**

In `src/renderer/App.jsx`:
- Import `useAccentTheme` from `./hooks/useAccentTheme`.
- Call `const { themeId: accentTheme, setAccentTheme } = useAccentTheme();`.
- Pass `accentTheme={accentTheme}` and `onSetAccentTheme={setAccentTheme}` to `<Island ... />`.

- [ ] **Step 2: Update `Island.jsx` to forward theme props to `ExpandedView`**

In `src/renderer/components/Island.jsx`:
- Add `accentTheme` and `onSetAccentTheme` to props.
- Pass `accentTheme={accentTheme}` and `onSetAccentTheme={onSetAccentTheme}` to `<ExpandedView ... />`.

- [ ] **Step 3: Commit changes**

```bash
git add src/renderer/App.jsx src/renderer/components/Island.jsx
git commit -m "feat(theme): wire accentTheme state through App and Island components"
```

---

### Task 4: Implement Settings Swatch Strip in `ExpandedView.jsx` and CSS

**Files:**
- Modify: `src/renderer/components/ExpandedView.jsx`
- Modify: `src/renderer/components/ExpandedView.module.css`

- [ ] **Step 1: Add Swatch Strip CSS classes in `ExpandedView.module.css`**

Add to `src/renderer/components/ExpandedView.module.css`:
```css
/* ── Accent Theme Swatch Selector ───────────────────── */
.themeSwatchRow {
  display: flex;
  align-items: center;
  gap: 6px;
}

.themeSwatchBtn {
  position: relative;
  width: 38px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  padding: 0;
  outline: none;
  transition: transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1),
              box-shadow 150ms ease;
  -webkit-tap-highlight-color: transparent;
}

.themeSwatchBtn:hover {
  transform: scale(1.08);
  border-color: rgba(255, 255, 255, 0.25);
}

.themeSwatchBtnActive {
  box-shadow: 0 0 0 2px #ffffff, 0 2px 8px rgba(0, 0, 0, 0.5);
  border-color: transparent;
  transform: scale(1.04);
}

.themeSwatchBtn:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Add Theme Picker Row to `ExpandedView.jsx`**

In `ExpandedView.jsx`:
- Accept `accentTheme` and `onSetAccentTheme` in props.
- Import `THEME_PALETTES` from `../../shared/constants.js`.
- In `activeTab === 'settings'` under `GROUP 2: DISPLAY & NOTCH APPEARANCE` (right after `Idle notch display`), add:
```jsx
{/* Accent Theme Gradient Swatch Selector */}
<div className={`${styles.settingsRow} ${styles.settingsRowTwoLine}`}>
  <div className={styles.rowLabelGroup}>
    <span className={styles.rowLabel}>Accent theme</span>
    <span className={styles.rowSubtitle}>
      {THEME_PALETTES[accentTheme]?.name ?? 'Classic Periwinkle'}
    </span>
  </div>
  <div className={styles.rowControl}>
    <div className={styles.themeSwatchRow} role="radiogroup" aria-label="Accent theme">
      {Object.values(THEME_PALETTES).map((palette) => {
        const isActive = (accentTheme || 'classic') === palette.id;
        return (
          <button
            key={palette.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={palette.name}
            title={palette.name}
            className={`${styles.themeSwatchBtn} ${isActive ? styles.themeSwatchBtnActive : ''}`}
            style={{ background: palette.swatchGradient }}
            onClick={() => {
              if (soundEnabled) playUiClick();
              onSetAccentTheme?.(palette.id);
            }}
          />
        );
      })}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit changes**

```bash
git add src/renderer/components/ExpandedView.jsx src/renderer/components/ExpandedView.module.css
git commit -m "feat(theme): add accent theme swatch selector in Settings tab"
```

---

### Task 5: Verification & Full Build Test

**Files:**
- Test all components and builds: `npm test` or `node --test`
- Build check: `npm run build`

- [ ] **Step 1: Run all test suites**

Run: `node --test src/shared/themeConstants.test.js src/renderer/hooks/useAccentTheme.test.js src/renderer/utils/colorExtractor.test.js`  
Expected: ALL PASS

- [ ] **Step 2: Run Vite production build check**

Run: `npm run build`  
Expected: Exit code 0 with clean output, no syntax or bundling errors.

- [ ] **Step 3: Final commit and summary walkthrough**

```bash
git add .
git commit -m "feat(theme): complete user-selectable color accent gradient themes"
```
