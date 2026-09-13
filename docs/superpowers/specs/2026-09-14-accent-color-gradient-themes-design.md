# Pomodoro Island — Color Accent Gradient Themes Design Specification

> **Date**: 2026-09-14  
> **Topic**: User-selectable Color Accent Gradients  
> **Status**: Approved  

---

## 1. Overview & Objectives

Pomodoro Island currently utilizes a fixed signature accent color (`#5c77bd`, satin steel-periwinkle) sampled from the frosted time bar. This specification introduces user-selectable accent gradients, allowing users to customize the signature accent styling across the app while strictly preserving the deep obsidian glass surface hierarchy (`#08080a`), high-contrast typography, and the Dieter Rams / Apple Dynamic Island minimalist ethos outlined in `DESIGN_KIT.md`.

### Core Requirements
1. **Scope of Accent**: Strictly applied to signature accent tokens:
   - Frosted time progress bars (Idle, Compact, Expanded states)
   - Active navigation tab indicators and glow effects
   - Interactive toggle switches and segmented control active states
   - Checkboxes and list selection indicators
   - Stats chart bars and volume fader track accents
2. **Surface Invariance**: Island background glass, borders, typography, and neutral cards remain deep obsidian and monochrome neutral. No colored background tints or saturated exterior glows.
3. **6 Selectable Palettes**:
   - **Classic Periwinkle** (Default fallback)
   - **Violet Haze** (`#00716F`, `#169DB0`, `#B2D3F2`, `#FCFFFF`)
   - **Solar Flame** (`#FD1B00`, `#FC5200`, `#F68C25`, `#FDC02A`)
   - **Ocean Breeze** (`#0B3C65`, `#1A9CC8`, `#27AED2`, `#AFE4F6`)
   - **Meadow Glow** (`#263D26`, `#6F9435`, `#A7B92A`, `#EDD330`)
   - **Rose Blush** (`#EB4E70`, `#FD9799`, `#FDE5E7`, `#FCFBFC`)
4. **Instant Persistence**: Selected palette is persisted via `electron-store` and applied on boot prior to first paint to avoid theme flicker.

---

## 2. Color Palette Definitions & Tokens

Palettes are declared in `src/shared/constants.js` under `THEME_PALETTES`:

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

### CSS Custom Properties Mapping
When a theme is activated, the following variables on `document.documentElement` are dynamically updated:
- `--accent-bar`: `theme.primary`
- `--accent-bar-hover`: `theme.hover`
- `--accent-bar-light`: `theme.light`
- `--accent-bar-gradient`: `theme.gradient`
- `--accent-bar-glow`: `theme.glow`

---

## 3. Architecture & Data Flow

### 1. `useAccentTheme` Hook (`src/renderer/hooks/useAccentTheme.js`)
- Reads stored theme from `window.electronAPI?.store?.get('accentTheme', DEFAULT_THEME_ID)`.
- Updates state and writes changes to `window.electronAPI?.store?.set('accentTheme', newId)`.
- In a `useLayoutEffect` / `useEffect`, applies CSS custom properties to `document.documentElement.style`.
- Returns `{ themeId, theme: THEME_PALETTES[themeId], setAccentTheme, themes: THEME_PALETTES }`.

### 2. State Propagation
- `App.jsx`: Instantiates `useAccentTheme()`. Passes `accentTheme` and `onSetAccentTheme` to `Island.jsx`.
- `Island.jsx`: Forwards `accentTheme` and `onSetAccentTheme` to `ExpandedView.jsx`.
- `ExpandedView.jsx`: Renders the swatch picker in the Settings tab.

### 3. Component Styling Compatibility
All existing components currently consume CSS variables:
- `ExpandedView.module.css`: uses `var(--accent-bar-gradient)`, `var(--accent-bar-glow)`, `var(--accent-bar)`
- `CompactView.module.css`: uses `var(--accent-bar)`
- `Island.module.css`: uses `var(--accent-bar)`
- `StatsTab.module.css`: uses `var(--accent-bar-gradient)`, `var(--accent-bar-glow)`

No component refactors are required for the existing styled components; they inherit new theme colors automatically via CSS variables.

---

## 4. UI/UX Specification for Settings Swatch Strip

### Location
- Located in `ExpandedView.jsx` → `activeTab === 'settings'` → inside `Display & notch` group (after `Idle notch display`).

### Row Hierarchy & Layout
- **Container**: `.settingsRow` (flex between label group and control).
- **Label Group**:
  - Title: `Accent theme` (`.rowLabel`)
  - Subtitle: Active palette name (`.rowSubtitle`), e.g. "Solar Flame".
- **Control**: Horizontal flex container with 6 swatches.
  - Width: ~`36px` to `40px` each, height: `18px`, `border-radius: 999px`.
  - Background: `theme.swatchGradient`.
  - Border: `1px solid rgba(255, 255, 255, 0.12)`.
  - Margin/Gap: `5px` gap between swatches.
- **Interactive States**:
  - **Hover**: Scale `1.08`, cursor pointer.
  - **Active Selection**: Hairline white ring `box-shadow: 0 0 0 2px #ffffff, 0 2px 8px rgba(0, 0, 0, 0.5)`.
  - **Audio Click**: Triggers `playUiClick()` when `soundEnabled` is true.
  - **Keyboard Accessibility**: `role="radiogroup"`, each button has `role="radio"`, `aria-checked`, `aria-label`, and keyboard focus outline.

---

## 5. Verification & Testing Strategy

1. **Unit Tests**:
   - `src/renderer/hooks/useAccentTheme.test.js`:
     - Default theme initialization (`classic`).
     - State updates when `setAccentTheme` is called.
     - Document style variable mutations (`--accent-bar`, `--accent-bar-gradient`, etc.).
     - Persistence calls to `window.electronAPI.store.set`.
2. **Integration & Manual Checks**:
   - Switching between all 6 themes in the Settings view.
   - Inspecting computed styles in DOM to ensure all CSS custom properties match the expected hex codes.
   - Verifying visual changes in Compact View progress bar, Expanded View tab indicator, and toggles.
   - Restarting application to verify theme persistence across sessions.
