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
