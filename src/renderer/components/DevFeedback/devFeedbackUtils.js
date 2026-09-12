/**
 * devFeedbackUtils.js
 * Utilities for the In-App Visual Dev Feedback & Pinning System.
 */

const STORAGE_KEY = 'pomodoro_island_dev_pins';
const DEV_MODE_KEY = 'pomodoro_island_dev_mode_active';

/**
 * Intelligent context sniffer: inspects the DOM element at (clientX, clientY)
 * to automatically determine what control, setting, metric, or button was clicked.
 */
export function detectTargetContext(element, islandState, activeTab) {
  if (!element) {
    return {
      targetLabel: islandState === 'compact' ? 'Compact Island Bar' : `Expanded View (${activeTab})`,
      category: islandState === 'compact' ? 'Compact' : activeTab ? activeTab.toUpperCase() : 'GENERAL',
      domPath: 'island',
    };
  }

  // 1. Check for closest button or action
  const button = element.closest('button');
  if (button) {
    const aria = button.getAttribute('aria-label');
    const title = button.getAttribute('title');
    const text = button.innerText?.trim();
    const label = aria || title || text || 'Action Button';
    return {
      targetLabel: `Button: "${label.slice(0, 35)}"`,
      category: islandState === 'compact' ? 'COMPACT CONTROLS' : (activeTab || 'EXPANDED').toUpperCase(),
      domPath: button.className ? `button.${button.className.split(' ')[0]}` : 'button',
    };
  }

  // 2. Check for settings flatRow or settingRow
  const row = element.closest('[class*="flatRow"], [class*="settingRow"], [class*="row"]');
  if (row) {
    const titleEl = row.querySelector('[class*="label"], [class*="Label"], [class*="Title"], span, p');
    const rowTitle = titleEl?.innerText?.trim();
    if (rowTitle) {
      return {
        targetLabel: `Setting: "${rowTitle.slice(0, 35)}"`,
        category: 'SETTINGS',
        domPath: 'settings-row',
      };
    }
  }

  // 3. Check for soundscape pills / segmented controls
  const segment = element.closest('[class*="soundPill"], [class*="segmentBtn"], [class*="pill"]');
  if (segment) {
    const label = segment.innerText?.trim() || 'Option';
    return {
      targetLabel: `Segment / Soundscape: "${label.slice(0, 25)}"`,
      category: 'AUDIO',
      domPath: 'segmented-pill',
    };
  }

  // 4. Check for telemetry / metric cards
  const telemetry = element.closest('[class*="telemetryItem"], [class*="statItem"], [class*="metric"]');
  if (telemetry) {
    const labelEl = telemetry.querySelector('[class*="Label"], span, h4');
    const label = labelEl?.innerText?.trim() || telemetry.innerText?.trim() || 'Stat Metric';
    return {
      targetLabel: `Telemetry Stat: "${label.slice(0, 30)}"`,
      category: 'STATS',
      domPath: 'telemetry-item',
    };
  }

  // 5. Check for input fields
  const input = element.closest('input, textarea');
  if (input) {
    const placeholder = input.getAttribute('placeholder') || input.name || 'Input field';
    return {
      targetLabel: `Input Field: "${placeholder.slice(0, 30)}"`,
      category: (activeTab || 'TASKS').toUpperCase(),
      domPath: input.tagName.toLowerCase(),
    };
  }

  // 6. Check for navigation tabs
  const tab = element.closest('[class*="tabBtn"], [class*="navTab"]');
  if (tab) {
    const tabName = tab.innerText?.trim() || 'Tab';
    return {
      targetLabel: `Navigation Tab: "${tabName}"`,
      category: 'NAVIGATION',
      domPath: 'tab-button',
    };
  }

  // 7. Compact view specific controls
  if (element.closest('[class*="progressBarContainer"], [class*="progressTrack"]')) {
    return {
      targetLabel: 'Remaining Time Progress Bar',
      category: 'COMPACT',
      domPath: 'time-bar',
    };
  }

  if (element.closest('[class*="timeDisplay"], [class*="timeText"]')) {
    return {
      targetLabel: 'Time Countdown Readout',
      category: 'TIMER',
      domPath: 'time-countdown',
    };
  }

  // 8. General fallback with text content
  const inlineText = element.innerText?.trim();
  if (inlineText && inlineText.length < 35 && !inlineText.includes('\n')) {
    return {
      targetLabel: `Component: "${inlineText}"`,
      category: islandState === 'compact' ? 'COMPACT' : (activeTab || 'GENERAL').toUpperCase(),
      domPath: element.tagName.toLowerCase(),
    };
  }

  return {
    targetLabel: islandState === 'compact' ? 'Compact Island Area' : `Expanded Island (${activeTab || 'view'})`,
    category: islandState === 'compact' ? 'COMPACT' : (activeTab || 'EXPANDED').toUpperCase(),
    domPath: element.className ? element.className.split(' ')[0] : 'island-surface',
  };
}

