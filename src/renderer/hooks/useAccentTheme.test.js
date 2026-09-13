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