/**
 * Loads stored dev pins from Electron Store or localStorage.
 */
export function loadSavedPins() {
  try {
    if (window.electronAPI?.store?.get) {
      const saved = window.electronAPI.store.get(STORAGE_KEY, null);
      if (Array.isArray(saved)) return saved;
    }
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[DevFeedback] Failed to load pins from storage:', err);
  }
  return [];
}

/**
 * Saves dev pins to Electron Store and localStorage.
 */
export function persistPins(pins) {
  try {
    if (window.electronAPI?.store?.set) {
      window.electronAPI.store.set(STORAGE_KEY, pins);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch (err) {
    console.warn('[DevFeedback] Failed to persist pins:', err);
  }
}

/**
 * Loads dev mode active state.
 */
export function loadDevModeActive() {
  try {
    if (window.electronAPI?.store?.get) {
      const saved = window.electronAPI.store.get(DEV_MODE_KEY, true);
      return saved !== false;
    }
    const local = localStorage.getItem(DEV_MODE_KEY);
    return local !== 'false';
  } catch {
    return true;
  }
}

/**
 * Persists dev mode state.
 */
export function persistDevModeActive(active) {
  try {
    if (window.electronAPI?.store?.set) {
      window.electronAPI.store.set(DEV_MODE_KEY, active);
    }
    localStorage.setItem(DEV_MODE_KEY, active ? 'true' : 'false');
  } catch (err) {
    console.warn('[DevFeedback] Failed to persist dev mode:', err);
  }
}

/**
 * Formats all pins into a structured, highly actionable markdown prompt
 * ready for AI coding assistants and developers.
 */
export function formatPinsToPrompt(pins) {
  if (!pins || pins.length === 0) {
    return '# No visual pins recorded yet.\nRight-click anywhere on the app to drop a pin with feedback.';
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = [
    `# Pomodoro Island — Visual Review Pins & Edit Requests`,
    `Generated on: ${dateStr} • Total Pins: ${pins.length}`,
    '',
    `Please address the following feedback items, issues, and polish requests collected via in-app visual pin drops:`,
    '',
    '---',
    '',
  ];

  pins.forEach((pin, index) => {
    const viewHeader = pin.viewState === 'compact'
      ? 'Compact Island'
      : `Expanded View • ${(pin.activeTab || 'General').toUpperCase()} Tab`;

    lines.push(`### Pin #${pin.number || index + 1}: [${viewHeader}] ${pin.targetLabel}`);
    lines.push(`- **View State**: \`${pin.viewState}\` (Tab: \`${pin.activeTab || 'none'}\`)`);
    lines.push(`- **Coordinates on Island**: \`x: ${Number(pin.xPercent).toFixed(1)}%\`, \`y: ${Number(pin.yPercent).toFixed(1)}%\``);
    lines.push(`- **Target Component**: \`${pin.targetLabel}\` (DOM: \`${pin.domPath || 'element'}\`)`);
    lines.push(`- **Feedback / Requested Change**:`);
    lines.push(`  > ${pin.comment.replace(/\n/g, '\n  > ')}`);
    lines.push('');
  });

  lines.push('---');
  lines.push('### Implementation Guidelines:');
  lines.push('1. Review and address each numbered pin systematically.');
  lines.push('2. Adhere to the established Obsidian Glass design system:');
  lines.push('   - Colors: `#08080a` surface, steel-blue `#5c77bd` accent, hairline dividers `rgba(255,255,255,0.06)`');
  lines.push('   - Typography: Inter font with tabular numbers for countdown timers (\`tnum\` 1)');
  lines.push('   - Motion: Apple Dynamic Island spring curves (mass 1, stiffness 260, damping 28)');
  lines.push('3. Verify that \`npm run build\` compiles with 0 errors.');

  return lines.join('\n');
}
